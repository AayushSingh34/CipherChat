package com.cipherchat.model;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
@Entity
@Table(name = "chat_channels")
public class ChatChannel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String type; // "GROUP" or "COMMUNITY"
    private String description;
    private String createdBy;
    @Column(columnDefinition = "CLOB")
    private String avatar;
    @Column(columnDefinition = "boolean default false")
    private Boolean isPrivate = false;
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> members = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> pendingRequests = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> blockedUsers = new ArrayList<>();
    public ChatChannel() {}
    public ChatChannel(String name, String type, String description, String createdBy, boolean isPrivate, String avatar) {
        this.name = name;
        this.type = type;
        this.description = description;
        this.createdBy = createdBy;
        this.isPrivate = isPrivate;
        this.avatar = avatar;
        this.members.add(createdBy);
    }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public boolean isPrivate() { return Boolean.TRUE.equals(isPrivate); }
    public void setPrivate(Boolean aPrivate) { isPrivate = aPrivate != null ? aPrivate : false; }
    public List<String> getMembers() { return members; }
    public void setMembers(List<String> members) { this.members = members; }
    public List<String> getPendingRequests() { return pendingRequests; }
    public void setPendingRequests(List<String> pendingRequests) { this.pendingRequests = pendingRequests; }
    public List<String> getBlockedUsers() { return blockedUsers; }
    public void setBlockedUsers(List<String> blockedUsers) { this.blockedUsers = blockedUsers; }
}