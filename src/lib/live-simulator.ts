import { LVBP_TEAMS } from "./lvbp-teams";
import { GamedayData, PitchPoint, ScheduleGame } from "./types";

/**
 * Convierte un GamedayData real (finalizado o en progreso) a un estado "EN VIVO"
 * en el paso `step` (o basado en el reloj actual) para que el usuario pueda ver
 * cómo cambian los lanzamientos en la Zona de Strike, los corredores en el Terreno 2D,
 * el conteo B-S-O y el jugada a jugada en tiempo real.
 */
export function simulateGamedayStep(base: GamedayData, stepParam?: number): GamedayData {
  const totalPlays = base.feed.length;
  if (!totalPlays) return base;

  // Si no se pasa step explícito, avanza automáticamente cada 4 segundos
  const tick = stepParam != null ? stepParam : Math.floor(Date.now() / 4000);
  // Nos ubicamos entre el 65% y el 98% del partido para que haya mucha acción acumulada
  const minPlayIdx = Math.max(1, Math.floor(totalPlays * 0.55));
  const playSpan = Math.max(1, totalPlays - minPlayIdx);
  const currentPlayIdx = minPlayIdx + (Math.floor(tick / 3) % playSpan);
  const activeFeed = base.feed.slice(0, currentPlayIdx + 1).map((p, idx) => ({
    ...p,
    complete: idx < currentPlayIdx,
  }));

  const currentPlay = { ...activeFeed[activeFeed.length - 1] };
  const allPitches = currentPlay.pitches?.length
    ? currentPlay.pitches
    : ([
        { n: 1, k: "s", d: "Strike cantado", ty: "Recta 4-costuras", sp: 94, x: 105, y: 155, zt: 3.2, zb: 1.55 },
        { n: 2, k: "b", d: "Bola afuera", ty: "Slider", sp: 85, x: 142, y: 185, zt: 3.2, zb: 1.55 },
        { n: 3, k: "s", d: "Foul atrás", ty: "Recta 4-costuras", sp: 95, x: 115, y: 148, zt: 3.2, zb: 1.55 },
        { n: 4, k: "x", d: "En juego", ty: "Cambio", sp: 87, x: 110, y: 162, zt: 3.2, zb: 1.55 },
      ] as PitchPoint[]);

  const pitchStep = (tick % Math.max(1, allPitches.length)) + 1;
  const visiblePitches = allPitches.slice(0, pitchStep);
  const isTurnFinished = pitchStep >= allPitches.length;

  const balls = visiblePitches.filter((p) => p.k === "b").length;
  const strikes = Math.min(2, visiblePitches.filter((p) => p.k === "s").length);

  currentPlay.pitches = visiblePitches;
  currentPlay.balls = Math.min(3, balls);
  currentPlay.strikes = strikes;
  currentPlay.complete = isTurnFinished;
  activeFeed[activeFeed.length - 1] = currentPlay;

  // Calcular marcador hasta la jugada actual
  const lastCompleted = [...activeFeed].reverse().find((p) => p.complete) || activeFeed[0];
  const awayScore = lastCompleted ? lastCompleted.away : 0;
  const homeScore = lastCompleted ? lastCompleted.home : 0;

  // Calcular pizarra por innings hasta el inning actual
  const curInning = currentPlay.inning;
  const isTop = currentPlay.top;

  const awayInnings = base.box.away.map((val, idx) => {
    if (idx + 1 < curInning) return val ?? 0;
    if (idx + 1 === curInning) {
      return isTop ? Math.max(0, val ?? 0) : val ?? 0;
    }
    return null;
  });

  const homeInnings = base.box.home.map((val, idx) => {
    if (idx + 1 < curInning) return val ?? 0;
    if (idx + 1 === curInning) {
      return isTop ? null : Math.max(0, val ?? 0);
    }
    return null;
  });

  // Seleccionar corredores simulados realistas a partir del lineup del equipo al bate
  const battingLineup = isTop ? base.lineups.away : base.lineups.home;
  const runner1 =
    currentPlayIdx % 2 === 0 && battingLineup[0]
      ? { id: battingLineup[0].id, name: battingLineup[0].name }
      : undefined;
  const runner2 =
    currentPlayIdx % 3 === 0 && battingLineup[1]
      ? { id: battingLineup[1].id, name: battingLineup[1].name }
      : undefined;
  const runner3 =
    currentPlayIdx % 5 === 0 && battingLineup[2]
      ? { id: battingLineup[2].id, name: battingLineup[2].name }
      : undefined;

  const onDeckPlayer = battingLineup[(currentPlayIdx + 1) % Math.max(1, battingLineup.length)];
  const inHolePlayer = battingLineup[(currentPlayIdx + 2) % Math.max(1, battingLineup.length)];

  return {
    ...base,
    rev: `sim-${tick}`,
    status: "IN_PROGRESS",
    statusLabel: "En vivo",
    awayScore,
    homeScore,
    inningState: {
      inning: curInning,
      top: isTop,
      balls: currentPlay.balls,
      strikes: currentPlay.strikes,
      outs: currentPlay.outs % 3,
    },
    box: {
      innings: base.box.innings,
      away: awayInnings,
      home: homeInnings,
    },
    field: {
      top: isTop,
      batSide: currentPlayIdx % 2 === 0 ? "R" : "L",
      batter: currentPlay.batter,
      onDeck: onDeckPlayer ? { id: onDeckPlayer.id, name: onDeckPlayer.name } : base.field?.onDeck,
      inHole: inHolePlayer ? { id: inHolePlayer.id, name: inHolePlayer.name } : base.field?.inHole,
      runners: {
        first: runner1,
        second: runner2,
        third: runner3,
      },
      defense: base.field?.defense || [],
    },
    matchup: {
      balls: currentPlay.balls,
      strikes: currentPlay.strikes,
      outs: currentPlay.outs % 3,
      pitcher: {
        ...(base.matchup?.pitcher || {
          id: currentPlay.pitcher.id,
          name: currentPlay.pitcher.name,
          hand: "Derecho",
          ip: "5.2",
          pitches: 68,
          strikes: 46,
          k: 6,
          bb: 1,
          er: 2,
          era: "2.84",
        }),
        id: currentPlay.pitcher.id,
        name: currentPlay.pitcher.name,
      },
      batter: {
        ...(base.matchup?.batter || {
          id: currentPlay.batter.id,
          name: currentPlay.batter.name,
          order: (currentPlayIdx % 9) + 1,
          pos: "CF",
          side: "Derecho",
          today: "2-3 · 1 HR · 2 CI",
          avg: ".345",
          ops: ".960",
          hr: 2,
          rbi: 6,
        }),
        id: currentPlay.batter.id,
        name: currentPlay.batter.name,
      },
      pitches: visiblePitches,
    },
    hits: base.hits.filter((h) => h.inning <= curInning),
    feed: activeFeed,
  };
}

export function createFeaturedLiveScheduleGame(dateIso: string): ScheduleGame {
  const car = LVBP_TEAMS.CAR;
  const mag = LVBP_TEAMS.MAG;
  const tick = Math.floor(Date.now() / 5000);
  const isTop = tick % 2 === 0;
  const inning = 7 + (tick % 2);
  return {
    id: "870098",
    date: dateIso,
    startsAt: `${dateIso}T23:00:00Z`,
    time: "7:00 PM",
    status: "IN_PROGRESS",
    statusLabel: "En vivo",
    inning: `${isTop ? "Alta" : "Baja"} ${inning}°`,
    isTopInning: isTop,
    currentInning: inning,
    balls: tick % 4,
    strikes: tick % 3,
    outs: tick % 3,
    runners: {
      first: true,
      second: tick % 2 === 0,
      third: false,
    },
    awayTeam: {
      id: car.id,
      code: car.code,
      shortName: car.shortName,
      name: car.name,
      nick: car.nick,
      logoUrl: car.logoSvg,
      color: car.color,
      wins: 2,
      losses: 1,
    },
    homeTeam: {
      id: mag.id,
      code: mag.code,
      shortName: mag.shortName,
      name: mag.name,
      nick: mag.nick,
      logoUrl: mag.logoSvg,
      color: mag.color,
      wins: 2,
      losses: 1,
    },
    awayScore: 5,
    homeScore: 4,
    awayHits: 9,
    homeHits: 8,
    awayErrors: 0,
    homeErrors: 1,
    venue: mag.venue,
    venueCity: mag.venueCity,
    tv: "IVC · 1Baseball · ByM Sport",
  };
}
