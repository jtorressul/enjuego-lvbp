import {
  fetchLvbpSchedule,
  fetchLvbpStandingsAndLeaders,
} from "@/lib/mlb-lvbp-service";
import type { LeaderCategory, ScheduleGame, StandingRow } from "@/lib/types";

export type PortalSeed = {
  schedule: ScheduleGame[];
  standings: StandingRow[];
  leaders: { hitting: LeaderCategory[]; pitching: LeaderCategory[] };
  dateIndex: number;
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

/** Season tables and the day's card, ready before the browser runs. */
export async function loadLvbpPortalSeed(): Promise<PortalSeed> {
  try {
    const [schedule, table] = await Promise.all([
      fetchLvbpSchedule("2026"),
      fetchLvbpStandingsAndLeaders("2026"),
    ]);
    return {
      schedule,
      standings: table.standings || [],
      leaders: table.leaders || EMPTY_LEADERS,
      dateIndex: dateIndexFor(schedule),
    };
  } catch {
    return {
      schedule: [],
      standings: [],
      leaders: EMPTY_LEADERS,
      dateIndex: 0,
    };
  }
}
