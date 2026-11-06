import SockJS from "sockjs-client";
import Stomp from "stompjs";

let stompClient = null;

export function connectSocket(username, callbacks) {
  const socket = new SockJS("/ws");
  stompClient = Stomp.over(socket);
  stompClient.debug = null;

  stompClient.connect({}, () => {
    // 1. Messages
    stompClient.subscribe(`/topic/messages/${username}`, (frame) => {
      callbacks.onMessageReceived?.(JSON.parse(frame.body));
    });

    // 2. Typing
    stompClient.subscribe(`/topic/typing/${username}`, (frame) => {
      callbacks.onTypingReceived?.(JSON.parse(frame.body));
    });

    // 3. Friend Request Notifications
    stompClient.subscribe(`/topic/notifications/${username}`, (frame) => {
      callbacks.onNotificationReceived?.(JSON.parse(frame.body));
    });

    // 4. Online Presence Updates
    stompClient.subscribe("/topic/presence", (frame) => {
      callbacks.onPresenceUpdate?.(JSON.parse(frame.body));
    });

    // Announce current user is online
    stompClient.send(
      "/app/presence",
      {},
      JSON.stringify({ username, status: "ONLINE" }),
    );
  });

  window.addEventListener("beforeunload", () => {
    if (stompClient && stompClient.connected) {
      stompClient.send(
        "/app/presence",
        {},
        JSON.stringify({ username, status: "OFFLINE" }),
      );
    }
  });
}

export function sendEncryptedSocketMessage(payload) {
  if (stompClient && stompClient.connected) {
    stompClient.send("/app/chat.send", {}, JSON.stringify(payload));
  }
}

export function sendTypingStatus(senderUsername, receiverUsername, isTyping) {
  if (stompClient && stompClient.connected) {
    stompClient.send(
      "/app/chat.typing",
      {},
      JSON.stringify({ senderUsername, receiverUsername, isTyping }),
    );
  }
}
