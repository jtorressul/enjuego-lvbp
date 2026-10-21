export type LeagueId = "lvbp" | "lidom" | "lmp" | "mlb";

export interface LeagueConfig {
  id: LeagueId;
  name: string;
  shortName: string;
  tagline: string;
  country: string;
  countryCode: string;
  flag: string;
  mlbLeagueId: number;
  sportId: number;
  defaultTeamCode: string;
  accentColor: string;
  badgeBg: string;
}

export const LEAGUES: Record<LeagueId, LeagueConfig> = {
  lvbp: {
    id: "lvbp",
    name: "Liga Venezolana de Béisbol Profesional",
    shortName: "LVBP",
    tagline: "Béisbol de Venezuela",
    country: "Venezuela",
    countryCode: "VE",
    flag: "🇻🇪",
    mlbLeagueId: 135,
    sportId: 17,
    defaultTeamCode: "CAR",
    accentColor: "#f59e0b",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  lidom: {
    id: "lidom",
    name: "Liga de Béisbol Profesional de la Rep. Dominicana",
    shortName: "LIDOM",
    tagline: "Béisbol Dominicano",
    country: "Rep. Dominicana",
    countryCode: "DO",
    flag: "🇩🇴",
    mlbLeagueId: 131,
    sportId: 17,
    defaultTeamCode: "LIC",
    accentColor: "#3b82f6",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  lmp: {
    id: "lmp",
    name: "Liga ARCO Mexicana del Pacífico",
    shortName: "LMP",
    tagline: "Béisbol de México",
    country: "México",
    countryCode: "MX",
    flag: "🇲🇽",
    mlbLeagueId: 132,
    sportId: 17,
    defaultTeamCode: "CUL",
    accentColor: "#10b981",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  mlb: {
    id: "mlb",
    name: "Major League Baseball",
    shortName: "MLB",
    tagline: "Grandes Ligas",
    country: "EE. UU.",
    countryCode: "US",
    flag: "🇺🇸",
    mlbLeagueId: 103, // AL 103 / NL 104
    sportId: 1,
    defaultTeamCode: "NYY",
    accentColor: "#ef4444",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

export const LEAGUES_LIST = Object.values(LEAGUES);

export const LEAGUE_MENU_ITEMS: { id: LeagueId; label: string; flag: string }[] = [
  { id: "lvbp", label: "Liga Venezolana (LVBP)", flag: "🇻🇪" },
  { id: "mlb", label: "Grandes Ligas (MLB)", flag: "🇺🇸" },
  { id: "lidom", label: "Liga Dominicana (LIDOM)", flag: "🇩🇴" },
  { id: "lmp", label: "Liga Mexicana (LMP)", flag: "🇲🇽" },
];

export function parseLeague(val?: string | null): LeagueId {
  if (!val) return "lvbp";
  const lower = val.trim().toLowerCase();
  if (lower === "lidom" || lower === "dominicana" || lower === "do") return "lidom";
  if (lower === "lmp" || lower === "mexico" || lower === "mx" || lower === "mexicana") return "lmp";
  if (lower === "mlb" || lower === "grandes-ligas") return "mlb";
  return "lvbp";
}

export function isWinterLeague(league: LeagueId): league is "lidom" | "lmp" {
  return league === "lidom" || league === "lmp";
}

export function leagueOfTeamCode(code: string): LeagueId {
  const upper = String(code || "").toUpperCase();
  const LIDOM_CODES = ["LIC", "AGU", "ESC", "GIG", "EST", "TOR"];
  const LMP_CODES = ["CUL", "HER", "MAZ", "OBR", "MOC", "GSV", "JAL", "MXC", "NAV", "NAY"];
  const LVBP_CODES = ["CAR", "MAG", "LAG", "LAR", "ZUL", "ARA", "ANZ", "MAR"];

  if (LIDOM_CODES.includes(upper)) return "lidom";
  if (LMP_CODES.includes(upper)) return "lmp";
  if (LVBP_CODES.includes(upper)) return "lvbp";
  return "mlb";
}
