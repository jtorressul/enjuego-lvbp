export type SoccerLeagueId =
  | "ven.1"
  | "uefa.champions"
  | "eng.1"
  | "esp.1"
  | "ita.1"
  | "ger.1"
  | "fra.1";

export interface SoccerLeagueConfig {
  id: SoccerLeagueId;
  slug: string;
  name: string;
  shortName: string;
  country: string;
  flag: string;
  logo: string;
  accentColor: string;
  totalTeams: number;
  zones: {
    champions?: number;      // up to this rank
    championsPlayoff?: number; // for UCL 9-24
    europa?: number[];        // ranks
    conference?: number[];    // ranks
    relegation?: number;      // from this rank down
  };
}

export function optimizeEspnLogoUrl(rawUrl?: string, size = 64): string {
  if (!rawUrl) return "";
  if (rawUrl.includes("/combiner/i?")) return rawUrl;
  const match = rawUrl.match(/^https?:\/\/a\.espncdn\.com(\/i\/[^\s?]+)/i);
  if (match && match[1]) {
    return `https://a.espncdn.com/combiner/i?img=${match[1]}&h=${size}&w=${size}`;
  }
  return rawUrl;
}

export const SOCCER_LEAGUES: Record<SoccerLeagueId, SoccerLeagueConfig> = {
  "ven.1": {
    id: "ven.1",
    slug: "futve",
    name: "Liga FUTVE",
    shortName: "Liga FUTVE",
    country: "Venezuela",
    flag: "🇻🇪",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/1947.png&h=64&w=64",
    accentColor: "#6b0f24",
    totalTeams: 14,
    zones: {
      champions: 4,          // Cuadrangulares finales / Copa Libertadores
      europa: [5, 6, 7, 8],  // Copa Sudamericana
      relegation: 14,        // Descenso
    },
  },
  "uefa.champions": {
    id: "uefa.champions",
    slug: "champions",
    name: "UEFA Champions League",
    shortName: "Champions League",
    country: "Europa",
    flag: "🏆",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/2.png&h=64&w=64",
    accentColor: "#001489",
    totalTeams: 36,
    zones: {
      champions: 8,          // Top 8 qualify directly to Round of 16
      championsPlayoff: 24,  // 9-24 Playoff
      relegation: 25,        // 25-36 eliminated
    },
  },
  "eng.1": {
    id: "eng.1",
    slug: "premier",
    name: "Premier League",
    shortName: "Premier League",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/23.png&h=64&w=64",
    accentColor: "#3d195b",
    totalTeams: 20,
    zones: {
      champions: 4,
      europa: [5],
      conference: [6],
      relegation: 18,
    },
  },
  "esp.1": {
    id: "esp.1",
    slug: "laliga",
    name: "LALIGA EA Sports",
    shortName: "LaLiga",
    country: "España",
    flag: "🇪🇸",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/15.png&h=64&w=64",
    accentColor: "#ea0029",
    totalTeams: 20,
    zones: {
      champions: 4,
      europa: [5],
      conference: [6],
      relegation: 18,
    },
  },
  "ita.1": {
    id: "ita.1",
    slug: "serie-a",
    name: "Serie A",
    shortName: "Serie A",
    country: "Italia",
    flag: "🇮🇹",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/12.png&h=64&w=64",
    accentColor: "#024494",
    totalTeams: 20,
    zones: {
      champions: 4,
      europa: [5],
      conference: [6],
      relegation: 18,
    },
  },
  "ger.1": {
    id: "ger.1",
    slug: "bundesliga",
    name: "Bundesliga",
    shortName: "Bundesliga",
    country: "Alemania",
    flag: "🇩🇪",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/10.png&h=64&w=64",
    accentColor: "#d3010c",
    totalTeams: 18,
    zones: {
      champions: 4,
      europa: [5],
      conference: [6],
      relegation: 17, // 16 is playoff, 17-18 direct relegation
    },
  },
  "fra.1": {
    id: "fra.1",
    slug: "ligue-1",
    name: "Ligue 1 McDonald's",
    shortName: "Ligue 1",
    country: "Francia",
    flag: "🇫🇷",
    logo: "https://a.espncdn.com/combiner/i?img=/i/leaguelogos/soccer/500/9.png&h=64&w=64",
    accentColor: "#091c3e",
    totalTeams: 18,
    zones: {
      champions: 3,
      europa: [4, 5],
      conference: [6],
      relegation: 17,
    },
  },
};

export const SOCCER_LEAGUES_LIST = Object.values(SOCCER_LEAGUES);

export function parseSoccerLeague(val?: string | null): SoccerLeagueId {
  if (!val) return "uefa.champions";
  const lower = val.trim().toLowerCase();
  if (
    lower === "futve" ||
    lower === "ven" ||
    lower === "venezuela" ||
    lower === "ven.1" ||
    lower === "liga-futve" ||
    lower === "ligafutve" ||
    lower === "liga futve"
  )
    return "ven.1";
  if (lower === "champions" || lower === "ucl" || lower === "uefa" || lower === "uefa.champions") return "uefa.champions";
  if (lower === "premier" || lower === "pl" || lower === "england" || lower === "eng.1") return "eng.1";
  if (lower === "laliga" || lower === "espana" || lower === "spain" || lower === "esp.1") return "esp.1";
  if (lower === "serie-a" || lower === "seriea" || lower === "italia" || lower === "ita.1") return "ita.1";
  if (lower === "bundesliga" || lower === "alemania" || lower === "ger.1") return "ger.1";
  if (lower === "ligue-1" || lower === "ligue1" || lower === "francia" || lower === "fra.1") return "fra.1";
  return "uefa.champions";
}
