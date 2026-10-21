import { LEAGUES, type LeagueId, isWinterLeague } from "./leagues";
import { LIDOM_TEAMS, LMP_TEAMS } from "./winter-teams";
import { resolveAnyBaseballTeam } from "./mlb-teams";
import { mapStatus, translateDetailedState, formatCaracasTime } from "./mlb-lvbp-service";
import type { ScheduleGame, StandingRow, LeaderCategory } from "./types";

export { isWinterLeague };

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const gScope = globalThis as unknown as {
  __ENJUEGO_WINTER_SCH_CACHE__?: Map<string, CacheEntry<ScheduleGame[]>>;
  __ENJUEGO_WINTER_STD_CACHE__?: Map<string, CacheEntry<{ standings: StandingRow[]; leaders: any }>>;
  __ENJUEGO_WINTER_ROSTER_CACHE__?: Map<string, CacheEntry<any>>;
};

if (!gScope.__ENJUEGO_WINTER_SCH_CACHE__) gScope.__ENJUEGO_WINTER_SCH_CACHE__ = new Map();
if (!gScope.__ENJUEGO_WINTER_STD_CACHE__) gScope.__ENJUEGO_WINTER_STD_CACHE__ = new Map();
if (!gScope.__ENJUEGO_WINTER_ROSTER_CACHE__) gScope.__ENJUEGO_WINTER_ROSTER_CACHE__ = new Map();

const winterSchCache = gScope.__ENJUEGO_WINTER_SCH_CACHE__;
const winterStdCache = gScope.__ENJUEGO_WINTER_STD_CACHE__;
const winterRosterCache = gScope.__ENJUEGO_WINTER_ROSTER_CACHE__;

export async function fetchWinterSchedule(
  league: "lidom" | "lmp",
  season = "2026"
): Promise<ScheduleGame[]> {
  const cacheKey = `${league}_${season}`;
  const now = Date.now();
  const cached = winterSchCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const leagueConfig = LEAGUES[league];
  const leagueId = leagueConfig?.mlbLeagueId || (league === "lidom" ? 131 : 132);

  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule?leagueId=${leagueId}&sportId=17&season=${season}&hydrate=team,linescore,probablePitcher`;
    const res = await fetch(url, {
      headers: { "User-Agent": "EnJuego-WinterService/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return cached?.data || [];
    }

    const json = await res.json();
    const dates = Array.isArray(json?.dates) ? json.dates : [];
    const games: ScheduleGame[] = [];

    for (const d of dates) {
      const dateStr = d.date;
      for (const g of d.games || []) {
        const status = mapStatus(g.status);
        const ls = g.linescore || {};
        const isTop = Boolean(ls.isTopInning);
        const currentInning = Number(ls.currentInning || 0);

        const inningLabel =
          status === "IN_PROGRESS"
            ? currentInning
              ? `${isTop ? "Alta" : "Baja"} ${currentInning}°`
              : "En Vivo"
            : status === "FINISHED"
              ? currentInning && currentInning !== 9
                ? `Final/${currentInning}`
                : "Final"
              : formatCaracasTime(g.gameDate);

        const awayMeta = resolveAnyBaseballTeam(g.teams?.away?.team?.id, g.teams?.away?.team?.name, league);
        const homeMeta = resolveAnyBaseballTeam(g.teams?.home?.team?.id, g.teams?.home?.team?.name, league);

        games.push({
          id: String(g.gamePk),
          date: dateStr,
          startsAt: g.gameDate,
          time: formatCaracasTime(g.gameDate),
          status,
          statusLabel: translateDetailedState(g.status?.detailedState, status),
          inning: inningLabel,
          isTopInning: isTop,
          currentInning: currentInning || undefined,
          balls: ls.balls ?? 0,
          strikes: ls.strikes ?? 0,
          outs: ls.outs ?? 0,
          runners: {
            first: Boolean(ls.offense?.first),
            second: Boolean(ls.offense?.second),
            third: Boolean(ls.offense?.third),
          },
          awayTeam: {
            id: awayMeta.id,
            code: awayMeta.code,
            shortName: awayMeta.shortName,
            name: awayMeta.name,
            nick: awayMeta.nick,
            logoUrl: awayMeta.logoSvg,
            color: awayMeta.color,
            wins: Number(g.teams?.away?.leagueRecord?.wins || 0),
            losses: Number(g.teams?.away?.leagueRecord?.losses || 0),
          },
          homeTeam: {
            id: homeMeta.id,
            code: homeMeta.code,
            shortName: homeMeta.shortName,
            name: homeMeta.name,
            nick: homeMeta.nick,
            logoUrl: homeMeta.logoSvg,
            color: homeMeta.color,
            wins: Number(g.teams?.home?.leagueRecord?.wins || 0),
            losses: Number(g.teams?.home?.leagueRecord?.losses || 0),
          },
          awayScore: Number(g.teams?.away?.score ?? ls.teams?.away?.runs ?? 0),
          homeScore: Number(g.teams?.home?.score ?? ls.teams?.home?.runs ?? 0),
          awayHits: Number(ls.teams?.away?.hits ?? 0),
          homeHits: Number(ls.teams?.home?.hits ?? 0),
          awayErrors: Number(ls.teams?.away?.errors ?? 0),
          homeErrors: Number(ls.teams?.home?.errors ?? 0),
          venue: g.venue?.name || homeMeta.venue,
          venueCity: homeMeta.venueCity,
          tv: league === "lidom" ? "Digital 15 · MLB.TV" : "Megacable · YouTube",
          tvChannels: league === "lidom" ? ["Digital 15", "MLB.TV"] : ["Megacable", "YouTube"],
        });
      }
    }

    const hasLive = games.some((g) => g.status === "IN_PROGRESS" || g.status === "WARMUP");
    const ttlMs = hasLive ? 15_000 : 300_000;
    winterSchCache.set(cacheKey, { data: games, expiresAt: now + ttlMs });

    return games;
  } catch (err) {
    console.warn(`[WinterService] Error fetching schedule for ${league}:`, err);
    return cached?.data || [];
  }
}

export async function fetchWinterStandingsAndLeaders(
  league: "lidom" | "lmp",
  season = "2026"
): Promise<{
  standings: StandingRow[];
  leaders: { hitting: LeaderCategory[]; pitching: LeaderCategory[] };
}> {
  const cacheKey = `${league}_${season}`;
  const now = Date.now();
  const cached = winterStdCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const leagueConfig = LEAGUES[league];
  const leagueId = leagueConfig?.mlbLeagueId || (league === "lidom" ? 131 : 132);

  try {
    const url = `https://statsapi.mlb.com/api/v1/standings?leagueId=${leagueId}&season=${season}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "EnJuego-WinterService/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    let standings: StandingRow[] = [];

    if (res.ok) {
      const json = await res.json();
      const records = json?.records?.[0]?.teamRecords || [];
      standings = records.map((r: any) => {
        const meta = resolveAnyBaseballTeam(r.team?.id, r.team?.name, league);
        const wins = Number(r.wins || 0);
        const losses = Number(r.losses || 0);
        const pct = r.winningPercentage || (wins + losses > 0 ? (wins / (wins + losses)).toFixed(3) : ".000");

        return {
          team: {
            id: meta.id,
            code: meta.code,
            shortName: meta.shortName,
            name: meta.name,
            nick: meta.nick,
            logoUrl: meta.logoSvg,
            color: meta.color,
            wins,
            losses,
          },
          gamesPlayed: wins + losses,
          wins,
          losses,
          pct: String(pct).replace(/^0/, ""),
          gamesBehind: String(r.gamesBack || "-"),
          streak: r.streak?.streakCode || "-",
          runsScored: Number(r.runsScored || 0),
          runsAllowed: Number(r.runsAllowed || 0),
          runDiff: Number(r.runDifferential || 0),
          homeRecord: `${r.records?.splitRecords?.find((s: any) => s.type === "home")?.wins || 0}-${r.records?.splitRecords?.find((s: any) => s.type === "home")?.losses || 0}`,
          awayRecord: `${r.records?.splitRecords?.find((s: any) => s.type === "away")?.wins || 0}-${r.records?.splitRecords?.find((s: any) => s.type === "away")?.losses || 0}`,
          lastTen: `${r.records?.splitRecords?.find((s: any) => s.type === "lastTen")?.wins || 0}-${r.records?.splitRecords?.find((s: any) => s.type === "lastTen")?.losses || 0}`,
        };
      });
    }

    // Fallback: If standings endpoint returned empty (e.g. offseason or pre-season), build from catalog
    if (standings.length === 0) {
      const catalog = league === "lidom" ? LIDOM_TEAMS : LMP_TEAMS;
      standings = Object.values(catalog).map((meta) => ({
        team: {
          id: meta.id,
          code: meta.code,
          shortName: meta.shortName,
          name: meta.name,
          nick: meta.nick,
          logoUrl: meta.logoSvg,
          color: meta.color,
          wins: 0,
          losses: 0,
        },
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pct: ".000",
        gamesBehind: "-",
        streak: "-",
        runsScored: 0,
        runsAllowed: 0,
        runDiff: 0,
        homeRecord: "0-0",
        awayRecord: "0-0",
        lastTen: "0-0",
      }));
    }

    const result = {
      standings,
      leaders: {
        hitting: [],
        pitching: [],
      },
    };

    winterStdCache.set(cacheKey, { data: result, expiresAt: now + 300_000 });
    return result;
  } catch (err) {
    console.warn(`[WinterService] Error fetching standings for ${league}:`, err);
    return cached?.data || { standings: [], leaders: { hitting: [], pitching: [] } };
  }
}

export async function fetchWinterRoster(
  league: "lidom" | "lmp",
  teamCode: string
): Promise<any> {
  const cacheKey = `${league}_${teamCode.toUpperCase()}`;
  const now = Date.now();
  const cached = winterRosterCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  const teamMeta = resolveAnyBaseballTeam(teamCode, "", league);
  if (!teamMeta?.id) return { team: null, players: [] };

  try {
    const url = `https://statsapi.mlb.com/api/v1/teams/${teamMeta.id}/roster?rosterType=active`;
    const res = await fetch(url, {
      headers: { "User-Agent": "EnJuego-WinterService/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return cached?.data || { team: teamMeta, players: [] };
    }

    const json = await res.json();
    const roster = (json?.roster || []).map((p: any) => ({
      id: p.person?.id,
      name: p.person?.fullName || "Jugador",
      jerseyNumber: p.jerseyNumber || "#",
      position: p.position?.abbreviation || "UTIL",
      positionName: p.position?.name || "Jugador",
      status: p.status?.description || "Activo",
      headshot: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_160,q_auto:good,f_auto/v1/people/${p.person?.id}/headshot/67/current`,
    }));

    const result = { team: teamMeta, players: roster };
    winterRosterCache.set(cacheKey, { data: result, expiresAt: now + 600_000 });
    return result;
  } catch (err) {
    console.warn(`[WinterService] Error fetching roster for ${league} ${teamCode}:`, err);
    return cached?.data || { team: teamMeta, players: [] };
  }
}
