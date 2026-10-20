/**
 * localStorage that cannot throw. Private-mode Safari and sandboxed iframes
 * make it unavailable, so we fall back to memory for the session.
 */

const memStore = new Map();

function ls() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* access itself can throw */
  }
  return null;
}

export const storage = {
  read(key) {
    const store = ls();
    if (store) {
      try {
        const raw = store.getItem(key);
        if (raw !== null) return raw;
      } catch { /* ignore */ }
    }
    return memStore.has(key) ? memStore.get(key) : null;
  },

  write(key, raw) {
    memStore.set(key, raw);
    const store = ls();
    if (store) {
      try { store.setItem(key, raw); } catch { /* quota or blocked */ }
    }
  },

  /** Bad JSON returns the fallback instead of throwing. */
  readJSON(key, fallback) {
    const raw = storage.read(key);
    if (raw === null) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  },

  writeJSON(key, value) {
    storage.write(key, JSON.stringify(value));
  },
};
