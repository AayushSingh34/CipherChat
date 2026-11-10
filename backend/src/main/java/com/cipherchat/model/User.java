package com.cipherchat.model;
import jakarta.persistence.*;
import java.util.UUID;
@Entity
@Table(name = "users")
public class User {
    @Id
    private String id = UUID.randomUUID().toString();
    @Column(unique = true, nullable = false)
    private String username;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "public_key", columnDefinition = "TEXT", nullable = false)
    private String publicKey;
    @Column(name = "display_name")
    private String displayName;
    @Column(name = "avatar", columnDefinition = "TEXT")
    private String avatar;
    @Column(name = "latitude")
    private Double latitude = 28.4595;
    @Column(name = "longitude")
    private Double longitude = 77.0266;
    @Column(name = "discoverable")
    private Boolean discoverable = true;
    @Column(name = "strict_privacy")
    private Boolean strictPrivacy = false;
    @Column(name = "security_question")
    private String securityQuestion;
    @Column(name = "security_answer")
    private String securityAnswer;
    public User() {}
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
    public String getDisplayName() { return displayName != null ? displayName : username; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public Double getLatitude() { return latitude != null ? latitude : 28.4595; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude != null ? longitude : 77.0266; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public boolean isDiscoverable() { return discoverable == null ? true : discoverable; }
    public void setDiscoverable(Boolean discoverable) { this.discoverable = discoverable; }
    public boolean isStrictPrivacy() { return strictPrivacy != null && strictPrivacy; }
    public void setStrictPrivacy(Boolean strictPrivacy) { this.strictPrivacy = strictPrivacy; }
    public String getSecurityQuestion() { return securityQuestion; }
    public void setSecurityQuestion(String securityQuestion) { this.securityQuestion = securityQuestion; }
    public String getSecurityAnswer() { return securityAnswer; }
    public void setSecurityAnswer(String securityAnswer) { this.securityAnswer = securityAnswer; }
}