/**
 * Minimal service worker.
 *
 * Its only job is to own the notifications: on Android Chrome `new Notification()`
 * is blocked, and only registration.showNotification() works. Clicking a
 * notification focuses the existing tab instead of opening a duplicate.
 *
 * It deliberately does NOT cache anything — no stale-asset debugging.
 */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
