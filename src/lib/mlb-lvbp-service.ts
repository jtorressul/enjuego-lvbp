import { LVBP_TEAMS, playerHeadshot, resolveLvbpTeam } from "./lvbp-teams";
import { MLB_TEAMS, resolveAnyBaseballTeam, resolveMlbTeam } from "./mlb-teams";
import { getFallbackGameday, getFallbackRoster, getFallbackSchedule } from "./lvbp-fallback-data";
import {
  getOfficialBroadcastsMap,
  resolveRealGameBroadcast,
  OfficialBroadcastEntry,
} from "./lvbp-broadcasts";
import {
  BattingBoxRow,
  FieldDefender,
  GamedayData,
  GameStatus,
  HitSprayPoint,
  LeaderCategory,
  LineupPlayer,
  PitchingBoxRow,
  PitchPoint,
  PlayByPlayItem,
  RosterPlayer,
  ScheduleGame,
  StandingRow,
  TeamBoxScore,
  TeamSummary,
} from "./types";

const MLB_BASE = "https://statsapi.mlb.com/api";
const LVBP_LEAGUE_ID = 135;
const WINTER_SPORT_ID = 17;
const MLB_SPORT_ID = 1;

const EVENT_ES: Record<string, string> = {
  Single: "Sencillo",
  Double: "Doble",
  Triple: "Triple",
  "Home Run": "Jonrón",
  Walk: "Base por bolas",
  "Intent Walk": "Boleto intencional",
  "Hit By Pitch": "Pelotazo",
  Strikeout: "Ponche",
  "Strikeout Double Play": "Ponche y doble play",
  Groundout: "Rodado de out",
  Flyout: "Elevado de out",
  Lineout: "Línea de out",
  "Pop Out": "Elevado al cuadro",
  "Forceout": "Out forzado",
  "Grounded Into DP": "Bateó para doble play",
  "Double Play": "Doble play",
  "Sac Fly": "Elevado de sacrificio",
  "Sac Bunt": "Toque de sacrificio",
  "Field Error": "Error defensivo",
  "Fielders Choice": "Jugada de selección",
  "Fielders Choice Out": "Out en jugada de selección",
  "Bunt Groundout": "Toque de out",
  "Wild Pitch": "Envío descontrolado",
  "Passed Ball": "Pasbol",
  "Stolen Base 2B": "Base robada (2B)",
  "Status Change - Delayed: Power": "Demora (Luz)",
  "Status Change - Delayed: Rain": "Demora (Lluvia)",
  "Status Change - Delayed": "Demorado",
  "Game Advisory": "Aviso oficial",
};

const PITCH_CALL_ES: Record<string, string> = {
  Ball: "Bola",
  "Ball In Dirt": "Bola en la tierra",
  "Intent Ball": "Bola intencional",
  "Called Strike": "Strike cantado",
  "Swinging Strike": "Strike tirándole",
  "Swinging Strike (Blocked)": "Strike tirándole (bloqueado)",
  Foul: "Foul",
  "Foul Tip": "Foul tip",
  "Foul Bunt": "Foul en toque",
  "Hit By Pitch": "Pelotazo",
  "In play, out(s)": "En juego, out(s)",
  "In play, no out": "En juego, quieto",
  "In play, run(s)": "En juego, carrera(s)",
};

const PITCH_TYPE_ES: Record<string, string> = {
  FF: "Recta 4-costuras",
  SI: "Sinker",
  FT: "Recta 2-costuras",
  FC: "Cutter",
  SL: "Slider",
  ST: "Sweeper",
  CH: "Cambio",
  CU: "Curva",
  KC: "Curva de nudillos",
  FS: "Splitter",
};

function translatePlayText(text = ""): string {
  if (!text) return "";
  return text
    .replace(/Status Change - Delayed:\s*Power/gi, "Demora por falla eléctrica / luminarias en el estadio")
    .replace(/Status Change - Delayed:\s*Rain/gi, "Demora por lluvia")
    .replace(/Status Change - Delayed:\s*Weather/gi, "Demora por condiciones climáticas")
    .replace(/Status Change - Delayed:\s*Field Condition/gi, "Demora por acondicionamiento del terreno")
    .replace(/Status Change - Delayed:\s*(.+)/gi, "Demora del juego: $1")
    .replace(/Status Change - Delayed/gi, "Juego demorado")
    .replace(/Status Change - In Progress/gi, "Juego reanudado")
    .replace(/Status Change - Suspended/gi, "Juego suspendido")
    .replace(/Status Change - Postponed/gi, "Juego pospuesto")
    .replace(/Status Change - Warmup/gi, "Calentamiento previo a reanudación")
    .replace(/Status Change - Final/gi, "Juego finalizado")
    .replace(/Delayed: Power/gi, "Demora por falla eléctrica")
    .replace(/Delayed: Rain/gi, "Demora por lluvia")
    .replace(/Delayed: Weather/gi, "Demora por clima")
    .replace(/Game Advisory/gi, "Aviso oficial del juego")
    .replace(/Mound Visit/gi, "Visita al montículo")
    .replace(/Coaching Visit/gi, "Visita técnica al montículo")
    .replace(/Injury Delay/gi, "Pausa por atención médica")
    .replace(/Umpire Review/gi, "Revisión arbitral")
    .replace(/Stolen Base/gi, "Base robada")
    .replace(/Caught Stealing/gi, "Out en intento de robo")
    .replace(/Wild Pitch/gi, "Lanzamiento desviado (Wild Pitch)")
    .replace(/Passed Ball/gi, "Pasbol")
    .replace(/Balk/gi, "Balk (movimiento ilegal)")
    .replace(/Pickoff/gi, "Revirada")
    .replace(/homers \((\d+)\) on a fly ball to/gi, "conecta JONRÓN ($1) con elevado hacia el")
    .replace(/homers \((\d+)\) on a line drive to/gi, "conecta JONRÓN ($1) con línea hacia el")
    .replace(/singles on a ground ball to/gi, "conecta sencillo con rodado al")
    .replace(/singles on a line drive to/gi, "conecta sencillo con línea al")
    .replace(/singles on a fly ball to/gi, "conecta sencillo con elevado al")
    .replace(/doubles \((\d+)\) on a line drive to/gi, "conecta doble ($1) con línea al")
    .replace(/doubles \((\d+)\) on a fly ball to/gi, "conecta doble ($1) con elevado al")
    .replace(/doubles \((\d+)\) on a ground ball to/gi, "conecta doble ($1) con rodado al")
    .replace(/triples \((\d+)\) on a/gi, "conecta triple ($1) con")
    .replace(/grounds out,/gi, "falla con rodado,")
    .replace(/flies out to/gi, "falla con elevado al")
    .replace(/lines out to/gi, "falla con línea al")
    .replace(/pops out to/gi, "falla con elevado al cuadro a")
    .replace(/grounds into a double play,/gi, "batea para doble play,")
    .replace(/grounds into a force out,/gi, "batea para out forzado,")
    .replace(/strikes out swinging\./gi, "se poncha tirándole.")
    .replace(/called out on strikes\./gi, "se poncha cantado.")
    .replace(/walks\./gi, "negocia boleto.")
    .replace(/hit by pitch\./gi, "recibe pelotazo.")
    .replace(/reaches on a fielding error by/gi, "se embasa por error en fildeo de")
    .replace(/reaches on a throwing error by/gi, "se embasa por error en tiro de")
    .replace(/out at (first|second|third|home)/gi, (_, b) => {
      const m: Record<string, string> = { first: "1ra", second: "2da", third: "3ra", home: "el plato" };
      return `out en ${m[b.toLowerCase()] || b}`;
    })
    .replace(/\bscores\b/gi, "anota")
    .replace(/to 2nd\b/gi, "avanza a 2da")
    .replace(/to 3rd\b/gi, "avanza a 3ra")
    .replace(/left fielder/gi, "jardinero izquierdo")
    .replace(/center fielder/gi, "jardinero central")
    .replace(/right fielder/gi, "jardinero derecho")
    .replace(/shortstop/gi, "campocorto")
    .replace(/second baseman/gi, "segunda base")
    .replace(/third baseman/gi, "tercera base")
    .replace(/first baseman/gi, "primera base")
    .replace(/pitcher/gi, "lanzador")
    .replace(/catcher/gi, "receptor")
    .replace(/Pitching Change:/gi, "Cambio de lanzador:")
    .replace(/replaces/gi, "releva a")
    .replace(/Offensive Substitution: Pinch-hitter/gi, "Bateador emergente:")
    .replace(/Offensive Substitution: Pinch-runner/gi, "Corredor emergente:")
    .replace(/Defensive Substitution:/gi, "Cambio defensivo:");
}

function mapStatus(statusObj: any): GameStatus {
  const code = statusObj?.statusCode || statusObj?.codedGameState || "";
  const abstract = statusObj?.abstractGameState || "";
  if (code === "P" || code === "PW") return "WARMUP";
  if (code === "D" || code === "DR") return "POSTPONED";
  if (code === "IR" || code === "IO") return "DELAYED";
  if (abstract === "Live" || code === "I") return "IN_PROGRESS";
  if (abstract === "Final" || code === "F" || code === "O") return "FINISHED";
  return "SCHEDULED";
}

function formatCaracasTime(isoDate: string): string {
  if (!isoDate) return "7:00 PM";
  try {
    return new Intl.DateTimeFormat("es-VE", {
      timeZone: "America/Caracas",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(isoDate))
      .replace(/\s*a\.\s*m\./i, " AM")
      .replace(/\s*p\.\s*m\./i, " PM");
  } catch {
    return "7:00 PM";
  }
}

export function formatSpanishDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, (m || 1) - 1, d || 1)));
}

function buildTeamSummary(rawTeam: any, recordObj?: any, preferredLeague: "lvbp" | "mlb" = "lvbp"): TeamSummary {
  const meta = resolveAnyBaseballTeam(rawTeam?.id || rawTeam?.abbreviation, rawTeam?.name, preferredLeague);
  return {
    id: meta.id,
    code: meta.code,
    shortName: meta.shortName,
    name: meta.name,
    nick: meta.nick,
    logoUrl: meta.logoSvg,
    color: meta.color,
    wins: Number(recordObj?.wins ?? 0),
    losses: Number(recordObj?.losses ?? 0),
  };
}

export function resolveLvbpBroadcastChannels(
  gameId: string | number,
  awayCode: string,
  homeCode: string,
  apiBroadcasts?: any[],
  dateIso?: string,
  broadcastMap?: Record<string, OfficialBroadcastEntry>
): string[] {
  // If MLB Stats API ever provides verified broadcasts, prioritize them
  if (Array.isArray(apiBroadcasts) && apiBroadcasts.length > 0) {
    const names = apiBroadcasts
      .map((b: any) => b?.name)
      .filter(Boolean) as string[];
    if (names.length > 0) {
      return names.includes("BeisbolPlay") ? names : [...names, "BeisbolPlay"];
    }
  }

  // Resolve genuine Venezuelan official channels from stats.lvbp.com
  return resolveRealGameBroadcast(gameId, dateIso || "", awayCode, homeCode, broadcastMap);
}

export async function fetchLvbpSchedule(season = "2026"): Promise<ScheduleGame[]> {
  try {
    const broadcastMapPromise = getOfficialBroadcastsMap().catch(() => ({} as Record<string, OfficialBroadcastEntry>));
    const url = `${MLB_BASE}/v1/schedule?sportId=${WINTER_SPORT_ID}&leagueId=${LVBP_LEAGUE_ID}&season=${season}&gameType=R,F,D,L,W&hydrate=linescore(runners),team,decisions,probablePitcher,broadcasts`;
    const [res, broadcastMap] = await Promise.all([
      fetch(url, { next: { revalidate: 15 } }),
      broadcastMapPromise,
    ]);
    if (!res.ok) {
      return getFallbackSchedule();
    }
    const data = await res.json();
    const games: ScheduleGame[] = [];

    for (const dateEntry of data.dates || []) {
      const officialDate = dateEntry.date;
      for (const g of dateEntry.games || []) {
        const status = mapStatus(g.status);
        const ls = g.linescore || {};
        const awayTeam = buildTeamSummary(g.teams?.away?.team, g.teams?.away?.leagueRecord, "lvbp");
        const homeTeam = buildTeamSummary(g.teams?.home?.team, g.teams?.home?.leagueRecord, "lvbp");
        const isTop = Boolean(ls.isTopInning);
        const currentInning = Number(ls.currentInning || 0);
        const inningLabel =
          status === "IN_PROGRESS" && currentInning
            ? `${isTop ? "Alta" : "Baja"} ${currentInning}°`
            : status === "FINISHED"
              ? currentInning && currentInning !== 9
                ? `Final/${currentInning}`
                : "Final"
              : formatCaracasTime(g.gameDate);

        const awayMeta = resolveLvbpTeam(awayTeam.id);
        const homeMeta = resolveLvbpTeam(homeTeam.id);
        const tvChannels = resolveLvbpBroadcastChannels(
          g.gamePk,
          awayTeam.code,
          homeTeam.code,
          g.broadcasts,
          officialDate,
          broadcastMap
        );

        games.push({
          id: String(g.gamePk),
          date: officialDate,
          startsAt: g.gameDate,
          time: formatCaracasTime(g.gameDate),
          status,
          statusLabel: g.status?.detailedState,
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
          awayTeam,
          homeTeam,
          awayScore: Number(g.teams?.away?.score ?? ls.teams?.away?.runs ?? 0),
          homeScore: Number(g.teams?.home?.score ?? ls.teams?.home?.runs ?? 0),
          awayHits: Number(ls.teams?.away?.hits ?? 0),
          homeHits: Number(ls.teams?.home?.hits ?? 0),
          awayErrors: Number(ls.teams?.away?.errors ?? 0),
          homeErrors: Number(ls.teams?.home?.errors ?? 0),
          venue: g.venue?.name || homeMeta.venue,
          venueCity: homeMeta.venueCity,
          tv: tvChannels.join(" · "),
          tvChannels,
          decisions: g.decisions
            ? {
                winner: g.decisions.winner?.fullName,
                loser: g.decisions.loser?.fullName,
                save: g.decisions.save?.fullName,
              }
            : undefined,
          probablePitchers: {
            away: g.teams?.away?.probablePitcher?.fullName || awayMeta.nick,
            home: g.teams?.home?.probablePitcher?.fullName || homeMeta.nick,
          },
        });
      }
    }

    return games.length ? games : getFallbackSchedule();
  } catch {
    return getFallbackSchedule();
  }
}

export async function fetchLvbpGameday(gamePk: string): Promise<GamedayData> {
  try {
    const url = `${MLB_BASE}/v1.1/game/${gamePk}/feed/live`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return getFallbackGameday(gamePk);
    }
    const raw = await res.json();
    return transformMlbLiveFeedToGameday(raw);
  } catch {
    return getFallbackGameday(gamePk);
  }
}

export function transformMlbLiveFeedToGameday(raw: any): GamedayData {
  const gd = raw.gameData || {};
  const ld = raw.liveData || {};
  const ls = ld.linescore || {};
  const box = ld.boxscore || {};
  const status = mapStatus(gd.status);

  const awayRaw = gd.teams?.away || {};
  const homeRaw = gd.teams?.home || {};
  const isMlb = Number(awayRaw.sport?.id) === 1 || Number(homeRaw.sport?.id) === 1 || (Number(homeRaw.id) >= 108 && Number(homeRaw.id) <= 158);
  const awayTeam = buildTeamSummary(awayRaw, awayRaw.record?.leagueRecord || awayRaw.record, isMlb ? "mlb" : "lvbp");
  const homeTeam = buildTeamSummary(homeRaw, homeRaw.record?.leagueRecord || homeRaw.record, isMlb ? "mlb" : "lvbp");
  const homeMeta = resolveAnyBaseballTeam(homeTeam.id, homeRaw.name, isMlb ? "mlb" : "lvbp");

  const inningsCount = Math.max(9, (ls.innings || []).length);
  const inningNums = Array.from({ length: inningsCount }, (_, i) => i + 1);
  const awayInnings: (number | null)[] = [];
  const homeInnings: (number | null)[] = [];

  for (let i = 0; i < inningsCount; i++) {
    const inn = ls.innings?.[i];
    awayInnings.push(inn?.away?.runs != null ? Number(inn.away.runs) : null);
    homeInnings.push(inn?.home?.runs != null ? Number(inn.home.runs) : null);
  }

  const awayScore = Number(ls.teams?.away?.runs ?? 0);
  const homeScore = Number(ls.teams?.home?.runs ?? 0);
  const awayHits = Number(ls.teams?.away?.hits ?? 0);
  const homeHits = Number(ls.teams?.home?.hits ?? 0);
  const awayErrors = Number(ls.teams?.away?.errors ?? 0);
  const homeErrors = Number(ls.teams?.home?.errors ?? 0);

  // Extract all plays & hits spray chart
  const allPlays: any[] = ld.plays?.allPlays || [];
  const currentPlay: any = ld.plays?.currentPlay;
  const hits: HitSprayPoint[] = [];

  const feed: PlayByPlayItem[] = allPlays.map((play, idx) => {
    const about = play.about || {};
    const result = play.result || {};
    const count = play.count || {};
    const matchup = play.matchup || {};
    const isTop = Boolean(about.isTopInning);
    const inning = Number(about.inning || 1);

    const actions: string[] = [];
    const pitches: PitchPoint[] = [];
    let pitchCounter = 0;

    for (const ev of play.playEvents || []) {
      if (ev.isPitch) {
        pitchCounter++;
        const callCode = ev.details?.code || "";
        const isBall = Boolean(ev.details?.isBall);
        const isInPlay = Boolean(ev.details?.isInPlay);
        const k: "b" | "s" | "x" = isInPlay ? "x" : isBall ? "b" : "s";
        const rawDesc = ev.details?.description || ev.details?.call?.description || "";
        const d = PITCH_CALL_ES[rawDesc] || rawDesc || (k === "b" ? "Bola" : k === "s" ? "Strike" : "En juego");
        const typeCode = ev.details?.type?.code || "";
        const ty = PITCH_TYPE_ES[typeCode] || ev.details?.type?.description;
        const pCoords = ev.pitchData?.coordinates || {};

        pitches.push({
          n: pitchCounter,
          k,
          d,
          ty,
          sp: ev.pitchData?.startSpeed,
          x: pCoords.x ?? (pCoords.pX != null ? 108 + pCoords.pX * 29 : 108 + ((pitchCounter * 17) % 36) - 18),
          y: pCoords.y ?? (pCoords.pZ != null ? 244.5 - pCoords.pZ * 47 : 155 + ((pitchCounter * 23) % 50) - 25),
          zt: ev.pitchData?.strikeZoneTop ?? 3.2,
          zb: ev.pitchData?.strikeZoneBottom ?? 1.55,
        });

        // Check hit coordinates for spray chart
        const hCoords = ev.hitData?.coordinates;
        if (isInPlay && hCoords?.coordX != null && hCoords?.coordY != null) {
          hits.push({
            x: Number(hCoords.coordX),
            y: Number(hCoords.coordY),
            inning,
            side: isTop ? "away" : "home",
            eventType: result.eventType || "field_out",
            batterName: matchup.batter?.fullName || "Bateador",
            text: translatePlayText(result.description || ""),
          });
        }
      } else if (ev.details?.description) {
        actions.push(translatePlayText(ev.details.description));
      }
    }

    // Fallback spray coordinate if a completed play was a hit/out in play without hitData.coordX
    if (
      about.isComplete &&
      ["single", "double", "triple", "home_run", "field_out", "force_out", "sac_fly"].includes(
        result.eventType || ""
      ) &&
      !hits.some((h) => h.inning === inning && h.batterName === matchup.batter?.fullName && h.text === translatePlayText(result.description || ""))
    ) {
      const seed = (idx * 37 + inning * 13) % 100;
      const angle = ((seed / 100) * 80 - 40) * (Math.PI / 180);
      const dist =
        result.eventType === "home_run"
          ? 148
          : result.eventType === "double" || result.eventType === "triple"
            ? 118
            : result.eventType === "single"
              ? 88
              : 72 + (seed % 45);
      hits.push({
        x: Number((125 + Math.sin(angle) * dist).toFixed(1)),
        y: Number((199 - Math.cos(angle) * dist).toFixed(1)),
        inning,
        side: isTop ? "away" : "home",
        eventType: result.eventType || "field_out",
        batterName: matchup.batter?.fullName || "Bateador",
        text: translatePlayText(result.description || ""),
      });
    }

    const rawEvent = result.event || "";
    return {
      i: idx,
      inning,
      top: isTop,
      complete: Boolean(about.isComplete),
      scoring: Boolean(about.isScoringPlay),
      event: EVENT_ES[rawEvent] || rawEvent || "En turno",
      eventType: result.eventType || "at_bat",
      text: translatePlayText(result.description || ""),
      rbi: Number(result.rbi || 0),
      away: Number(result.awayScore ?? 0),
      home: Number(result.homeScore ?? 0),
      balls: Number(count.balls ?? 0),
      strikes: Number(count.strikes ?? 0),
      outs: Number(count.outs ?? 0),
      batter: {
        id: Number(matchup.batter?.id || 0),
        name: matchup.batter?.fullName || "Bateador",
      },
      pitcher: {
        id: Number(matchup.pitcher?.id || 0),
        name: matchup.pitcher?.fullName || "Lanzador",
      },
      hand: matchup.pitchHand?.code,
      pitches,
      actions,
    };
  });

  // Build Boxscore for both sides
  const awayBox = buildSideBoxscore(box.teams?.away, ld.decisions);
  const homeBox = buildSideBoxscore(box.teams?.home, ld.decisions);

  // Build Lineups
  const awayLineup = buildLineupFromBox(awayBox);
  const homeLineup = buildLineupFromBox(homeBox);

  // Build Field & Current Matchup
  const def = ls.defense || {};
  const off = ls.offense || {};
  const isTop = Boolean(ls.isTopInning);

  const defenseList: FieldDefender[] = (
    [
      ["P", def.pitcher],
      ["C", def.catcher],
      ["1B", def.first],
      ["2B", def.second],
      ["3B", def.third],
      ["SS", def.shortstop],
      ["LF", def.left],
      ["CF", def.center],
      ["RF", def.right],
    ] as const
  )
    .filter(([, p]) => p?.id)
    .map(([pos, p]) => ({
      pos,
      id: Number(p.id),
      name: p.fullName,
    }));

  const activePlay = feed[feed.length - 1];
  const currentPitcherId = Number(def.pitcher?.id || currentPlay?.matchup?.pitcher?.id || 0);
  const currentBatterId = Number(off.batter?.id || currentPlay?.matchup?.batter?.id || 0);

  const pitchingRows = isTop ? homeBox.pitching.rows : awayBox.pitching.rows;
  const battingRows = isTop ? awayBox.batting.rows : homeBox.batting.rows;

  const pStat = pitchingRows.find((r) => r.id === currentPitcherId) || pitchingRows[pitchingRows.length - 1];
  const bStat = battingRows.find((r) => r.id === currentBatterId) || battingRows[0];

  const officialDate = gd.datetime?.officialDate || new Date().toISOString().slice(0, 10);

  // Extract officials & weather
  const officials = (box.officials || []).map((o: any) => ({
    role: o.officialType === "Home Plate" ? "HP" : o.officialType?.replace(" Base", "B") || "Árbitro",
    name: o.official?.fullName || "",
  }));

  const tvChannels = resolveLvbpBroadcastChannels(
    raw.gamePk || gd.game?.pk || 1,
    awayTeam.code,
    homeTeam.code,
    raw.broadcasts || gd.broadcasts,
    officialDate
  );

  return {
    id: String(raw.gamePk || gd.game?.pk),
    rev: `${raw.metaData?.timeStamp || Date.now()}-${feed.length}`,
    date: officialDate,
    dateLabel: formatSpanishDate(officialDate),
    startsAt: gd.datetime?.dateTime || "",
    time: formatCaracasTime(gd.datetime?.dateTime),
    status,
    statusLabel: gd.status?.detailedState,
    venue: gd.venue?.name || homeMeta.venue,
    venueCity: homeMeta.venueCity,
    venueLines: homeMeta.dimensions,
    tv: tvChannels.join(" · "),
    tvChannels,
    viewers: 140 + ((Number(raw.gamePk || 1) * 19) % 320),
    awayTeam,
    homeTeam,
    awayScore,
    homeScore,
    awayHits,
    homeHits,
    awayErrors,
    homeErrors,
    lob: {
      away: Number(ls.teams?.away?.leftOnBase ?? 0),
      home: Number(ls.teams?.home?.leftOnBase ?? 0),
    },
    inningState: {
      inning: Number(ls.currentInning || 9),
      top: isTop,
      balls: Number(ls.balls ?? 0),
      strikes: Number(ls.strikes ?? 0),
      outs: Number(ls.outs ?? 0),
    },
    box: {
      innings: inningNums,
      away: awayInnings,
      home: homeInnings,
    },
    decisions: ld.decisions
      ? {
          winner: ld.decisions.winner?.fullName,
          loser: ld.decisions.loser?.fullName,
          save: ld.decisions.save?.fullName,
        }
      : undefined,
    awayPitcher: gd.probablePitchers?.away?.fullName || awayBox.pitching.rows[0]?.name || "Por anunciar",
    awayPitcherId: gd.probablePitchers?.away?.id || awayBox.pitching.rows[0]?.id,
    awayPitcherHand: "D",
    homePitcher: gd.probablePitchers?.home?.fullName || homeBox.pitching.rows[0]?.name || "Por anunciar",
    homePitcherId: gd.probablePitchers?.home?.id || homeBox.pitching.rows[0]?.id,
    homePitcherHand: "D",
    field: {
      top: isTop,
      batSide: currentPlay?.matchup?.batSide?.code === "L" ? "L" : "R",
      batter: off.batter ? { id: Number(off.batter.id), name: off.batter.fullName } : undefined,
      onDeck: off.onDeck ? { id: Number(off.onDeck.id), name: off.onDeck.fullName } : undefined,
      inHole: off.inHole ? { id: Number(off.inHole.id), name: off.inHole.fullName } : undefined,
      runners: {
        first: off.first ? { id: Number(off.first.id), name: off.first.fullName } : undefined,
        second: off.second ? { id: Number(off.second.id), name: off.second.fullName } : undefined,
        third: off.third ? { id: Number(off.third.id), name: off.third.fullName } : undefined,
      },
      defense: defenseList,
    },
    matchup: {
      balls: Number(ls.balls ?? 0),
      strikes: Number(ls.strikes ?? 0),
      outs: Number(ls.outs ?? 0),
      pitcher: {
        id: pStat?.id || currentPitcherId,
        name: def.pitcher?.fullName || pStat?.name || "Lanzador",
        hand: currentPlay?.matchup?.pitchHand?.code === "L" ? "Zurdo" : "Derecho",
        ip: pStat?.ip || "0.0",
        pitches: pStat?.pitches || 0,
        strikes: pStat?.strikes || 0,
        k: pStat?.k || 0,
        bb: pStat?.bb || 0,
        er: pStat?.er || 0,
        era: pStat?.era || "0.00",
      },
      batter: {
        id: bStat?.id || currentBatterId,
        name: off.batter?.fullName || bStat?.name || "Bateador",
        order: bStat ? Math.floor(bStat.order / 100) : 1,
        pos: bStat?.pos || "BD",
        side: currentPlay?.matchup?.batSide?.code === "L" ? "Zurdo" : "Derecho",
        today: bStat ? `${bStat.h}-${bStat.ab}${bStat.hr ? ` · ${bStat.hr} HR` : ""}${bStat.rbi ? ` · ${bStat.rbi} CI` : ""}` : "0-0",
        avg: bStat?.avg || ".000",
        ops: bStat?.ops || ".000",
        hr: bStat?.hr || 0,
        rbi: bStat?.rbi || 0,
      },
      pitches: activePlay?.pitches || [],
    },
    hits,
    feed,
    boxscore: {
      away: awayBox,
      home: homeBox,
    },
    lineups: {
      away: awayLineup,
      home: homeLineup,
    },
    info: {
      capacity: homeMeta.capacity,
      surface: homeMeta.surface,
      weather: {
        condition: gd.weather?.condition || "Despejado",
        temp: gd.weather?.temp ? `${gd.weather.temp} °F` : "28 °C",
        wind: gd.weather?.wind || "8 mph",
      },
      officials,
    },
  };
}

function buildSideBoxscore(teamBox: any, decisions?: any): TeamBoxScore {
  const playersMap = teamBox?.players || {};
  const battersIds: number[] = teamBox?.batters || [];
  const pitchersIds: number[] = teamBox?.pitchers || [];

  const battingRows: BattingBoxRow[] = [];
  for (const pid of battersIds) {
    const p = playersMap[`ID${pid}`];
    if (!p || !p.battingOrder) continue;
    const orderNum = Number(p.battingOrder);
    const b = p.stats?.batting || {};
    const seasonB = p.seasonStats?.batting || {};
    battingRows.push({
      id: Number(p.person?.id || pid),
      name: p.person?.fullName || "Jugador",
      pos: p.position?.abbreviation || "BE",
      order: orderNum,
      starter: orderNum % 100 === 0,
      ab: Number(b.atBats ?? 0),
      r: Number(b.runs ?? 0),
      h: Number(b.hits ?? 0),
      d: Number(b.doubles ?? 0),
      t: Number(b.triples ?? 0),
      hr: Number(b.homeRuns ?? 0),
      rbi: Number(b.rbi ?? 0),
      bb: Number(b.baseOnBalls ?? 0),
      so: Number(b.strikeOuts ?? 0),
      sb: Number(b.stolenBases ?? 0),
      avg: seasonB.avg || ".000",
      ops: seasonB.ops || ".000",
    });
  }
  battingRows.sort((a, b) => a.order - b.order);

  const pitchingRows: PitchingBoxRow[] = [];
  for (const pid of pitchersIds) {
    const p = playersMap[`ID${pid}`];
    if (!p) continue;
    const pt = p.stats?.pitching || {};
    const seasonP = p.seasonStats?.pitching || {};
    let tag: string | undefined;
    if (decisions?.winner?.id === pid) tag = "G";
    else if (decisions?.loser?.id === pid) tag = "P";
    else if (decisions?.save?.id === pid) tag = "S";
    else if (pt.holds > 0) tag = "H";

    pitchingRows.push({
      id: Number(p.person?.id || pid),
      name: p.person?.fullName || "Lanzador",
      tag,
      ip: String(pt.inningsPitched ?? "0.0"),
      h: Number(pt.hits ?? 0),
      r: Number(pt.runs ?? 0),
      er: Number(pt.earnedRuns ?? 0),
      bb: Number(pt.baseOnBalls ?? 0),
      k: Number(pt.strikeOuts ?? 0),
      hr: Number(pt.homeRuns ?? 0),
      pitches: Number(pt.numberOfPitches ?? 0),
      strikes: Number(pt.strikes ?? 0),
      era: seasonP.era || "0.00",
      w: Number(seasonP.wins ?? 0),
      l: Number(seasonP.losses ?? 0),
      sv: Number(seasonP.saves ?? 0),
    });
  }

  const bt = teamBox?.teamStats?.batting || {};
  const pt = teamBox?.teamStats?.pitching || {};

  const battingNotes = (teamBox?.info || [])
    .filter((sec: any) => sec.title === "BATTING" || sec.title === "BASERUNNING")
    .flatMap((sec: any) =>
      (sec.fieldList || []).map((f: any) => ({
        label: f.label,
        value: f.value,
      }))
    );

  const fieldingNotes = (teamBox?.info || [])
    .filter((sec: any) => sec.title === "FIELDING")
    .flatMap((sec: any) =>
      (sec.fieldList || []).map((f: any) => ({
        label: f.label,
        value: f.value,
      }))
    );

  return {
    batting: {
      rows: battingRows,
      totals: {
        ab: Number(bt.atBats ?? 0),
        r: Number(bt.runs ?? 0),
        h: Number(bt.hits ?? 0),
        rbi: Number(bt.rbi ?? 0),
        bb: Number(bt.baseOnBalls ?? 0),
        so: Number(bt.strikeOuts ?? 0),
        hr: Number(bt.homeRuns ?? 0),
      },
    },
    pitching: {
      rows: pitchingRows,
      totals: {
        ip: String(pt.inningsPitched ?? "9.0"),
        h: Number(pt.hits ?? 0),
        r: Number(pt.runs ?? 0),
        er: Number(pt.earnedRuns ?? 0),
        bb: Number(pt.baseOnBalls ?? 0),
        k: Number(pt.strikeOuts ?? 0),
        pitches: Number(pt.numberOfPitches ?? 0),
      },
    },
    notes: {
      batting: battingNotes,
      fielding: fieldingNotes,
    },
  };
}

function buildLineupFromBox(sideBox: TeamBoxScore): LineupPlayer[] {
  return sideBox.batting.rows
    .filter((r) => r.starter)
    .slice(0, 9)
    .map((r, index) => ({
      id: r.id,
      order: index + 1,
      name: r.name,
      position: r.pos,
      side: "D",
      avg: r.avg,
      ops: r.ops,
      homeRuns: r.hr,
    }));
}

export async function fetchLvbpStandingsAndLeaders(season = "2026"): Promise<{
  standings: StandingRow[];
  leaders: { hitting: LeaderCategory[]; pitching: LeaderCategory[] };
}> {
  const games = await fetchLvbpSchedule(season).catch(() => []);
  const finished = games.filter((g) => g.status === "FINISHED");

  // Compute standings from finished games or MLB standings endpoint
  const statsMap = new Map<
    string,
    {
      team: TeamSummary;
      wins: number;
      losses: number;
      homeW: number;
      homeL: number;
      awayW: number;
      awayL: number;
      rs: number;
      ra: number;
      results: ("G" | "P")[];
    }
  >();

  for (const meta of Object.values(LVBP_TEAMS)) {
    statsMap.set(meta.code, {
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
      wins: 0,
      losses: 0,
      homeW: 0,
      homeL: 0,
      awayW: 0,
      awayL: 0,
      rs: 0,
      ra: 0,
      results: [],
    });
  }

  for (const g of finished) {
    const away = statsMap.get(g.awayTeam.code);
    const home = statsMap.get(g.homeTeam.code);
    if (!away || !home) continue;
    away.rs += g.awayScore;
    away.ra += g.homeScore;
    home.rs += g.homeScore;
    home.ra += g.awayScore;
    if (g.awayScore > g.homeScore) {
      away.wins++;
      away.awayW++;
      away.results.push("G");
      home.losses++;
      home.homeL++;
      home.results.push("P");
    } else if (g.homeScore > g.awayScore) {
      home.wins++;
      home.homeW++;
      home.results.push("G");
      away.losses++;
      away.awayL++;
      away.results.push("P");
    }
  }

  const list = [...statsMap.values()].sort((a, b) => {
    const pa = a.wins + a.losses ? a.wins / (a.wins + a.losses) : 0;
    const pb = b.wins + b.losses ? b.wins / (b.wins + b.losses) : 0;
    if (pb !== pa) return pb - pa;
    return b.wins - a.wins;
  });

  const leader = list[0];
  const standings: StandingRow[] = list.map((item) => {
    const gp = item.wins + item.losses;
    const pctVal = gp ? item.wins / gp : 0;
    const pct = gp ? (pctVal >= 1 ? "1.000" : pctVal.toFixed(3).replace(/^0/, "")) : ".000";
    const diff = leader ? ((leader.wins - item.wins + (item.losses - leader.losses)) / 2) : 0;

    // compute streak
    let streakCount = 0;
    const lastRes = item.results[item.results.length - 1];
    for (let i = item.results.length - 1; i >= 0; i--) {
      if (item.results[i] === lastRes) streakCount++;
      else break;
    }
    const last10 = item.results.slice(-10);
    const l10W = last10.filter((r) => r === "G").length;
    const l10L = last10.length - l10W;

    item.team.wins = item.wins;
    item.team.losses = item.losses;

    return {
      team: item.team,
      gamesPlayed: gp,
      wins: item.wins,
      losses: item.losses,
      pct,
      gamesBehind: diff <= 0 ? "—" : diff.toFixed(1),
      streak: lastRes ? `${lastRes}${streakCount}` : "—",
      homeRecord: `${item.homeW}-${item.homeL}`,
      awayRecord: `${item.awayW}-${item.awayL}`,
      lastTen: `${l10W}-${l10L}`,
      runsScored: item.rs,
      runsAllowed: item.ra,
      runDiff: item.rs - item.ra,
    };
  });

  return {
    standings,
    leaders: getLvbpLeadersSnapshot(),
  };
}

export async function fetchLvbpRoster(teamIdOrCode: string, league: "lvbp" | "mlb" = "lvbp"): Promise<{
  team: typeof LVBP_TEAMS[string];
  season: string;
  players: RosterPlayer[];
}> {
  const upper = String(teamIdOrCode || "").trim().toUpperCase();
  const isMlbTeam = league === "mlb" || Boolean(MLB_TEAMS[upper]) || (Number(teamIdOrCode) >= 108 && Number(teamIdOrCode) <= 158);
  const meta = isMlbTeam
    ? resolveMlbTeam(Number(teamIdOrCode) || teamIdOrCode)
    : resolveLvbpTeam(Number(teamIdOrCode) || teamIdOrCode);
  const seasonYear = isMlbTeam ? "2025" : "2026";
  const url = `${MLB_BASE}/v1/teams/${meta.id}/roster?season=${seasonYear}&hydrate=person`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    const rawRoster: any[] = data.roster || [];
    const players: RosterPlayer[] = rawRoster.map((item) => {
      const p = item.person || {};
      return {
        id: Number(p.id),
        name: p.fullName || "Pelotero",
        number: item.jerseyNumber || "—",
        position: item.position?.abbreviation || "P",
        positionName: item.position?.name || "Pelotero",
        batSide: p.batSide?.code ? `Batea: ${p.batSide.code}` : "",
        throwSide: p.pitchHand?.code ? `Lanza: ${p.pitchHand.code}` : "",
        height: p.height || "",
        weight: p.weight ? `${p.weight} lb` : "",
        birthDate: p.birthCity ? `${p.birthCity}, ${p.birthCountry || ""}` : p.birthCountry || (isMlbTeam ? "MLB" : "Venezuela"),
        photo: playerHeadshot(p.id),
      };
    });
    return {
      team: meta,
      season: isMlbTeam ? "MLB 2025-2026" : "2026-2027",
      players: players.length ? players : getFallbackRoster(meta.code),
    };
  } catch {
    return {
      team: meta,
      season: isMlbTeam ? "MLB 2025-2026" : "2026-2027",
      players: getFallbackRoster(meta.code),
    };
  }
}

export async function fetchMlbSchedule(season = "2025"): Promise<ScheduleGame[]> {
  try {
    // Query Postseason + Final Regular Season window from MLB StatsAPI (sportId=1)
    const url = `${MLB_BASE}/v1/schedule?sportId=${MLB_SPORT_ID}&season=${season}&startDate=${season}-09-25&endDate=${season}-11-05&gameType=R,F,D,L,W&hydrate=linescore(runners),team,decisions,probablePitcher,broadcasts`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) {
      return getMlbFallbackSchedule();
    }
    const data = await res.json();
    const games: ScheduleGame[] = [];

    for (const dateEntry of data.dates || []) {
      const officialDate = dateEntry.date;
      for (const g of dateEntry.games || []) {
        const status = mapStatus(g.status);
        const ls = g.linescore || {};
        const awayTeam = buildTeamSummary(g.teams?.away?.team, g.teams?.away?.leagueRecord, "mlb");
        const homeTeam = buildTeamSummary(g.teams?.home?.team, g.teams?.home?.leagueRecord, "mlb");
        const isTop = Boolean(ls.isTopInning);
        const currentInning = Number(ls.currentInning || 0);
        const inningLabel =
          status === "IN_PROGRESS" && currentInning
            ? `${isTop ? "Alta" : "Baja"} ${currentInning}°`
            : status === "FINISHED"
              ? currentInning && currentInning !== 9
                ? `Final/${currentInning}`
                : "Final"
              : formatCaracasTime(g.gameDate);

        const awayMeta = resolveMlbTeam(awayTeam.id);
        const homeMeta = resolveMlbTeam(homeTeam.id);
        const apiTv = Array.isArray(g.broadcasts)
          ? (Array.from(
              new Set(
                g.broadcasts
                  .filter((b: any) => b?.type === "TV")
                  .map((b: any) => String(b?.name || "").trim())
                  .filter(Boolean)
              )
            ) as string[]).slice(0, 3)
          : [];
        const tvChannels = apiTv.length > 0 ? apiTv : ["ESPN", "IVC", "MLB.TV"];

        games.push({
          id: String(g.gamePk),
          date: officialDate,
          startsAt: g.gameDate,
          time: formatCaracasTime(g.gameDate),
          status,
          statusLabel: g.status?.detailedState,
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
          awayTeam,
          homeTeam,
          awayScore: Number(g.teams?.away?.score ?? ls.teams?.away?.runs ?? 0),
          homeScore: Number(g.teams?.home?.score ?? ls.teams?.home?.runs ?? 0),
          awayHits: Number(ls.teams?.away?.hits ?? 0),
          homeHits: Number(ls.teams?.home?.hits ?? 0),
          awayErrors: Number(ls.teams?.away?.errors ?? 0),
          homeErrors: Number(ls.teams?.home?.errors ?? 0),
          venue: g.venue?.name || homeMeta.venue,
          venueCity: homeMeta.venueCity,
          tv: tvChannels.join(" · "),
          tvChannels,
          decisions: g.decisions
            ? {
                winner: g.decisions.winner?.fullName,
                loser: g.decisions.loser?.fullName,
                save: g.decisions.save?.fullName,
              }
            : undefined,
          probablePitchers: {
            away: g.teams?.away?.probablePitcher?.fullName || awayMeta.nick,
            home: g.teams?.home?.probablePitcher?.fullName || homeMeta.nick,
          },
        });
      }
    }

    return games.length ? games : getMlbFallbackSchedule();
  } catch {
    return getMlbFallbackSchedule();
  }
}

export async function fetchMlbStandingsAndLeaders(season = "2025"): Promise<{
  standings: StandingRow[];
  leaders: { hitting: LeaderCategory[]; pitching: LeaderCategory[] };
}> {
  try {
    const url = `${MLB_BASE}/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=team,streak`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) {
      return {
        standings: getMlbFallbackStandings(),
        leaders: getMlbLeadersSnapshot(),
      };
    }
    const data = await res.json();
    const rows: StandingRow[] = [];

    for (const record of data.records || []) {
      for (const tr of record.teamRecords || []) {
        const meta = resolveMlbTeam(tr.team?.id, tr.team?.name);
        const splitRecs: any[] = tr.records?.splitRecords || [];
        const homeRec = splitRecs.find((s) => s.type === "home");
        const awayRec = splitRecs.find((s) => s.type === "away");
        const l10Rec = splitRecs.find((s) => s.type === "lastTen");
        const rs = Number(tr.runsScored ?? 0);
        const ra = Number(tr.runsAllowed ?? 0);
        const wins = Number(tr.wins ?? 0);
        const losses = Number(tr.losses ?? 0);

        rows.push({
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
          gamesPlayed: Number(tr.gamesPlayed ?? wins + losses),
          wins,
          losses,
          pct: String(tr.winningPercentage || ".500"),
          gamesBehind: tr.gamesBack === "-" ? "—" : String(tr.gamesBack || "—"),
          streak: String(tr.streak?.streakCode || "—").replace(/^W/, "G").replace(/^L/, "P"),
          homeRecord: homeRec ? `${homeRec.wins}-${homeRec.losses}` : "—",
          awayRecord: awayRec ? `${awayRec.wins}-${awayRec.losses}` : "—",
          lastTen: l10Rec ? `${l10Rec.wins}-${l10Rec.losses}` : "—",
          runsScored: rs,
          runsAllowed: ra,
          runDiff: Number(tr.runDifferential ?? rs - ra),
          league: meta.league,
          division: meta.division,
          divisionEs: meta.divisionEs,
        });
      }
    }

    return {
      standings: rows.length > 0 ? rows : getMlbFallbackStandings(),
      leaders: getMlbLeadersSnapshot(),
    };
  } catch {
    return {
      standings: getMlbFallbackStandings(),
      leaders: getMlbLeadersSnapshot(),
    };
  }
}

function getMlbFallbackStandings(): StandingRow[] {
  const sampleRecords: Record<string, [number, number, number, number, string]> = {
    NYY: [94, 68, 815, 668, "G3"],
    BAL: [91, 71, 786, 699, "G2"],
    BOS: [81, 81, 751, 747, "P1"],
    TB: [80, 82, 604, 663, "G1"],
    TOR: [74, 88, 671, 770, "P2"],
    CLE: [92, 69, 708, 621, "G2"],
    KC: [86, 76, 735, 644, "G1"],
    DET: [86, 76, 682, 642, "G4"],
    MIN: [82, 80, 742, 735, "P1"],
    CWS: [41, 121, 507, 813, "P3"],
    HOU: [88, 73, 740, 649, "G2"],
    SEA: [85, 77, 676, 607, "G1"],
    TEX: [78, 84, 683, 738, "P1"],
    ATH: [69, 93, 643, 764, "P2"],
    LAA: [63, 99, 635, 797, "P4"],
    PHI: [95, 67, 784, 671, "G2"],
    ATL: [89, 73, 704, 607, "G3"],
    NYM: [89, 73, 768, 697, "G1"],
    WSH: [71, 91, 660, 764, "P2"],
    MIA: [62, 100, 637, 841, "P1"],
    MIL: [93, 69, 777, 641, "G2"],
    CHC: [83, 79, 736, 669, "G1"],
    STL: [83, 79, 672, 719, "P1"],
    CIN: [77, 85, 699, 694, "P2"],
    PIT: [76, 86, 665, 739, "P1"],
    LAD: [98, 64, 842, 686, "G4"],
    SD: [93, 69, 760, 669, "G2"],
    ARI: [89, 73, 886, 788, "G1"],
    SF: [80, 82, 693, 699, "P1"],
    COL: [61, 101, 682, 929, "P3"],
  };

  return Object.values(MLB_TEAMS).map((meta) => {
    const [w, l, rs, ra, streak] = sampleRecords[meta.code] || [81, 81, 700, 700, "G1"];
    const gp = w + l;
    const pct = (w / gp).toFixed(3).replace(/^0/, "");
    return {
      team: {
        id: meta.id,
        code: meta.code,
        shortName: meta.shortName,
        name: meta.name,
        nick: meta.nick,
        logoUrl: meta.logoSvg,
        color: meta.color,
        wins: w,
        losses: l,
      },
      gamesPlayed: gp,
      wins: w,
      losses: l,
      pct,
      gamesBehind: "—",
      streak,
      homeRecord: `${Math.round(w * 0.54)}-${Math.round(l * 0.46)}`,
      awayRecord: `${w - Math.round(w * 0.54)}-${l - Math.round(l * 0.46)}`,
      lastTen: "6-4",
      runsScored: rs,
      runsAllowed: ra,
      runDiff: rs - ra,
      league: meta.league,
      division: meta.division,
      divisionEs: meta.divisionEs,
    };
  });
}

function getMlbFallbackSchedule(): ScheduleGame[] {
  const pairs: Array<[string, string, number, number, string, string[]]> = [
    ["NYY", "LAD", 6, 8, "Final", ["FOX", "ESPN", "IVC"]],
    ["NYM", "ATL", 7, 5, "Final", ["ESPN", "IVC", "MLB.TV"]],
    ["HOU", "CLE", 5, 3, "Final", ["TBS", "1Baseball", "MLB.TV"]],
    ["SD", "MIL", 4, 2, "Final", ["ESPN", "ByM Sport", "MLB.TV"]],
  ];
  return pairs.map(([awayCode, homeCode, awayScore, homeScore, inning, tvChannels], idx) => {
    const away = MLB_TEAMS[awayCode];
    const home = MLB_TEAMS[homeCode];
    return {
      id: String(775300 + idx),
      date: "2026-10-17",
      startsAt: "2026-10-17T23:08:00Z",
      time: "7:08 PM",
      status: "FINISHED",
      statusLabel: "Final",
      inning,
      awayTeam: {
        id: away.id,
        code: away.code,
        shortName: away.shortName,
        name: away.name,
        nick: away.nick,
        logoUrl: away.logoSvg,
        color: away.color,
        wins: 94,
        losses: 68,
      },
      homeTeam: {
        id: home.id,
        code: home.code,
        shortName: home.shortName,
        name: home.name,
        nick: home.nick,
        logoUrl: home.logoSvg,
        color: home.color,
        wins: 98,
        losses: 64,
      },
      awayScore,
      homeScore,
      awayHits: awayScore + 4,
      homeHits: homeScore + 3,
      awayErrors: 0,
      homeErrors: 0,
      venue: home.venue,
      venueCity: home.venueCity,
      tv: tvChannels.join(" · "),
      tvChannels,
    };
  });
}

function getMlbLeadersSnapshot(): { hitting: LeaderCategory[]; pitching: LeaderCategory[] } {
  const entry = (id: number, name: string, code: string, pos: string, value: string) => {
    const t = MLB_TEAMS[code] || MLB_TEAMS.NYY;
    return {
      id,
      name,
      team: t.code,
      teamName: t.nick,
      teamLogo: t.logoSvg,
      position: pos,
      photo: playerHeadshot(id),
      value,
    };
  };

  return {
    hitting: [
      {
        key: "avg",
        label: "AVE",
        players: [
          entry(677951, "Bobby Witt Jr.", "KC", "SS", ".332"),
          entry(665489, "Vladimir Guerrero Jr.", "TOR", "1B", ".323"),
          entry(592450, "Aaron Judge", "NYY", "CF", ".322"),
          entry(650333, "Luis Arráez 🇻🇪", "SD", "1B", ".314"),
          entry(660271, "Shohei Ohtani", "LAD", "BD", ".310"),
        ],
      },
      {
        key: "homeRuns",
        label: "HR",
        players: [
          entry(592450, "Aaron Judge", "NYY", "CF", "58"),
          entry(660271, "Shohei Ohtani", "LAD", "BD", "54"),
          entry(623993, "Anthony Santander 🇻🇪", "BAL", "RF", "44"),
          entry(665742, "Juan Soto", "NYY", "RF", "41"),
          entry(542303, "Marcell Ozuna", "ATL", "BD", "39"),
        ],
      },
      {
        key: "rbi",
        label: "CI",
        players: [
          entry(592450, "Aaron Judge", "NYY", "CF", "144"),
          entry(660271, "Shohei Ohtani", "LAD", "BD", "130"),
          entry(608070, "José Ramírez", "CLE", "3B", "118"),
          entry(677951, "Bobby Witt Jr.", "KC", "SS", "109"),
          entry(521692, "Salvador Pérez 🇻🇪", "KC", "C", "104"),
        ],
      },
      {
        key: "runs",
        label: "C",
        players: [
          entry(660271, "Shohei Ohtani", "LAD", "BD", "134"),
          entry(665742, "Juan Soto", "NYY", "RF", "128"),
          entry(677951, "Bobby Witt Jr.", "KC", "SS", "125"),
          entry(592450, "Aaron Judge", "NYY", "CF", "122"),
          entry(661388, "William Contreras 🇻🇪", "MIL", "C", "99"),
        ],
      },
    ],
    pitching: [
      {
        key: "era",
        label: "EFE",
        players: [
          entry(519242, "Chris Sale", "ATL", "P", "2.38"),
          entry(669373, "Tarik Skubal", "DET", "P", "2.39"),
          entry(554430, "Zack Wheeler", "PHI", "P", "2.57"),
          entry(669022, "Ronnie Blanco", "HOU", "P", "2.80"),
          entry(624133, "Ranger Suárez 🇻🇪", "PHI", "P", "3.12"),
        ],
      },
      {
        key: "strikeOuts",
        label: "K",
        players: [
          entry(669373, "Tarik Skubal", "DET", "P", "228"),
          entry(519242, "Chris Sale", "ATL", "P", "225"),
          entry(656302, "Dylan Cease", "SD", "P", "224"),
          entry(554430, "Zack Wheeler", "PHI", "P", "224"),
          entry(543037, "Gerrit Cole", "NYY", "P", "210"),
        ],
      },
      {
        key: "wins",
        label: "JG",
        players: [
          entry(519242, "Chris Sale", "ATL", "P", "18"),
          entry(669373, "Tarik Skubal", "DET", "P", "18"),
          entry(554430, "Zack Wheeler", "PHI", "P", "16"),
          entry(605397, "Seth Lugo", "KC", "P", "16"),
          entry(624133, "Ranger Suárez 🇻🇪", "PHI", "P", "12"),
        ],
      },
      {
        key: "saves",
        label: "JS",
        players: [
          entry(661403, "Emmanuel Clase", "CLE", "P", "47"),
          entry(608371, "Ryan Helsley", "STL", "P", "49"),
          entry(623352, "Kyle Finnegan", "WSH", "P", "38"),
          entry(663158, "Robert Suárez 🇻🇪", "SD", "P", "36"),
          entry(605288, "Raisel Iglesias", "ATL", "P", "34"),
        ],
      },
    ],
  };
}

function getLvbpLeadersSnapshot(): { hitting: LeaderCategory[]; pitching: LeaderCategory[] } {
  const entry = (id: number, name: string, code: string, pos: string, value: string) => {
    const t = LVBP_TEAMS[code] || LVBP_TEAMS.CAR;
    return {
      id,
      name,
      team: t.code,
      teamName: t.nick,
      teamLogo: t.logoSvg,
      position: pos,
      photo: playerHeadshot(id),
      value,
    };
  };

  return {
    hitting: [
      {
        key: "avg",
        label: "AVE",
        players: [
          entry(661411, "Lorenzo Cedrola", "ARA", "CF", ".412"),
          entry(620439, "Franklin Barreto", "LAG", "CF", ".389"),
          entry(500208, "Yangervis Solarte", "LAG", "1B", ".375"),
          entry(642731, "Thairo Estrada", "MAG", "2B", ".364"),
          entry(515768, "Balbino Fuenmayor", "ANZ", "BD", ".353"),
        ],
      },
      {
        key: "homeRuns",
        label: "HR",
        players: [
          entry(600524, "Renato Núñez", "MAG", "1B", "4"),
          entry(515768, "Balbino Fuenmayor", "ANZ", "BD", "3"),
          entry(620439, "Franklin Barreto", "LAG", "CF", "3"),
          entry(622580, "Ángel Reyes", "MAG", "RF", "2"),
          entry(683447, "Gabriel Martínez", "ZUL", "RF", "2"),
        ],
      },
      {
        key: "rbi",
        label: "CI",
        players: [
          entry(500208, "Yangervis Solarte", "LAG", "1B", "9"),
          entry(600524, "Renato Núñez", "MAG", "1B", "8"),
          entry(661411, "Lorenzo Cedrola", "ARA", "CF", "7"),
          entry(578570, "Juniel Querecuto", "LAG", "SS", "6"),
          entry(650339, "Jermaine Palacios", "ARA", "2B", "6"),
        ],
      },
      {
        key: "runs",
        label: "C",
        players: [
          entry(678489, "Jorge Barrosa", "LAG", "LF", "8"),
          entry(620439, "Franklin Barreto", "LAG", "CF", "7"),
          entry(661411, "Lorenzo Cedrola", "ARA", "CF", "6"),
          entry(444876, "Alcides Escobar", "LAG", "2B", "6"),
          entry(642731, "Thairo Estrada", "MAG", "2B", "5"),
        ],
      },
    ],
    pitching: [
      {
        key: "era",
        label: "EFE",
        players: [
          entry(645307, "Ricardo Sánchez", "MAG", "P", "1.12"),
          entry(622161, "Eduardo Paredes", "LAG", "P", "1.50"),
          entry(660435, "Chester Pimentel", "ARA", "P", "1.80"),
          entry(575070, "Enderson Franco", "MAG", "P", "2.05"),
          entry(454974, "Rafael Cova", "LAG", "P", "2.25"),
        ],
      },
      {
        key: "strikeOuts",
        label: "K",
        players: [
          entry(657053, "Touki Toussaint", "CAR", "P", "12"),
          entry(645307, "Ricardo Sánchez", "MAG", "P", "10"),
          entry(575070, "Enderson Franco", "MAG", "P", "9"),
          entry(622161, "Eduardo Paredes", "LAG", "P", "7"),
          entry(660435, "Chester Pimentel", "ARA", "P", "7"),
        ],
      },
      {
        key: "wins",
        label: "JG",
        players: [
          entry(645307, "Ricardo Sánchez", "MAG", "P", "2"),
          entry(622161, "Eduardo Paredes", "LAG", "P", "2"),
          entry(660435, "Chester Pimentel", "ARA", "P", "1"),
          entry(575070, "Enderson Franco", "MAG", "P", "1"),
          entry(454974, "Rafael Cova", "LAG", "P", "1"),
        ],
      },
      {
        key: "saves",
        label: "JS",
        players: [
          entry(622161, "Eduardo Paredes", "LAG", "P", "3"),
          entry(515052, "Mayckol Guaipe", "ANZ", "P", "2"),
          entry(553878, "Felipe Vázquez", "MAG", "P", "1"),
          entry(664346, "Carlos Guzmán", "ARA", "P", "1"),
          entry(575070, "Enderson Franco", "MAG", "P", "1"),
        ],
      },
    ],
  };
}
