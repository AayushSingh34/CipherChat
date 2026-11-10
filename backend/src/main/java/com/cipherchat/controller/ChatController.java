package com.cipherchat.controller;
import com.cipherchat.model.EncryptedMessage;
import com.cipherchat.repository.MessageRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
@RestController
@RequestMapping("/api/chat")
@SuppressWarnings({"rawtypes", "unchecked"})
public class ChatController {
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    public ChatController(MessageRepository messageRepository, SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate;
    }
    @MessageMapping("/send")
    public void receiveMessage(@Payload Map payload) {
        try {
            String sender = String.valueOf(payload.get("senderUsername"));
            String receiver = String.valueOf(payload.get("receiverUsername"));
            String ciphertext = String.valueOf(payload.get("ciphertext"));
            String iv = String.valueOf(payload.get("iv"));
            String messageType = payload.containsKey("messageType") ? String.valueOf(payload.get("messageType")) : "TEXT";
            String fileName = payload.containsKey("fileName") ? String.valueOf(payload.get("fileName")) : null;
            EncryptedMessage msg = new EncryptedMessage();
            msg.setId(UUID.randomUUID().toString());
            msg.setSenderUsername(sender);
            msg.setReceiverUsername(receiver);
            msg.setCiphertext(ciphertext);
            msg.setIv(iv);
            msg.setMessageType(messageType);
            msg.setFileName(fileName);
            msg.setTimestamp(LocalDateTime.now());
            messageRepository.save(msg);
            messagingTemplate.convertAndSend("/topic/chat/" + receiver, msg);
            messagingTemplate.convertAndSend("/topic/chat/" + sender, msg);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam String user1, @RequestParam String user2) {
        try {
            List<EncryptedMessage> messages = messageRepository.findBySenderUsernameAndReceiverUsernameOrSenderUsernameAndReceiverUsername(user1, user2, user2, user1);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
    @GetMapping("/presence/online")
    public ResponseEntity<?> getOnlineStatus() {
        return ResponseEntity.ok(Map.of("status", "ONLINE", "timestamp", System.currentTimeMillis()));
    }
}