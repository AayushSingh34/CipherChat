package com.cipherchat.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String username;

    private String displayName;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String avatar;

    @Column(nullable = false)
    private String passwordHash;

    private String securityQuestion;
    private String securityAnswer;

    @Lob
    @Column(columnDefinition = "CLOB", nullable = false)
    private String publicKey;

    private Double latitude;
    private Double longitude;
    private boolean discoverable = true;
    private boolean strictPrivacy = false;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getDisplayName() { return displayName != null ? displayName : username; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getSecurityQuestion() { return securityQuestion; }
    public void setSecurityQuestion(String securityQuestion) { this.securityQuestion = securityQuestion; }
    public String getSecurityAnswer() { return securityAnswer; }
    public void setSecurityAnswer(String securityAnswer) { this.securityAnswer = securityAnswer; }
    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public boolean isDiscoverable() { return discoverable; }
    public void setDiscoverable(boolean discoverable) { this.discoverable = discoverable; }
    public boolean isStrictPrivacy() { return strictPrivacy; }
    public void setStrictPrivacy(boolean strictPrivacy) { this.strictPrivacy = strictPrivacy; }
}