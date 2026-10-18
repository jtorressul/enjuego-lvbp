// Cloudflare Geo-Location & Venezuelan State/Region resolver for EnJuego Analytics

export interface VisitorGeoInfo {
  countryCode: string;
  countryName: string;
  flag: string;
  region: string;
  city: string;
  locationLabel: string;
}

// ISO 3166-1 alpha-2 flags and Spanish country names
export const COUNTRY_DICTIONARY: Record<string, { name: string; flag: string }> = {
  VE: { name: "Venezuela", flag: "🇻🇪" },
  US: { name: "Estados Unidos", flag: "🇺🇸" },
  ES: { name: "España", flag: "🇪🇸" },
  CO: { name: "Colombia", flag: "🇨🇴" },
  CL: { name: "Chile", flag: "🇨🇱" },
  PE: { name: "Perú", flag: "🇵🇪" },
  PA: { name: "Panamá", flag: "🇵🇦" },
  DO: { name: "Rep. Dominicana", flag: "🇩🇴" },
  MX: { name: "México", flag: "🇲🇽" },
  EC: { name: "Ecuador", flag: "🇪🇨" },
  AR: { name: "Argentina", flag: "🇦🇷" },
  CA: { name: "Canadá", flag: "🇨🇦" },
  BR: { name: "Brasil", flag: "🇧🇷" },
  IT: { name: "Italia", flag: "🇮🇹" },
  PT: { name: "Portugal", flag: "🇵🇹" },
  UY: { name: "Uruguay", flag: "🇺🇾" },
  CR: { name: "Costa Rica", flag: "🇨🇷" },
  PR: { name: "Puerto Rico", flag: "🇵🇷" },
  TT: { name: "Trinidad y Tobago", flag: "🇹🇹" },
  AW: { name: "Aruba", flag: "🇦🇼" },
  CW: { name: "Curazao", flag: "🇨🇼" },
  FR: { name: "Francia", flag: "🇫🇷" },
  DE: { name: "Alemania", flag: "🇩🇪" },
  GB: { name: "Reino Unido", flag: "🇬🇧" },
};

// Venezuelan states mapping (ISO 3166-2:VE codes & Cloudflare region names)
export const VENEZUELA_STATES_MAP: Record<string, string> = {
  A: "Distrito Capital (Caracas)",
  "DISTRITO CAPITAL": "Distrito Capital (Caracas)",
  CARACAS: "Distrito Capital (Caracas)",
  M: "Miranda",
  MIRANDA: "Miranda",
  V: "Zulia",
  ZULIA: "Zulia",
  G: "Carabobo",
  CARABOBO: "Carabobo",
  K: "Lara",
  LARA: "Lara",
  D: "Aragua",
  ARAGUA: "Aragua",
  B: "Anzoátegui",
  ANZOATEGUI: "Anzoátegui",
  "ANZOÁTEGUI": "Anzoátegui",
  F: "Bolívar",
  BOLIVAR: "Bolívar",
  "BOLÍVAR": "Bolívar",
  S: "Táchira",
  TACHIRA: "Táchira",
  "TÁCHIRA": "Táchira",
  I: "Falcón",
  FALCON: "Falcón",
  "FALCÓN": "Falcón",
  L: "Mérida",
  MERIDA: "Mérida",
  "MÉRIDA": "Mérida",
  O: "Nueva Esparta (Margarita)",
  "NUEVA ESPARTA": "Nueva Esparta (Margarita)",
  MARGARITA: "Nueva Esparta (Margarita)",
  N: "Monagas",
  MONAGAS: "Monagas",
  R: "Sucre",
  SUCRE: "Sucre",
  P: "Portuguesa",
  PORTUGUESA: "Portuguesa",
  T: "Trujillo",
  TRUJILLO: "Trujillo",
  U: "Yaracuy",
  YARACUY: "Yaracuy",
  E: "Barinas",
  BARINAS: "Barinas",
  J: "Guárico",
  GUARICO: "Guárico",
  "GUÁRICO": "Guárico",
  H: "Cojedes",
  COJEDES: "Cojedes",
  C: "Apure",
  APURE: "Apure",
  X: "La Guaira (Vargas)",
  VARGAS: "La Guaira (Vargas)",
  "LA GUAIRA": "La Guaira (Vargas)",
  Y: "Delta Amacuro",
  "DELTA AMACURO": "Delta Amacuro",
  Z: "Amazonas",
  AMAZONAS: "Amazonas",
};

// United States common baseball diaspora states
export const US_STATES_MAP: Record<string, string> = {
  FL: "Florida",
  TX: "Texas",
  NY: "New York",
  CA: "California",
  IL: "Illinois",
  GA: "Georgia",
  NC: "North Carolina",
  NJ: "New Jersey",
  MA: "Massachusetts",
  PA: "Pennsylvania",
  OH: "Ohio",
  VA: "Virginia",
  CO: "Colorado",
  AZ: "Arizona",
};

export function getFlagEmoji(countryCode: string): string {
  const code = (countryCode || "").toUpperCase().trim();
  if (COUNTRY_DICTIONARY[code]) return COUNTRY_DICTIONARY[code].flag;
  if (/^[A-Z]{2}$/.test(code)) {
    return code
      .split("")
      .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
      .join("");
  }
  return "🌐";
}

export function normalizeVenezuelaState(regionRaw: string): string {
  if (!regionRaw) return "";
  const cleaned = regionRaw.trim().toUpperCase();
  if (VENEZUELA_STATES_MAP[cleaned]) {
    return VENEZUELA_STATES_MAP[cleaned];
  }
  // Try substring match
  for (const [key, name] of Object.entries(VENEZUELA_STATES_MAP)) {
    if (cleaned.includes(key)) {
      return name;
    }
  }
  return regionRaw;
}

/**
 * Resolves visitor geolocation (Country, State/Region, City)
 * using Cloudflare native request.cf and Cloudflare edge headers.
 */
export function resolveVisitorGeo(
  request: Request,
  body?: Record<string, any>
): VisitorGeoInfo {
  const reqAny = request as any;
  const cf = reqAny.cf || {};

  // 1. Resolve Country
  let countryCode = (
    cf.country ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country") ||
    ""
  ).toUpperCase().trim();

  // Client timezone fallback if running in dev or behind proxy without headers
  if (!countryCode || countryCode === "XX" || countryCode === "T1") {
    const tz = body?.timeZone || "";
    if (tz.includes("Caracas")) countryCode = "VE";
    else if (tz.includes("New_York") || tz.includes("Chicago") || tz.includes("Los_Angeles")) countryCode = "US";
    else if (tz.includes("Madrid")) countryCode = "ES";
    else if (tz.includes("Bogota")) countryCode = "CO";
    else if (tz.includes("Santiago")) countryCode = "CL";
    else countryCode = "VE"; // Default baseball focus
  }

  const countryMeta = COUNTRY_DICTIONARY[countryCode] || {
    name: countryCode,
    flag: getFlagEmoji(countryCode),
  };
  const countryName = countryMeta.name;
  const flag = countryMeta.flag;

  // 2. Resolve Region / State
  let rawRegion = (
    cf.region ||
    cf.regionCode ||
    request.headers.get("cf-region") ||
    request.headers.get("cf-region-code") ||
    ""
  ).trim();

  // 3. Resolve City
  const city = (
    cf.city ||
    request.headers.get("cf-ipcity") ||
    ""
  ).trim();

  let region = rawRegion;
  if (countryCode === "VE") {
    // If city is Caracas and no region is set, map to Distrito Capital
    if (!region && city.toLowerCase().includes("caracas")) {
      region = "Distrito Capital (Caracas)";
    } else if (!region && city.toLowerCase().includes("maracaibo")) {
      region = "Zulia";
    } else if (!region && city.toLowerCase().includes("valencia")) {
      region = "Carabobo";
    } else if (!region && city.toLowerCase().includes("barquisimeto")) {
      region = "Lara";
    } else {
      region = normalizeVenezuelaState(rawRegion || city);
    }
  } else if (countryCode === "US") {
    const codeUp = rawRegion.toUpperCase();
    if (US_STATES_MAP[codeUp]) {
      region = US_STATES_MAP[codeUp];
    }
  }

  // Fallback for default Venezuela view
  if (!region && countryCode === "VE") {
    region = "Venezuela";
  }

  // 4. Build Display Label
  let locationLabel = "";
  if (countryCode === "VE") {
    if (city && region && !region.toLowerCase().includes(city.toLowerCase())) {
      locationLabel = `${flag} ${city}, ${region}`;
    } else if (region) {
      locationLabel = `${flag} ${region}`;
    } else {
      locationLabel = `${flag} Venezuela`;
    }
  } else {
    if (city && region) {
      locationLabel = `${flag} ${city}, ${region} (${countryCode})`;
    } else if (region) {
      locationLabel = `${flag} ${region}, ${countryName}`;
    } else {
      locationLabel = `${flag} ${countryName}`;
    }
  }

  return {
    countryCode,
    countryName,
    flag,
    region: region || countryName,
    city,
    locationLabel,
  };
}
