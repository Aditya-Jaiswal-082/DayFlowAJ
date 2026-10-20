import { useEffect, useState } from "react";

const read = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Minutes since midnight, refreshed on an interval — drives "now" / "next up". */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNow(read()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}