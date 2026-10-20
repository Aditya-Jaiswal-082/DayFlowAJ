import { useEffect, useState } from "react";
import { useStorage } from "./useStorage.js";
import { STORAGE_KEYS, WEATHER_CODES } from "../lib/constants.js";

/**
 * Current conditions from Open-Meteo (no API key). The last reading is cached so
 * the header isn't empty on reload.
 *
 * @returns {{temp:number, desc:string}|null}
 */
export function useWeather() {
  const [weather, setWeather] = useStorage(STORAGE_KEYS.weather, null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return undefined;
    setDone(true);

    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;

    let cancelled = false;

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
          if (!current || cancelled) return;

          setWeather({
            temp: Math.round(current.temperature_2m),
            desc: WEATHER_CODES[current.weather_code] || "Clear",
          });
        } catch {
          /* keep the cached reading */
        }
      },
      () => { /* permission denied — header just omits weather */ },
      { timeout: 10000, maximumAge: 15 * 60 * 1000 },
    );

    return () => { cancelled = true; };
  }, [done, setWeather]);

  return weather;
}
