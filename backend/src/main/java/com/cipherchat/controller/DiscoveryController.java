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
            return userRepository.saveAndFlush(u);
        });
    }
    @RequestMapping(value = {"/update-location", "/privacy"}, method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<?> updateLocationOrPrivacy(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        ChatController.markOnline(username);
        List<User> matchingUsers = userRepository.findAllByUsernameIgnoreCase(username);
        if (matchingUsers.isEmpty()) {
            matchingUsers = List.of(getOrCreateUser(username));
        }
        User primary = null;
        for (User u : matchingUsers) {
            if (req.get("latitude") != null) {
                double lat = Double.parseDouble(String.valueOf(req.get("latitude")));
                if (lat != 0.0) u.setLatitude(lat);
            }
            if (req.get("longitude") != null) {
                double lon = Double.parseDouble(String.valueOf(req.get("longitude")));
                if (lon != 0.0) u.setLongitude(lon);
            }
            if (req.containsKey("discoverable")) {
                u.setDiscoverable(Boolean.parseBoolean(String.valueOf(req.get("discoverable"))));
            }
            if (req.containsKey("strictPrivacy")) {
                u.setStrictPrivacy(Boolean.parseBoolean(String.valueOf(req.get("strictPrivacy"))));
            }
            primary = userRepository.saveAndFlush(u);
        }
        return ResponseEntity.ok(primary);
    }
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyUserDTO>> getNearbyUsers(
            @RequestParam String username,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(defaultValue = "50000") double radiusKm) {
        String cleanCaller = username.trim();
        ChatController.markOnline(cleanCaller);
        User me = getOrCreateUser(cleanCaller);
        if (lat != null && lon != null && (lat != 0.0 || lon != 0.0)) {
            me.setLatitude(lat);
            me.setLongitude(lon);
            userRepository.saveAndFlush(me);
        }
        double myLat = me.getLatitude() != null ? me.getLatitude() : 28.4595;
        double myLon = me.getLongitude() != null ? me.getLongitude() : 77.0266;
        List<User> allUsers = userRepository.findAll();
        Map<String, NearbyUserDTO> dedupedMap = new LinkedHashMap<>();
        // First collect any user who turned Ghost Mode OFF (discoverable == false) so duplicate rows can never leak them
        Set<String> ghostUsers = new HashSet<>();
        for (User u : allUsers) {
            if (u.getUsername() != null && !u.isDiscoverable()) {
                ghostUsers.add(u.getUsername().trim().toLowerCase());
            }
        }
        for (User u : allUsers) {
            if (u.getUsername() == null) continue;
            String key = u.getUsername().trim().toLowerCase();
            if (key.equals(cleanCaller.toLowerCase())) continue;
            if (!u.isDiscoverable() || ghostUsers.contains(key)) continue;
            double uLat = u.getLatitude() != null ? u.getLatitude() : myLat;
            double uLon = u.getLongitude() != null ? u.getLongitude() : myLon;
            double dist = calculateDistanceKm(myLat, myLon, uLat, uLon);
            NearbyUserDTO dto = new NearbyUserDTO(
                u.getUsername(),
                (u.getDisplayName() != null && !u.getDisplayName().isBlank()) ? u.getDisplayName() : u.getUsername(),
                u.getPublicKey() != null ? u.getPublicKey() : "",
                Math.round(dist * 100.0) / 100.0,
                u.isStrictPrivacy()
            );
            dedupedMap.put(key, dto);
        }
        return ResponseEntity.ok(new ArrayList<>(dedupedMap.values()));
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