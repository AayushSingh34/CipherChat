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
            List<Friendship> existingList = friendshipRepository.findRelationsBetween(from, to);
            if (!existingList.isEmpty()) {
                Friendship f = existingList.get(0);
                if ("BLOCKED".equalsIgnoreCase(f.getStatus())) {
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
    @RequestMapping(value = {"/respond", "/block", "/unfriend"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> respondToRequest(@RequestBody Map req) {
        try {
            String friendshipId = req.get("friendshipId") != null ? String.valueOf(req.get("friendshipId")).trim() : "";
            String action = req.get("action") != null ? String.valueOf(req.get("action")).trim() : "BLOCK";
            String currentUsername = req.get("username") != null ? String.valueOf(req.get("username")).trim()
                                   : String.valueOf(req.getOrDefault("requester", "")).trim();
            String targetUsername = req.get("targetUsername") != null ? String.valueOf(req.get("targetUsername")).trim()
                                  : String.valueOf(req.getOrDefault("addressee", "")).trim();
            ChatController.markOnline(currentUsername);
            List<Friendship> matches = new ArrayList<>();
            if (!friendshipId.isEmpty() && !"null".equalsIgnoreCase(friendshipId) && !"undefined".equalsIgnoreCase(friendshipId)) {
                friendshipRepository.findById(friendshipId).ifPresent(matches::add);
            }
            if (matches.isEmpty() && !currentUsername.isEmpty() && !targetUsername.isEmpty()) {
                matches.addAll(friendshipRepository.findRelationsBetween(currentUsername, targetUsername));
            }
            if (matches.isEmpty()) {
                if ("BLOCK".equalsIgnoreCase(action) && !currentUsername.isEmpty() && !targetUsername.isEmpty()) {
                    Friendship f = new Friendship(currentUsername, targetUsername, "BLOCKED");
                    f.setBlockedBy(currentUsername);
                    Friendship saved = friendshipRepository.save(f);
                    return ResponseEntity.ok(Map.of("status", "BLOCKED", "friendshipId", saved.getId()));
                }
                return ResponseEntity.ok(Map.of("status", "CLEARED"));
            }
            Friendship primary = matches.get(0);
            // Clean up any duplicate rows if they existed
            if (matches.size() > 1) {
                for (int i = 1; i < matches.size(); i++) {
                    friendshipRepository.delete(matches.get(i));
                }
            }
            String reqUser = primary.getRequesterUsername();
            String addUser = primary.getAddresseeUsername();
            if ("ACCEPT".equalsIgnoreCase(action)) {
                primary.setStatus("ACCEPTED");
                friendshipRepository.save(primary);
            } else if ("REJECT".equalsIgnoreCase(action) || "UNFRIEND".equalsIgnoreCase(action) || "UNBLOCK".equalsIgnoreCase(action)) {
                friendshipRepository.delete(primary);
            } else if ("BLOCK".equalsIgnoreCase(action)) {
                primary.setStatus("BLOCKED");
                primary.setBlockedBy(currentUsername.isEmpty() ? reqUser : currentUsername);
                friendshipRepository.save(primary);
            }
            Map payload = new HashMap();
            payload.put("type", "FRIEND_" + action.toUpperCase());
            payload.put("partner", currentUsername);
            try {
                messagingTemplate.convertAndSend("/topic/notifications/" + reqUser, payload);
                messagingTemplate.convertAndSend("/topic/notifications/" + addUser, payload);
            } catch (Exception ignored) {}
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "action", action));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/list")
    public ResponseEntity<?> getFriends(@RequestParam String username) {
        try {
            ChatController.markOnline(username);
            List<Friendship> relations = friendshipRepository.findAllForUser(username.trim());
            List result = new ArrayList();
            for (Friendship f : relations) {
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
                    item.put("online", ChatController.isUserOnline(partner.getUsername()));
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