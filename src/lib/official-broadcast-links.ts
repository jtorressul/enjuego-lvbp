export interface BroadcastChannelInfo {
  name: string;
  officialUrl?: string;
  badgeLabel: string;
  type: "open_stream" | "digital_stream" | "cable_network";
  isOpenTv: boolean;
  dialInfo?: string;
  description: string;
}

export const OFFICIAL_BROADCAST_CHANNELS: Record<string, BroadcastChannelInfo> = {
  "Venevisión": {
    name: "Venevisión",
    officialUrl: "https://www.venevisionplay.com/player/channel/63ebefc9949c830012620602",
    badgeLabel: "Venevisión Play",
    type: "open_stream",
    isOpenTv: true,
    description: "Señal abierta nacional y streaming oficial gratuito en Venevisión Play.",
  },
  "Televen": {
    name: "Televen",
    officialUrl: "https://app.televen.com/",
    badgeLabel: "Televen Stream",
    type: "open_stream",
    isOpenTv: true,
    description: "Señal abierta nacional y streaming oficial en vivo en Televen Stream / Televen MAX.",
  },
  "BeisbolPlay": {
    name: "BeisbolPlay",
    officialUrl: "https://www.beisbolplay.com/lvbp-envivo",
    badgeLabel: "BeisbolPlay",
    type: "digital_stream",
    isOpenTv: false,
    description: "Plataforma oficial de streaming con el 100% de los juegos de la LVBP en vivo por suscripción.",
  },
  "YouTube": {
    name: "YouTube",
    officialUrl: "https://www.youtube.com/@LVBP_Oficial/streams",
    badgeLabel: "YouTube LVBP",
    type: "open_stream",
    isOpenTv: true,
    description: "Transmisiones oficiales gratuitas en el canal oficial de YouTube de la LVBP.",
  },
  "Meridiano TV": {
    name: "Meridiano TV",
    officialUrl: "https://meridiano.net/",
    badgeLabel: "Meridiano TV",
    type: "open_stream",
    isOpenTv: true,
    description: "Canal especialista en deportes por señal abierta y cable en Venezuela.",
  },
  "IVC": {
    name: "IVC",
    officialUrl: "https://ivcnetworks.com/",
    badgeLabel: "IVC Network",
    type: "cable_network",
    isOpenTv: false,
    dialInfo: "SimpleTV: 111 / HD 1111 · Inter: 102 / HD 100 · NetUno: 105",
    description: "Cadena deportiva por suscripción con transmisiones exclusivas de la LVBP.",
  },
  "ByM Sport": {
    name: "ByM Sport",
    officialUrl: "https://inter.com.ve/bymsport/",
    badgeLabel: "ByM Sport",
    type: "cable_network",
    isOpenTv: false,
    dialInfo: "Inter: 100 / HD 189 · SimpleTV: 610 / HD 1610",
    description: "Canal deportivo exclusivo de Inter y SimpleTV para la temporada de béisbol.",
  },
  "1Baseball Network": {
    name: "1Baseball Network",
    officialUrl: "https://1baseballnetwork.com/",
    badgeLabel: "1Baseball",
    type: "cable_network",
    isOpenTv: false,
    dialInfo: "SimpleTV: 119 / HD 1119 · Inter: 111",
    description: "Canal temático de béisbol con cobertura de la LVBP en televisión por suscripción.",
  },
  "Canal i": {
    name: "Canal i",
    officialUrl: "https://canal-i.com/en-vivo/",
    badgeLabel: "Canal i",
    type: "open_stream",
    isOpenTv: true,
    description: "Señal abierta nacional con transmisiones selectas de béisbol profesional.",
  },
  "TVES": {
    name: "TVES",
    officialUrl: "https://www.tves.gob.ve/en-vivo/",
    badgeLabel: "TVES",
    type: "open_stream",
    isOpenTv: true,
    description: "Señal abierta nacional de televisión pública venezolana.",
  },
  "VTV": {
    name: "VTV",
    officialUrl: "https://www.vtv.gob.ve/en-vivo/",
    badgeLabel: "VTV",
    type: "open_stream",
    isOpenTv: true,
    description: "Señal abierta nacional con encuentros selectos de la LVBP.",
  },
  "TLT": {
    name: "TLT",
    officialUrl: "https://lateletuya.com/",
    badgeLabel: "TLT La Tele Tuya",
    type: "open_stream",
    isOpenTv: true,
    description: "Señal abierta de televisión venezolana con transmisiones deportivas.",
  },
  "OK.ru": {
    name: "OK.ru",
    officialUrl: "https://ok.ru/video/14909080673812",
    badgeLabel: "OK.ru En Vivo",
    type: "open_stream",
    isOpenTv: true,
    description: "Transmisión en vivo Caracas vs La Guaira disponible online.",
  },
};

export function cleanChannelName(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isOpenTvChannel(channelName: string): boolean {
  if (!channelName) return false;
  const clean = cleanChannelName(channelName);
  return (
    clean.includes("venevision") ||
    clean.includes("televen") ||
    clean.includes("meridiano") ||
    clean.includes("tves") ||
    clean.includes("teves") ||
    clean.includes("vtv") ||
    clean.includes("canal i") ||
    clean.includes("canali") ||
    clean.includes("tlt") ||
    clean.includes("youtube") ||
    clean.includes("ok.ru") ||
    clean.includes("ok ru")
  );
}

export function filterOpenTvChannels(channels: string[]): string[] {
  if (!Array.isArray(channels)) return [];
  return channels.filter(isOpenTvChannel);
}

export function getChannelInfo(rawChannel: string): BroadcastChannelInfo {
  const norm = rawChannel.trim();
  if (OFFICIAL_BROADCAST_CHANNELS[norm]) {
    return OFFICIAL_BROADCAST_CHANNELS[norm];
  }
  const cleanTarget = cleanChannelName(norm);
  for (const [key, val] of Object.entries(OFFICIAL_BROADCAST_CHANNELS)) {
    const cleanKey = cleanChannelName(key);
    if (cleanTarget.includes(cleanKey) || cleanKey.includes(cleanTarget)) {
      return val;
    }
  }

  const isOpen = isOpenTvChannel(rawChannel);
  return {
    name: norm,
    badgeLabel: norm,
    type: isOpen ? "open_stream" : "digital_stream",
    isOpenTv: isOpen,
    officialUrl: isOpen ? undefined : "https://www.beisbolplay.com/lvbp-envivo",
    description: `Transmisión oficial de ${norm} para la LVBP.`,
  };
}

export function openOfficialBroadcast(
  channel: string,
  gameTitle?: string,
  mode: "pip" | "popout" = "pip"
): boolean {
  if (typeof window === "undefined") return false;

  const info = getChannelInfo(channel);
  const targetUrl = info.officialUrl || "https://www.beisbolplay.com/lvbp-envivo";

  // Mobile screen check: opens in standard tab / app
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    const opened = window.open(targetUrl, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  }

  // Desktop: PiP mode docks in the bottom-right corner of the monitor
  const width = mode === "pip" ? 620 : Math.min(1080, Math.floor(window.screen.availWidth * 0.8));
  const height = mode === "pip" ? 390 : Math.min(680, Math.floor(window.screen.availHeight * 0.85));

  const left = mode === "pip"
    ? Math.max(0, window.screen.availWidth - width - 24)
    : Math.max(0, Math.floor((window.screen.availWidth - width) / 2));

  const top = mode === "pip"
    ? Math.max(0, window.screen.availHeight - height - 48)
    : Math.max(0, Math.floor((window.screen.availHeight - height) / 2));

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

  const popoutName = `EnJuego_${info.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const popout = window.open(targetUrl, popoutName, windowFeatures);

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
