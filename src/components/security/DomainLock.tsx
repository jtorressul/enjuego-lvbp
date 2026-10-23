"use client";

import { useEffect } from "react";

const ALLOWED_HOSTS = new Set([
  "enjuego.online",
  "www.enjuego.online",
  "localhost",
  "127.0.0.1",
]);

export function DomainLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const currentHost = window.location.hostname.toLowerCase();

      // Allow local network IP testing (e.g. 192.168.x.x, 10.x.x.x)
      if (
        currentHost.startsWith("192.168.") ||
        currentHost.startsWith("10.") ||
        currentHost.endsWith(".local")
      ) {
        return;
      }

      // Check if domain is unauthorized (e.g. onfap.com, sungrams.com or arbitrary proxy)
      if (!ALLOWED_HOSTS.has(currentHost)) {
        console.warn(
          "[Security] Unauthorized host detected:",
          currentHost,
          "- Redirecting to official domain https://enjuego.online"
        );

        // Blank out page immediately to protect branding and views
        if (document.body) {
          document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#060a12;color:#ffffff;font-family:sans-serif;text-align:center;padding:20px;">
              <div>
                <h1 style="font-size:24px;font-weight:bold;margin-bottom:12px;">Redirigiendo a En Juego Oficial...</h1>
                <p style="color:#94a3b8;font-size:14px;">Estás accediendo a través de un dominio no autorizado. Te estamos transfiriendo al portal seguro:</p>
                <a href="https://enjuego.online" style="display:inline-block;margin-top:16px;background:#f59e0b;color:#000;padding:10px 20px;border-radius:12px;font-weight:bold;text-decoration:none;">Ir a enjuego.online</a>
              </div>
            </div>
          `;
        }

        const targetUrl = `https://enjuego.online${window.location.pathname}${window.location.search}`;

        // Break out of unauthorized iframes
        if (window.top && window.top !== window.self) {
          try {
            window.top.location.href = targetUrl;
            return;
          } catch {
            // cross-origin frame bust fallback
          }
        }

        window.location.replace(targetUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}
