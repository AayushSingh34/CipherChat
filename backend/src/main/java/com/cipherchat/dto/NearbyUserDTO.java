package com.cipherchat.dto;
public class NearbyUserDTO {
    private String username;
    private String publicKey;
    private double distanceKm;
    private boolean strictPrivacy;
    public NearbyUserDTO(String username, String publicKey, double distanceKm, boolean strictPrivacy) {
        this.username = username;
        this.publicKey = publicKey;
        this.distanceKm = Math.round(distanceKm * 100.0) / 100.0;
        this.strictPrivacy = strictPrivacy;
    }
    public String getUsername() { return username; }
    public String getPublicKey() { return publicKey; }
    public double getDistanceKm() { return distanceKm; }
    public boolean isStrictPrivacy() { return strictPrivacy; }
}
