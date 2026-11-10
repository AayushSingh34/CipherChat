package com.cipherchat.dto;
public class NearbyUserDTO {
    private String username;
    private String displayName;
    private String publicKey;
    private double distanceKm;
    private boolean strictPrivacy;
    public NearbyUserDTO() {}
    public NearbyUserDTO(String username, String displayName, String publicKey, double distanceKm, boolean strictPrivacy) {
        this.username = username;
        this.displayName = displayName;
        this.publicKey = publicKey;
        this.distanceKm = distanceKm;
        this.strictPrivacy = strictPrivacy;
    }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double distanceKm) { this.distanceKm = distanceKm; }
    public boolean isStrictPrivacy() { return strictPrivacy; }
    public void setStrictPrivacy(boolean strictPrivacy) { this.strictPrivacy = strictPrivacy; }
}