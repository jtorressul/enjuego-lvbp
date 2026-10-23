import {
  fetchLvbpSchedule,
  fetchLvbpStandingsAndLeaders,
} from "@/lib/mlb-lvbp-service";
import { fetchSoccerScoreboard, type SoccerMatch } from "@/lib/soccer-service";
import type { LeaderCategory, ScheduleGame, StandingRow } from "@/lib/types";

export type PortalSeed = {
  schedule: ScheduleGame[];
  standings: StandingRow[];
  leaders: { hitting: LeaderCategory[]; pitching: LeaderCategory[] };
  dateIndex: number;
  soccerMatches: SoccerMatch[];
};

const EMPTY_LEADERS = { hitting: [] as LeaderCategory[], pitching: [] as LeaderCategory[] };

function todayCaracasIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function dateIndexFor(games: ScheduleGame[]): number {
  const dates = [...new Set(games.map((game) => game.date))].sort();
  if (!dates.length) return 0;
  const today = todayCaracasIso();
  let index = dates.indexOf(today);
  if (index === -1) index = dates.findIndex((date) => date >= today);
  if (index === -1) index = dates.length - 1;
  return index;
}

function toCompactSeedGame(g: ScheduleGame): ScheduleGame {
  return {
    id: g.id,
    date: g.date,
    startsAt: g.startsAt,
    time: g.time,
    status: g.status,
    statusLabel: g.statusLabel,
    inning: g.inning,
    currentInning: g.currentInning,
    awayTeam: {
      id: g.awayTeam?.id,
      code: g.awayTeam?.code || "LVBP",
      shortName: g.awayTeam?.shortName || "",
      name: g.awayTeam?.name || "",
      nick: g.awayTeam?.nick || "",
      logoUrl: g.awayTeam?.logoUrl || "",
      color: g.awayTeam?.color || "#1e293b",
      wins: g.awayTeam?.wins || 0,
      losses: g.awayTeam?.losses || 0,
    },
    homeTeam: {
      id: g.homeTeam?.id,
      code: g.homeTeam?.code || "LVBP",
      shortName: g.homeTeam?.shortName || "",
      name: g.homeTeam?.name || "",
      nick: g.homeTeam?.nick || "",
      logoUrl: g.homeTeam?.logoUrl || "",
      color: g.homeTeam?.color || "#1e293b",
      wins: g.homeTeam?.wins || 0,
      losses: g.homeTeam?.losses || 0,
    },
    awayScore: g.awayScore || 0,
    homeScore: g.homeScore || 0,
    awayHits: g.awayHits || 0,
    homeHits: g.homeHits || 0,
    awayErrors: g.awayErrors || 0,
    homeErrors: g.homeErrors || 0,
    venue: g.venue || "",
    venueCity: g.venueCity || "",
    tv: g.tv || "",
    tvChannels: g.tvChannels || [],
    decisions: g.decisions,
  } as ScheduleGame;
}

let cachedSeed: { data: PortalSeed; freshUntil: number; staleUntil: number } | null = null;
let seedInFlight: Promise<PortalSeed> | null = null;

async function doLoadLvbpPortalSeed(): Promise<PortalSeed> {
  const now = Date.now();
  try {
    const [schedule, table, soccerMatches] = await Promise.all([
      fetchLvbpSchedule("2026"),
      fetchLvbpStandingsAndLeaders("2026"),
      fetchSoccerScoreboard("uefa.champions").catch(() => [] as SoccerMatch[]),
    ]);
    const compactSchedule = Array.isArray(schedule) ? schedule.map(toCompactSeedGame) : [];
    const data: PortalSeed = {
      schedule: compactSchedule,
      standings: table.standings || [],
      leaders: table.leaders || EMPTY_LEADERS,
      dateIndex: dateIndexFor(compactSchedule),
      soccerMatches: soccerMatches || [],
    };
    cachedSeed = {
      data,
      freshUntil: now + 45_000, // 45 seconds fresh
      staleUntil: now + 1800_000, // 30 minutes stale-while-revalidate
    };
    return data;
  } catch {
    if (cachedSeed) return cachedSeed.data;
    return {
      schedule: [],
      standings: [],
      leaders: EMPTY_LEADERS,
      dateIndex: 0,
      soccerMatches: [],
    };
  }
}

/** Season tables and the day's card, ready before the browser runs (cached in memory with instant SWR). */
export async function loadLvbpPortalSeed(): Promise<PortalSeed> {
  const now = Date.now();
  if (cachedSeed && cachedSeed.data.schedule.length > 0) {
    if (now < cachedSeed.freshUntil) {
      return cachedSeed.data;
    }
    if (now < cachedSeed.staleUntil) {
      if (!seedInFlight) {
        seedInFlight = doLoadLvbpPortalSeed().finally(() => {
          seedInFlight = null;
        });
      }
      return cachedSeed.data;
    }
  }

  if (!seedInFlight) {
    seedInFlight = doLoadLvbpPortalSeed().finally(() => {
      seedInFlight = null;
    });
  }
  return seedInFlight;
}
