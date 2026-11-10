package com.cipherchat.controller;
import com.cipherchat.model.ChatChannel;
import com.cipherchat.model.EncryptedMessage;
import com.cipherchat.model.Friendship;
import com.cipherchat.repository.ChannelRepository;
import com.cipherchat.repository.FriendshipRepository;
import com.cipherchat.repository.MessageRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@RestController
@RequestMapping("/api/chat")
@SuppressWarnings({"rawtypes", "unchecked"})
@org.springframework.transaction.annotation.Transactional
public class ChatController {
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final FriendshipRepository friendshipRepository;
    private final ChannelRepository channelRepository;
    public static final Set<String> ONLINE_USERS = ConcurrentHashMap.newKeySet();
    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MessageRepository messageRepository,
                          FriendshipRepository friendshipRepository,
                          ChannelRepository channelRepository) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
        this.friendshipRepository = friendshipRepository;
        this.channelRepository = channelRepository;
    }
    @MessageMapping("/chat.send")
    public void receiveAndRouteMessage(@Payload EncryptedMessage message) {
        String target = message.getReceiverUsername();
        Optional<ChatChannel> channelOpt = channelRepository.findById(target);
        if (channelOpt.isPresent()) {
            ChatChannel ch = channelOpt.get();
            if (ch.getBlockedUsers().contains(message.getSenderUsername()) || !ch.getMembers().contains(message.getSenderUsername())) {
                return;
            }
            EncryptedMessage saved = messageRepository.save(message);
            for (String member : ch.getMembers()) {
                messagingTemplate.convertAndSend("/topic/messages/" + member, saved);
            }
            return;
        }
        Optional<Friendship> rel = friendshipRepository.findRelation(message.getSenderUsername(), target);
        if (rel.isPresent() && "BLOCKED".equals(rel.get().getStatus())) {
            return;
        }
        EncryptedMessage saved = messageRepository.save(message);
        messagingTemplate.convertAndSend("/topic/messages/" + target, saved);
        messagingTemplate.convertAndSend("/topic/messages/" + message.getSenderUsername(), saved);
    }
    @DeleteMapping("/message/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable String id, @RequestParam String username) {
        Optional<EncryptedMessage> msgOpt = messageRepository.findById(id);
        if (msgOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        EncryptedMessage msg = msgOpt.get();
        if (!msg.getSenderUsername().equalsIgnoreCase(username)) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only delete your own messages"));
        }
        String target = msg.getReceiverUsername();
        messageRepository.deleteById(id);
        Map deleteNotice = Map.of("type", "MESSAGE_DELETED", "messageId", id);
        Optional<ChatChannel> channelOpt = channelRepository.findById(target);
        if (channelOpt.isPresent()) {
            for (String member : channelOpt.get().getMembers()) {
                messagingTemplate.convertAndSend("/topic/notifications/" + member, deleteNotice);
            }
        } else {
            messagingTemplate.convertAndSend("/topic/notifications/" + target, deleteNotice);
            messagingTemplate.convertAndSend("/topic/notifications/" + username, deleteNotice);
        }
        return ResponseEntity.ok(Map.of("status", "DELETED", "id", id));
    }
    @MessageMapping("/chat.typing")
    public void handleTypingNotification(@Payload Map typingEvent) {
        String receiver = String.valueOf(typingEvent.get("receiverUsername"));
        messagingTemplate.convertAndSend("/topic/typing/" + receiver, typingEvent);
    }
    @MessageMapping("/presence")
    public void handlePresence(@Payload Map event) {
        String username = String.valueOf(event.get("username"));
        String status = String.valueOf(event.get("status"));
        if ("ONLINE".equalsIgnoreCase(status)) {
            ONLINE_USERS.add(username);
        } else {
            ONLINE_USERS.remove(username);
        }
        messagingTemplate.convertAndSend("/topic/presence", Map.of(
            "username", username,
            "status", status,
            "allOnline", new ArrayList<>(ONLINE_USERS)
        ));
    }
    @GetMapping("/presence/online")
    public ResponseEntity getOnlineUsers() {
        return ResponseEntity.ok(new ArrayList<>(ONLINE_USERS));
    }
    @GetMapping("/history")
    public ResponseEntity<List<EncryptedMessage>> getChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        if (user1.equals(user2)) {
            List<EncryptedMessage> all = messageRepository.findAll();
            List<EncryptedMessage> channelMsgs = new ArrayList<>();
            for (EncryptedMessage m : all) {
                if (user1.equals(m.getReceiverUsername())) {
                    channelMsgs.add(m);
                }
            }
            channelMsgs.sort(Comparator.comparing(EncryptedMessage::getTimestamp));
            return ResponseEntity.ok(channelMsgs);
        }
        return ResponseEntity.ok(messageRepository.findConversationHistory(user1, user2));
    }
}