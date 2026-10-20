/**
 * Vibration feedback, where the browser allows it (Android Chrome; iOS Safari
 * ignores it). Every call is a no-op rather than an error when unsupported, and
 * patterns stay under 40ms so nothing feels like an alarm.
 */

const PATTERNS = {
  tap: 8,
  toggle: [0, 10],
  success: [0, 12, 40, 18],
  warn: [0, 24, 30, 24],
};

export function haptic(kind = "tap") {
  try {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(PATTERNS[kind] ?? PATTERNS.tap);
  } catch {
    /* some browsers throw when the page isn't focused */
  }
}
