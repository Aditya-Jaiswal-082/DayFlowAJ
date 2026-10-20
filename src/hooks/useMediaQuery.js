import { useEffect, useState } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(query).matches === true,
  );

  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Phone-sized viewport — drives the bottom nav and single-column layouts. */
export const useIsMobile = () => useMediaQuery("(max-width: 700px)");
