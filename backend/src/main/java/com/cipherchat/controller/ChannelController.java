package com.cipherchat.controller;
import com.cipherchat.model.ChatChannel;
import com.cipherchat.repository.ChannelRepository;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
@RestController
@RequestMapping("/api/channels")
@SuppressWarnings({"rawtypes", "unchecked"})
public class ChannelController {
    private final ChannelRepository channelRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    public ChannelController(ChannelRepository channelRepository,
                             UserRepository userRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.channelRepository = channelRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }
    @GetMapping
    public ResponseEntity<List<ChatChannel>> getChannels(@RequestParam String type) {
        return ResponseEntity.ok(channelRepository.findByType(type.toUpperCase()));
    }
    @GetMapping("/search")
    public ResponseEntity<List<ChatChannel>> searchChannels(@RequestParam String query, @RequestParam String type) {
        List<ChatChannel> all = channelRepository.findByType(type.toUpperCase());
        List<ChatChannel> filtered = all.stream()
                .filter(c -> c.getName().toLowerCase().contains(query.toLowerCase()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(filtered);
    }
    @PostMapping
    public ResponseEntity<?> createChannel(@RequestBody Map req) {
        String name = String.valueOf(req.get("name"));
        String type = String.valueOf(req.get("type"));
        String desc = req.get("description") != null ? String.valueOf(req.get("description")) : "";
        String user = String.valueOf(req.get("username"));
        String avatar = req.get("avatar") != null ? String.valueOf(req.get("avatar")) : "";
        boolean isPrivate = Boolean.TRUE.equals(req.get("isPrivate"));
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Channel name required"));
        }
        ChatChannel channel = new ChatChannel(name.trim(), type.toUpperCase(), desc.trim(), user, isPrivate, avatar);
        ChatChannel saved = channelRepository.save(channel);
        return ResponseEntity.ok(saved);
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> updateChannel(@PathVariable String id, @RequestBody Map req) {
        ChatChannel ch = channelRepository.findById(id).orElseThrow();
        if (req.containsKey("name") && !String.valueOf(req.get("name")).isBlank()) {
            ch.setName(String.valueOf(req.get("name")).trim());
        }
        if (req.containsKey("description")) {
            ch.setDescription(String.valueOf(req.get("description")).trim());
        }
        if (req.containsKey("avatar")) {
            ch.setAvatar(String.valueOf(req.get("avatar")));
        }
        ChatChannel saved = channelRepository.save(ch);
        for (String member : saved.getMembers()) {
            messagingTemplate.convertAndSend("/topic/notifications/" + member, Map.of("type", "CHANNEL_UPDATED", "channelId", saved.getId()));
        }
        return ResponseEntity.ok(saved);
    }
    @PostMapping("/add-member")
    public ResponseEntity<?> addMemberDirectly(@RequestBody Map req) {
        String channelId = String.valueOf(req.get("channelId"));
        String targetUser = String.valueOf(req.get("username")).trim();
        if (userRepository.findByUsername(targetUser).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        ChatChannel ch = channelRepository.findById(channelId).orElseThrow();
        if (ch.getBlockedUsers().contains(targetUser)) {
            return ResponseEntity.badRequest().body(Map.of("error", "User is blocked from this channel"));
        }
        if (!ch.getMembers().contains(targetUser)) {
            ch.getMembers().add(targetUser);
            ch.getPendingRequests().remove(targetUser);
            channelRepository.save(ch);
            messagingTemplate.convertAndSend("/topic/notifications/" + targetUser, Map.of("type", "CHANNEL_ADDED", "channelName", ch.getName()));
        }
        return ResponseEntity.ok(ch);
    }
    @PostMapping("/manage-member")
    public ResponseEntity<?> manageMember(@RequestBody Map req) {
        String channelId = String.valueOf(req.get("channelId"));
        String targetUser = String.valueOf(req.get("targetUser"));
        String action = String.valueOf(req.get("action")); // "REMOVE", "BLOCK", "UNBLOCK"
        ChatChannel ch = channelRepository.findById(channelId).orElseThrow();
        if ("REMOVE".equalsIgnoreCase(action)) {
            ch.getMembers().remove(targetUser);
        } else if ("BLOCK".equalsIgnoreCase(action)) {
            ch.getMembers().remove(targetUser);
            ch.getPendingRequests().remove(targetUser);
            if (!ch.getBlockedUsers().contains(targetUser)) {
                ch.getBlockedUsers().add(targetUser);
            }
        } else if ("UNBLOCK".equalsIgnoreCase(action)) {
            ch.getBlockedUsers().remove(targetUser);
        }
        ChatChannel saved = channelRepository.save(ch);
        messagingTemplate.convertAndSend("/topic/notifications/" + targetUser, Map.of("type", "CHANNEL_MODERATION", "channelId", saved.getId()));
        return ResponseEntity.ok(saved);
    }
    @PostMapping("/request-join")
    public ResponseEntity<?> requestJoinChannel(@RequestBody Map req) {
        String channelId = String.valueOf(req.get("channelId"));
        String username = String.valueOf(req.get("username"));
        ChatChannel ch = channelRepository.findById(channelId).orElseThrow();
        if (ch.getBlockedUsers().contains(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "You are blocked from joining this channel"));
        }
        if (ch.isPrivate()) {
            if (!ch.getPendingRequests().contains(username) && !ch.getMembers().contains(username)) {
                ch.getPendingRequests().add(username);
                channelRepository.save(ch);
                messagingTemplate.convertAndSend("/topic/notifications/" + ch.getCreatedBy(), Map.of("type", "CHANNEL_JOIN_REQUEST", "requester", username));
            }
        } else {
            if (!ch.getMembers().contains(username)) {
                ch.getMembers().add(username);
                channelRepository.save(ch);
            }
        }
        return ResponseEntity.ok(ch);
    }
    @PostMapping("/respond-join")
    public ResponseEntity<?> respondJoinRequest(@RequestBody Map req) {
        String channelId = String.valueOf(req.get("channelId"));
        String username = String.valueOf(req.get("username"));
        String action = String.valueOf(req.get("action"));
        ChatChannel ch = channelRepository.findById(channelId).orElseThrow();
        ch.getPendingRequests().remove(username);
        if ("APPROVE".equalsIgnoreCase(action)) {
            if (!ch.getMembers().contains(username)) {
                ch.getMembers().add(username);
            }
            messagingTemplate.convertAndSend("/topic/notifications/" + username, Map.of("type", "CHANNEL_APPROVED", "channelName", ch.getName()));
        }
        return ResponseEntity.ok(channelRepository.save(ch));
    }
}