"use client";

import React, { useEffect, useState } from "react";

declare global {
  interface Window {
    __ENJUEGO_PWA_PROMPT__?: any;
    __ENJUEGO_TRIGGER_INSTALL__?: () => Promise<boolean>;
  }
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Silently register Service Worker in background
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => {
          // Service worker active and ready
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }

    // 2. Capture beforeinstallprompt cleanly without intrusive auto-popups
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__ENJUEGO_PWA_PROMPT__ = e;
      window.dispatchEvent(new CustomEvent("enjuego-pwa-available"));
    };

    window.__ENJUEGO_TRIGGER_INSTALL__ = async () => {
      const prompt = window.__ENJUEGO_PWA_PROMPT__;
      if (!prompt) return false;
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        window.__ENJUEGO_PWA_PROMPT__ = null;
        return true;
      }
      return false;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // No floating popup banners blocking user view
  return null;
}
