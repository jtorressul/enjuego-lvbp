import webpush from "web-push";
import { getAllPushSubscriptions, removePushSubscription } from "./push-store";
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from "./push-config";
import { ScheduleGame } from "./types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface SavedGameState {
  awayScore: number;
  homeScore: number;
  status: string;
  inning?: string;
  lastNotifiedAt?: number;
}

export async function checkAndDispatchGameAlerts(games: ScheduleGame[]): Promise<void> {
  if (!Array.isArray(games) || games.length === 0) return;

  try {
    const ctx = await getCloudflareContext({ async: true });
    const kv = (ctx?.env as any)?.ENJUEGO_KV;
    if (!kv) return;

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    for (const game of games) {
      if (!game.id) continue;
      const key = `score_alert_state:${game.id}`;
      const rawPrev = await kv.get(key);
      const prev: SavedGameState | null = rawPrev ? JSON.parse(rawPrev) : null;

      const currentScore: SavedGameState = {
        awayScore: Number(game.awayScore ?? 0),
        homeScore: Number(game.homeScore ?? 0),
        status: String(game.status || "SCHEDULED"),
        inning: typeof game.inning === "string" ? game.inning : ((game as any).statusLabel || ""),
        lastNotifiedAt: prev?.lastNotifiedAt || Date.now(),
      };

      if (!prev) {
        // First time seeing this game, record initial state without false notification
        await kv.put(key, JSON.stringify(currentScore), { expirationTtl: 86400 * 2 });
        continue;
      }

      const awayNick = game.awayTeam?.nick || game.awayTeam?.name || "Visitante";
      const homeNick = game.homeTeam?.nick || game.homeTeam?.name || "Home Club";
      const awayCode = game.awayTeam?.code || "";
      const homeCode = game.homeTeam?.code || "";

      let alertTitle: string | null = null;
      let alertBody: string | null = null;
      const targetTeams: string[] = [awayCode, homeCode].filter(Boolean);

      // 1. Live game: check if a team scored
      if (currentScore.status === "IN_PROGRESS" && prev.status === "IN_PROGRESS") {
        if (currentScore.awayScore > prev.awayScore) {
          const diff = currentScore.awayScore - prev.awayScore;
          alertTitle = `⚾ ¡CARRERA de ${awayNick}! (${currentScore.awayScore} - ${currentScore.homeScore})`;
          alertBody = `${awayNick} anotó ${diff > 1 ? `${diff} carreras` : "carrera"} (${game.inning || "En vivo"}). Marcador: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}.`;
        } else if (currentScore.homeScore > prev.homeScore) {
          const diff = currentScore.homeScore - prev.homeScore;
          alertTitle = `⚾ ¡CARRERA de ${homeNick}! (${currentScore.homeScore} - ${currentScore.awayScore})`;
          alertBody = `${homeNick} anotó ${diff > 1 ? `${diff} carreras` : "carrera"} (${game.inning || "En vivo"}). Marcador: ${homeNick} ${currentScore.homeScore} - ${awayNick} ${currentScore.awayScore}.`;
        }
      }

      // 2. Game just started
      else if (currentScore.status === "IN_PROGRESS" && prev.status !== "IN_PROGRESS") {
        alertTitle = `⚾ ¡Comenzó el juego en vivo!`;
        alertBody = `Voz de playball: ${awayNick} vs ${homeNick} ya está en acción. Sigue el marcador jugada a jugada.`;
      }

      // 3. Game just finished
      else if (currentScore.status === "FINISHED" && prev.status !== "FINISHED") {
        const winner = currentScore.awayScore > currentScore.homeScore ? awayNick : homeNick;
        alertTitle = `🏆 ¡FINAL: Ganó ${winner}! (${currentScore.awayScore} - ${currentScore.homeScore})`;
        alertBody = `Pizarra final: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}. Revisa el Box Score completo.`;
      }

      // Save updated state in KV
      await kv.put(key, JSON.stringify(currentScore), { expirationTtl: 86400 * 2 });

      // Dispatch alert if score changed or game concluded
      if (alertTitle && alertBody) {
        await dispatchPushAlert({
          title: alertTitle,
          body: alertBody,
          url: `/juego/${game.id}`,
          targetTeams,
        }).catch((err) => {
          console.warn("[ScoreAlerts] Error sending push:", err);
        });
      }
    }
  } catch (err) {
    console.warn("[ScoreAlerts] Error in checkAndDispatchGameAlerts:", err);
  }
}

async function dispatchPushAlert({
  title,
  body,
  url,
  targetTeams,
}: {
  title: string;
  body: string;
  url: string;
  targetTeams: string[];
}): Promise<void> {
  const subscriptions = await getAllPushSubscriptions();
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    url: url || "/inicio",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: `enjuego-score-${Date.now()}`,
  });

  const matchingSubs = subscriptions.filter((sub) => {
    if (!sub.teamPreference || sub.teamPreference === "all") return true;
    return targetTeams.includes(sub.teamPreference);
  });

  await Promise.all(
    matchingSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await removePushSubscription(sub.endpoint).catch(() => {});
        }
      }
    })
  );
}
