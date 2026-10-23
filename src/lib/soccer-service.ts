import { optimizeEspnLogoUrl, SOCCER_LEAGUES, type SoccerLeagueId } from "@/lib/soccer-leagues";
export type { SoccerLeagueId } from "@/lib/soccer-leagues";

export interface SoccerTeam {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string;
  score?: number | string;
  record?: string;
  form?: string;
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
  city?: string;
  stage?: string;
  broadcast?: string;
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

export interface SoccerMatchEvent {
  id: string;
  type: "goal" | "yellow-card" | "red-card" | "sub" | "other";
  text: string;
  shortText?: string;
  minute: string;
  period: number;
  teamId?: string;
  teamName?: string;
  isHome: boolean;
  player?: string;
  subOut?: string;
  assist?: string;
}

export interface SoccerStatRow {
  label: string;
  name: string;
  homeDisplay: string;
  awayDisplay: string;
  homeValue: number;
  awayValue: number;
}

export interface SoccerLineupPlayer {
  id: string;
  name: string;
  shortName: string;
  jersey: string;
  position: string;
  positionNameSpanish: string;
  formationPlace: number;
  starter: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  shots: number;
  shotsOnTarget: number;
  subbedOut: boolean;
  subbedIn: boolean;
}

export interface SoccerShotEvent {
  id: string;
  minute: string;
  clockSeconds: number;
  period: number;
  isHome: boolean;
  teamName: string;
  teamAbbr: string;
  playerName: string;
  playerShortName: string;
  jersey?: string;
  positionLabel: string;
  outcome: "goal" | "saved" | "off_target" | "blocked";
  x: number;
  y: number;
  endX: number;
  endY: number;
  goalY: number;
  goalZ: number;
  shotType: string;
  situation: string;
  goalZone: string;
  distanceMeters: number;
  xg: string;
  xgot: string;
  textSpanish: string;
}

export interface SoccerMomentumBin {
  binIndex: number;
  minuteStart: number;
  minuteLabel: string;
  homePressure: number; // 0..100
  awayPressure: number; // 0..100
  markers: {
    type: "goal" | "yellow-card" | "red-card";
    isHome: boolean;
    minute: string;
    player?: string;
  }[];
}

export interface SoccerCommentaryItem {
  id: string;
  minute: string;
  textSpanish: string;
  type: "goal" | "shot" | "card" | "sub" | "corner" | "foul" | "whistle" | "info";
  isHome?: boolean;
}

export interface SoccerMatchDetail {
  id: string;
  leagueId: SoccerLeagueId;
  leagueName: string;
  date: string;
  dateCaracas: string;
  timeCaracas: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED";
  statusText: string;
  venue?: string;
  city?: string;
  attendance?: string;
  referee?: string;
  stage?: string;
  broadcast?: string;
  homeTeam: SoccerTeam;
  awayTeam: SoccerTeam;
  events: SoccerMatchEvent[];
  stats: SoccerStatRow[];
  lineups?: {
    home: {
      formation?: string;
      uniformColor: string;
      uniformTextColor: string;
      gkColor: string;
      starters: SoccerLineupPlayer[];
      bench: SoccerLineupPlayer[];
    };
    away: {
      formation?: string;
      uniformColor: string;
      uniformTextColor: string;
      gkColor: string;
      starters: SoccerLineupPlayer[];
      bench: SoccerLineupPlayer[];
    };
  };
  shots: SoccerShotEvent[];
  momentum: SoccerMomentumBin[];
  commentary: SoccerCommentaryItem[];
  latestPlay?: {
    minute: string;
    bannerTitle: string;
    headlineSpanish: string;
    detailSpanish: string;
    isHome?: boolean;
    x?: number;
    y?: number;
  };
}

// In-Memory Cache with TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const scoreboardCache = new Map<string, CacheEntry<SoccerMatch[]>>();
const liveTodayCache = new Map<string, CacheEntry<SoccerMatch[]>>();
const standingsCache = new Map<string, CacheEntry<SoccerStandingRow[]>>();
const matchDetailCache = new Map<string, CacheEntry<SoccerMatchDetail>>();

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

function parseRawEspnScoreboardEvents(
  rawEvents: any[],
  leagueId: SoccerLeagueId,
  leagueName: string
): SoccerMatch[] {
  return rawEvents.map((ev: any) => {
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
    const translateForm = (rawForm?: string): string | undefined => {
      if (!rawForm) return undefined;
      return rawForm
        .toUpperCase()
        .split("")
        .map((ch) => (ch === "W" ? "G" : ch === "D" ? "E" : ch === "L" ? "P" : ch))
        .join("-");
    };

    const rawBroadcast =
      comp?.broadcasts?.[0]?.names?.[0] ||
      comp?.geoBroadcasts?.[0]?.media?.shortName ||
      (leagueId === "ven.1" ? "Televen · Liga FUTVE YouTube · GOLTV" : undefined);

    return {
      id: String(ev.id || Math.random().toString(36).slice(2, 9)),
      date: ev.date || comp?.date || new Date().toISOString(),
      dateCaracas,
      timeCaracas,
      status,
      statusText,
      clock: ev.status?.displayClock,
      venue: comp?.venue?.fullName || comp?.venue?.shortName || comp?.venue?.address?.city,
      city: [comp?.venue?.address?.city, comp?.venue?.address?.country].filter(Boolean).join(", ") || undefined,
      stage: ev.season?.slug?.replace(/-/g, " ") || undefined,
      broadcast: rawBroadcast,
      leagueId,
      leagueName,
      homeTeam: {
        id: String(homeComp?.team?.id || "home"),
        name: homeComp?.team?.displayName || homeComp?.team?.name || "Local",
        shortName: homeComp?.team?.shortDisplayName || homeComp?.team?.name || "Local",
        abbreviation: homeComp?.team?.abbreviation || "LOC",
        logo: optimizeEspnLogoUrl(
          homeComp?.team?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${homeComp?.team?.id}.png`,
          64
        ),
        score: isScheduled ? undefined : (homeComp?.score !== undefined && homeComp?.score !== "" ? Number(homeComp.score) : undefined),
        record: homeComp?.records?.[0]?.summary || undefined,
        form: translateForm(homeComp?.form),
      },
      awayTeam: {
        id: String(awayComp?.team?.id || "away"),
        name: awayComp?.team?.displayName || awayComp?.team?.name || "Visitante",
        shortName: awayComp?.team?.shortDisplayName || awayComp?.team?.name || "Visitante",
        abbreviation: awayComp?.team?.abbreviation || "VIS",
        logo: optimizeEspnLogoUrl(
          awayComp?.team?.logo || `https://a.espncdn.com/i/teamlogos/soccer/500/${awayComp?.team?.id}.png`,
          64
        ),
        score: isScheduled ? undefined : (awayComp?.score !== undefined && awayComp?.score !== "" ? Number(awayComp.score) : undefined),
        record: awayComp?.records?.[0]?.summary || undefined,
        form: translateForm(awayComp?.form),
      },
    };
  });
}

function sortSoccerMatches(matches: SoccerMatch[]): SoccerMatch[] {
  return matches.sort((a, b) => {
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
}

/**
 * Fetch matches / scoreboard from ESPN for a given soccer league.
 * Combines the monthly calendar with ESPN's uncached real-time live scoreboard (8s TTL)
 * so live match scores and minutes never suffer from monthly CDN caching delays.
 */
export async function fetchSoccerScoreboard(
  leagueId: SoccerLeagueId,
  targetDate?: string // YYYYMMDD optional
): Promise<SoccerMatch[]> {
  const currentMonth = getCurrentYearMonthCaracas();
  const cacheKey = `${leagueId}_${targetDate || currentMonth}`;
  const now = Date.now();
  const leagueConfig = SOCCER_LEAGUES[leagueId] || SOCCER_LEAGUES["uefa.champions"];

  // If a specific date is requested, fetch that date directly with short cache
  if (targetDate) {
    const cachedDate = scoreboardCache.get(cacheKey);
    if (cachedDate && now < cachedDate.expiresAt) {
      return cachedDate.data;
    }
    const cleanDate = targetDate.replace(/-/g, "");
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard?dates=${cleanDate}`;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "EnJuego-SoccerService/1.0" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return cachedDate?.data || [];
      const json = await res.json();
      const matches = sortSoccerMatches(
        parseRawEspnScoreboardEvents(Array.isArray(json.events) ? json.events : [], leagueId, leagueConfig.name)
      );
      const hasLive = matches.some((m) => m.status === "IN_PROGRESS");
      scoreboardCache.set(cacheKey, {
        data: matches,
        expiresAt: now + (hasLive ? 8_000 : 30_000),
      });
      return matches;
    } catch {
      return cachedDate?.data || [];
    }
  }

  // Default: Merge monthly schedule cache (120s TTL) + Real-time Live Scoreboard (8s TTL, cache: "no-store")
  const cachedMonth = scoreboardCache.get(cacheKey);
  const cachedLive = liveTodayCache.get(leagueId);

  const monthPromise =
    cachedMonth && now < cachedMonth.expiresAt
      ? Promise.resolve(cachedMonth.data)
      : (async () => {
          try {
            const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard?dates=${currentMonth}`;
            const res = await fetch(url, {
              cache: "no-store",
              headers: { "User-Agent": "EnJuego-SoccerService/1.0" },
              signal: AbortSignal.timeout(8_000),
            });
            if (!res.ok) return cachedMonth?.data || [];
            const json = await res.json();
            const parsed = parseRawEspnScoreboardEvents(
              Array.isArray(json.events) ? json.events : [],
              leagueId,
              leagueConfig.name
            );
            scoreboardCache.set(cacheKey, {
              data: parsed,
              expiresAt: Date.now() + 120_000,
            });
            return parsed;
          } catch {
            return cachedMonth?.data || [];
          }
        })();

  const livePromise =
    cachedLive && now < cachedLive.expiresAt
      ? Promise.resolve(cachedLive.data)
      : (async () => {
          try {
            // Query ESPN's real-time default scoreboard (no ?dates=YYYYMM range, so zero monthly CDN lag)
            const liveUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard`;
            const res = await fetch(liveUrl, {
              cache: "no-store",
              headers: { "User-Agent": "EnJuego-SoccerService/1.0" },
              signal: AbortSignal.timeout(6_000),
            });
            if (!res.ok) return cachedLive?.data || [];
            const json = await res.json();
            const parsed = parseRawEspnScoreboardEvents(
              Array.isArray(json.events) ? json.events : [],
              leagueId,
              leagueConfig.name
            );
            const hasLive = parsed.some((m) => m.status === "IN_PROGRESS");
            liveTodayCache.set(leagueId, {
              data: parsed,
              expiresAt: Date.now() + (hasLive ? 8_000 : 15_000),
            });
            return parsed;
          } catch {
            return cachedLive?.data || [];
          }
        })();

  const [monthMatches, liveMatches] = await Promise.all([monthPromise, livePromise]);
  const mergedMap = new Map<string, SoccerMatch>();
  for (const m of monthMatches) {
    mergedMap.set(m.id, m);
  }
  // Overwrite with real-time live scoreboard entries
  for (const lm of liveMatches) {
    mergedMap.set(lm.id, lm);
  }

  return sortSoccerMatches(Array.from(mergedMap.values()));
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
          logo: optimizeEspnLogoUrl(
            entry.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${entry.team?.id}.png`,
            64
          ),
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

/**
 * Fetch detailed match data (scores, venue, timeline of goals/cards/subs, comparative boxscore stats, lineups)
 */
export async function fetchSoccerMatchDetail(
  leagueId: SoccerLeagueId,
  matchId: string
): Promise<SoccerMatchDetail | null> {
  const cacheKey = `${leagueId}_${matchId}`;
  const now = Date.now();
  const cached = matchDetailCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const leagueConfig = SOCCER_LEAGUES[leagueId] || SOCCER_LEAGUES["uefa.champions"];
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/summary?event=${matchId}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return cached?.data || null;
    }

    const json = await res.json();
    const comp = json.header?.competitions?.[0];
    if (!comp) {
      return cached?.data || null;
    }

    const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home") || comp.competitors?.[0];
    const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away") || comp.competitors?.[1];

    const rawStatus = comp.status?.type?.name || "";
    const isCompleted = comp.status?.type?.completed === true || rawStatus.includes("FINAL") || rawStatus.includes("FULL_TIME");
    const isLive = comp.status?.type?.state === "in";

    let status: SoccerMatchDetail["status"] = "SCHEDULED";
    if (isLive) status = "IN_PROGRESS";
    else if (isCompleted) status = "FINISHED";

    const { dateCaracas, timeCaracas } = formatCaracasTime(comp.date || new Date().toISOString());

    let statusText = comp.status?.type?.shortDetail || comp.status?.type?.description || "";
    if (status === "SCHEDULED") statusText = timeCaracas;
    else if (status === "FINISHED") statusText = "Final";

    const isScheduled = status === "SCHEDULED";
    const homeScore = isScheduled || !homeComp?.score ? undefined : parseInt(homeComp.score, 10);
    const awayScore = isScheduled || !awayComp?.score ? undefined : parseInt(awayComp.score, 10);

    const translateFormDetail = (rawForm?: string): string | undefined => {
      if (!rawForm) return undefined;
      return rawForm
        .toUpperCase()
        .split("")
        .map((ch) => (ch === "W" ? "G" : ch === "D" ? "E" : ch === "L" ? "P" : ch))
        .join("-");
    };

    const homeTeam: SoccerTeam = {
      id: String(homeComp?.team?.id || "home"),
      name: homeComp?.team?.displayName || homeComp?.team?.name || "Local",
      shortName: homeComp?.team?.shortDisplayName || homeComp?.team?.name || "Local",
      abbreviation: homeComp?.team?.abbreviation || "LOC",
      logo: homeComp?.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${homeComp?.team?.id}.png`,
      score: homeScore,
      record: homeComp?.records?.[0]?.summary || undefined,
      form: translateFormDetail(homeComp?.form),
    };

    const awayTeam: SoccerTeam = {
      id: String(awayComp?.team?.id || "away"),
      name: awayComp?.team?.displayName || awayComp?.team?.name || "Visitante",
      shortName: awayComp?.team?.shortDisplayName || awayComp?.team?.name || "Visitante",
      abbreviation: awayComp?.team?.abbreviation || "VIS",
      logo: awayComp?.team?.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/soccer/500/${awayComp?.team?.id}.png`,
      score: awayScore,
      record: awayComp?.records?.[0]?.summary || undefined,
      form: translateFormDetail(awayComp?.form),
    };

    // Venue, City, Referee, Broadcast & Stage Info
    const venueObj = json.gameInfo?.venue;
    const venueName = venueObj ? (venueObj.fullName || venueObj.shortName || venueObj.address?.city) : undefined;
    const cityName = venueObj ? [venueObj.address?.city, venueObj.address?.country].filter(Boolean).join(", ") : undefined;
    const attendance = json.gameInfo?.attendance ? new Intl.NumberFormat("es-VE").format(json.gameInfo.attendance) : undefined;
    const referee =
      json.gameInfo?.officials?.[0]?.fullName ||
      json.gameInfo?.officials?.[0]?.displayName ||
      undefined;
    const stageRaw =
      comp?.series?.title ||
      json.header?.gameNote ||
      json.header?.season?.name ||
      undefined;
    const stage = stageRaw
      ? String(stageRaw)
          .replace(/League Phase/gi, "Fase de Liga")
          .replace(/Group Stage/gi, "Fase de Grupos")
          .replace(/Round of 16/gi, "Octavos de Final")
          .replace(/Quarterfinals/gi, "Cuartos de Final")
          .replace(/Semifinals/gi, "Semifinales")
          .replace(/English Premier League/gi, "Premier League")
          .replace(/Spanish LALIGA/gi, "LaLiga EA Sports")
          .replace(/Italian Serie A/gi, "Serie A")
          .replace(/German Bundesliga/gi, "Bundesliga")
          .replace(/French Ligue 1/gi, "Ligue 1")
      : undefined;
    const broadcast =
      comp?.broadcasts?.[0]?.names?.join(", ") ||
      comp?.geoBroadcasts?.[0]?.media?.shortName ||
      (leagueId === "ven.1" ? "Televen · Liga FUTVE YouTube · GOLTV" : "ESPN / Disney+");

    // Key Events: Goals, Cards, Substitutions
    const rawEvents: any[] = json.keyEvents || [];
    const events: SoccerMatchEvent[] = rawEvents
      .filter((ev) => {
        const t = ev.type?.type || "";
        return ev.scoringPlay || t.includes("goal") || t.includes("card") || t.includes("substitution");
      })
      .map((ev, idx) => {
        const rawType = ev.type?.type || "";
        let eventType: SoccerMatchEvent["type"] = "other";
        if (ev.scoringPlay || rawType.includes("goal")) {
          eventType = "goal";
        } else if (rawType.includes("yellow-card")) {
          eventType = "yellow-card";
        } else if (rawType.includes("red-card")) {
          eventType = "red-card";
        } else if (rawType.includes("substitution")) {
          eventType = "sub";
        }

        const isHome = String(ev.team?.id) === homeTeam.id;
        const player = ev.participants?.[0]?.athlete?.displayName || undefined;
        const subOut = eventType === "sub" ? ev.participants?.[1]?.athlete?.displayName : undefined;
        const assist = eventType === "goal" ? ev.participants?.[1]?.athlete?.displayName : undefined;

        return {
          id: String(ev.id || idx),
          type: eventType,
          text: ev.text || ev.type?.text || "",
          shortText: ev.shortText || ev.type?.text || "",
          minute: ev.clock?.displayValue || (ev.clock?.value ? `${Math.floor(ev.clock.value / 60)}'` : ""),
          period: ev.period?.number || 1,
          teamId: String(ev.team?.id || ""),
          teamName: ev.team?.displayName || "",
          isHome,
          player,
          subOut,
          assist,
        };
      });

    // Comparative Stats (Boxscore)
    const boxscoreTeams: any[] = json.boxscore?.teams || [];
    const homeBox = boxscoreTeams.find((t) => String(t.team?.id) === homeTeam.id || t.homeAway === "home");
    const awayBox = boxscoreTeams.find((t) => String(t.team?.id) === awayTeam.id || t.homeAway === "away");

    const statDefinitions: { name: string; label: string }[] = [
      { name: "possessionPct", label: "Posesión de Balón" },
      { name: "totalShots", label: "Remates Totales" },
      { name: "shotsOnTarget", label: "Remates al Arco" },
      { name: "wonCorners", label: "Tiros de Esquina" },
      { name: "foulsCommitted", label: "Faltas Cometidas" },
      { name: "offsides", label: "Fueras de Juego" },
      { name: "yellowCards", label: "Tarjetas Amarillas" },
      { name: "redCards", label: "Tarjetas Rojas" },
      { name: "saves", label: "Atajadas" },
      { name: "totalPasses", label: "Pases Totales" },
      { name: "passPct", label: "Efectividad de Pases" },
    ];

    const stats: SoccerStatRow[] = [];
    if (homeBox && awayBox) {
      for (const def of statDefinitions) {
        const hItem = homeBox.statistics?.find((s: any) => s.name === def.name);
        const aItem = awayBox.statistics?.find((s: any) => s.name === def.name);
        if (hItem || aItem) {
          const hVal = hItem?.displayValue ?? "0";
          const aVal = aItem?.displayValue ?? "0";
          let hNum = parseFloat(hVal) || 0;
          let aNum = parseFloat(aVal) || 0;

          let hDisplay = hVal;
          let aDisplay = aVal;
          if (def.name === "possessionPct") {
            hDisplay = `${hVal}%`;
            aDisplay = `${aVal}%`;
          } else if (def.name === "passPct") {
            hDisplay = `${Math.round(hNum * 100)}%`;
            aDisplay = `${Math.round(aNum * 100)}%`;
            hNum = Math.round(hNum * 100);
            aNum = Math.round(aNum * 100);
          }

          stats.push({
            name: def.name,
            label: def.label,
            homeDisplay: hDisplay,
            awayDisplay: aDisplay,
            homeValue: hNum,
            awayValue: aNum,
          });
        }
      }
    }

    // Helper: Translate position code to Spanish
    const translatePositionSpanish = (abbr?: string): string => {
      const code = (abbr || "").toUpperCase();
      if (code === "G" || code === "GK") return "Portero";
      if (code.startsWith("CD") || code === "CB" || code === "D") return "Defensa central";
      if (code === "LB" || code === "LWB") return "Lateral izquierdo";
      if (code === "RB" || code === "RWB") return "Lateral derecho";
      if (code.startsWith("DM") || code === "CDM") return "Mediocampista defensivo";
      if (code === "AM-L" || code === "LM" || code === "LW") return "Mediocampista ofensivo izq.";
      if (code === "AM-R" || code === "RM" || code === "RW") return "Mediocampista ofensivo der.";
      if (code.startsWith("AM") || code === "CAM") return "Mediocampista ofensivo";
      if (code.startsWith("CM") || code === "M") return "Mediocampista central";
      if (code.startsWith("F") || code === "ST" || code === "CF") return "Delantero centro";
      return "Jugador";
    };

    // Helper: Translate raw ESPN English commentary into Spanish
    const translatePlayTextSpanish = (rawText: string): string => {
      if (!rawText) return "";
      let t = rawText.trim();
      t = t.replace(/^Goal!\s*/i, "Gol. ");
      t = t.replace(/^Attempt saved\.\s*/i, "Atajada. ");
      t = t.replace(/^Attempt missed\.\s*/i, "Fuera de portería. ");
      t = t.replace(/^Attempt blocked\.\s*/i, "Disparo bloqueado. ");
      t = t.replace(/^First Half begins\./i, "Comienza el Primer Tiempo.");
      t = t.replace(/^First Half ends,\s*/i, "Final del Primer Tiempo: ");
      t = t.replace(/^Second Half begins\s*/i, "Comienza el Segundo Tiempo ");
      t = t.replace(/^Second Half ends,\s*/i, "Final del Segundo Tiempo: ");
      t = t.replace(/^Match ends,\s*/i, "Final del partido: ");
      t = t.replace(/^Lineups are announced and players are warming up\./i, "Alineaciones confirmadas y equipos realizando el calentamiento.");
      t = t.replace(/^Corner,\s*/i, "Tiro de esquina para ");
      t = t.replace(/Conceded by\s+([^.]+)\./gi, "Cedido por $1.");
      t = t.replace(/^Foul by\s+([^(]+)\(([^)]+)\)\./i, "Falta cometida por $1 ($2).");
      t = t.replace(/wins a free kick in the defensive half\./gi, "recibe falta en zona defensiva.");
      t = t.replace(/wins a free kick in the attacking half\./gi, "recibe falta en zona de ataque.");
      t = t.replace(/wins a free kick on the left wing\./gi, "recibe falta por la banda izquierda.");
      t = t.replace(/wins a free kick on the right wing\./gi, "recibe falta por la banda derecha.");
      t = t.replace(/^Offside,\s*([^.]+)\./i, "Fuera de juego de $1.");
      t = t.replace(/^Delay in match\s+because of an injury\s*/i, "Partido detenido por atención médica ");
      t = t.replace(/^Delay over\.\s*They are ready to continue\./i, "Se reanuda el encuentro.");
      t = t.replace(/right footed shot/gi, "remate con la derecha");
      t = t.replace(/left footed shot/gi, "remate con la izquierda");
      t = t.replace(/header/gi, "remate de cabeza");
      t = t.replace(/from the centre of the box/gi, "desde el centro del área");
      t = t.replace(/from the left side of the box/gi, "desde la izquierda del área");
      t = t.replace(/from the right side of the box/gi, "desde la derecha del área");
      t = t.replace(/from outside the box/gi, "desde fuera del área");
      t = t.replace(/from very close range/gi, "a quemarropa");
      t = t.replace(/is saved in the bottom left corner by/gi, "es atajado abajo a la izquierda por");
      t = t.replace(/is saved in the bottom right corner by/gi, "es atajado abajo a la derecha por");
      t = t.replace(/is saved in the centre of the goal by/gi, "es contenido en el centro del arco por");
      t = t.replace(/is saved in the top centre of the goal by/gi, "es desviado arriba al centro por");
      t = t.replace(/is saved in the top left corner by/gi, "es atajado en el ángulo izquierdo por");
      t = t.replace(/is saved in the top right corner by/gi, "es atajado en el ángulo derecho por");
      t = t.replace(/to the bottom left corner\./gi, "junto al poste izquierdo.");
      t = t.replace(/to the bottom right corner\./gi, "junto al poste derecho.");
      t = t.replace(/to the top left corner\./gi, "al ángulo superior izquierdo.");
      t = t.replace(/to the top right corner\./gi, "al ángulo superior derecho.");
      t = t.replace(/to the centre of the goal\./gi, "al centro de la portería.");
      t = t.replace(/is blocked\./gi, "es bloqueado por la defensa.");
      t = t.replace(/misses to the left\./gi, "se marcha desviado por la izquierda.");
      t = t.replace(/misses to the right\./gi, "se marcha desviado por la derecha.");
      t = t.replace(/is high and wide to the left\./gi, "se va alto y desviado a la izquierda.");
      t = t.replace(/is high and wide to the right\./gi, "se va alto y desviado a la derecha.");
      t = t.replace(/is too high\./gi, "se marcha por encima del travesaño.");
      t = t.replace(/is close, but misses to the left\./gi, "pasa muy cerca del poste izquierdo.");
      t = t.replace(/is close, but misses to the right\./gi, "pasa muy cerca del poste derecho.");
      t = t.replace(/Assisted by\s+([^.]+)\./gi, "Asistencia: $1.");
      t = t.replace(/is shown the yellow card for a bad foul\./gi, "recibe tarjeta amarilla por falta.");
      t = t.replace(/is shown the yellow card\./gi, "recibe tarjeta amarilla.");
      t = t.replace(/is shown the red card\./gi, "recibe tarjeta roja.");
      t = t.replace(/Substitution,\s*([^.]+)\.\s*([^I]+)\s+replaces\s+([^.]+)\./gi, "Cambio en $1: entra $2 por $3.");
      return t;
    };

    // Map player metadata by displayName for quick lookup in shots
    const playerMetaMap = new Map<string, { jersey: string; posLabel: string; shortName: string }>();

    // Lineups (Rosters)
    const rawRosters: any[] = json.rosters || [];
    let lineups: SoccerMatchDetail["lineups"] = undefined;
    if (rawRosters.length >= 2) {
      const normalizeHex = (rawHex: string | undefined, fallback: string): { bg: string; text: string } => {
        const clean = (rawHex || "").replace("#", "").trim();
        if (!clean || clean.length !== 6) return { bg: fallback, text: "#ffffff" };
        // If uniform is white/very light, use dark text or team fallback so jersey stands out on green pitch
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum > 0.82) {
          return { bg: "#1e293b", text: "#ffffff" };
        }
        return { bg: `#${clean}`, text: "#ffffff" };
      };

      const parseRoster = (r: any, isHomeRoster: boolean) => {
        const formation = r?.formation || "4-2-3-1";
        const uniformInfo = normalizeHex(r?.uniform?.color, isHomeRoster ? "#2563eb" : "#dc2626");
        const all: any[] = r?.roster || [];

        const mapPlayer = (p: any, isStarter: boolean): SoccerLineupPlayer => {
          const fullName = p.athlete?.displayName || p.athlete?.fullName || "Jugador";
          const shortName = p.athlete?.lastName || p.athlete?.shortName || fullName.split(" ").pop() || fullName;
          const posAbbr = p.position?.abbreviation || p.position?.name || "";
          const posNameSpanish = translatePositionSpanish(posAbbr);
          const jersey = String(p.jersey || "");

          playerMetaMap.set(fullName.toLowerCase(), {
            jersey,
            posLabel: posNameSpanish,
            shortName,
          });

          const getStatVal = (abbr: string): number => {
            const st = (p.stats || []).find((s: any) => s.abbreviation === abbr);
            return st?.value !== undefined ? Number(st.value) : parseInt(st?.displayValue || "0", 10) || 0;
          };

          return {
            id: String(p.athlete?.id || p.jersey || Math.random()),
            name: fullName,
            shortName,
            jersey,
            position: posAbbr,
            positionNameSpanish: posNameSpanish,
            formationPlace: Number(p.formationPlace) || 0,
            starter: isStarter,
            goals: getStatVal("G"),
            assists: getStatVal("A"),
            yellowCards: getStatVal("YC"),
            redCards: getStatVal("RC"),
            shots: getStatVal("SHOT"),
            shotsOnTarget: getStatVal("SOG"),
            subbedOut: Boolean(p.subbedOut),
            subbedIn: Boolean(p.subbedIn),
          };
        };

        const starters: SoccerLineupPlayer[] = all
          .filter((p) => p.starter === true)
          .map((p) => mapPlayer(p, true));
        const bench: SoccerLineupPlayer[] = all
          .filter((p) => p.starter === false)
          .map((p) => mapPlayer(p, false));

        return {
          formation,
          uniformColor: uniformInfo.bg,
          uniformTextColor: uniformInfo.text,
          gkColor: "#3f3f46",
          starters,
          bench,
        };
      };

      const homeRosterRaw = rawRosters.find((r) => String(r.team?.id) === homeTeam.id || r.homeAway === "home") || rawRosters[0];
      const awayRosterRaw = rawRosters.find((r) => String(r.team?.id) === awayTeam.id || r.homeAway === "away") || rawRosters[1];

      lineups = {
        home: parseRoster(homeRosterRaw, true),
        away: parseRoster(awayRosterRaw, false),
      };
    }

    // Parse Commentary, Shots (with pitch/goal coordinates), Momentum (45 bins of 2 mins), and Latest Play
    const rawComm: any[] = Array.isArray(json.commentary) ? json.commentary : [];
    const shots: SoccerShotEvent[] = [];
    const commentary: SoccerCommentaryItem[] = [];

    // Initialize 46 bins (0' to 90' in 2-minute intervals)
    const momentumBins: SoccerMomentumBin[] = Array.from({ length: 46 }, (_, i) => ({
      binIndex: i,
      minuteStart: i * 2,
      minuteLabel: `${i * 2}'`,
      homePressure: 0,
      awayPressure: 0,
      markers: [],
    }));

    const addMomentumImpulse = (minuteNum: number, isHomeImpulse: boolean, amount: number) => {
      const idx = Math.max(0, Math.min(45, Math.floor(minuteNum / 2)));
      if (isHomeImpulse) {
        momentumBins[idx].homePressure += amount;
        if (idx > 0) momentumBins[idx - 1].homePressure += Math.round(amount * 0.35);
        if (idx < 45) momentumBins[idx + 1].homePressure += Math.round(amount * 0.35);
      } else {
        momentumBins[idx].awayPressure += amount;
        if (idx > 0) momentumBins[idx - 1].awayPressure += Math.round(amount * 0.35);
        if (idx < 45) momentumBins[idx + 1].awayPressure += Math.round(amount * 0.35);
      }
    };

    // Place keyEvent markers onto momentum timeline
    for (const ev of events) {
      const minNum = parseInt(ev.minute.replace(/[^0-9]/g, ""), 10) || 1;
      const idx = Math.max(0, Math.min(45, Math.floor(minNum / 2)));
      if (ev.type === "goal" || ev.type === "yellow-card" || ev.type === "red-card") {
        momentumBins[idx].markers.push({
          type: ev.type,
          isHome: ev.isHome,
          minute: ev.minute,
          player: ev.player,
        });
      }
      if (ev.type === "goal") {
        addMomentumImpulse(minNum, ev.isHome, 48);
      }
    }

    let latestPlay: SoccerMatchDetail["latestPlay"] = undefined;

    for (let i = 0; i < rawComm.length; i++) {
      const item = rawComm[i];
      const play = item.play || {};
      const rawText = String(item.text || play.text || "");
      const minuteDisplay = String(item.time?.displayValue || play.clock?.displayValue || "");
      const clockSec = Number(item.time?.value ?? play.clock?.value ?? 0);
      const minuteNum = Math.max(0, Math.min(90, Math.floor(clockSec / 60)));
      const playType = String(play.type?.type || "").toLowerCase();
      const playTypeText = String(play.type?.text || "").toLowerCase();

      const teamDisplayName = String(play.team?.displayName || "");
      const isHomePlay =
        teamDisplayName
          ? teamDisplayName.toLowerCase() === homeTeam.name.toLowerCase() ||
            teamDisplayName.toLowerCase().includes(homeTeam.shortName.toLowerCase())
          : rawText.includes(`(${homeTeam.name})`) || rawText.includes(`(${homeTeam.shortName})`);

      // Momentum impulses from commentary plays
      if (playType.includes("goal") || play.scoringPlay) {
        addMomentumImpulse(minuteNum, isHomePlay, 45);
      } else if (playType.includes("shot-on-target") || rawText.startsWith("Attempt saved")) {
        addMomentumImpulse(minuteNum, isHomePlay, 30);
      } else if (playType.includes("shot") || rawText.startsWith("Attempt ")) {
        addMomentumImpulse(minuteNum, isHomePlay, 20);
      } else if (playType.includes("corner") || rawText.startsWith("Corner")) {
        addMomentumImpulse(minuteNum, isHomePlay, 15);
      } else if (rawText.includes("free kick in the attacking half")) {
        addMomentumImpulse(minuteNum, isHomePlay, 10);
      } else if (teamDisplayName) {
        addMomentumImpulse(minuteNum, isHomePlay, 5);
      }

      const textSpanish = translatePlayTextSpanish(rawText);

      // Classify commentary item
      let commType: SoccerCommentaryItem["type"] = "info";
      if (play.scoringPlay || playType.includes("goal") || rawText.startsWith("Goal!")) commType = "goal";
      else if (playType.includes("shot") || rawText.startsWith("Attempt ")) commType = "shot";
      else if (playType.includes("card") || rawText.includes("card")) commType = "card";
      else if (playType.includes("substitution") || rawText.startsWith("Substitution")) commType = "sub";
      else if (playType.includes("corner") || rawText.startsWith("Corner")) commType = "corner";
      else if (playType.includes("foul") || rawText.startsWith("Foul")) commType = "foul";
      else if (rawText.includes("Half") || rawText.includes("Match ends")) commType = "whistle";

      if (textSpanish) {
        commentary.push({
          id: String(play.id || item.sequence || i),
          minute: minuteDisplay,
          textSpanish,
          type: commType,
          isHome: teamDisplayName ? isHomePlay : undefined,
        });
      }

      // Check if this is a shot event with coordinates
      const isShot =
        commType === "goal" ||
        commType === "shot" ||
        playType.includes("shot") ||
        playTypeText.includes("shot") ||
        (play.fieldPositionX !== undefined && (rawText.startsWith("Attempt ") || rawText.startsWith("Goal!")));

      if (isShot) {
        const playerFull =
          play.participants?.[0]?.athlete?.displayName ||
          (rawText.match(/\.\s*([^(]+)\s*\(/)?.[1]?.trim()) ||
          "Jugador";
        const meta = playerMetaMap.get(playerFull.toLowerCase());
        const shortPlayer =
          meta?.shortName ||
          (playerFull.includes(" ")
            ? `${playerFull.split(" ")[0][0]}. ${playerFull.split(" ").slice(1).join(" ")}`
            : playerFull);

        let outcome: SoccerShotEvent["outcome"] = "off_target";
        if (commType === "goal" || play.scoringPlay) outcome = "goal";
        else if (playType.includes("on-target") || rawText.startsWith("Attempt saved")) outcome = "saved";
        else if (playType.includes("blocked") || rawText.startsWith("Attempt blocked")) outcome = "blocked";
        else outcome = "off_target";

        const rawX = typeof play.fieldPositionX === "number" ? play.fieldPositionX : 86;
        const rawY = typeof play.fieldPositionY === "number" ? play.fieldPositionY : 50;
        const rawEndX = typeof play.fieldPosition2X === "number" ? play.fieldPosition2X : 100;
        const rawEndY = typeof play.fieldPosition2Y === "number" ? play.fieldPosition2Y : 50;
        const goalY = typeof play.goalPositionY === "number" ? play.goalPositionY : rawEndY;

        // Derive goalZ (height in goal mouth: 0 = ground, 100 = above crossbar)
        let goalZ = 32;
        if (rawText.includes("top left") || rawText.includes("top right") || rawText.includes("top centre")) {
          goalZ = 72;
        } else if (rawText.includes("too high") || rawText.includes("high and wide")) {
          goalZ = 92;
        } else if (rawText.includes("bottom")) {
          goalZ = 18;
        } else if (outcome === "off_target") {
          goalZ = 65;
        }

        const shotType = rawText.toLowerCase().includes("left footed")
          ? "Pie izquierdo"
          : rawText.toLowerCase().includes("header")
          ? "Cabeza"
          : "Pie derecho";

        const situation = rawText.toLowerCase().includes("penalty")
          ? "Penal"
          : rawText.toLowerCase().includes("free kick")
          ? "Tiro libre"
          : rawText.toLowerCase().includes("corner")
          ? "Tras córner"
          : rawText.toLowerCase().includes("fast break")
          ? "Contraataque"
          : "Jugada en curso";

        let goalZone = "-";
        if (rawText.includes("bottom left")) goalZone = "Abajo a la izquierda";
        else if (rawText.includes("bottom right")) goalZone = "Abajo a la derecha";
        else if (rawText.includes("top left")) goalZone = "Ángulo superior izq.";
        else if (rawText.includes("top right")) goalZone = "Ángulo superior der.";
        else if (rawText.includes("centre of the goal")) goalZone = "Centro de la portería";

        // Distance to goal center (x=100, y=50) on a 105m x 68m FIFA pitch
        const dxMeters = ((100 - rawX) / 100) * 105;
        const dyMeters = ((rawY - 50) / 100) * 68;
        const distMeters = Math.max(2, Math.round(Math.hypot(dxMeters, dyMeters)));

        // Realistic xG estimation from distance & angle
        let xgVal = 0.04;
        if (situation === "Penal") {
          xgVal = 0.79;
        } else {
          const distFactor = Math.exp(-distMeters / 9.5);
          const angleFactor = Math.max(0.25, 1 - Math.abs(rawY - 50) / 55);
          const headPenalty = shotType === "Cabeza" ? 0.65 : 1.0;
          xgVal = Math.min(0.85, Math.max(0.02, distFactor * angleFactor * headPenalty * 1.15));
        }
        const xgotVal =
          outcome === "goal"
            ? Math.min(0.96, xgVal * 1.65 + 0.12)
            : outcome === "saved"
            ? Math.min(0.75, xgVal * 1.15)
            : 0;

        shots.push({
          id: String(play.id || `shot-${i}`),
          minute: minuteDisplay || `${minuteNum}'`,
          clockSeconds: clockSec,
          period: play.period?.number || 1,
          isHome: isHomePlay,
          teamName: isHomePlay ? homeTeam.name : awayTeam.name,
          teamAbbr: isHomePlay ? homeTeam.abbreviation : awayTeam.abbreviation,
          playerName: playerFull,
          playerShortName: shortPlayer,
          jersey: meta?.jersey,
          positionLabel: meta?.posLabel || "Jugador",
          outcome,
          x: rawX,
          y: rawY,
          endX: rawEndX,
          endY: rawEndY,
          goalY,
          goalZ,
          shotType,
          situation,
          goalZone,
          distanceMeters: distMeters,
          xg: xgVal.toFixed(2),
          xgot: xgotVal.toFixed(2),
          textSpanish,
        });
      }
    }

    // Normalize momentum bars to 0..100
    for (const bin of momentumBins) {
      bin.homePressure = Math.min(100, bin.homePressure);
      bin.awayPressure = Math.min(100, bin.awayPressure);
    }

    // Build latestPlay for the 2.5D Stadium widget
    const lastComm = commentary[commentary.length - 1];
    const lastShot = shots[shots.length - 1];
    const shortDetailRaw = String(comp.status?.type?.shortDetail || "");
    const bannerTitle =
      status === "FINISHED"
        ? "FINAL DEL PARTIDO"
        : shortDetailRaw === "HT" || shortDetailRaw === "Halftime" || statusText.includes("ET")
        ? "MEDIO TIEMPO"
        : status === "IN_PROGRESS"
        ? lastComm?.type === "goal"
          ? "¡GOL!"
          : "EN JUEGO"
        : "PREVIA DEL PARTIDO";

    latestPlay = {
      minute: lastComm?.minute || statusText || "90'",
      bannerTitle,
      headlineSpanish:
        bannerTitle === "MEDIO TIEMPO"
          ? "Medio tiempo"
          : status === "FINISHED"
          ? "Partido finalizado"
          : lastComm?.type === "goal"
          ? "¡Gol en el partido!"
          : "Última acción registrada",
      detailSpanish:
        lastComm?.textSpanish ||
        `Encuentro entre ${homeTeam.name} y ${awayTeam.name} en ${venueName || "el estadio"}.`,
      isHome: lastComm?.isHome,
      x: lastShot?.x ?? 50,
      y: lastShot?.y ?? 50,
    };

    const detail: SoccerMatchDetail = {
      id: String(matchId),
      leagueId,
      leagueName: leagueConfig.name,
      date: comp.date || new Date().toISOString(),
      dateCaracas,
      timeCaracas,
      status,
      statusText,
      venue: venueName,
      city: cityName,
      attendance,
      referee,
      stage,
      broadcast,
      homeTeam,
      awayTeam,
      events,
      stats,
      lineups,
      shots,
      momentum: momentumBins,
      commentary: commentary.slice().reverse(),
      latestPlay,
    };

    const ttl = isLive ? 8 * 1000 : isCompleted ? 60 * 60 * 1000 : 30 * 1000;
    matchDetailCache.set(cacheKey, {
      data: detail,
      expiresAt: now + ttl,
    });

    return detail;
  } catch (err) {
    console.error(`[SoccerService] Error fetching match detail ${matchId} for ${leagueId}:`, err);
    return cached?.data || null;
  }
}
