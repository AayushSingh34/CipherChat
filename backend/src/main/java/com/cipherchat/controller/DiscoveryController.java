package com.cipherchat.controller;
import com.cipherchat.dto.NearbyUserDTO;
import com.cipherchat.model.User;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/discovery")
@Transactional
@SuppressWarnings({"rawtypes", "unchecked"})
public class DiscoveryController {
    private final UserRepository userRepository;
    public DiscoveryController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    private User getOrCreateUser(String username) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            User u = new User();
            u.setId(UUID.randomUUID().toString());
            u.setUsername(username);
            u.setDisplayName(username);
            u.setPasswordHash("auto");
            u.setPublicKey("KEY_" + username);
            u.setDiscoverable(true);
            u.setStrictPrivacy(false);
            return userRepository.save(u);
        });
    }
    @RequestMapping(value = {"/update-location", "/privacy"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updateLocationOrPrivacy(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        ChatController.markOnline(username);
        User u = getOrCreateUser(username);
        if (req.get("latitude") != null) {
            u.setLatitude(Double.valueOf(String.valueOf(req.get("latitude"))));
        }
        if (req.get("longitude") != null) {
            u.setLongitude(Double.valueOf(String.valueOf(req.get("longitude"))));
        }
        if (req.containsKey("discoverable")) {
            u.setDiscoverable(Boolean.parseBoolean(String.valueOf(req.get("discoverable"))));
        }
        if (req.containsKey("strictPrivacy")) {
            u.setStrictPrivacy(Boolean.parseBoolean(String.valueOf(req.get("strictPrivacy"))));
        }
        User saved = userRepository.save(u);
        return ResponseEntity.ok(saved);
    }
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyUserDTO>> getNearbyUsers(
            @RequestParam String username,
            @RequestParam(defaultValue = "28.4595") double lat,
            @RequestParam(defaultValue = "77.0266") double lon,
            @RequestParam(defaultValue = "50000") double radiusKm) {
        ChatController.markOnline(username);
        User me = getOrCreateUser(username.trim());
        me.setLatitude(lat);
        me.setLongitude(lon);
        userRepository.save(me);
        List<User> allUsers = userRepository.findAll();
        List<NearbyUserDTO> nearby = new ArrayList<>();
        for (User u : allUsers) {
            if (u.getUsername() == null || u.getUsername().equalsIgnoreCase(username.trim())) continue;
            if (!u.isDiscoverable()) continue;
            double uLat = u.getLatitude() != null ? u.getLatitude() : 28.4595;
            double uLon = u.getLongitude() != null ? u.getLongitude() : 77.0266;
            double dist = calculateDistanceKm(lat, lon, uLat, uLon);
            NearbyUserDTO dto = new NearbyUserDTO(
                u.getUsername(),
                u.getDisplayName() != null ? u.getDisplayName() : u.getUsername(),
                u.getPublicKey() != null ? u.getPublicKey() : "",
                Math.round(dist * 10.0) / 10.0,
                u.isStrictPrivacy()
            );
            nearby.add(dto);
        }
        return ResponseEntity.ok(nearby);
    }
    private double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}