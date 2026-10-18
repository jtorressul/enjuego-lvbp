import type { RadioBroadcastInfo, RadioStationOption } from "./types";
export type { RadioBroadcastInfo, RadioStationOption };
import { MLB_TEAMS } from "./mlb-teams";

export interface TeamRadioMeta {
  circuitName: string;
  stationName: string;
  dial: string;
  city: string;
  webPlayerUrl: string;
  streamUrl?: string;
  embedType?: "audio" | "iframe" | "youtube";
  embedUrl?: string;
  stations?: RadioStationOption[];
  narrators: string;
  description: string;
}

export const LVBP_RADIO_CIRCUITS: Record<string, TeamRadioMeta> = {
  // Tiburones de La Guaira: Candela Pura 91.9 FM y RQ 910 AM
  LAG: {
    circuitName: "Circuito Radial Tiburones",
    stationName: "Candela Pura 91.9 FM · RQ 910 AM",
    dial: "91.9 FM Caracas · 910 AM",
    city: "Caracas / La Guaira",
    webPlayerUrl: "https://acp2.lorini.net:58400/stream",
    streamUrl: "https://acp2.lorini.net:58400/stream",
    embedType: "audio",
    stations: [
      {
        id: "candela",
        name: "Candela Pura 91.9 FM",
        dial: "91.9 FM Caracas",
        streamUrl: "https://acp2.lorini.net:58400/stream",
        webPlayerUrl: "https://acp2.lorini.net:58400/stream",
        embedType: "audio",
      },
      {
        id: "rq910",
        name: "RQ 910 AM",
        dial: "910 AM Caracas",
        streamUrl: "https://acp2.lorini.net:58500/stream",
        webPlayerUrl: "https://acp2.lorini.net:58500/stream",
        embedType: "audio",
      },
    ],
    narrators: "Atilano Hidalgo Peña, Carlos Valmore Rodríguez, Gabriel Chávez",
    description: "Transmisión oficial de los Tiburones de La Guaira con la samba y la emoción en vivo.",
  },

  // Navegantes del Magallanes: Hot 94 FM (hot94.fm)
  MAG: {
    circuitName: "Circuito Radial Magallanes",
    stationName: "Hot 94 FM (FM Center)",
    dial: "94.1 FM Caracas · hot94.fm",
    city: "Caracas / Valencia",
    webPlayerUrl: "https://hot94.fm/",
    streamUrl: "https://acp2.lorini.net:58300/stream",
    embedType: "audio",
    stations: [
      {
        id: "hot94",
        name: "Hot 94.1 FM",
        dial: "94.1 FM",
        streamUrl: "https://acp2.lorini.net:58300/stream",
        webPlayerUrl: "https://hot94.fm/",
        embedType: "audio",
      },
    ],
    narrators: "Giner García, Carlos Feo, Carlos Tovar Ostos",
    description: "Voz oficial de la Nave Turca a través de Hot 94.1 FM y la cadena Magallanes.",
  },

  // Leones del Caracas: Unión Radio (unionradio.net/live-pt/)
  CAR: {
    circuitName: "Circuito Unión Radio (Leones)",
    stationName: "Unión Radio Live · La Mega 107.3 FM",
    dial: "107.9 FM / 107.3 FM · unionradio.net/live-pt",
    city: "Caracas / Red Nacional",
    webPlayerUrl: "https://unionradio.net/live-pt/",
    embedUrl: "https://unionradio.net/live-pt/",
    embedType: "iframe",
    narrators: "Fernando Arreaza, Efraín Zavarce, Pascual Artiles",
    description: "Transmisión oficial de los Leones del Caracas a través de Unión Radio en vivo.",
  },

  // Cardenales de Lara: Cardenales FM (cardenalesfm.net)
  LAR: {
    circuitName: "Circuito Cardenales de Lara",
    stationName: "Cardenales 92.1 FM",
    dial: "92.1 FM Barquisimeto · cardenalesfm.net",
    city: "Barquisimeto / Centroccidente",
    webPlayerUrl: "https://www.cardenalesfm.net/",
    streamUrl: "https://server6.globalhostla.com:9308/stream",
    embedUrl:
      "https://player.globalstreaming.com.ve/?nr=CARDENALES%2092.1%20FM&s=6&p=08&dr=cardenalesfm.net&l=logo.png&bgI=background.png&c1=000000&c2=FFFFFF&c3=C91414&c4=FFFFFF&vt=6&i=cardenales921fm",
    embedType: "audio",
    narrators: "Alfonso Saer 'El Narrador', Alfonso Saer Gómez, Ignacio Serrano",
    description: "Transmisión oficial de los Cardenales de Lara en vivo desde Barquisimeto.",
  },

  // Caribes de Anzoátegui: Radio Anzoátegui (onlineradiobox.com/ve/anzoategui/)
  ANZ: {
    circuitName: "Circuito Radial Caribes",
    stationName: "Radio Anzoátegui",
    dial: "Puerto La Cruz · onlineradiobox.com/ve/anzoategui",
    city: "Puerto La Cruz / Oriente",
    webPlayerUrl: "https://onlineradiobox.com/ve/anzoategui/",
    streamUrl: "https://acp2.lorini.net:44008/stream",
    embedType: "audio",
    narrators: "Tony Cruz, Carlos Tovar Ostos, Luis Ramos",
    description: "La tribu oriental en vivo con la señal oficial de Radio Anzoátegui.",
  },

  // Tigres de Aragua: YouTube Tigresdearaguaradio (youtube.com/@Tigresdearaguaradio/streams)
  ARA: {
    circuitName: "Circuito Tigres de Aragua Radio",
    stationName: "Tigres de Aragua Radio (YouTube Live)",
    dial: "Canal Oficial YouTube @Tigresdearaguaradio",
    city: "Maracay / En vivo",
    webPlayerUrl: "https://www.youtube.com/@Tigresdearaguaradio/streams",
    streamUrl: "https://acp2.lorini.net:58200/stream",
    embedType: "youtube",
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCBOFzNo5SBak7Hi2F6JTENw",
    narrators: "Héctor Cordido, Manuel Rodríguez, David Concepción Jr.",
    description: "Transmisión en vivo oficial de Tigres de Aragua Radio a través de su canal de YouTube.",
  },

  // Bravos de Margarita: Éxitos FM (mundour.com/live-exitos/)
  MAR: {
    circuitName: "Circuito Bravos de Margarita",
    stationName: "Éxitos FM (MundoUR)",
    dial: "99.7 FM Margarita · mundour.com/live-exitos",
    city: "Isla de Margarita / Caracas",
    webPlayerUrl: "https://mundour.com/live-exitos/",
    embedUrl: "https://mundour.com/live-exitos/",
    embedType: "iframe",
    narrators: "Guillermo Rodríguez, David Naranjo, Trina Ballesteros",
    description: "La voz brava insular a través del circuito Éxitos FM en vivo.",
  },

  // Águilas del Zulia: Digital 58 Radio (digital58.com.ve/site/digital58-radio/)
  ZUL: {
    circuitName: "Circuito Águilas del Zulia",
    stationName: "Digital 58 Radio",
    dial: "Maracaibo / Todo el Zulia · digital58.com.ve",
    city: "Maracaibo / Todo el Zulia",
    webPlayerUrl: "https://digital58.com.ve/site/digital58-radio/",
    streamUrl: "https://stream.zeno.fm/swp0kueen98uv",
    embedUrl:
      "https://cp.usastreams.com/pr2g/APPlayerRadioHTML5.aspx?stream=http://stream.zeno.fm/swp0kueen98uv&fondo=05&formato=mp3&color=7&titulo=2&autoStart=20&vol=5&tipo=22&nombre=Digital58+Radio&botonPlay=2&server=http://stream.zeno.fm/status.xslCHUMILLASmount=/swp0kueen98uv",
    embedType: "audio",
    narrators: "Joan Urdaneta, Rafael Petit, Rodolfo Rincón",
    description: "El nido rapaz en vivo con el béisbol de las Águilas del Zulia en Digital 58.",
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

  // 1. LVBP Teams: Exact sources provided by user
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
      embedType: meta.embedType,
      embedUrl: meta.embedUrl,
      stations: meta.stations,
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
        embedType: "iframe",
        embedUrl: "https://www.mlb.com/live-stream-games",
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
        embedType: "iframe",
        embedUrl: "https://www.mlb.com/live-stream-games",
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
      embedType: "iframe",
      embedUrl: "https://www.mlb.com/live-stream-games",
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
