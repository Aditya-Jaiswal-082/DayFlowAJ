import { useCallback, useEffect, useRef, useState } from "react";
import { useStorage } from "./useStorage.js";
import { STORAGE_KEYS, WEATHER_CODES } from "../lib/constants.js";

/**
 * Current conditions from Open-Meteo (https://api.open-meteo.com — free, no
 * API key) for the coordinates your browser reports. Strictly opt-in.
 *
 * Nothing touches your location until you say yes. `pref` is null until you've
 * answered, "on" once you allow it, "declined" if you say no thanks (or turn it
 * off in Settings — that is always respected), "blocked" if the browser refused
 * (an older "off" counts as blocked). Tapping Allow asks
 * the browser directly (inside the tap, which browsers require), so its own
 * permission prompt appears. If the browser has *already* granted location to
 * this site there is nothing to ask, so it simply turns on.
 *
 * Failures are reported, not swallowed: a blocked permission, an insecure
 * (plain http) address — where browsers refuse location outright — or a
 * timeout each produce a message.
 */
export function useWeather() {
  const [data, setData] = useStorage(STORAGE_KEYS.weather, null);
  const [pref, setPref] = useStorage(STORAGE_KEYS.weatherPref, null);
  const [perm, setPerm] = useState("unknown");     // "granted" | "denied" | "prompt" | "unknown"
  const [status, setStatus] = useState("idle");    // "idle" | "loading" | "ok" | "error"
  const [error, setError] = useState(null);
  const started = useRef(false);

  // What the browser already says about location for this site.
  useEffect(() => {
    let result = null;
    let alive = true;
    navigator.permissions?.query({ name: "geolocation" }).then((r) => {
      if (!alive) return;
      result = r;
      setPerm(r.state);
      r.onchange = () => setPerm(r.state);
    }).catch(() => { /* not supported — stay "unknown" */ });
    return () => { alive = false; if (result) result.onchange = null; };
  }, []);

  const load = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError("This browser can’t share a location.");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setStatus("error");
      setError("Browsers only allow location on a secure (https) address — this one is plain http.");
      return;
    }

    setStatus("loading");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            "https://api.open-meteo.com/v1/forecast"
            + `?latitude=${coords.latitude}&longitude=${coords.longitude}`
            + "&current=temperature_2m,weather_code&timezone=auto",
          );
          if (!res.ok) throw new Error(`weather ${res.status}`);
          const { current } = await res.json();
          if (!current) throw new Error("no reading");
          setData({
            temp: Math.round(current.temperature_2m),
            desc: WEATHER_CODES[current.weather_code] || "Clear",
          });
          setStatus("ok");
        } catch {
          setStatus("error");
          setError("Couldn’t reach the weather service. Try again in a moment.");
        }
      },
      (err) => {
        setStatus("error");
        if (err.code === 1) {
          setPref("blocked");
          setError("Location is blocked for this site. Tap the 🔒 in the address bar, allow Location, then try again.");
        } else if (err.code === 3) {
          setError("Finding your location took too long. Try again.");
        } else {
          setError("Your device couldn’t work out a location.");
        }
      },
      { timeout: 12000, maximumAge: 15 * 60 * 1000 },
    );
  }, [setData, setPref]);

  // Only an explicit "no thanks" is final. Anything else (never asked, or a past
  // browser refusal) follows what the browser says now.
  const declined = pref === "declined";
  const unanswered = pref !== "on" && !declined;

  // Already allowed in the browser — including allowed by hand in site settings
  // after an earlier refusal → nothing to ask; just switch it on.
  useEffect(() => {
    if (unanswered && perm === "granted") setPref("on");
  }, [unanswered, perm, setPref]);

  // Refresh the reading on load when it's switched on (no prompt: it was granted before).
  useEffect(() => {
    if (pref === "on" && !started.current) {
      started.current = true;
      load();
    }
  }, [pref, load]);

  /** Call from a tap — the browser only shows its prompt inside a user gesture. */
  const enable = useCallback(() => {
    started.current = true;
    setPref("on");
    load();
  }, [load, setPref]);

  const disable = useCallback(() => {
    setPref("declined");
    setData(null);
    setStatus("idle");
    setError(null);
  }, [setData, setPref]);

  const dismissError = useCallback(() => { setError(null); setPref((p) => p ?? "declined"); }, [setPref]);

  /** True when it's worth showing the "show the weather?" question. */
  const askable = unanswered && perm !== "granted" && perm !== "denied";

  /** Not on, not declined, nothing to ask — worth a small "enable" nudge in the bar. */
  const nudge = unanswered && !askable;

  return { data, pref, perm, status, error, askable, nudge, enable, disable, dismissError };
}