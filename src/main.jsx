import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { runMigrations } from "./lib/schema.js";
import "./styles/global.css";

// Upgrade stored data before any component reads it.
runMigrations();

// Owns notifications (required on mobile Chrome) — caches nothing.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* not fatal */ });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
