package com.cipherchat.controller;
import com.cipherchat.model.User;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/auth")
@Transactional
@SuppressWarnings({"rawtypes", "unchecked"})
public class AuthController {
    private final UserRepository userRepository;
    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    private String extractPassword(Map req) {
        if (req.get("password") != null && !String.valueOf(req.get("password")).isEmpty()) {
            return String.valueOf(req.get("password"));
        }
        if (req.get("passwordHash") != null && !String.valueOf(req.get("passwordHash")).isEmpty()) {
            return String.valueOf(req.get("passwordHash"));
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
    @PostMapping({"/privacy", "/update-privacy"})
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
    @PostMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        User u = opt.get();
        if (req.get("displayName") != null) u.setDisplayName(String.valueOf(req.get("displayName")));
        if (req.get("avatar") != null) u.setAvatar(String.valueOf(req.get("avatar")));
        User saved = userRepository.save(u);
        return ResponseEntity.ok(saved);
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
    public ResponseEntity<?> resetPassword(@RequestBody Map req) {
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