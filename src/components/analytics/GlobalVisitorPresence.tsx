"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getHeartbeatClientPayloadSync } from "@/lib/client-device-hints";

export function GlobalVisitorPresence() {
  const pathname = usePathname();
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Do not track the admin dashboard itself as a public visitor
    if (pathname?.startsWith("/admin")) return;

    let sessionId = window.sessionStorage.getItem("enjuego_live_sid");
    if (!sessionId) {
      sessionId = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      window.sessionStorage.setItem("enjuego_live_sid", sessionId);
    }

    const sendHeartbeat = () => {
      if (typeof document !== "undefined" && document.hidden) return;

      const client = getHeartbeatClientPayloadSync();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      let sectionLabel = "Inicio";
      if (!pathname || pathname === "/" || pathname === "/inicio") sectionLabel = "Inicio";
      else if (pathname.startsWith("/noticias")) sectionLabel = "Noticias";
      else if (pathname.startsWith("/futbol")) sectionLabel = "Fútbol";
      else if (pathname.startsWith("/posiciones")) sectionLabel = "Posiciones";
      else if (pathname.startsWith("/resultados")) sectionLabel = "Resultados";
      else if (pathname.startsWith("/calendario")) sectionLabel = "Calendario";
      else if (pathname.startsWith("/lideres")) sectionLabel = "Líderes";
      else if (pathname.startsWith("/juego")) sectionLabel = "Gameday";
      else if (pathname.startsWith("/equipos") || pathname.startsWith("/teams")) sectionLabel = "Equipos";

      // Read optional logged in user info from storage if available
      let userId: string | undefined;
      let userName: string | undefined;
      let userHandle: string | undefined;
      let favoriteTeam: string | undefined;
      try {
        const storedUser = localStorage.getItem("enjuego_user");
        if (storedUser) {
          const u = JSON.parse(storedUser);
          userId = u.id;
          userName = u.name;
          userHandle = u.handle;
          favoriteTeam = u.favoriteTeam;
        }
      } catch {
        // ignore
      }

      fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          sessionId,
          userId,
          userName: userName || "Visitante",
          userHandle,
          favoriteTeam,
          isRegistered: Boolean(userId),
          path: window.location.pathname + window.location.search,
          sectionLabel,
          timeZone,
          client,
        }),
      }).catch(() => {});
    };

    // Send heartbeat immediately on initial mount or route navigation
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname || "";
      const timer = setTimeout(sendHeartbeat, 600);
      return () => clearTimeout(timer);
    }

    // Keepalive ping every 90 seconds while tab is active
    const interval = setInterval(sendHeartbeat, 90_000);
    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
