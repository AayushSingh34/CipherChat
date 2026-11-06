cipher-chat-project/
├── README.md
├── docker-compose.yml                  # PostgreSQL + PostGIS & Redis containers
│
├── backend/                            # Java Spring Boot Backend
│   ├── pom.xml                         # Maven dependencies (WebSocket, Security, JPA, Spatial)
│   └── src/main/
│       ├── java/com/cipherchat/
│       │   ├── CipherChatApplication.java
│       │   ├── config/
│       │   │   ├── SecurityConfig.java         # JWT & zero-phone auth filters
│       │   │   ├── WebSocketConfig.java        # STOMP over WebSocket configuration
│       │   │   └── CorsConfig.java             # Cross-origin rules for React client
│       │   ├── controller/
│       │   │   ├── AuthController.java         # Username/Key-pair registration & login
│       │   │   ├── ChatController.java         # WebSocket message routing & history API
│       │   │   ├── FriendController.java       # Add, accept, block, & list friends
│       │   │   └── DiscoveryController.java    # Neighborhood geospatial radar endpoints
│       │   ├── model/
│       │   │   ├── User.java                   # UUID, username, PublicKey, PrivacyFlags, GeoPoint
│       │   │   ├── Friendship.java             # Requester, Addressee, Status (PENDING/ACCEPTED)
│       │   │   └── EncryptedMessage.java       # Sender, Receiver, Ciphertext, IV, Timestamp
│       │   ├── repository/
│       │   │   ├── UserRepository.java         # Includes PostGIS spatial radius queries
│       │   │   ├── FriendshipRepository.java
│       │   │   └── MessageRepository.java      # Paginated chat history queries
│       │   ├── service/
│       │   │   ├── AuthService.java            # Token generation & public key storage
│       │   │   ├── ChatService.java            # Stores ciphertext blobs & triggers push
│       │   │   ├── FriendService.java          # Manages social graph & privacy permissions
│       │   │   └── GeoDiscoveryService.java    # Calculates nearby users with fuzzy distance
│       │   └── dto/
│       │       ├── AuthRequestDTO.java
│       │       ├── ChatMessageDTO.java         # Carries encrypted payload + IV
│       │       └── NearbyUserDTO.java          # Returns username & approximate distance only
│       └── resources/
│           └── application.yml                 # DB connection, JWT secret, WebSocket paths
│
└── frontend/                           # React + Vite + Tailwind CSS Frontend
    ├── package.json                    # Node dependencies (sockjs-client, stompjs, lucide-react)
    ├── vite.config.js                  # Vite bundler config
    ├── tailwind.config.js              # Utility-first styling setup
    ├── index.html                      # Entry HTML file
    └── src/
        ├── main.jsx                    # React DOM root mount
        ├── App.jsx                     # Main router & layout wrapper
        ├── index.css                   # Global CSS & Tailwind imports
        ├── crypto/                     # Client-Side End-to-End Encryption (E2EE)
        │   ├── keyManager.js           # Generates ECDH/RSA key-pairs; stores Private Key in IndexedDB
        │   └── cipherEngine.js         # Encrypts/decrypts messages via AES-GCM before network send
        ├── services/
        │   ├── api.js                  # Axios instance with JWT interceptor
        │   ├── socketService.js        # STOMP WebSocket client connection & subscriptions
        │   └── geoService.js           # Browser Geolocation API wrapper
        ├── context/
        │   ├── AuthContext.jsx         # Holds session state & active cryptographic keys
        │   └── ChatContext.jsx         # Manages active chat rooms, unread counts, & history
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx         # Navigation between Chats, Radar, and Privacy Settings
        │   │   └── Header.jsx          # Active chat partner status & E2EE verification badge
        │   ├── chat/
        │   │   ├── ChatWindow.jsx      # Scrollable message stream (loads persisted history)
        │   │   ├── MessageBubble.jsx   # Decrypts ciphertext on-the-fly and renders text
        │   │   └── MessageInput.jsx    # Input bar that encrypts text prior to WebSocket emit
        │   ├── discovery/
        │   │   ├── RadarView.jsx       # Interactive UI showing discoverable users in the neighborhood
        │   │   └── UserCard.jsx        # Displays nearby user profile with "Add Friend" action
        │   └── privacy/
        │       └── PrivacyToggle.jsx   # Controls Ghost Mode, Discovery Radius, and Direct Message rules
        └── pages/
            ├── AuthPage.jsx            # Zero-phone signup (Username + local Key-Pair generation)
            ├── DashboardPage.jsx       # Main split-pane chat & discovery workspace
            └── SettingsPage.jsx        # Key backup/export & privacy configuration