package com.cipherchat.model;
import jakarta.persistence.*;
import java.util.UUID;
@Entity
@Table(name = "friendships")
public class Friendship {
    @Id
    @Column(name = "id")
    private String id = UUID.randomUUID().toString();
    @Column(name = "requester_username", nullable = false)
    private String requesterUsername;
    @Column(name = "addressee_username", nullable = false)
    private String addresseeUsername;
    @Column(name = "status", nullable = false)
    private String status;
    @Column(name = "blocked_by")
    private String blockedBy;
    public Friendship() {}
    public Friendship(String requesterUsername, String addresseeUsername, String status) {
        this.id = UUID.randomUUID().toString();
        this.requesterUsername = requesterUsername;
        this.addresseeUsername = addresseeUsername;
        this.status = status;
    }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRequesterUsername() { return requesterUsername; }
    public void setRequesterUsername(String requesterUsername) { this.requesterUsername = requesterUsername; }
    public String getAddresseeUsername() { return addresseeUsername; }
    public void setAddresseeUsername(String addresseeUsername) { this.addresseeUsername = addresseeUsername; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getBlockedBy() { return blockedBy; }
    public void setBlockedBy(String blockedBy) { this.blockedBy = blockedBy; }
}