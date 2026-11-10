package com.cipherchat.controller;
import com.cipherchat.model.Friendship;
import com.cipherchat.repository.FriendshipRepository;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/friends")
@Transactional
@SuppressWarnings({"rawtypes", "unchecked"})
public class FriendController {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    public FriendController(FriendshipRepository friendshipRepository,
                            UserRepository userRepository,
                            SimpMessagingTemplate messagingTemplate) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestBody Map req) {
        try {
            String from = String.valueOf(req.get("requester")).trim();
            String to = String.valueOf(req.get("addressee")).trim();
            ChatController.markOnline(from);
            if (from.equalsIgnoreCase(to)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot add yourself"));
            }
            if (userRepository.findByUsername(to).isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }
            Optional<Friendship> existing = friendshipRepository.findRelation(from, to);
            if (existing.isPresent()) {
                Friendship f = existing.get();
                if ("BLOCKED".equals(f.getStatus())) {
                    return ResponseEntity.badRequest().body(Map.of("error", "User is blocked"));
                }
                return ResponseEntity.badRequest().body(Map.of("error", "Request or friendship already exists"));
            }
            Friendship saved = friendshipRepository.save(new Friendship(from, to, "PENDING"));
            Map notifyPayload = new HashMap();
            notifyPayload.put("type", "FRIEND_REQUEST");
            notifyPayload.put("requester", from);
            notifyPayload.put("addressee", to);
            notifyPayload.put("friendshipId", saved.getId());
            try {
                messagingTemplate.convertAndSend("/topic/notifications/" + to, notifyPayload);
                messagingTemplate.convertAndSend("/topic/notifications/" + from, notifyPayload);
            } catch (Exception ignored) {}
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @PostMapping("/respond")
    public ResponseEntity<?> respondToRequest(@RequestBody Map req) {
        try {
            String friendshipId = req.get("friendshipId") != null ? String.valueOf(req.get("friendshipId")).trim() : "";
            String action = req.get("action") != null ? String.valueOf(req.get("action")).trim() : "";
            String currentUsername = req.get("username") != null ? String.valueOf(req.get("username")).trim() : "";
            String targetUsername = req.get("targetUsername") != null ? String.valueOf(req.get("targetUsername")).trim() : "";
            ChatController.markOnline(currentUsername);
            Optional<Friendship> opt = Optional.empty();
            if (!friendshipId.isEmpty() && !"null".equalsIgnoreCase(friendshipId) && !"undefined".equalsIgnoreCase(friendshipId)) {
                opt = friendshipRepository.findById(friendshipId);
            }
            if (opt.isEmpty() && !targetUsername.isEmpty() && !currentUsername.isEmpty()) {
                opt = friendshipRepository.findRelation(currentUsername, targetUsername);
            }
            if (opt.isEmpty()) {
                if ("BLOCK".equalsIgnoreCase(action) && !targetUsername.isEmpty() && !currentUsername.isEmpty()) {
                    Friendship f = new Friendship(currentUsername, targetUsername, "BLOCKED");
                    f.setBlockedBy(currentUsername);
                    friendshipRepository.save(f);
                    return ResponseEntity.ok(Map.of("status", "SUCCESS"));
                }
                return ResponseEntity.badRequest().body(Map.of("error", "Friendship relation not found"));
            }
            Friendship f = opt.get();
            String reqUser = f.getRequesterUsername();
            String addUser = f.getAddresseeUsername();
            if ("ACCEPT".equalsIgnoreCase(action)) {
                f.setStatus("ACCEPTED");
                friendshipRepository.save(f);
            } else if ("REJECT".equalsIgnoreCase(action) || "UNFRIEND".equalsIgnoreCase(action) || "UNBLOCK".equalsIgnoreCase(action)) {
                friendshipRepository.delete(f);
            } else if ("BLOCK".equalsIgnoreCase(action)) {
                f.setStatus("BLOCKED");
                f.setBlockedBy(currentUsername);
                friendshipRepository.save(f);
            }
            Map payload = new HashMap();
            payload.put("type", "FRIEND_" + action.toUpperCase());
            payload.put("partner", currentUsername);
            try {
                messagingTemplate.convertAndSend("/topic/notifications/" + reqUser, payload);
                messagingTemplate.convertAndSend("/topic/notifications/" + addUser, payload);
            } catch (Exception ignored) {}
            return ResponseEntity.ok(Map.of("status", "SUCCESS"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/list")
    public ResponseEntity<?> getFriends(@RequestParam String username) {
        try {
            ChatController.markOnline(username);
            Set<String> activeUsers = ChatController.getOnlineSet();
            List relations = friendshipRepository.findAllForUser(username.trim());
            List result = new ArrayList();
            for (Object obj : relations) {
                Friendship f = (Friendship) obj;
                String partnerName = f.getRequesterUsername().equalsIgnoreCase(username.trim())
                        ? f.getAddresseeUsername()
                        : f.getRequesterUsername();
                userRepository.findByUsername(partnerName).ifPresent(partner -> {
                    Map item = new HashMap();
                    item.put("friendshipId", f.getId());
                    item.put("username", partner.getUsername());
                    item.put("displayName", partner.getDisplayName());
                    item.put("avatar", partner.getAvatar());
                    item.put("publicKey", partner.getPublicKey());
                    item.put("status", f.getStatus());
                    item.put("online", activeUsers.contains(partner.getUsername()));
                    item.put("isRequester", f.getRequesterUsername().equalsIgnoreCase(username.trim()));
                    item.put("blockedBy", f.getBlockedBy());
                    result.add(item);
                });
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}