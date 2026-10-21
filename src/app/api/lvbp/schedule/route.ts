import { NextResponse } from "next/server";
import { fetchLvbpSchedule, fetchMlbSchedule } from "@/lib/mlb-lvbp-service";
import { fetchWinterSchedule, isWinterLeague } from "@/lib/winter-leagues-service";
import { parseLeague } from "@/lib/leagues";
import { checkAndDispatchGameAlerts } from "@/lib/score-notifications";
import type { ScheduleGame } from "@/lib/types";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

let lastScheduleAlertAt = 0;

function toScheduleListItem(game: ScheduleGame) {
  return {
    id: game.id,
    date: game.date,
    startsAt: game.startsAt,
    time: game.time,
    status: game.status,
    statusLabel: game.statusLabel,
    inning: game.inning,
    currentInning: game.currentInning,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    awayHits: game.awayHits,
    homeHits: game.homeHits,
    awayErrors: game.awayErrors,
    homeErrors: game.homeErrors,
    venue: game.venue,
    venueCity: game.venueCity,
    tv: game.tv,
    tvChannels: game.tvChannels,
    youtubeVideoId: game.youtubeVideoId,
    youtubeUrl: game.youtubeUrl,
    decisions: game.decisions,
  };
}

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const league = parseLeague(searchParams.get("league") ?? searchParams.get("liga"));
      const season = searchParams.get("season") || "2026";
      const games = isWinterLeague(league)
        ? await fetchWinterSchedule(league, season)
        : league === "mlb"
          ? await fetchMlbSchedule(season)
          : await fetchLvbpSchedule(season);
      if (league === "lvbp" && Array.isArray(games)) {
        const now = Date.now();
        if (now - lastScheduleAlertAt > 45_000) {
          lastScheduleAlertAt = now;
          checkAndDispatchGameAlerts(games).catch(() => {});
        }
      }
      const hasLive =
        Array.isArray(games) &&
        games.some((g) => g.status === "IN_PROGRESS" || g.status === "WARMUP" || g.status === "DELAYED");
      return NextResponse.json(
        { games: Array.isArray(games) ? games.map(toScheduleListItem) : [], league },
        { headers: publicCacheHeaders(hasLive ? 6 : 15) }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "No se pudo cargar el calendario", games: [] },
        { status: 500 }
      );
    }
  });
}
