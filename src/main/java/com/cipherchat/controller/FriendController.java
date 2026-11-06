package com.cipherchat.controller;
import com.cipherchat.model.Friendship;
import com.cipherchat.model.User;
import com.cipherchat.repository.FriendshipRepository;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/friends")
public class FriendController {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    public FriendController(FriendshipRepository friendshipRepository, UserRepository userRepository) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
    }
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestBody Map<String, String> req) {
        String from = req.get("requester");
        String to = req.get("addressee");
        if (from.equals(to)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot add yourself"));
        }
        if (userRepository.findByUsername(to).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        Optional<Friendship> existing = friendshipRepository.findRelation(from, to);
        if (existing.isPresent()) {
            return ResponseEntity.ok(existing.get());
        }
        Friendship f = new Friendship(from, to, "ACCEPTED");
        return ResponseEntity.ok(friendshipRepository.save(f));
    }
    @GetMapping("/list")
    public ResponseEntity<List>> getFriends(@RequestParam String username) {
        List<Friendship> relations = friendshipRepository.findAllForUser(username);
        List> result = new ArrayList<>();
        for (Friendship f : relations) {
            String partnerName = f.getRequesterUsername().equals(username)
                    ? f.getAddresseeUsername()
                    : f.getRequesterUsername();
            userRepository.findByUsername(partnerName).ifPresent(partner -> {
                Map<String, Object> item = new HashMap<>();
                item.put("friendshipId", f.getId());
                item.put("username", partner.getUsername());
                item.put("publicKey", partner.getPublicKey());
                item.put("status", f.getStatus());
                item.put("strictPrivacy", partner.isStrictPrivacy());
                result.add(item);
            });
        }
        return ResponseEntity.ok(result);
    }
}
