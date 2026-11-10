package com.cipherchat.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "encrypted_messages")
public class EncryptedMessage {
    @Id
    private String id;
    @Column(name = "sender_username", nullable = false)
    private String senderUsername;
    @Column(name = "receiver_username", nullable = false)
    private String receiverUsername;
    @Column(name = "ciphertext", columnDefinition = "TEXT", nullable = false)
    private String ciphertext;
    @Column(name = "iv", nullable = false)
    private String iv;
    @Column(name = "message_type")
    private String messageType = "TEXT";
    @Column(name = "file_name")
    private String fileName;
    @Column(name = "timestamp")
    private LocalDateTime timestamp;
    public EncryptedMessage() {}
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
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}