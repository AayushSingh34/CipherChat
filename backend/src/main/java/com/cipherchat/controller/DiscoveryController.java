package com.cipherchat.controller;
import com.cipherchat.dto.NearbyUserDTO;
import com.cipherchat.model.User;
import com.cipherchat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
@RestController
@RequestMapping("/api/discovery")
public class DiscoveryController {
    private final UserRepository userRepository;
    public DiscoveryController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    @PostMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestBody Map<String, Object> req) {
        String username = (String) req.get("username");
        Double lat = ((Number) req.get("latitude")).doubleValue();
        Double lon = ((Number) req.get("longitude")).doubleValue();
        User user = userRepository.findByUsername(username).orElseThrow();
        user.setLatitude(lat);
        user.setLongitude(lon);
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("status", "Location updated"));
    }
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyUserDTO>> getNearbyUsers(
            @RequestParam String username,
            @RequestParam(defaultValue = "10.0") double radiusKm) {
        User current = userRepository.findByUsername(username).orElseThrow();
        if (current.getLatitude() == null || current.getLongitude() == null) {
            return ResponseEntity.ok(List.of());
        }
        List<NearbyUserDTO> nearby = userRepository.findAll().stream()
                .filter(u -> !u.getUsername().equals(username))
                .filter(User::isDiscoverable)
                .filter(u -> u.getLatitude() != null && u.getLongitude() != null)
                .map(u -> {
                    double dist = haversine(current.getLatitude(), current.getLongitude(), u.getLatitude(), u.getLongitude());
                    return new NearbyUserDTO(u.getUsername(), u.getPublicKey(), dist, u.isStrictPrivacy());
                })
                .filter(dto -> dto.getDistanceKm() <= radiusKm)
                .collect(Collectors.toList());
        return ResponseEntity.ok(nearby);
    }
    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
