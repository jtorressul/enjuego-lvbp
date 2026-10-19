import { NextResponse } from "next/server";
import { MLB_TEAMS } from "@/lib/mlb-teams";

export const dynamic = "force-dynamic";

export interface PostseasonSeriesTeam {
  id: number;
  code: string;
  nick: string;
  name: string;
  logoUrl: string;
  score: number | null;
  seriesWins: number;
  isPlaceholder?: boolean;
}

export interface PostseasonSeriesGameItem {
  gamePk: string;
  gameNumber: number;
  officialDate: string;
  gameDateIso: string;
  status: "FINISHED" | "IN_PROGRESS" | "SCHEDULED";
  statusDetail: string;
  awayTeamId: number;
  homeTeamId: number;
  awayScore: number | null;
  homeScore: number | null;
}

export interface PostseasonBracketNode {
  seriesId: string; // F_3, F_4, F_1, F_2, D_4, D_3, D_2, D_1, L_2, L_1, W_1
  round: "WC" | "DS" | "CS" | "WS";
  bestOf: number;
  dateLabel: string;
  gameLabel: string;
  activeGamePk: string | null;
  status: "FINISHED" | "IN_PROGRESS" | "SCHEDULED";
  topTeam: PostseasonSeriesTeam;
  bottomTeam: PostseasonSeriesTeam;
  summaryText: string;
  games: PostseasonSeriesGameItem[];
}

const MLB_ID_TO_META = new Map<number, (typeof MLB_TEAMS)[string]>();
for (const meta of Object.values(MLB_TEAMS)) {
  MLB_ID_TO_META.set(meta.id, meta);
}

function resolveTeamInfo(rawTeam: { id?: number; name?: string; abbreviation?: string } | undefined): {
  id: number;
  code: string;
  nick: string;
  name: string;
  logoUrl: string;
  isPlaceholder?: boolean;
} {
  const id = Number(rawTeam?.id ?? 0);
  const found = MLB_ID_TO_META.get(id);
  if (found) {
    return {
      id: found.id,
      code: found.code,
      nick: found.nick,
      name: found.name,
      logoUrl: found.logoSvg,
    };
  }
  const rawName = rawTeam?.name || "Por definir";
  const isPlaceholder = id < 100 || rawName.includes("/");
  return {
    id,
    code: rawTeam?.abbreviation || rawName,
    nick: rawName,
    name: rawName,
    logoUrl: isPlaceholder
      ? "https://www.mlbstatic.com/team-logos/league-on-dark/1.svg"
      : `https://www.mlbstatic.com/team-logos/${id}.svg`,
    isPlaceholder,
  };
}

function formatSpanishBracketDate(officialDate: string, includeWeekday: boolean): string {
  if (!officialDate) return "";
  // Check relative to current date in America/Caracas (2026-10-18)
  const nowCaracas = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [yNow, mNow, dNow] = nowCaracas.split("-").map(Number);
  const todayUtc = Date.UTC(yNow, mNow - 1, dNow);

  const [y, m, d] = officialDate.split("-").map(Number);
  if (!y || !m || !d) return officialDate;
  const targetUtc = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((targetUtc - todayUtc) / 86400000);

  if (diffDays === 0) return "Hoy";
  if (diffDays === -1) return "Ayer";
  if (diffDays === 1) return "Mañana";

  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dow = new Date(targetUtc).getUTCDay();
  const dayMonth = `${d}/${m}`;
  return includeWeekday ? `${weekdays[dow]}, ${dayMonth}` : dayMonth;
}

// Preferred top/bottom ordering so bracket flow lines match the visual bracket cleanly
const PREFERRED_TOP_TEAM_BY_SERIES: Record<string, number[]> = {
  F_3: [144], // Braves on top, Phillies bottom
  F_4: [135], // Padres on top, Cubs bottom
  F_1: [117], // Astros on top, White Sox bottom
  F_2: [147], // Yankees on top, Red Sox bottom
  D_4: [144, 143], // Winner of F_3 (Braves) on top, Dodgers bottom
  D_3: [135, 112], // Winner of F_4 (Padres) on top, Brewers bottom
  D_2: [114], // Guardians on top, White Sox bottom
  D_1: [147, 111], // Winner of F_2 (Yankees) on top, Rays bottom
  L_2: [119, 144, 143], // Winner of D_4 (Dodgers) on top, Brewers bottom
  L_1: [114, 145], // Winner of D_2 (Guardians) on top, Rays bottom
  W_1: [158, 119], // NL Champion (Brewers) on top, AL Champion bottom
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season") || "2026";

  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule/postseason/series?season=${season}&sportId=1`,
      { next: { revalidate: 25 } }
    );
    if (!res.ok) {
      throw new Error(`MLB postseason API returned ${res.status}`);
    }
    const data = await res.json();
    const rawSeriesList = Array.isArray(data?.series) ? data.series : [];

    const byId: Record<string, PostseasonBracketNode> = {};

    for (const s of rawSeriesList) {
      const seriesId: string = s?.series?.id || "";
      if (!seriesId) continue;

      const rawGames: any[] = Array.isArray(s?.games) ? s.games : [];
      if (rawGames.length === 0) continue;

      const round: "WC" | "DS" | "CS" | "WS" = seriesId.startsWith("F")
        ? "WC"
        : seriesId.startsWith("D")
          ? "DS"
          : seriesId.startsWith("L")
            ? "CS"
            : "WS";

      const bestOf = round === "WC" ? 3 : round === "DS" ? 5 : 7;
      const winsNeeded = Math.ceil(bestOf / 2);

      // Map all games in this series
      const games: PostseasonSeriesGameItem[] = rawGames.map((g) => {
        const code = g?.status?.abstractGameCode;
        const st: "FINISHED" | "IN_PROGRESS" | "SCHEDULED" =
          code === "F" ? "FINISHED" : code === "L" ? "IN_PROGRESS" : "SCHEDULED";
        return {
          gamePk: String(g?.gamePk || ""),
          gameNumber: Number(g?.seriesGameNumber || 1),
          officialDate: String(g?.officialDate || ""),
          gameDateIso: String(g?.gameDate || ""),
          status: st,
          statusDetail: String(g?.status?.detailedState || ""),
          awayTeamId: Number(g?.teams?.away?.team?.id || 0),
          homeTeamId: Number(g?.teams?.home?.team?.id || 0),
          awayScore:
            st === "SCHEDULED"
              ? null
              : typeof g?.teams?.away?.score === "number"
                ? g.teams.away.score
                : null,
          homeScore:
            st === "SCHEDULED"
              ? null
              : typeof g?.teams?.home?.score === "number"
                ? g.teams.home.score
                : null,
        };
      });

      // Pick the active display game:
      // 1. Live game if any
      // 2. Otherwise the latest finished game
      // 3. Otherwise the first scheduled game
      const liveRaw = rawGames.find((g) => g?.status?.abstractGameCode === "L");
      const finishedRaws = rawGames.filter((g) => g?.status?.abstractGameCode === "F");
      const activeRaw =
        liveRaw ||
        (finishedRaws.length > 0 ? finishedRaws[finishedRaws.length - 1] : rawGames[0]);

      const awayRaw = activeRaw?.teams?.away;
      const homeRaw = activeRaw?.teams?.home;

      const awayMeta = resolveTeamInfo(awayRaw?.team);
      const homeMeta = resolveTeamInfo(homeRaw?.team);

      const awaySeriesWins = Number(awayRaw?.leagueRecord?.wins ?? 0);
      const homeSeriesWins = Number(homeRaw?.leagueRecord?.wins ?? 0);

      const activeCode = activeRaw?.status?.abstractGameCode;
      const activeStatus: "FINISHED" | "IN_PROGRESS" | "SCHEDULED" =
        activeCode === "F" ? "FINISHED" : activeCode === "L" ? "IN_PROGRESS" : "SCHEDULED";

      const awayScore =
        activeStatus === "SCHEDULED"
          ? null
          : typeof awayRaw?.score === "number"
            ? awayRaw.score
            : null;
      const homeScore =
        activeStatus === "SCHEDULED"
          ? null
          : typeof homeRaw?.score === "number"
            ? homeRaw.score
            : null;

      const teamA: PostseasonSeriesTeam = {
        ...awayMeta,
        score: awayScore,
        seriesWins: awaySeriesWins,
      };
      const teamB: PostseasonSeriesTeam = {
        ...homeMeta,
        score: homeScore,
        seriesWins: homeSeriesWins,
      };

      const preferredTopIds = PREFERRED_TOP_TEAM_BY_SERIES[seriesId] || [];
      let topTeam = teamB;
      let bottomTeam = teamA;
      if (preferredTopIds.includes(teamA.id)) {
        topTeam = teamA;
        bottomTeam = teamB;
      } else if (preferredTopIds.includes(teamB.id)) {
        topTeam = teamB;
        bottomTeam = teamA;
      }

      // Compute series summary text in Spanish matching the exact screenshot style:
      // - If series is won: "ATL gana por 2 – 1"
      // - If series is tied and in progress: "Serie empatada 2 - 2, El mejor de 7"
      // - If one team leads in progress: "CLE lidera 2 - 1, El mejor de 7"
      // - If not started (0-0): "El mejor de 7"
      let summaryText = `El mejor de ${bestOf}`;
      if (topTeam.seriesWins >= winsNeeded || bottomTeam.seriesWins >= winsNeeded) {
        const winner = topTeam.seriesWins >= bottomTeam.seriesWins ? topTeam : bottomTeam;
        const loser = winner === topTeam ? bottomTeam : topTeam;
        summaryText = `${winner.code} gana por ${winner.seriesWins} – ${loser.seriesWins}`;
      } else if (topTeam.seriesWins > 0 || bottomTeam.seriesWins > 0) {
        if (topTeam.seriesWins === bottomTeam.seriesWins) {
          summaryText = `Serie empatada ${topTeam.seriesWins} - ${bottomTeam.seriesWins}, El mejor de ${bestOf}`;
        } else {
          const leader = topTeam.seriesWins > bottomTeam.seriesWins ? topTeam : bottomTeam;
          const trailer = leader === topTeam ? bottomTeam : topTeam;
          summaryText = `${leader.code} lidera ${leader.seriesWins} - ${trailer.seriesWins}, El mejor de ${bestOf}`;
        }
      }

      const includeWeekday = round !== "WC";
      const dateLabel = formatSpanishBracketDate(
        String(activeRaw?.officialDate || ""),
        includeWeekday
      );
      const gameNumber = Number(activeRaw?.seriesGameNumber || 1);

      byId[seriesId] = {
        seriesId,
        round,
        bestOf,
        dateLabel,
        gameLabel: `Partido ${gameNumber}`,
        activeGamePk: activeRaw?.gamePk ? String(activeRaw.gamePk) : null,
        status: activeStatus,
        topTeam,
        bottomTeam,
        summaryText,
        games,
      };
    }

    return NextResponse.json(
      {
        season: Number(season),
        seriesById: byId,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error consultando postemporada MLB", seriesById: {} },
      { status: 500 }
    );
  }
}
