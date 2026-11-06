package com.cipherchat.controller;

import com.cipherchat.model.User;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public AuthController(UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User req) {
        if (userRepository.findByUsername(req.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }
        if (req.getDisplayName() == null || req.getDisplayName().isBlank()) {
            req.setDisplayName(req.getUsername());
        }
        return ResponseEntity.ok(userRepository.save(req));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> req) {
        String username = req.get("username");
        String passwordHash = req.get("passwordHash");
        String publicKey = req.get("publicKey");

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || !userOpt.get().getPasswordHash().equals(passwordHash)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
        User user = userOpt.get();
        if (publicKey != null && !publicKey.isBlank()) {
            user.setPublicKey(publicKey);
            userRepository.save(user);
        }
        return ResponseEntity.ok(user);
    }

    @GetMapping("/security-question")
    public ResponseEntity<?> getSecurityQuestion(@RequestParam String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username not found"));
        }
        String q = userOpt.get().getSecurityQuestion();
        if (q == null || q.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No security question registered for this account"));
        }
        return ResponseEntity.ok(Map.of("question", q));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> req) {
        String username = req.get("username");
        String answer = req.get("securityAnswer");
        String newPassword = req.get("newPassword");

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        if (user.getSecurityAnswer() == null || !user.getSecurityAnswer().equalsIgnoreCase(answer.trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Incorrect security answer"));
        }

        user.setPasswordHash(newPassword);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "Password reset successfully"));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> req) {
        String username = req.get("username");
        User user = userRepository.findByUsername(username).orElseThrow();

        if (req.containsKey("displayName")) user.setDisplayName(req.get("displayName"));
        if (req.containsKey("newPassword") && !req.get("newPassword").isBlank()) user.setPasswordHash(req.get("newPassword"));
        if (req.containsKey("avatar")) user.setAvatar(req.get("avatar"));
        if (req.containsKey("securityQuestion")) user.setSecurityQuestion(req.get("securityQuestion"));
        if (req.containsKey("securityAnswer")) user.setSecurityAnswer(req.get("securityAnswer"));

        User saved = userRepository.save(user);

        // Broadcast profile/avatar change to all active subscribers
        messagingTemplate.convertAndSend("/topic/presence", Map.of(
            "type", "PROFILE_UPDATED",
            "username", saved.getUsername(),
            "avatar", saved.getAvatar() != null ? saved.getAvatar() : "",
            "displayName", saved.getDisplayName()
        ));

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/privacy")
    public ResponseEntity<?> updatePrivacy(@RequestBody Map<String, Object> req) {
        String username = (String) req.get("username");
        User user = userRepository.findByUsername(username).orElseThrow();
        if (req.containsKey("discoverable")) user.setDiscoverable((Boolean) req.get("discoverable"));
        if (req.containsKey("strictPrivacy")) user.setStrictPrivacy((Boolean) req.get("strictPrivacy"));
        return ResponseEntity.ok(userRepository.save(user));
    }
}