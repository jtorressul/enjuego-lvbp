import { SOCCER_LEAGUES, type SoccerLeagueId } from "@/lib/soccer-leagues";

export interface SoccerTeam {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string;
  score?: number | string;
}

export interface SoccerMatch {
  id: string;
  date: string;       // ISO string
  dateCaracas: string; // YYYY-MM-DD
  timeCaracas: string; // HH:mm
  status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED";
  statusText: string;  // e.g. "45'", "HT", "Final", "15:00"
  clock?: string;
  venue?: string;
  leagueId: SoccerLeagueId;
  leagueName: string;
  homeTeam: SoccerTeam;
  awayTeam: SoccerTeam;
}

export interface SoccerStandingRow {
  rank: number;
  team: SoccerTeam;
  gamesPlayed: number; // PJ
  wins: number;        // G
  ties: number;        // E
  losses: number;      // P
  goalsFor: number;    // GF
  goalsAgainst: number;// GC
  goalDiff: number;    // DG
  points: number;      // PTS
  zone?: "champions" | "champions_playoff" | "europa" | "conference" | "relegation" | null;
}

// In-Memory Cache with TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const scoreboardCache = new Map<string, CacheEntry<SoccerMatch[]>>();
const standingsCache = new Map<string, CacheEntry<SoccerStandingRow[]>>();

function formatCaracasTime(isoDateStr: string): { dateCaracas: string; timeCaracas: string } {
  try {
    const d = new Date(isoDateStr);
    const caracasDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

    const timeCaracas = new Intl.DateTimeFormat("es-VE", {
      timeZone: "America/Caracas",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);

    return { dateCaracas: caracasDate, timeCaracas };
  } catch {
    return { dateCaracas: isoDateStr.slice(0, 10), timeCaracas: "15:00" };
  }
}

function getCurrentYearMonthCaracas(): string {
  try {
    const d = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value || "2026";
    const month = parts.find((p) => p.type === "month")?.value || "10";
    return `${year}${month}`;
  } catch {
    return "202610";
  }
}

/**
 * Fetch matches / scoreboard from ESPN for a given soccer league
 */
export async function fetchSoccerScoreboard(
  leagueId: SoccerLeagueId,
  targetDate?: string // YYYYMMDD optional
): Promise<SoccerMatch[]> {
  const currentMonth = getCurrentYearMonthCaracas();
  const cacheKey = `${leagueId}_${targetDate || currentMonth}`;
  const now = Date.now();
  const cached = scoreboardCache.get(cacheKey);

  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const leagueConfig = SOCCER_LEAGUES[leagueId] || SOCCER_LEAGUES["uefa.champions"];
  const dateParam = targetDate ? `?dates=${targetDate.replace(/-/g, "")}` : `?dates=${currentMonth}`;
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard${dateParam}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EnJuego-SoccerService/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return cached?.data || [];
    }

    const json = await res.json();
    const rawEvents = Array.isArray(json.events) ? json.events : [];

    const matches: SoccerMatch[] = rawEvents.map((ev: any) => {
      const comp = ev.competitions?.[0];
      const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
      const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
      const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

      const state = ev.status?.type?.state;
      let status: SoccerMatch["status"] = "SCHEDULED";
      let statusText = "Por Jugar";

      const { dateCaracas, timeCaracas } = formatCaracasTime(ev.date || comp?.date || new Date().toISOString());

      if (state === "in") {
        status = "IN_PROGRESS";
        const shortDetail = ev.status?.type?.shortDetail;
        if (shortDetail === "HT" || shortDetail === "Halftime") {
          statusText = "ET (Descanso)";
        } else {
          statusText = ev.status?.displayClock || `${ev.status?.clock || ""}'` || "En Vivo";
        }
      } else if (state === "post") {
        status = "FINISHED";
        statusText = "Final";
      } else {
        status = "SCHEDULED";
        statusText = timeCaracas;
      }

      const isScheduled = status === "SCHEDULED";

      return {
        id: String(ev.id || Math.random().toString(36).slice(2, 9)),
        date: ev.date || comp?.date || new Date().toISOString(),
        dateCaracas,
        timeCaracas,
        status,
        statusText,
        clock: ev.status?.displayClock,
        venue: comp?.venue?.fullName || comp?.venue?.address?.city,
        leagueId,
        leagueName: leagueConfig.name,
        homeTeam: {
          id: String(homeComp?.team?.id || "home"),
          name: homeComp?.team?.displayName || homeComp?.team?.name || "Local",
          shortName: homeComp?.team?.shortDisplayName || homeComp?.team?.name || "Local",
          abbreviation: homeComp?.team?.abbreviation || "LOC",
          logo: homeComp?.team?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${homeComp?.team?.id}.png`,
          score: isScheduled ? undefined : (homeComp?.score !== undefined && homeComp?.score !== "" ? Number(homeComp.score) : undefined),
        },
        awayTeam: {
          id: String(awayComp?.team?.id || "away"),
          name: awayComp?.team?.displayName || awayComp?.team?.name || "Visitante",
          shortName: awayComp?.team?.shortDisplayName || awayComp?.team?.name || "Visitante",
          abbreviation: awayComp?.team?.abbreviation || "VIS",
          logo: awayComp?.team?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${awayComp?.team?.id}.png`,
          score: isScheduled ? undefined : (awayComp?.score !== undefined && awayComp?.score !== "" ? Number(awayComp.score) : undefined),
        },
      };
    });

    // Smart Sort:
    // 1. Live games at top (IN_PROGRESS)
    // 2. Scheduled games next (earliest kickoff first)
    // 3. Finished games (most recently finished first, so latest results are seen immediately)
    matches.sort((a, b) => {
      const stateOrder = (st: SoccerMatch["status"]) => {
        if (st === "IN_PROGRESS") return 0;
        if (st === "SCHEDULED") return 1;
        return 2;
      };
      const orderA = stateOrder(a.status);
      const orderB = stateOrder(b.status);
      if (orderA !== orderB) return orderA - orderB;

      if (a.status === "SCHEDULED" && b.status === "SCHEDULED") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (a.status === "FINISHED" && b.status === "FINISHED") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });

    // Cache: 45s if has live games, 5 min otherwise
    const hasLive = matches.some((m) => m.status === "IN_PROGRESS");
    scoreboardCache.set(cacheKey, {
      data: matches,
      expiresAt: now + (hasLive ? 45_000 : 300_000),
    });

    return matches;
  } catch (err) {
    console.error(`[SoccerService] Error fetching scoreboard for ${leagueId}:`, err);
    return cached?.data || [];
  }
}

/**
 * Fetch Standings from ESPN for a given soccer league
 */
export async function fetchSoccerStandings(leagueId: SoccerLeagueId): Promise<SoccerStandingRow[]> {
  const cacheKey = `standings_${leagueId}`;
  const now = Date.now();
  const cached = standingsCache.get(cacheKey);

  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const leagueConfig = SOCCER_LEAGUES[leagueId] || SOCCER_LEAGUES["uefa.champions"];
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EnJuego-SoccerService/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return cached?.data || [];
    }

    const json = await res.json();
    const rawEntries = json.children?.[0]?.standings?.entries || [];

    const rows: SoccerStandingRow[] = rawEntries.map((entry: any, idx: number) => {
      const stats = entry.stats || [];
      const getStat = (name: string): number => {
        const item = stats.find((s: any) => s.name === name);
        return item?.value !== undefined ? Number(item.value) : 0;
      };

      const rank = getStat("rank") || idx + 1;
      const gamesPlayed = getStat("gamesPlayed");
      const wins = getStat("wins");
      const ties = getStat("ties");
      const losses = getStat("losses");
      const goalsFor = getStat("pointsFor");
      const goalsAgainst = getStat("pointsAgainst");
      const goalDiff = getStat("pointDifferential");
      const points = getStat("points");

      let zone: SoccerStandingRow["zone"] = null;
      if (leagueId === "uefa.champions") {
        if (rank <= 8) zone = "champions";
        else if (rank <= 24) zone = "champions_playoff";
        else zone = "relegation";
      } else {
        const z = leagueConfig.zones;
        if (z.champions && rank <= z.champions) zone = "champions";
        else if (z.europa?.includes(rank)) zone = "europa";
        else if (z.conference?.includes(rank)) zone = "conference";
        else if (z.relegation && rank >= z.relegation) zone = "relegation";
      }

      return {
        rank,
        team: {
          id: String(entry.team?.id || idx),
          name: entry.team?.displayName || entry.team?.name || "Club",
          shortName: entry.team?.shortDisplayName || entry.team?.name || "Club",
          abbreviation: entry.team?.abbreviation || "",
          logo: entry.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${entry.team?.id}.png`,
        },
        gamesPlayed,
        wins,
        ties,
        losses,
        goalsFor,
        goalsAgainst,
        goalDiff,
        points,
        zone,
      };
    });

    // Sort by rank
    rows.sort((a, b) => a.rank - b.rank);

    // Cache: 15 minutes
    standingsCache.set(cacheKey, {
      data: rows,
      expiresAt: now + 15 * 60 * 1000,
    });

    return rows;
  } catch (err) {
    console.error(`[SoccerService] Error fetching standings for ${leagueId}:`, err);
    return cached?.data || [];
  }
}
