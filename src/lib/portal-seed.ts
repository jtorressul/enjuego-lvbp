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

let cachedSeed: { data: PortalSeed; expiresAt: number } | null = null;

/** Season tables and the day's card, ready before the browser runs (cached 30s in memory for instant SSR). */
export async function loadLvbpPortalSeed(): Promise<PortalSeed> {
  const now = Date.now();
  if (cachedSeed && now < cachedSeed.expiresAt && cachedSeed.data.schedule.length > 0) {
    return cachedSeed.data;
  }
  try {
    const [schedule, table, soccerMatches] = await Promise.all([
      fetchLvbpSchedule("2026"),
      fetchLvbpStandingsAndLeaders("2026"),
      fetchSoccerScoreboard("uefa.champions").catch(() => [] as SoccerMatch[]),
    ]);
    const data: PortalSeed = {
      schedule,
      standings: table.standings || [],
      leaders: table.leaders || EMPTY_LEADERS,
      dateIndex: dateIndexFor(schedule),
      soccerMatches: soccerMatches || [],
    };
    cachedSeed = { data, expiresAt: now + 10_000 };
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
