/* Escalia web push (FR-COM-02 BR-4). The message carries a title and a generic line only: no amounts, no addresses. */
self.addEventListener("push", (event) => {
  let message = { title: "Escalia", body: "" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // An unreadable payload still shows the generic title.
  }
  event.waitUntil(self.registration.showNotification(message.title, { body: message.body, icon: "/branding/icons/icon-192.png" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
