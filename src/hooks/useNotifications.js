import { useCallback, useMemo, useState } from "react";

const supported = () => typeof window !== "undefined" && "Notification" in window;

/**
 * System notifications.
 *
 * Honest about its limits: a notification can only be raised while the page is
 * running. Reminders that come due while the app is closed are delivered the
 * next time you open it (see useReminders). Alerts with the app fully closed
 * would need Web Push and a server.
 */
export function useNotifications() {
  const [permission, setPermission] = useState(() =>
    (supported() ? Notification.permission : "unsupported"));

  const request = useCallback(async () => {
    if (!supported()) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return "denied";
    }
  }, []);

  const notify = useCallback(async ({ title, body, tag }) => {
    if (!supported() || Notification.permission !== "granted") return false;
    try {
      // Prefer the service worker: on mobile Chrome it's the only thing allowed.
      const reg = await navigator.serviceWorker?.getRegistration?.();
      if (reg?.showNotification) {
        await reg.showNotification(title, { body, tag, badge: undefined, requireInteraction: false });
      } else {
        new Notification(title, { body, tag });
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return useMemo(() => ({
    permission,
    supported: permission !== "unsupported",
    granted: permission === "granted",
    request,
    notify,
  }), [permission, request, notify]);
}
