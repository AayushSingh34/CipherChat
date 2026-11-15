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
## 🛠️ Technology Stack

![React](https://shields.io)
![Vite](https://shields.io)
![Tailwind CSS](https://shields.io)
![Java 17](https://shields.io)
![Spring Boot 3](https://shields.io)
![PostgreSQL](https://shields.io)
![Docker](https://shields.io)

| Layer | Technologies | Architectural Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide, Axios | Responsive dark-mode SPA with custom chat themes, fast bundling, and REST client integration. |
| **Backend** | Java 17, Spring Boot 3, Maven | Modular REST APIs (`/auth`, `/chat`, `/friends`, `/discovery`, `/channels`) and core business logic. |
| **Real-Time Engine** | STOMP over WebSockets + HTTP Polling | Instant message delivery, typing indicators, and live presence with automatic HTTP fallback. |
| **End-to-End Encryption** | Web Crypto API (`ECDH` + `AES-256-GCM`) | Client-side asymmetric keypair generation, shared secret derivation, and authenticated encryption. |
| **Database & Persistence** | PostgreSQL (Neon), Spring Data JPA, `JdbcTemplate` | SSL cloud persistence combining ORM entity management with lightweight native SQL for low-memory queries. |
| **Location & Radar** | Browser Geolocation API + Haversine Formula | Client-side GPS capture paired with server-side spherical distance calculation for nearby discovery. |
| **DevOps & Deployment** | Multi-Stage Docker, Render | Bundles React into the Spring Boot JAR and runs in a memory-constrained JVM (`-Xmx320m -XX:+UseSerialGC`). |


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
## 🚀 How to Use CipherChat

Follow this quick guide to get started with **CipherChat**—no phone number or email required.

---

### 1. 🔐 Create Your Anonymous Identity
1. Open the application and switch to the **Register** tab.
2. Enter a unique **Username** and a strong **Passphrase**.
3. *(Optional)* Add a custom **Security Question & Answer** so you can recover your account later without a phone number.
4. Click **Register**. Your browser automatically generates a local **ECDH / AES-256-GCM** encryption keypair—your private key never leaves your device.

> **Note:** Returning users must log in with their registered credentials. Unregistered usernames or incorrect passphrases are blocked with an on-screen alert.

---

### 2. 🛡️ Configure Your Privacy Controls
Right from the left sidebar, toggle two real-time privacy switches anytime:

| Control | Mode A | Mode B |
| :--- | :--- | :--- |
| **Visibility** | **👁️ Radar Visible** — Appear on nearby users' GPS Radar with approximate distance. | **👻 Ghost Mode** — Instantly hide your profile from everyone's Radar. |
| **Messaging** | **🌐 Open DMs** — Anyone who finds you on Radar can message you immediately. | **🔒 Friends Only** — Strangers must send a friend request and wait for acceptance. |

---

### 3. 🧭 Discover People, Groups & Communities
* **GPS Radar (Compass Icon):** Click the **Compass** icon to open the **Encrypted Node Explorer**. Allow location access to scan nearby discoverable users (with live distance) and browse public **Groups & Communities**.
* **Direct Search:** Use the **Search friend by username...** bar in the sidebar to locate a specific user and send a friend request.
* **Create a Space:** Switch to the **Groups** or **Communities** tab in the sidebar to create your own public or private channel.

---

### 4. 💬 Start Encrypted Conversations
* **Direct Messages:** Click any accepted friend in your **Personal** list to chat.
* **Open DM Threads:** If you message an **Open DM** user from Radar without being friends, the chat opens immediately for both users with an **Open DM banner** and a one-click **Send Friend Request** button.
* **Rich Media:** Send encrypted text, images, file attachments, and voice notes directly from the chat input bar.
* **Message Deletion:** Hover over any message and click the **Trash (🗑️)** icon to choose:
  * **Delete for Me** — Removes the message from your screen only.
  * **Delete for Everyone** — Permanently erases the message for all participants.

---

### 5. ⚙️ Manage Contacts, Groups & Profile
* **Unfriend or Block:** Open any DM, click the top-right **`⋮`** menu, and select **Unfriend** or **Block User**. Blocked contacts are moved to the **Blocked List (🛡️)** tab, where you can unblock them anytime.
* **Group Admin Controls:** Group and Community creators can approve/reject join requests, edit channel details, remove/block members, or permanently **Delete** the channel.
* **Profile & Themes:** Click the bottom-left **Settings (⚙️)** button to update your **Display Name**, upload a **Profile Picture**, or switch your **Chat Wallpaper & Theme**.

## ⚡ Quick Start (Run Locally)

### Prerequisites
Make sure you have the following installed:
* **Java 17+** & **Maven 3.9+**
* **Node.js 18+** & **npm**
* A **PostgreSQL** database (e.g., [Neon](https://neon.tech/) free tier or local PostgreSQL)

---

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd "Numberless fully - encrypted - based Chat system"
```

### 2. Configure Database Credentials
Set your PostgreSQL connection details in backend/src/main/resources/application.properties (or export them as environment variables):
```bash
spring.datasource.url=jdbc:postgresql://<your-neon-host>/<dbname>?sslmode=require
spring.datasource.username=<your-db-username>
spring.datasource.password=<your-db-password>
```
### 3. Start the Backend (Spring Boot)
Open a terminal in the project root:
```bash
cd backend
mvn clean spring-boot:run
```
> [!IMPORTANT]
> Backend runs at.. `http://localhost:8080`

### 4. Start the Frontend (React + Vite)

Open a **second terminal** in the project root:

```bash
cd frontend
npm install
npm run dev
```
> [!TIP]
> Frontend runs at `http://localhost:5173` — open this URL in your browser to start chatting!

### 🐳 Run with Docker (Single Command)
If you have **Docker** installed, you can build and run the entire full-stack app (Frontend + Backend combined) in one container:
```bash
# 1. Build the image
docker build -t cipherchat .

# 2. Run the container
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://<your-neon-host>/<dbname>?sslmode=require" \
  -e SPRING_DATASOURCE_USERNAME="<your-db-username>" \
  -e SPRING_DATASOURCE_PASSWORD="<your-db-password>" \
  cipherchat
```
> [!NOTE]
> Access the full app at `http://localhost:8080`

