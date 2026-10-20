import { useState, useEffect, useRef } from "react";
import { storage } from "../lib/storage.js";

/** useState that persists. Same API, including functional updates. */
export function useStorage(key, initial) {
  const [val, setVal] = useState(() => storage.readJSON(key, initial));
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;   // nothing has changed yet on mount
      return;
    }
    storage.writeJSON(key, val);
  }, [key, val]);

  return [val, setVal];
}
