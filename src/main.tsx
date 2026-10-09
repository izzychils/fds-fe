import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "@/App";
import "@/styles/globals.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root container #root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        className:
          "!rounded-2xl !border !border-white/50 !bg-white/85 !text-foreground !backdrop-blur-xl !shadow-xl",
      }}
    />
  </StrictMode>,
);

/**
 * PWA service worker.
 * Registered only in a production build: during development a service worker
 * would serve stale assets and fight Vite's HMR.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[Nma's Kitchen] Service worker registration failed:", error);
    });
  });
}
