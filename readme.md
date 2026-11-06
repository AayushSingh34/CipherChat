# 🔒 CipherChat: Zero-Phone End-to-End Encrypted (E2EE) Chat System

CipherChat is a modern, privacy-first communication platform that operates without requiring phone numbers, SIM cards, or centralized identity linkage. Built with **Java Spring Boot**, **React (Vite)**, and **WebSockets**, it provides high-security peer-to-peer style messaging, group circles, and open communities with full client-side encryption and admin moderation workflows.

---

## 🌟 Key Features

* **Zero Phone Numbers / SIM Cards Required:** Instant username and secure passphrase registration.
* **True End-to-End Encryption (E2EE):** Messages, photos, and files are encrypted in-browser using **AES-256-GCM** before touching the server.
* **Voice Note Recording (`AUDIO`):** Built-in browser `MediaRecorder` API allowing instant recording, sending, and playback of voice messages across personal, group, and community chats.
* **Groups & Open Communities:** Support for public and private channels with admin approval workflows, member moderation, and block/unblock controls.
* **Live Presence & Typing Indicators:** Real-time online status tracking and typing notifications over STOMP WebSockets.
* **Custom Chat Wallpaper & Themes:** Personal theme customizer with system wallpaper upload support.
* **Message & File Deletion:** Ability to delete sent messages, files, photos, or voice notes for everyone in real time.
* **E2EE Key Backups:** Export and import local cryptographic identity keys as `.json` backups.

---

## ⚙️ System Architecture

CipherChat uses a decoupled full-stack architecture running inside a unified container:cipher-chat-project/
[React + Vite Frontend (SPA)]
│ (REST API & WebSocket / STOMP over /ws)
▼
[Spring Boot (v3.2.5) Backend Container]
│
├─► REST Controllers (Auth, Friends, Channels)
├─► WebSocket Message Broker (/topic/messages, /topic/presence)
└─► Embedded H2 Database (File-backed under /data/cipherchat_db)
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
