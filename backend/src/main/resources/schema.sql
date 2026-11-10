CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    public_key TEXT,
    display_name VARCHAR(255),
    avatar TEXT,
    security_question VARCHAR(255),
    security_answer VARCHAR(255),
    discoverable BOOLEAN DEFAULT TRUE,
    strict_privacy BOOLEAN DEFAULT FALSE,
    latitude DOUBLE PRECISION DEFAULT 28.4595,
    longitude DOUBLE PRECISION DEFAULT 77.0266
);
CREATE TABLE IF NOT EXISTS friendships (
    id VARCHAR(255) PRIMARY KEY,
    requester_username VARCHAR(255) NOT NULL,
    addressee_username VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    blocked_by VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS encrypted_messages (
    id VARCHAR(255) PRIMARY KEY,
    sender_username VARCHAR(255) NOT NULL,
    receiver_username VARCHAR(255) NOT NULL,
    ciphertext TEXT NOT NULL,
    iv VARCHAR(255) NOT NULL,
    message_type VARCHAR(255) DEFAULT 'TEXT',
    file_name VARCHAR(255),
    timestamp TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chat_channels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    created_by VARCHAR(255),
    avatar TEXT,
    is_private BOOLEAN DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS chat_channel_members (
    chat_channel_id VARCHAR(255) NOT NULL,
    members VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS chat_channel_pending_requests (
    chat_channel_id VARCHAR(255) NOT NULL,
    pending_requests VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS chat_channel_blocked_users (
    chat_channel_id VARCHAR(255) NOT NULL,
    blocked_users VARCHAR(255)
);