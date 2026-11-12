package com.cipherchat.repository;
import com.cipherchat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    List<User> findAllByUsernameIgnoreCase(@Param("username") String username);
    default Optional<User> findByUsername(String username) {
        if (username == null) return Optional.empty();
        List<User> list = findAllByUsernameIgnoreCase(username.trim());
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}