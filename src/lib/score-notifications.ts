import webpush from "web-push";
import { getAllPushSubscriptions, removePushSubscription } from "./push-store";
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from "./push-config";
import { ScheduleGame } from "./types";
import { leagueOfTeamCode } from "./leagues";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface SavedGameState {
  awayScore: number;
  homeScore: number;
  status: string;
  statusLabel?: string;
  inning?: string;
  notifiedEvents?: string[];
  lastNotifiedAt?: number;
}

export async function checkAndDispatchGameAlerts(games: ScheduleGame[]): Promise<void> {
  if (!Array.isArray(games) || games.length === 0) return;

  // Las alertas push son de LVBP/MLB. Los partidos de LIDOM y LMP no deben
  // notificar a los suscriptores existentes (los de preferencia "all" los recibirían).
  games = games.filter((game) => {
    const leagueCode = leagueOfTeamCode(game?.homeTeam?.code) ?? leagueOfTeamCode(game?.awayTeam?.code);
    return leagueCode !== "lidom" && leagueCode !== "lmp";
  });
  if (games.length === 0) return;

  try {
    let rawKv: any = null;
    const isCloudflare = Boolean(
      process.env.CF_PAGES ||
      (typeof navigator !== "undefined" && (navigator as any).userAgent === "Cloudflare-Workers")
    );
    if (isCloudflare) {
      try {
        const ctx = await getCloudflareContext({ async: true });
        rawKv = (ctx?.env as any)?.ENJUEGO_KV;
      } catch {
        // Running on VPS Node.js
      }
    }

    const getStoredAlert = async (k: string): Promise<string | null> => {
      if (rawKv) return await rawKv.get(k);
      try {
        const { sqliteGet } = await import("@/lib/sqlite-store");
        return sqliteGet(k);
      } catch {
        return null;
      }
    };

    const putStoredAlert = async (k: string, val: string): Promise<void> => {
      if (rawKv) {
        await rawKv.put(k, val, { expirationTtl: 86400 * 2 });
        return;
      }
      try {
        const { sqlitePut } = await import("@/lib/sqlite-store");
        sqlitePut(k, val);
      } catch {}
    };

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    for (const game of games) {
      if (!game.id) continue;
      const key = `score_alert_state:${game.id}`;
      const rawPrev = await getStoredAlert(key);
      const prev: SavedGameState | null = rawPrev ? JSON.parse(rawPrev) : null;

      const currentScore: SavedGameState = {
        awayScore: Number(game.awayScore ?? 0),
        homeScore: Number(game.homeScore ?? 0),
        status: String(game.status || "SCHEDULED"),
        statusLabel: (game as any).statusLabel || "",
        inning: typeof game.inning === "string" ? game.inning : ((game as any).statusLabel || ""),
        notifiedEvents: prev?.notifiedEvents || [],
        lastNotifiedAt: prev?.lastNotifiedAt || Date.now(),
      };

      if (!prev) {
        // First time seeing this game: record initial state and existing ejections/events to avoid retro-alerts
        const initialEvents = new Set<string>();
        const feed = (game as any).feed;
        if (Array.isArray(feed)) {
          for (const play of feed) {
            const candidates = [play.text, ...(Array.isArray(play.actions) ? play.actions : [])].filter(Boolean);
            for (const item of candidates) {
              if (/expulsad[oa]|ejected\b|atenci[oó]n m[eé]dica|lesionad[oa]|injury delay/i.test(item)) {
                initialEvents.add(`${game.id}_${play.i ?? play.inning}_${item.slice(0, 30)}`);
              }
            }
          }
        }
        currentScore.notifiedEvents = Array.from(initialEvents);
        await putStoredAlert(key, JSON.stringify(currentScore));
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
          alertBody = `${awayNick} anotó ${diff > 1 ? `${diff} carreras` : "carrera"} (${currentScore.inning || "En vivo"}). Marcador: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}.`;
        } else if (currentScore.homeScore > prev.homeScore) {
          const diff = currentScore.homeScore - prev.homeScore;
          alertTitle = `⚾ ¡CARRERA de ${homeNick}! (${currentScore.homeScore} - ${currentScore.awayScore})`;
          alertBody = `${homeNick} anotó ${diff > 1 ? `${diff} carreras` : "carrera"} (${currentScore.inning || "En vivo"}). Marcador: ${homeNick} ${currentScore.homeScore} - ${awayNick} ${currentScore.awayScore}.`;
        }
      }

      // 2. Game just started (Playball)
      else if (currentScore.status === "IN_PROGRESS" && prev.status !== "IN_PROGRESS" && prev.status !== "DELAYED") {
        alertTitle = `⚾ ¡Comenzó el juego en vivo!`;
        alertBody = `Voz de playball: ${awayNick} vs ${homeNick} ya está en acción. Sigue el marcador jugada a jugada.`;
      }

      // 3. Game finished
      else if (currentScore.status === "FINISHED" && prev.status !== "FINISHED") {
        const winner = currentScore.awayScore > currentScore.homeScore ? awayNick : homeNick;
        alertTitle = `🏆 ¡FINAL: Ganó ${winner}! (${currentScore.awayScore} - ${currentScore.homeScore})`;
        alertBody = `Pizarra final: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}. Revisa el Box Score completo.`;
      }

      // 4. Game delayed by rain or technical issues
      else if (currentScore.status === "DELAYED" && prev.status !== "DELAYED") {
        alertTitle = `🌧️ Juego demorado: ${awayNick} vs ${homeNick}`;
        alertBody = `El juego se encuentra en pausa (${currentScore.statusLabel || "Demorado por lluvia"}). Pizarra: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore} (${currentScore.inning || "En pausa"}). Te avisaremos cuando se reanude.`;
      }

      // 5. Game resumed after delay
      else if (currentScore.status === "IN_PROGRESS" && prev.status === "DELAYED") {
        alertTitle = `⚾ ¡Se reanuda el juego! ${awayNick} vs ${homeNick}`;
        alertBody = `Vuelven las acciones al terreno (${currentScore.inning || "En vivo"}). Marcador: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}.`;
      }

      // 6. Game suspended or postponed officially
      else if (
        (currentScore.status === "POSTPONED" && prev.status !== "POSTPONED") ||
        (currentScore.statusLabel?.toLowerCase().includes("suspendid") && !prev.statusLabel?.toLowerCase().includes("suspendid"))
      ) {
        alertTitle = `⚠️ Juego suspendido: ${awayNick} vs ${homeNick}`;
        alertBody = `El encuentro ha sido suspendido oficialmente (${currentScore.statusLabel || "Condiciones climáticas"}). Marcador: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}.`;
      }

      // Dispatch primary score/status alert if triggered
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

      // 7. Check for Player Ejection or Medical Injury in Gameday Play-by-Play Feed
      const feed = (game as any).feed;
      const notifiedEvents = new Set(prev.notifiedEvents || []);

      if (Array.isArray(feed)) {
        for (const play of feed) {
          const candidates: string[] = [play.text, ...(Array.isArray(play.actions) ? play.actions : [])].filter(Boolean);

          for (const item of candidates) {
            const isEjection = /expulsad[oa]|ejected\b/i.test(item);
            const isInjury = /atenci[oó]n m[eé]dica|lesionad[oa]|injury delay/i.test(item);

            if (isEjection || isInjury) {
              const eventId = `${game.id}_${play.i ?? play.inning}_${item.slice(0, 30)}`;
              if (!notifiedEvents.has(eventId)) {
                notifiedEvents.add(eventId);

                const playInning = play.inning ? `${play.top ? "Alta" : "Baja"} ${play.inning}°` : (currentScore.inning || "En juego");
                const eventTitle = isEjection
                  ? `🟥 ¡EXPULSIÓN: ${awayNick} vs ${homeNick}!`
                  : `🚑 Pausa médica: ${awayNick} vs ${homeNick}`;
                const eventBody = `${item} (${playInning}). Marcador: ${awayNick} ${currentScore.awayScore} - ${homeNick} ${currentScore.homeScore}.`;

                await dispatchPushAlert({
                  title: eventTitle,
                  body: eventBody,
                  url: `/juego/${game.id}`,
                  targetTeams,
                }).catch((err) => {
                  console.warn("[ScoreAlerts] Error sending ejection push:", err);
                });
              }
            }
          }
        }
      }

      // Keep recent notified events to prevent memory bloat in KV
      currentScore.notifiedEvents = Array.from(notifiedEvents).slice(-50);

      // Save updated state in KV or SQLite
      await putStoredAlert(key, JSON.stringify(currentScore));
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
