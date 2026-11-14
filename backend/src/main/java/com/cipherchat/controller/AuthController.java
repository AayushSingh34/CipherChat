package com.cipherchat.controller;
import com.cipherchat.model.User;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.annotation.PostConstruct;
import java.util.*;
@RestController
@RequestMapping("/api/auth")
@Transactional
@SuppressWarnings({"rawtypes", "unchecked"})
public class AuthController {
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JdbcTemplate jdbcTemplate;
    public AuthController(UserRepository userRepository,
                          SimpMessagingTemplate messagingTemplate,
                          JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.jdbcTemplate = jdbcTemplate;
    }
    @PostConstruct
    public void ensurePostgresTextColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN avatar TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN public_key TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN display_name TYPE TEXT");
        } catch (Exception ignored) {}
    }
    private String extractPassword(Map req) {
        if (req.get("password") != null && !String.valueOf(req.get("password")).isEmpty()) {
            return String.valueOf(req.get("password"));
        }
        if (req.get("passwordHash") != null && !String.valueOf(req.get("passwordHash")).isEmpty()) {
            return String.valueOf(req.get("passwordHash"));
        }
        if (req.get("newPassword") != null && !String.valueOf(req.get("newPassword")).isEmpty()) {
            return String.valueOf(req.get("newPassword"));
        }
        return "";
    }
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map req) {
        try {
            String username = String.valueOf(req.get("username")).trim();
            if (username.isEmpty() || "null".equalsIgnoreCase(username)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required."));
            }
            if (userRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username already exists. Please log in."));
            }
            String pass = extractPassword(req);
            if (pass.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required to register."));
            }
            String publicKey = req.get("publicKey") != null ? String.valueOf(req.get("publicKey")) : "KEY_" + username;
            User user = new User();
            user.setId(UUID.randomUUID().toString());
            user.setUsername(username);
            user.setDisplayName(req.get("displayName") != null && !String.valueOf(req.get("displayName")).isBlank()
                    ? String.valueOf(req.get("displayName")).trim()
                    : username);
            user.setPasswordHash(pass);
            user.setPublicKey(publicKey);
            user.setDiscoverable(true);
            user.setStrictPrivacy(false);
            if (req.get("avatar") != null) user.setAvatar(String.valueOf(req.get("avatar")));
            if (req.get("securityQuestion") != null) user.setSecurityQuestion(String.valueOf(req.get("securityQuestion")));
            if (req.get("securityAnswer") != null) user.setSecurityAnswer(String.valueOf(req.get("securityAnswer")));
            User saved = userRepository.saveAndFlush(user);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map req) {
        try {
            String username = req.get("username") != null ? String.valueOf(req.get("username")).trim() : "";
            String pass = extractPassword(req);
            String publicKey = req.get("publicKey") != null ? String.valueOf(req.get("publicKey")) : "";
            if (username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please enter your username."));
            }
            Optional<User> opt = userRepository.findByUsername(username);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "No user details found. Please register first."));
            }
            User user = opt.get();
            if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty() && !user.getPasswordHash().equals(pass)) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid password. Please check your credentials."));
            }
            if (publicKey != null && !publicKey.isBlank() && !publicKey.startsWith("KEY_") && !publicKey.equals(user.getPublicKey())) {
                user.setPublicKey(publicKey);
                user = userRepository.saveAndFlush(user);
                try {
                    messagingTemplate.convertAndSend("/topic/presence", Map.of("type", "PROFILE_UPDATED", "username", user.getUsername()));
                } catch (Exception ignored) {}
            }
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/search")
    public ResponseEntity<?> searchUser(@RequestParam String username) {
        Optional<User> opt = userRepository.findByUsername(username.trim());
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "No user details found"));
        }
        return ResponseEntity.ok(opt.get());
    }
    @RequestMapping(value = {"/privacy", "/update-privacy"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updatePrivacy(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "No user details found"));
        User u = opt.get();
        if (req.containsKey("discoverable")) {
            u.setDiscoverable(Boolean.parseBoolean(String.valueOf(req.get("discoverable"))));
        }
        if (req.containsKey("strictPrivacy")) {
            u.setStrictPrivacy(Boolean.parseBoolean(String.valueOf(req.get("strictPrivacy"))));
        }
        User saved = userRepository.saveAndFlush(u);
        return ResponseEntity.ok(saved);
    }
    @RequestMapping(value = {"/profile", "/update-profile", "/user"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updateProfile(@RequestBody Map req) {
        try {
            String username = String.valueOf(req.get("username")).trim();
            Optional<User> opt = userRepository.findByUsername(username);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "No user details found. Please register first."));
            }
            User u = opt.get();
            if (req.get("displayName") != null && !String.valueOf(req.get("displayName")).isBlank()) {
                u.setDisplayName(String.valueOf(req.get("displayName")).trim());
            }
            if (req.get("avatar") != null) {
                u.setAvatar(String.valueOf(req.get("avatar")));
            }
            if (req.get("securityQuestion") != null && !String.valueOf(req.get("securityQuestion")).isBlank()) {
                u.setSecurityQuestion(String.valueOf(req.get("securityQuestion")));
            }
            if (req.get("securityAnswer") != null && !String.valueOf(req.get("securityAnswer")).isBlank()) {
                u.setSecurityAnswer(String.valueOf(req.get("securityAnswer")));
            }
            String newPass = extractPassword(req);
            if (!newPass.isEmpty()) {
                u.setPasswordHash(newPass);
            }
            User saved = userRepository.saveAndFlush(u);
            try {
                messagingTemplate.convertAndSend("/topic/presence", Map.of("type", "PROFILE_UPDATED", "username", saved.getUsername()));
            } catch (Exception ignored) {}
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/recovery-question")
    public ResponseEntity<?> getRecoveryQuestion(@RequestParam String username) {
        Optional<User> opt = userRepository.findByUsername(username.trim());
        if (opt.isEmpty() || opt.get().getSecurityQuestion() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "No user details or recovery question found"));
        }
        return ResponseEntity.ok(Map.of("question", opt.get().getSecurityQuestion()));
    }
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        String answer = String.valueOf(req.get("securityAnswer")).trim();
        String newPass = extractPassword(req);
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "No user details found"));
        User u = opt.get();
        if (u.getSecurityAnswer() != null && u.getSecurityAnswer().equalsIgnoreCase(answer)) {
            u.setPasswordHash(newPass);
            userRepository.saveAndFlush(u);
            return ResponseEntity.ok(Map.of("status", "PASSWORD_UPDATED"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Incorrect security answer"));
    }
}