package com.cipherchat.model;

import jakarta.persistence.*;

@Entity
@Table(name = "friendships")
public class Friendship {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String requesterUsername;
    private String addresseeUsername;
    private String status; // "PENDING", "ACCEPTED", "BLOCKED"
    private String blockedBy; // Stores who initiated the block

    public Friendship() {}

    public Friendship(String requesterUsername, String addresseeUsername, String status) {
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