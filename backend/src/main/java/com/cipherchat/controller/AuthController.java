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
            String pass = extractPassword(req);
            String publicKey = req.get("publicKey") != null ? String.valueOf(req.get("publicKey")) : "KEY_" + username;
            User user = userRepository.findByUsername(username).orElseGet(() -> {
                User u = new User();
                u.setId(UUID.randomUUID().toString());
                u.setUsername(username);
                u.setDiscoverable(true);
                u.setStrictPrivacy(false);
                return u;
            });
            if (!pass.isEmpty()) user.setPasswordHash(pass);
            user.setPublicKey(publicKey);
            if (req.get("displayName") != null) user.setDisplayName(String.valueOf(req.get("displayName")));
            if (req.get("avatar") != null) user.setAvatar(String.valueOf(req.get("avatar")));
            if (req.get("securityQuestion") != null) user.setSecurityQuestion(String.valueOf(req.get("securityQuestion")));
            if (req.get("securityAnswer") != null) user.setSecurityAnswer(String.valueOf(req.get("securityAnswer")));
            User saved = userRepository.save(user);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map req) {
        try {
            String username = String.valueOf(req.get("username")).trim();
            String pass = extractPassword(req);
            String publicKey = req.get("publicKey") != null ? String.valueOf(req.get("publicKey")) : "KEY_" + username;
            Optional<User> opt = userRepository.findByUsername(username);
            User user;
            if (opt.isEmpty()) {
                user = new User();
                user.setId(UUID.randomUUID().toString());
                user.setUsername(username);
                user.setDisplayName(username);
                user.setPasswordHash(pass);
                user.setPublicKey(publicKey);
                user.setDiscoverable(true);
                user.setStrictPrivacy(false);
                user = userRepository.save(user);
            } else {
                user = opt.get();
                if (!pass.isEmpty() && (user.getPasswordHash() == null || !user.getPasswordHash().equals(pass))) {
                    user.setPasswordHash(pass);
                    user = userRepository.save(user);
                }
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
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        return ResponseEntity.ok(opt.get());
    }
    @RequestMapping(value = {"/privacy", "/update-privacy"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updatePrivacy(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        User u = opt.get();
        if (req.containsKey("discoverable")) {
            u.setDiscoverable(Boolean.parseBoolean(String.valueOf(req.get("discoverable"))));
        }
        if (req.containsKey("strictPrivacy")) {
            u.setStrictPrivacy(Boolean.parseBoolean(String.valueOf(req.get("strictPrivacy"))));
        }
        User saved = userRepository.save(u);
        return ResponseEntity.ok(saved);
    }
    @RequestMapping(value = {"/profile", "/update-profile", "/user"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updateProfile(@RequestBody Map req) {
        try {
            String username = String.valueOf(req.get("username")).trim();
            User u = userRepository.findByUsername(username).orElseGet(() -> {
                User newUser = new User();
                newUser.setId(UUID.randomUUID().toString());
                newUser.setUsername(username);
                newUser.setPasswordHash("auto");
                newUser.setPublicKey("KEY_" + username);
                newUser.setDiscoverable(true);
                newUser.setStrictPrivacy(false);
                return newUser;
            });
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
            User saved = userRepository.save(u);
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
            return ResponseEntity.badRequest().body(Map.of("error", "No recovery question found"));
        }
        return ResponseEntity.ok(Map.of("question", opt.get().getSecurityQuestion()));
    }
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestParam(required = false) String uParam, @RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        String answer = String.valueOf(req.get("securityAnswer")).trim();
        String newPass = extractPassword(req);
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        User u = opt.get();
        if (u.getSecurityAnswer() != null && u.getSecurityAnswer().equalsIgnoreCase(answer)) {
            u.setPasswordHash(newPass);
            userRepository.save(u);
            return ResponseEntity.ok(Map.of("status", "PASSWORD_UPDATED"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Incorrect security answer"));
    }
}