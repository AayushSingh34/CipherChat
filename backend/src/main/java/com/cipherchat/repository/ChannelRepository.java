package com.cipherchat.repository;

import com.cipherchat.model.ChatChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChannelRepository extends JpaRepository<ChatChannel, String> {
    List<ChatChannel> findByType(String type);
}