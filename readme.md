# 🔒 CipherChat: Zero-Phone End-to-End Encrypted (E2EE) Chat System

CipherChat is a modern, privacy-first communication platform that operates without requiring phone numbers, SIM cards, or centralized identity linkage. Built with **Java Spring Boot**, **React (Vite)**, and **WebSockets**, it provides high-security peer-to-peer style messaging, group circles, and open communities with full client-side encryption and admin moderation workflows.

## Core Features

* **Zero-Phone-Number Onboarding:** Strict registration and login using a unique username, passphrase, and optional custom security question/answer for account recovery.
* **Client-Side End-to-End Encryption (E2EE):** Uses the browser's **Web Crypto API (ECDH + AES-256-GCM)** to derive shared secrets locally. Private keys never leave the user's device; public keys sync automatically on login.
* **Encrypted Node Explorer (GPS Radar):** Discovers nearby users using the browser's Geolocation API and calculates real-world distances on the backend using the **Haversine formula**.
* **Radar Visible vs. Ghost Mode:**
  * **Radar Visible:** Your profile and approximate distance appear on nearby users' Radar.
  * **Ghost Mode:** Immediately hides your profile from everyone else's Radar while keeping existing friend chats active.
* **Open DMs vs. Friends Only:**
  * **Open DMs:** Anyone who finds you on Radar can message you immediately. Incoming non-friend chats appear in the recipient's sidebar with an **Open DM banner** and a one-click **Send Friend Request** button.
  * **Friends Only:** Blocks unsolicited DMs; users must send a friend request and wait for acceptance.
* **Granular Message Deletion:**
  * **Delete for Me:** Hides a message permanently from your own view while leaving it intact for the other participant.
  * **Delete for Everyone:** Permanently removes the message from PostgreSQL and broadcasts a deletion event to all screens.
* **Moderation & Privacy Controls:** One-click **Unfriend**, **Block / Unblock** (with a dedicated Blocked Users tab), and **Groups & Communities** with join approvals, member removal/blocking, and **Admin Delete**.
* **Rich Media & Customization:** Supports encrypted text, images, file attachments, voice notes, typing indicators, live online presence, profile photo/display name updates, and custom chat wallpapers/themes.
* **Accurate Local Timezones:** All message timestamps are stored in ISO-8601 UTC on the server and automatically converted to the viewer's local device clock.

---

## System Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. AUTH & KEY GENERATION (Browser)                                      │
│    Register/Login ──► Web Crypto API generates ECDH Keypair             │
│    • Private Key stays in Browser Storage                               │
│    • Public Key sent to POST /api/auth/register or /api/auth/login      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. DISCOVERY & PRESENCE (Real-Time + 3s Polling)                        │
│    • STOMP WebSocket connects + 3s HTTP heartbeat updates online status │
│    • GPS coordinates sent to GET /api/discovery/nearby (Haversine)      │
│    • Ghost Mode (discoverable=false) strictly excluded from results     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. END-TO-END ENCRYPTED MESSAGING                                       │
│    [Sender Browser]                                                     │
│      Derives AES-256-GCM key (Sender PrivKey + Receiver PubKey)         │
│      Encrypts message with random IV ──► POST /api/chat/send            │
│                                                                         │
│    [Spring Boot Backend + Neon PostgreSQL]                              │
│      Saves { ciphertext, iv, UTC timestamp } (Server sees NO plaintext) │
│      Broadcasts via STOMP WebSocket to /topic/chat/{receiver}           │
│                                                                         │
│    [Receiver Browser]                                                   │
│      Derives identical AES key (Receiver PrivKey + Sender PubKey)       │
│      Decrypts locally & converts UTC timestamp to local device time     │
└─────────────────────────────────────────────────────────────────────────┘
```
## Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Single-page application (SPA) UI and fast development/production bundling. |
| **Styling & Icons** | Tailwind CSS, Lucide React | Responsive dark-mode UI, custom chat themes/wallpapers, and vector icons. |
| **HTTP Client** | Axios | REST API communication for authentication, profiles, friendships, and chat fallback. |
| **Backend** | Java 17, Spring Boot 3, Maven | RESTful APIs (`/api/auth`, `/api/chat`, `/api/friends`, `/api/discovery`, `/api/channels`) and core business logic. |
| **Real-Time Messaging** | STOMP over WebSockets + HTTP Polling | Instant message delivery, typing indicators, and live presence with automatic HTTP fallback. |
| **Cryptography (E2EE)** | Web Crypto API (ECDH + AES-256-GCM) | Client-side asymmetric keypair generation, shared secret derivation, and authenticated message encryption. |
| **Database** | PostgreSQL (Neon Serverless) | Cloud-hosted relational database storing users, encrypted ciphertexts, friendships, and channels over SSL. |
| **Data Access** | Spring Data JPA (Hibernate) + `JdbcTemplate` | ORM entity management combined with lightweight native SQL (`SELECT DISTINCT`) for low-memory queries. |
| **Location & Radar** | Browser Geolocation API + Haversine Formula | Captures GPS coordinates on the client and calculates real-world distances on the backend. |
| **Deployment & DevOps** | Docker (Multi-Stage) + Render | Builds React into static assets, packages the Spring Boot JAR, and runs in a memory-tuned JVM (`-Xmx320m -XX:+UseSerialGC`). |

## 📂 Project Structure

```text
Numberless fully - encrypted - based Chat system/
├── backend/
│   ├── src/main/java/com/cipherchat/
│   │   ├── config/          # WebSocket, CORS, and Security configurations
│   │   ├── controller/      # Auth, Chat, Channel, and Friend REST/WS controllers
│   │   ├── model/           # JPA Entities (User, Friendship, ChatChannel, EncryptedMessage)
│   │   └── repository/      # Spring Data JPA Repositories
│   └── pom.xml              # Maven build configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # ChatWindow, RadarView, and UI layouts
│   │   ├── crypto/          # WebCrypto AES-256-GCM cipher engine
│   │   ├── services/        # Axios API and STOMP WebSocket client services
│   │   ├── App.jsx          # Main application router and state manager
│   │   └── main.jsx         # React entry point with ErrorBoundary
│   └── vite.config.js       # Vite build & proxy configurations
├── Dockerfile               # Multi-stage production container build
└── README.md                # Project documentation
```
🔄 Project Workflow
Authentication: User registers a username and passphrase. The browser generates local cryptographic identity keys via the WebCrypto API.

Discovery & Connection: Users can toggle radar visibility to discover nearby encrypted nodes or add friends directly via username.

E2EE Messaging:

Personal DMs: Messages are encrypted locally using a shared secret derived from recipient public keys before transmission.

Channels (Groups/Communities): Messages are broadcast securely to all active channel members.

Real-time Delivery: STOMP WebSockets instantly route messages, typing statuses, and presence updates to connected clients.

🚀 Getting Started & Instructions to Use
Prerequisites
Java 21 (or compatible JDK)

Node.js (v18+) and npm

Maven (Included via wrapper or local installation)
Local Development Setup
1. Start the Backend Server
Open a terminal in the backend folder and run:

PowerShell
.\apache-maven-3.9.6\bin\mvn.cmd clean spring-boot:run
(The Spring Boot server will start on port 8080 with an embedded file-backed H2 database).

2. Start the Frontend Development Server
Open a second terminal in the frontend folder and run:

PowerShell
npm install
npm run dev
(Vite will spin up the frontend on http://localhost:5173 with automatic API and WebSocket proxying).

3. Open in Browser
Navigate to http://localhost:5173 in your browser, register two separate user accounts (e.g., in two separate browser windows/incognito), add each other as friends, and start chatting securely!
