import type { RadioBroadcastInfo } from "./types";
export type { RadioBroadcastInfo };
import { MLB_TEAMS } from "./mlb-teams";

export interface TeamRadioMeta {
  circuitName: string;
  stationName: string;
  dial: string;
  city: string;
  webPlayerUrl: string;
  streamUrl?: string;
  narrators: string;
  description: string;
}

export const LVBP_RADIO_CIRCUITS: Record<string, TeamRadioMeta> = {
  CAR: {
    circuitName: "Circuito Unión Radio (Leones)",
    stationName: "La Mega 107.3 FM · Onda 107.9 FM",
    dial: "107.9 FM / 107.3 FM Caracas · 1090 AM",
    city: "Caracas / Red Nacional Unión Radio",
    webPlayerUrl: "https://mundour.com/envivo/",
    streamUrl: "https://stream.zeno.fm/f97vcm325v8uv",
    narrators: "Fernando Arreaza, Efraín Zavarce, Pascual Artiles",
    description: "Transmisión oficial de los Leones del Caracas a través de la cadena nacional de Unión Radio.",
  },
  MAG: {
    circuitName: "Circuito Radial Magallanes",
    stationName: "La Mega 95.7 FM · Unión Radio 105.3 FM",
    dial: "95.7 FM Valencia · 105.3 FM · 1090 AM",
    city: "Valencia / Red Nacional",
    webPlayerUrl: "https://mundour.com/lamega-valencia/",
    streamUrl: "https://stream.zeno.fm/p8e8r9c5rzzuv",
    narrators: "Giner García, Carlos Feo, Carlos Tovar Ostos",
    description: "Voz oficial de la Nave Turca con cobertura total para el centro y todo el país.",
  },
  LAR: {
    circuitName: "Circuito Cardenales de Lara",
    stationName: "Sabrosa 90.1 FM · Líder 94.9 FM",
    dial: "90.1 FM / 94.9 FM Barquisimeto",
    city: "Barquisimeto / Centroccidente",
    webPlayerUrl: "https://sabrosa901fm.com/",
    streamUrl: "https://stream.zeno.fm/43y2b2sq5v8uv",
    narrators: "Alfonso Saer 'El Narrador', Alfonso Saer Gómez, Ignacio Serrano",
    description: "Transmisión histórica de los Cardenales de Lara con la narración de Alfonso Saer.",
  },
  LAG: {
    circuitName: "Circuito Radial Tiburones",
    stationName: "Unión Radio Deportes 1090 AM · Onda 90.3 FM",
    dial: "1090 AM Caracas · 90.3 FM La Guaira",
    city: "La Guaira / Gran Caracas",
    webPlayerUrl: "https://mundour.com/union-radio-deportes/",
    streamUrl: "https://stream.zeno.fm/f97vcm325v8uv",
    narrators: "Atilano Hidalgo Peña, Carlos Valmore Rodríguez, Gabriel Chávez",
    description: "La samba y las emociones de los Tiburones de La Guaira en vivo.",
  },
  ARA: {
    circuitName: "Circuito Radial Tigres de Aragua",
    stationName: "Aragüeña 99.5 FM · Fiesta 106.5 FM",
    dial: "99.5 FM / 106.5 FM Maracay",
    city: "Maracay / Región Central",
    webPlayerUrl: "https://araguena995fm.com/",
    narrators: "Héctor Cordido, Manuel Rodríguez, David Concepción Jr.",
    description: "Transmisión bengalí desde el José Pérez Colmenares para todo el estado Aragua.",
  },
  ZUL: {
    circuitName: "Circuito Radial Águilas del Zulia",
    stationName: "Urbe 96.3 FM · Fe y Alegría 88.1 FM",
    dial: "96.3 FM / 88.1 FM Maracaibo",
    city: "Maracaibo / Todo el Zulia",
    webPlayerUrl: "https://www.urbe.edu/urbefm/",
    streamUrl: "https://stream.zeno.fm/k2kzvdf2m0hvv",
    narrators: "Joan Urdaneta, Rafael Petit, Rodolfo Rincón",
    description: "El nido rapaz en vivo con el béisbol y la gaita zuliana desde el Luis Aparicio El Grande.",
  },
  MAR: {
    circuitName: "Circuito Radial Bravos de Margarita",
    stationName: "Reina 96.7 FM · Kys 101.5 FM",
    dial: "96.7 FM Porlamar · 101.5 FM Caracas",
    city: "Isla de Margarita / Caracas",
    webPlayerUrl: "https://reina967fm.com/",
    narrators: "Guillermo Rodríguez, David Naranjo, Trina Ballesteros",
    description: "La voz brava insular desde el Estadio Nueva Esparta de Guatamare.",
  },
  ANZ: {
    circuitName: "Circuito Radial Caribes",
    stationName: "Circuito Orbital 103.3 FM · Romántica 98.9 FM",
    dial: "103.3 FM / 98.9 FM Puerto La Cruz",
    city: "Puerto La Cruz / Oriente",
    webPlayerUrl: "https://orbitalfm.com/",
    narrators: "Tony Cruz, Carlos Tovar Ostos, Luis Ramos",
    description: "La tribu oriental en vivo desde el Alfonso 'Chico' Carrasquel.",
  },
};

export const MLB_DEFAULT_RADIO: Record<string, { station: string; dial: string; spanish?: string }> = {
  NYY: { station: "WFAN Sports Radio", dial: "660 AM / 101.9 FM", spanish: "WADO 1280 AM" },
  LAD: { station: "Dodgers Radio AM570", dial: "570 AM", spanish: "KTNQ 1020 AM" },
  HOU: { station: "SportsTalk 790", dial: "790 AM", spanish: "TUDN Radio 93.3 FM" },
  BOS: { station: "WEEI Sports Radio", dial: "93.7 FM", spanish: "WAMG 890 AM" },
  NYM: { station: "WCBS Newsradio", dial: "880 AM", spanish: "Que Buena 92.7 FM" },
  ATL: { station: "680 The Fan", dial: "680 AM / 93.7 FM", spanish: "La Mejor 1600 AM" },
  SD: { station: "97.3 The Fan", dial: "97.3 FM", spanish: "XEMO 860 AM" },
  PHI: { station: "SportsRadio 94 WIP", dial: "94.1 FM", spanish: "WTTM 1680 AM" },
};

/**
 * Resolves the real radio circuit information for a given team in a game.
 */
export function resolveTeamRadio(
  teamCode: string,
  side: "away" | "home",
  apiBroadcasts?: any[]
): RadioBroadcastInfo {
  const normCode = (teamCode || "").toUpperCase().trim();

  // 1. LVBP Teams
  if (LVBP_RADIO_CIRCUITS[normCode]) {
    const meta = LVBP_RADIO_CIRCUITS[normCode];
    return {
      teamCode: normCode,
      side,
      circuitName: meta.circuitName,
      stationName: meta.stationName,
      dial: meta.dial,
      city: meta.city,
      webPlayerUrl: meta.webPlayerUrl,
      streamUrl: meta.streamUrl,
      narrators: meta.narrators,
      isSpanish: true,
    };
  }

  // 2. MLB Teams: Inspect real API broadcasts if available
  if (Array.isArray(apiBroadcasts) && apiBroadcasts.length > 0) {
    const sideBroadcasts = apiBroadcasts.filter(
      (b) =>
        (b?.type === "AM" || b?.type === "FM") &&
        (b?.homeAway === side || (!b?.homeAway && b?.isNational))
    );

    // Check for Spanish broadcast first
    const spanishBc = sideBroadcasts.find((b) => b?.language === "es");
    if (spanishBc) {
      const callSign = spanishBc.callSign || spanishBc.name || "Radio";
      return {
        teamCode: normCode,
        side,
        circuitName: `${normCode} Radio (Español)`,
        stationName: spanishBc.name || callSign,
        dial: callSign,
        city: "Transmisión Oficial en Español",
        webPlayerUrl: "https://www.mlb.com/live-stream-games",
        narrators: "Transmisión en Español",
        isSpanish: true,
      };
    }

    const primaryBc = sideBroadcasts[0];
    if (primaryBc) {
      const callSign = primaryBc.callSign || primaryBc.name || "Radio";
      return {
        teamCode: normCode,
        side,
        circuitName: `${normCode} Radio Network`,
        stationName: primaryBc.name || callSign,
        dial: callSign,
        city: "Señal Radial Oficial",
        webPlayerUrl: "https://www.mlb.com/live-stream-games",
        narrators: "MLB Radio Broadcast",
        isSpanish: primaryBc.language === "es",
      };
    }
  }

  // 3. MLB Fallback Defaults
  if (MLB_DEFAULT_RADIO[normCode]) {
    const mlbDef = MLB_DEFAULT_RADIO[normCode];
    return {
      teamCode: normCode,
      side,
      circuitName: `${normCode} Radio Network`,
      stationName: mlbDef.station,
      dial: mlbDef.dial,
      city: mlbDef.spanish ? `Español: ${mlbDef.spanish}` : "Transmisión Oficial MLB",
      webPlayerUrl: "https://www.mlb.com/live-stream-games",
      narrators: "MLB Audio / Gameday",
      isSpanish: false,
    };
  }

  // Generic fallback
  const teamMeta = MLB_TEAMS[normCode];
  return {
    teamCode: normCode,
    side,
    circuitName: `Circuito ${teamMeta?.name || normCode}`,
    stationName: "Señal Radial Oficial",
    dial: "Radio Oficial",
    city: teamMeta?.city || "Béisbol en Vivo",
    webPlayerUrl: "https://www.mlb.com/live-stream-games",
    narrators: "Transmisión Oficial",
    isSpanish: true,
  };
}

/**
 * Opens the official radio broadcast in a docked PiP popup window on desktop or a new tab on mobile.
 */
export function openOfficialRadio(radio: RadioBroadcastInfo): boolean {
  if (typeof window === "undefined" || !radio.webPlayerUrl) return false;
  const targetUrl = radio.webPlayerUrl;
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    const opened = window.open(targetUrl, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  }

  const width = 480;
  const height = 580;
  const left = Math.max(0, window.screen.availWidth - width - 24);
  const top = Math.max(0, window.screen.availHeight - height - 48);

  const windowFeatures = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "menubar=no",
    "toolbar=no",
    "location=yes",
    "status=no",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  const popoutName = `EnJuego_Radio_${radio.teamCode || "Live"}`;
  const popout = window.open(targetUrl, popoutName, windowFeatures);
  if (!popout || popout.closed || typeof popout.closed === "undefined") {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    return true;
  }
  try {
    popout.focus();
  } catch {
    // ignore
  }
  return true;
}

