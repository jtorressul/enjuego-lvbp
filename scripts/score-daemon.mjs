#!/usr/bin/env node
/**
 * EnJuego Background Score & Notification Daemon
 * Runs continuously under PM2 to check live LVBP games, warm the cache,
 * and dispatch instant Web Push notifications to fans even when the website is idle.
 */

const CHECK_INTERVAL_MS = 35_000; // 35 seconds
const LOCAL_SCHEDULE_URL = "http://127.0.0.1:3000/api/lvbp/schedule";

console.log("[ScoreDaemon] Starting EnJuego Background Notification Daemon...");

async function checkLiveGames() {
  const nowStr = new Date().toISOString();
  try {
    const res = await fetch(LOCAL_SCHEDULE_URL, {
      headers: {
        "User-Agent": "EnJuego-ScoreDaemon/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[ScoreDaemon] ${nowStr} - Schedule returned HTTP ${res.status}`);
      return;
    }

    const data = await res.json();
    const games = Array.isArray(data?.games) ? data.games : [];
    const liveGames = games.filter(
      (g) => g.status === "IN_PROGRESS" || g.status === "LIVE"
    );

    console.log(
      `[ScoreDaemon] ${nowStr} - Polled ${games.length} total games (${liveGames.length} active live).`
    );
  } catch (err) {
    console.error(`[ScoreDaemon] ${nowStr} - Polling error:`, err?.message || err);
  }
}

async function loop() {
  await checkLiveGames();
  setTimeout(loop, CHECK_INTERVAL_MS);
}

// Start first check
loop();
