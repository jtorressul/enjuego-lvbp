export interface BroadcastChannelInfo {
  name: string;
  officialUrl?: string;
  badgeLabel: string;
  type: "open_stream" | "digital_stream" | "cable_network";
  dialInfo?: string;
  description: string;
}

export const OFFICIAL_BROADCAST_CHANNELS: Record<string, BroadcastChannelInfo> = {
  "Venevisión": {
    name: "Venevisión",
    officialUrl: "https://venevisionplay.com/",
    badgeLabel: "Venevisión Play",
    type: "open_stream",
    description: "Señal abierta nacional y streaming oficial gratuito en Venevisión Play.",
  },
  "Televen": {
    name: "Televen",
    officialUrl: "https://televen.com/en-vivo/",
    badgeLabel: "Televen Stream",
    type: "open_stream",
    description: "Señal abierta nacional y streaming oficial en vivo en Televen Stream.",
  },
  "BeisbolPlay": {
    name: "BeisbolPlay",
    officialUrl: "https://www.beisbolplay.com/lvbp-envivo",
    badgeLabel: "BeisbolPlay",
    type: "digital_stream",
    description: "Plataforma oficial de streaming con el 100% de los juegos de la LVBP en vivo.",
  },
  "YouTube": {
    name: "YouTube",
    officialUrl: "https://www.youtube.com/@LVBP_Oficial/streams",
    badgeLabel: "YouTube LVBP",
    type: "open_stream",
    description: "Transmisiones oficiales gratuitas de los lunes de LVBP en su canal de YouTube.",
  },
  "Meridiano TV": {
    name: "Meridiano TV",
    officialUrl: "https://meridiano.net/",
    badgeLabel: "Meridiano TV",
    type: "open_stream",
    description: "Canal especialista en deportes de señal abierta y cable en Venezuela.",
  },
  "IVC": {
    name: "IVC",
    officialUrl: "https://ivcnetworks.com/",
    badgeLabel: "IVC Network",
    type: "cable_network",
    dialInfo: "SimpleTV: 111 / HD 1111 · Inter: 102 / HD 100 · NetUno: 105",
    description: "Cadena deportiva por suscripción con transmisiones exclusivas de la LVBP.",
  },
  "ByM Sport": {
    name: "ByM Sport",
    officialUrl: "https://inter.com.ve/bymsport/",
    badgeLabel: "ByM Sport",
    type: "cable_network",
    dialInfo: "Inter: 100 / HD 189 · SimpleTV: 610 / HD 1610",
    description: "Canal deportivo exclusivo de Inter y SimpleTV para la temporada de béisbol.",
  },
  "1Baseball Network": {
    name: "1Baseball Network",
    officialUrl: "https://1baseballnetwork.com/",
    badgeLabel: "1Baseball",
    type: "cable_network",
    dialInfo: "SimpleTV: 119 / HD 1119 · Inter: 111",
    description: "Canal temático de béisbol con cobertura de la LVBP en televisión por suscripción.",
  },
  "Canal i": {
    name: "Canal i",
    officialUrl: "https://canal-i.com/",
    badgeLabel: "Canal i",
    type: "open_stream",
    description: "Señal abierta nacional con transmisiones selectas de béisbol profesional.",
  },
  "TVES": {
    name: "TVES",
    officialUrl: "https://tves.gob.ve/",
    badgeLabel: "TVES",
    type: "open_stream",
    description: "Señal abierta nacional de televisión pública venezolana.",
  },
  "VTV": {
    name: "VTV",
    officialUrl: "https://vtv.gob.ve/",
    badgeLabel: "VTV",
    type: "open_stream",
    description: "Señal abierta nacional con encuentros selectos de la LVBP.",
  },
};

export function getChannelInfo(rawChannel: string): BroadcastChannelInfo {
  const norm = rawChannel.trim();
  if (OFFICIAL_BROADCAST_CHANNELS[norm]) {
    return OFFICIAL_BROADCAST_CHANNELS[norm];
  }
  // Check partial match
  for (const [key, val] of Object.entries(OFFICIAL_BROADCAST_CHANNELS)) {
    if (norm.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(norm.toLowerCase())) {
      return val;
    }
  }
  return {
    name: norm,
    badgeLabel: norm,
    type: "digital_stream",
    officialUrl: "https://www.beisbolplay.com/lvbp-envivo",
    description: `Transmisión oficial de ${norm} para la LVBP.`,
  };
}

export function openOfficialBroadcast(channel: string, gameTitle?: string): boolean {
  if (typeof window === "undefined") return false;

  const info = getChannelInfo(channel);
  const targetUrl = info.officialUrl || "https://www.beisbolplay.com/lvbp-envivo";

  // Desktop screen dimensions check
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // Open standard target _blank on mobile to allow deep linking to installed apps
    const opened = window.open(targetUrl, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  }

  // Desktop: Controlled popout window (1020x640) centered on screen
  const width = Math.min(1080, Math.floor(window.screen.availWidth * 0.8));
  const height = Math.min(680, Math.floor(window.screen.availHeight * 0.85));
  const left = Math.max(0, Math.floor((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.floor((window.screen.availHeight - height) / 2));

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

  const popout = window.open(
    targetUrl,
    `EnJuego_${info.name.replace(/\s+/g, "_")}`,
    windowFeatures
  );

  if (!popout || popout.closed || typeof popout.closed === "undefined") {
    // Popup was blocked by browser, fallback to standard new tab
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    return true;
  }

  try {
    popout.focus();
  } catch {
    // ignore focus error
  }

  return true;
}
