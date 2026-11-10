package com.cipherchat.controller;
import com.cipherchat.dto.NearbyUserDTO;
import com.cipherchat.model.User;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/discovery")
@SuppressWarnings({"rawtypes", "unchecked"})
public class DiscoveryController {
    private final UserRepository userRepository;
    public DiscoveryController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    @PostMapping("/update-location")
    public ResponseEntity<?> updateLocation(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        Double lat = req.get("latitude") != null ? Double.valueOf(String.valueOf(req.get("latitude"))) : 28.4595;
        Double lon = req.get("longitude") != null ? Double.valueOf(String.valueOf(req.get("longitude"))) : 77.0266;
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Please log out and register again"));
        User u = opt.get();
        u.setLatitude(lat);
        u.setLongitude(lon);
        if (req.containsKey("discoverable")) {
            u.setDiscoverable(Boolean.parseBoolean(String.valueOf(req.get("discoverable"))));
        }
        if (req.containsKey("strictPrivacy")) {
            u.setStrictPrivacy(Boolean.parseBoolean(String.valueOf(req.get("strictPrivacy"))));
        }
        userRepository.save(u);
        return ResponseEntity.ok(Map.of(
            "status", "UPDATED",
            "username", u.getUsername(),
            "discoverable", u.isDiscoverable(),
            "strictPrivacy", u.isStrictPrivacy()
        ));
    }
    @PostMapping("/privacy")
    public ResponseEntity<?> updatePrivacy(@RequestBody Map req) {
        String username = String.valueOf(req.get("username")).trim();
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Please log out and register again"));
        User u = opt.get();
        if (req.containsKey("discoverable")) {
            u.setDiscoverable(Boolean.parseBoolean(String.valueOf(req.get("discoverable"))));
        }
        if (req.containsKey("strictPrivacy")) {
            u.setStrictPrivacy(Boolean.parseBoolean(String.valueOf(req.get("strictPrivacy"))));
        }
        userRepository.save(u);
        return ResponseEntity.ok(Map.of(
            "status", "UPDATED",
            "username", u.getUsername(),
            "discoverable", u.isDiscoverable(),
            "strictPrivacy", u.isStrictPrivacy()
        ));
    }
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyUserDTO>> getNearbyUsers(
            @RequestParam String username,
            @RequestParam(defaultValue = "28.4595") double lat,
            @RequestParam(defaultValue = "77.0266") double lon,
            @RequestParam(defaultValue = "50000") double radiusKm) {
        userRepository.findByUsername(username).ifPresent(me -> {
            me.setLatitude(lat);
            me.setLongitude(lon);
            userRepository.save(me);
        });
        List<User> allUsers = userRepository.findAll();
        List<NearbyUserDTO> nearby = new ArrayList<>();
        for (User u : allUsers) {
            if (u.getUsername().equalsIgnoreCase(username)) continue;
            if (!u.isDiscoverable()) continue;
            double uLat = u.getLatitude() != null ? u.getLatitude() : 28.4595;
            double uLon = u.getLongitude() != null ? u.getLongitude() : 77.0266;
            double dist = calculateDistanceKm(lat, lon, uLat, uLon);
            NearbyUserDTO dto = new NearbyUserDTO(
                u.getUsername(),
                u.getDisplayName() != null ? u.getDisplayName() : u.getUsername(),
                u.getPublicKey(),
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