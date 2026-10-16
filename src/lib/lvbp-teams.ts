export interface LvbpTeamMeta {
  id: number;
  code: string;
  mlbAbbr: string;
  name: string;
  shortName: string;
  nick: string;
  city: string;
  venue: string;
  venueCity: string;
  capacity: number;
  surface: string;
  dimensions: string;
  founded: number;
  color: string;
  secondaryColor: string;
  story: string;
  radioName: string;
  logoSvg: string;
}

function makeShieldSvg(bg: string, accent: string, text: string, textColor = "#ffffff"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <path d="M48 6 L84 18 V46 C84 68 68 83 48 90 C28 83 12 68 12 46 V18 Z" fill="url(#g)" stroke="${accent}" stroke-width="4"/>
    <path d="M48 12 L78 22 V45 C78 63 64 76 48 83 C32 76 18 63 18 45 V22 Z" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>
    <text x="48" y="56" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${text.length > 3 ? 20 : 24}" fill="${textColor}" letter-spacing="1">${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const LVBP_OFFICIAL_LOGO = "/logos/lvbp.svg";

export const LVBP_TEAMS: Record<string, LvbpTeamMeta> = {
  CAR: {
    id: 695,
    code: "CAR",
    mlbAbbr: "CAR",
    name: "Leones del Caracas",
    shortName: "CAR",
    nick: "Leones",
    city: "Caracas",
    venue: "Estadio Monumental Simón Bolívar",
    venueCity: "Caracas",
    capacity: 38000,
    surface: "Grama artificial",
    dimensions: "LF 330' · CF 400' · RF 330'",
    founded: 1942,
    color: "#c8102e",
    secondaryColor: "#eab308",
    story:
      "Los Leones del Caracas son el club más ganador de la historia venezolana. Nacidos en 1942, cargan una tradición de estrellas, títulos inolvidables y una fanaticada que convierte el Monumental de La Rinconada en una fiesta cada noche.",
    radioName: "Circuito Radial Leones",
    logoSvg: "/logos/695.png",
  },
  MAG: {
    id: 696,
    code: "MAG",
    mlbAbbr: "MAG",
    name: "Navegantes del Magallanes",
    shortName: "MAG",
    nick: "Navegantes",
    city: "Valencia",
    venue: "Estadio José Bernardo Pérez",
    venueCity: "Valencia",
    capacity: 16000,
    surface: "Grama natural",
    dimensions: "LF 338' · CF 403' · RF 338'",
    founded: 1917,
    color: "#1d4e89",
    secondaryColor: "#facc15",
    story:
      "Los Navegantes del Magallanes representan a Valencia y a millones de aficionados en toda Venezuela. La Nave Turca navega con rivalidades eternas, regresos eléctricos y una identidad inconfundible.",
    radioName: "Circuito Radial Magallanes",
    logoSvg: "/logos/696.png",
  },
  LAR: {
    id: 693,
    code: "LAR",
    mlbAbbr: "LAR",
    name: "Cardenales de Lara",
    shortName: "LAR",
    nick: "Cardenales",
    city: "Barquisimeto",
    venue: "Estadio Antonio Herrera Gutiérrez",
    venueCity: "Barquisimeto",
    capacity: 20450,
    surface: "Grama natural",
    dimensions: "LF 333' · CF 398' · RF 328'",
    founded: 1942,
    color: "#8c1d18",
    secondaryColor: "#f8fafc",
    story:
      "Los Cardenales de Lara juegan con el rojo crepuscular de Barquisimeto. Fundados en 1942, viven del calor de la afición en el Antonio Herrera Gutiérrez y de una dinastía de peloteros aguerridos.",
    radioName: "Circuito Cardenales",
    logoSvg: "/logos/693.png",
  },
  LAG: {
    id: 698,
    code: "LAG",
    mlbAbbr: "LAG",
    name: "Tiburones de La Guaira",
    shortName: "LAG",
    nick: "Tiburones",
    city: "La Guaira / Caracas",
    venue: "Estadio Universitario / Forum La Guaira",
    venueCity: "Caracas / Macuto",
    capacity: 20700,
    surface: "Grama natural",
    dimensions: "LF 346' · CF 406' · RF 346'",
    founded: 1962,
    color: "#1493c9",
    secondaryColor: "#ef4444",
    story:
      "Los Tiburones de La Guaira juegan al ritmo de la samba y el mar. La Guerrilla dejó huella eterna y hoy el club defiende su historia entre el Universitario y el Fórum de Macuto.",
    radioName: "Circuito Radial Tiburones",
    logoSvg: "/logos/698.png",
  },
  ARA: {
    id: 699,
    code: "ARA",
    mlbAbbr: "ARA",
    name: "Tigres de Aragua",
    shortName: "ARA",
    nick: "Tigres",
    city: "Maracay",
    venue: "Estadio José Pérez Colmenares",
    venueCity: "Maracay",
    capacity: 12650,
    surface: "Grama natural",
    dimensions: "LF 341' · CF 400' · RF 341'",
    founded: 1965,
    color: "#e87722",
    secondaryColor: "#1e3a8a",
    story:
      "Los Tigres de Aragua rugen en la Ciudad Jardín de Maracay. El José Pérez Colmenares ha visto dinastías, títulos de Serie del Caribe y una tradición bengalí que marca a generaciones.",
    radioName: "Circuito Radial Tigres",
    logoSvg: "/logos/699.png",
  },
  ZUL: {
    id: 692,
    code: "ZUL",
    mlbAbbr: "ZUL",
    name: "Águilas del Zulia",
    shortName: "ZUL",
    nick: "Águilas",
    city: "Maracaibo",
    venue: "Estadio Luis Aparicio El Grande",
    venueCity: "Maracaibo",
    capacity: 22000,
    surface: "Grama natural",
    dimensions: "LF 342' · CF 412' · RF 342'",
    founded: 1969,
    color: "#f0b429",
    secondaryColor: "#111827",
    story:
      "Las Águilas del Zulia llevan el orgullo de Maracaibo. El Luis Aparicio El Grande es su nido: béisbol aguerrido, gaita zuliana y una afición que empuja cada entrada.",
    radioName: "Circuito Radial Águilas",
    logoSvg: "/logos/692.png",
  },
  MAR: {
    id: 697,
    code: "MAR",
    mlbAbbr: "MAR",
    name: "Bravos de Margarita",
    shortName: "MAR",
    nick: "Bravos",
    city: "Porlamar",
    venue: "Estadio Nueva Esparta",
    venueCity: "Guatamare, Isla de Margarita",
    capacity: 15800,
    surface: "Grama natural",
    dimensions: "LF 332' · CF 406' · RF 332'",
    founded: 2007,
    color: "#d7263d",
    secondaryColor: "#06b6d4",
    story:
      "Los Bravos de Margarita llevan la fuerza insular al diamante. El Estadio Nueva Esparta de Guatamare es sinónimo de brisa caribeña y un club que pelea cada serie con carácter.",
    radioName: "Circuito Radial Bravos",
    logoSvg: "/logos/697.png",
  },
  ANZ: {
    id: 694,
    code: "ANZ",
    mlbAbbr: "ORI",
    name: "Caribes de Anzoátegui",
    shortName: "ANZ",
    nick: "Caribes",
    city: "Puerto La Cruz",
    venue: "Estadio Alfonso 'Chico' Carrasquel",
    venueCity: "Puerto La Cruz",
    capacity: 18000,
    surface: "Grama natural",
    dimensions: "LF 330' · CF 395' · RF 330'",
    founded: 1987,
    color: "#6e3b6f",
    secondaryColor: "#f97316",
    story:
      "Los Caribes de Anzoátegui juegan al ritmo del oriente venezolano. La Tribu hace vibrar el Alfonso 'Chico' Carrasquel de Puerto La Cruz con ofensiva explosiva y noches de campeonato.",
    radioName: "Circuito Radial Caribes",
    logoSvg: "/logos/694.png",
  },
};

export const TEAM_BY_ID: Record<number, LvbpTeamMeta> = Object.values(LVBP_TEAMS).reduce(
  (acc, team) => {
    acc[team.id] = team;
    return acc;
  },
  {} as Record<number, LvbpTeamMeta>
);

export function resolveLvbpTeam(idOrCode?: number | string, fallbackName = "Equipo LVBP"): LvbpTeamMeta {
  if (typeof idOrCode === "number" && TEAM_BY_ID[idOrCode]) {
    return TEAM_BY_ID[idOrCode];
  }
  const upper = String(idOrCode || "").toUpperCase();
  if (LVBP_TEAMS[upper]) return LVBP_TEAMS[upper];
  if (upper === "ORI") return LVBP_TEAMS.ANZ;
  const byName = Object.values(LVBP_TEAMS).find(
    (t) =>
      fallbackName.toLowerCase().includes(t.nick.toLowerCase()) ||
      fallbackName.toLowerCase().includes(t.city.toLowerCase())
  );
  return byName || LVBP_TEAMS.CAR;
}

export function playerHeadshot(id?: number | string): string {
  if (!id) {
    return (
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1e293b"/><circle cx="32" cy="24" r="11" fill="#64748b"/><path d="M10 64c2-17 12-25 22-25s20 8 22 25z" fill="#64748b"/></svg>'
      )
    );
  }
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_160,q_auto:good,f_auto/v1/people/${id}/headshot/67/current`;
}
