package com.cipherchat.controller;
import com.cipherchat.model.EncryptedMessage;
import com.cipherchat.repository.MessageRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@RestController
@RequestMapping("/api/chat")
@Transactional
@SuppressWarnings({"rawtypes", "unchecked"})
public class ChatController {
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private static final Map<String, Long> onlineUsers = new ConcurrentHashMap<>();
    public ChatController(MessageRepository messageRepository, SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
    }
    public static void markOnline(String username) {
        if (username != null && !username.isBlank()) {
            onlineUsers.put(username.trim(), System.currentTimeMillis());
        }
    }
    private EncryptedMessage saveAndBroadcast(Map payload) {
        String sender = String.valueOf(payload.get("senderUsername")).trim();
        String receiver = String.valueOf(payload.get("receiverUsername")).trim();
        String ciphertext = String.valueOf(payload.get("ciphertext"));
        String iv = payload.get("iv") != null ? String.valueOf(payload.get("iv")) : "PLAIN";
        String messageType = payload.get("messageType") != null ? String.valueOf(payload.get("messageType")) : "TEXT";
        String fileName = payload.get("fileName") != null ? String.valueOf(payload.get("fileName")) : null;
        markOnline(sender);
        EncryptedMessage msg = new EncryptedMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setSenderUsername(sender);
        msg.setReceiverUsername(receiver);
        msg.setCiphertext(ciphertext);
        msg.setIv(iv);
        msg.setMessageType(messageType);
        msg.setFileName(fileName);
        msg.setTimestamp(LocalDateTime.now());
        EncryptedMessage saved = messageRepository.save(msg);
        try {
            messagingTemplate.convertAndSend("/topic/chat/" + receiver, saved);
            messagingTemplate.convertAndSend("/topic/chat/" + sender, saved);
            messagingTemplate.convertAndSend("/topic/messages/" + receiver, saved);
            messagingTemplate.convertAndSend("/topic/messages/" + sender, saved);
        } catch (Exception ignored) {}
        return saved;
    }
    @MessageMapping({"/send", "/chat.send", "/message"})
    public void receiveWsMessage(@Payload Map payload) {
        try {
            saveAndBroadcast(payload);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    @PostMapping("/send")
    public ResponseEntity<?> sendRestMessage(@RequestBody Map payload) {
        try {
            EncryptedMessage saved = saveAndBroadcast(payload);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam String user1, @RequestParam String user2) {
        try {
            markOnline(user1);
            List<EncryptedMessage> messages = messageRepository.findConversation(user1.trim(), user2.trim());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
    @PostMapping("/presence/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        markOnline(username);
        return ResponseEntity.ok(Map.of("status", "ONLINE", "onlineUsers", getActiveUserList()));
    }
    @GetMapping({"/presence/online", "/online"})
    public ResponseEntity<?> getOnlineStatus(@RequestParam(required = false) String username) {
        if (username != null) markOnline(username);
        return ResponseEntity.ok(getActiveUserList());
    }
    private Set<String> getActiveUserList() {
        long cutoff = System.currentTimeMillis() - 60000; // Active in last 60s
        onlineUsers.entrySet().removeIf(e -> e.getValue() < cutoff);
        return onlineUsers.keySet();
    }
}