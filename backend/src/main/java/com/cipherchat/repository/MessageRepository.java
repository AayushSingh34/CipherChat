package com.cipherchat.repository;
import com.cipherchat.model.EncryptedMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface MessageRepository extends JpaRepository<EncryptedMessage, String> {
    @Query("SELECT m FROM EncryptedMessage m WHERE (m.senderUsername = :u1 AND m.receiverUsername = :u2) OR (m.senderUsername = :u2 AND m.receiverUsername = :u1) ORDER BY m.timestamp ASC")
    List<EncryptedMessage> findConversationHistory(@Param("u1") String u1, @Param("u2") String u2);
}
