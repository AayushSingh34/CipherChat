package com.cipherchat.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "encrypted_messages")
public class EncryptedMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String senderUsername;
    private String receiverUsername;

    @Column(columnDefinition = "CLOB", nullable = false)
    private String ciphertext; // Encrypted text or base64 file data

    @Column(nullable = false)
    private String iv;

    private String messageType; // "TEXT", "IMAGE", "FILE"
    private String fileName;

    private long timestamp;

    public EncryptedMessage() {
        this.timestamp = Instant.now().toEpochMilli();
        this.messageType = "TEXT";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
    public String getReceiverUsername() { return receiverUsername; }
    public void setReceiverUsername(String receiverUsername) { this.receiverUsername = receiverUsername; }
    public String getCiphertext() { return ciphertext; }
    public void setCiphertext(String ciphertext) { this.ciphertext = ciphertext; }
    public String getIv() { return iv; }
    public void setIv(String iv) { this.iv = iv; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}