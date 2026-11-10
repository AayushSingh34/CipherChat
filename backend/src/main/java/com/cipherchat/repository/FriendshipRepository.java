package com.cipherchat.repository;
import com.cipherchat.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, String> {
    @Query("SELECT f FROM Friendship f WHERE (f.requesterUsername = :u1 AND f.addresseeUsername = :u2) OR (f.requesterUsername = :u2 AND f.addresseeUsername = :u1)")
    Optional<Friendship> findRelation(@Param("u1") String u1, @Param("u2") String u2);
    @Query("SELECT f FROM Friendship f WHERE f.requesterUsername = :username OR f.addresseeUsername = :username")
    List<Friendship> findAllForUser(@Param("username") String username);
}