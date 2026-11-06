package com.cipherchat.repository;
import com.cipherchat.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
public interface FriendshipRepository extends JpaRepository<Friendship, String> {
    @Query("SELECT f FROM Friendship f WHERE (LOWER(f.requesterUsername) = LOWER(:u1) AND LOWER(f.addresseeUsername) = LOWER(:u2)) OR (LOWER(f.requesterUsername) = LOWER(:u2) AND LOWER(f.addresseeUsername) = LOWER(:u1))")
    List<Friendship> findRelationsList(@Param("u1") String u1, @Param("u2") String u2);
    default Optional<Friendship> findRelation(String u1, String u2) {
        List<Friendship> list = findRelationsList(u1, u2);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
    @Query("SELECT f FROM Friendship f WHERE LOWER(f.requesterUsername) = LOWER(:username) OR LOWER(f.addresseeUsername) = LOWER(:username)")
    List<Friendship> findAllForUser(@Param("username") String username);
}