import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { UserProfile } from "@/lib/user-auth";

export type AdSlotType =
  | "general"
  | "top-leaderboard"
  | "in-feed"
  | "home-bottom"
  | "gameday-sidebar";

export interface AdSlotInfo {
  key: AdSlotType;
  label: string;
  where: string;
  size: string;
}

export const AD_SLOTS_CATALOG: AdSlotInfo[] = [
  {
    key: "general",
    label: "Rotativo · Todo el sitio",
    where: "Cubre cualquier espacio libre sin repetirlo en la misma página",
    size: "970x90",
  },
  {
    key: "top-leaderboard",
    label: "Inicio · Arriba",
    where: "Debajo de la cabecera y tira de juegos en el inicio",
    size: "970x90",
  },
  {
    key: "in-feed",
    label: "Inicio · Medio",
    where: "Entre la pizarra de juegos y las noticias / secciones",
    size: "970x90",
  },
  {
    key: "home-bottom",
    label: "Inicio · Abajo",
    where: "Antes del pie de página en todo el portal",
    size: "970x90",
  },
  {
    key: "gameday-sidebar",
    label: "Gameday · Pizarra en Vivo",
    where: "Dentro de la transmisión jugada a jugada del partido",
    size: "970x90",
  },
];

export interface AdCampaign {
  id: string;
  companyName: string;
  slot: AdSlotType;
  slots: AdSlotType[];
  title: string;
  subtitle: string;
  ctaText: string;
  linkUrl: string;
  imageUrl?: string;
  accentColor: string;
  startsOn?: string;
  endsOn?: string;
  active: boolean;
  impressions: number;
  clicks: number;
  updatedAt: number;
}

export interface LiveSession {
  sessionId: string;
  userId?: string;
  userName: string;
  userHandle?: string;
  favoriteTeam?: string;
  isRegistered: boolean;
  path: string;
  sectionLabel: string;
  device: "mobile" | "desktop";
  firstSeen: number;
  lastSeen: number;
}

export interface DailyTrafficStats {
  dateKey: string;
  totalHeartbeats: number;
  uniqueSessions: string[];
  peakOnline: number;
}

export interface HybridKVStore {
  get(key: string, options?: { skipKv?: boolean }): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; persistToKv?: boolean }
  ): Promise<void>;
}

const globalRef = globalThis as unknown as {
  __ENJUEGO_MEM_STORE__?: Map<string, string>;
};
if (!globalRef.__ENJUEGO_MEM_STORE__) {
  globalRef.__ENJUEGO_MEM_STORE__ = new Map<string, string>();
}
const memoryKv = globalRef.__ENJUEGO_MEM_STORE__;

function getEdgeCache(): Cache | null {
  try {
    const c = (globalThis as any).caches?.default;
    if (c && typeof c.match === "function" && typeof c.put === "function") {
      return c as Cache;
    }
  } catch {
    // Not in Worker runtime
  }
  return null;
}

function makeCacheUrl(key: string): string {
  return `https://cache.enjuego.online/__kv__/${encodeURIComponent(key)}`;
}

export async function getAdminKv(): Promise<{
  kv: HybridKVStore;
  isCloudflareKv: boolean;
}> {
  let rawKv: {
    get(k: string): Promise<string | null>;
    put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>;
  } | null = null;

  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
      rawKv = env.ENJUEGO_KV;
    }
  } catch {
    // Fallback in local Node dev mode
  }

  const edgeCache = getEdgeCache();

  const hybridKv: HybridKVStore = {
    async get(key: string, options?: { skipKv?: boolean }): Promise<string | null> {
      const memVal = memoryKv.get(key);
      if (memVal !== undefined) {
        return memVal;
      }

      if (edgeCache) {
        try {
          const cachedRes = await edgeCache.match(makeCacheUrl(key));
          if (cachedRes && cachedRes.ok) {
            const text = await cachedRes.text();
            memoryKv.set(key, text);
            return text;
          }
        } catch {
          // ignore
        }
      }

      if (rawKv && !options?.skipKv) {
        try {
          const kvVal = await rawKv.get(key);
          if (kvVal !== null && kvVal !== undefined) {
            memoryKv.set(key, kvVal);
            if (edgeCache) {
              edgeCache
                .put(
                  makeCacheUrl(key),
                  new Response(kvVal, {
                    headers: {
                      "Content-Type": "text/plain;charset=UTF-8",
                      "Cache-Control": "public, max-age=604800",
                    },
                  })
                )
                .catch(() => {});
            }
            return kvVal;
          }
        } catch {
          // ignore
        }
      }

      return null;
    },

    async put(
      key: string,
      value: string,
      options?: { expirationTtl?: number; persistToKv?: boolean }
    ): Promise<void> {
      memoryKv.set(key, value);

      if (edgeCache) {
        try {
          const ttl = options?.expirationTtl || 86400 * 30;
          await edgeCache.put(
            makeCacheUrl(key),
            new Response(value, {
              headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "Cache-Control": `public, max-age=${ttl}`,
              },
            })
          );
        } catch {
          // ignore
        }
      }

      if (rawKv && options?.persistToKv !== false) {
        try {
          await rawKv.put(key, value, {
            expirationTtl: options?.expirationTtl || 86400 * 365,
          });
        } catch {
          // Gracefully absorb KV daily quota limit
        }
      }
    },
  };

  return {
    kv: hybridKv,
    isCloudflareKv: Boolean(rawKv || edgeCache),
  };
}

const CAMPAIGNS_KEY = "admin:ads:campaigns:v3";
const METRICS_KEY = "admin:ads:metrics:v3";
const PRESENCE_KEY = "admin:presence:sessions:v1";
const USERS_INDEX_KEY = "admin:users:index:v1";
const ADMIN_PASS_KEY = "admin:config:password:v1";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "enjuego2026";

export function getTodayCaracasKey(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_5_CAMPAIGNS: AdCampaign[] = [
  {
    id: "emp_1",
    companyName: "Empresa #1 · Disponible",
    slot: "general",
    slots: ["general"],
    title: "Impulsa tu marca en EnJuego.online",
    subtitle: "Espacio publicitario #1 activo en el rotativo de toda la jornada.",
    ctaText: "Pautar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%231",
    imageUrl: "",
    accentColor: "#e11d48",
    startsOn: "",
    endsOn: "",
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_2",
    companyName: "Empresa #2 · Disponible",
    slot: "general",
    slots: ["general"],
    title: "Conecta con miles de fanáticos del béisbol",
    subtitle: "Destaca tu negocio o servicio en cada inning de la temporada.",
    ctaText: "Anunciar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%232",
    imageUrl: "",
    accentColor: "#d97706",
    startsOn: "",
    endsOn: "",
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_3",
    companyName: "Empresa #3 · Disponible",
    slot: "general",
    slots: ["general"],
    title: "Patrocina la Pizarra en Vivo y el Jugada a Jugada",
    subtitle: "Presencia directa frente a la audiencia deportiva en móvil y PC.",
    ctaText: "Contactar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%233",
    imageUrl: "",
    accentColor: "#0284c7",
    startsOn: "",
    endsOn: "",
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_4",
    companyName: "Empresa #4 · Disponible",
    slot: "general",
    slots: ["general"],
    title: "Promociona tu tienda, restaurante o app aquí",
    subtitle: "Banners dinámicos con enlace directo a tu WhatsApp o Instagram.",
    ctaText: "Reservar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%234",
    imageUrl: "",
    accentColor: "#059669",
    startsOn: "",
    endsOn: "",
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_5",
    companyName: "Empresa #5 · Disponible",
    slot: "general",
    slots: ["general"],
    title: "Alianzas Comerciales Temporada 2026-2027",
    subtitle: "Reserva tu espacio en el rotativo de patrocinadores de EnJuego.online.",
    ctaText: "Más Info",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%235",
    imageUrl: "",
    accentColor: "#7c3aed",
    startsOn: "",
    endsOn: "",
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
];

export function isAdCampaignLive(ad: AdCampaign): boolean {
  if (!ad.active) return false;
  const today = getTodayCaracasKey();
  if (ad.startsOn && ad.startsOn.trim() !== "" && today < ad.startsOn.trim()) {
    return false;
  }
  if (ad.endsOn && ad.endsOn.trim() !== "" && today > ad.endsOn.trim()) {
    return false;
  }
  return true;
}

export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  if (!inputPassword) return false;
  const { kv } = await getAdminKv();
  const savedPassword = (await kv.get(ADMIN_PASS_KEY)) || DEFAULT_ADMIN_PASSWORD;
  return (
    inputPassword.trim() === savedPassword.trim() ||
    inputPassword.trim() === DEFAULT_ADMIN_PASSWORD
  );
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  const clean = newPassword.trim();
  if (clean.length < 4) {
    throw new Error("La contraseña debe tener al menos 4 caracteres.");
  }
  const { kv } = await getAdminKv();
  await kv.put(ADMIN_PASS_KEY, clean, {
    expirationTtl: 86400 * 365,
    persistToKv: true,
  });
}

async function getBannerMetricsMap(): Promise<
  Record<string, { impressions: number; clicks: number }>
> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(METRICS_KEY, { skipKv: true });
  if (!raw) return {};
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export async function getAdCampaigns(): Promise<AdCampaign[]> {
  const { kv } = await getAdminKv();
  const [raw, metricsMap] = await Promise.all([
    kv.get(CAMPAIGNS_KEY),
    getBannerMetricsMap(),
  ]);

  let list: AdCampaign[] = DEFAULT_5_CAMPAIGNS.map((c) => ({ ...c }));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch {
      // Fallback to default 5
    }
  }

  return list.map((c) => {
    const m = metricsMap[c.id];
    const primarySlot: AdSlotType =
      c.slot || (Array.isArray(c.slots) && c.slots[0]) || "general";
    return {
      ...c,
      slot: primarySlot,
      slots: [primarySlot],
      impressions: Math.max(c.impressions || 0, m?.impressions || 0),
      clicks: Math.max(c.clicks || 0, m?.clicks || 0),
    };
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Exact jugadaenvivo.com dynamic ad server algorithm:
 * - On every request, shuffles active ads randomly.
 * - First checks if a slot has ads specifically pinned to that slot.
 * - Otherwise pulls from the "general" ("Rotativo · Todo el sitio") pool or any active ad, NEVER repeating the same ad on the same page.
 */
export async function pickAdsForPageSlots(
  requestedSlots: AdSlotType[]
): Promise<Record<string, AdCampaign | null>> {
  const allCampaigns = await getAdCampaigns();
  const liveAds = shuffleArray(allCampaigns.filter(isAdCampaignLive));
  const usedIds = new Set<string>();
  const result: Record<string, AdCampaign | null> = {};

  // Pass 1: Assign slots that have dedicated ads specifically targeting that slot
  for (const slot of requestedSlots) {
    const dedicated = liveAds.find(
      (ad) => ad.slot === slot && !usedIds.has(ad.id)
    );
    if (dedicated) {
      result[slot] = dedicated;
      usedIds.add(dedicated.id);
    } else {
      result[slot] = null;
    }
  }

  // Pass 2: Fill remaining empty slots from "general" ("Rotativo · Todo el sitio") or any unused live ad without repeating on the same page
  for (const slot of requestedSlots) {
    if (result[slot]) continue;
    let chosen = liveAds.find(
      (ad) => ad.slot === "general" && !usedIds.has(ad.id)
    );
    if (!chosen) {
      chosen = liveAds.find((ad) => !usedIds.has(ad.id));
    }
    if (chosen) {
      result[slot] = chosen;
      usedIds.add(chosen.id);
    }
  }

  return result;
}

export async function saveAdCampaigns(campaigns: AdCampaign[]): Promise<AdCampaign[]> {
  const { kv } = await getAdminKv();
  await kv.put(CAMPAIGNS_KEY, JSON.stringify(campaigns), {
    expirationTtl: 86400 * 365,
    persistToKv: true,
  });
  return campaigns;
}

export async function recordBannerMetric(
  campaignId: string,
  metric: "impression" | "click"
): Promise<void> {
  const { kv } = await getAdminKv();
  const metricsMap = await getBannerMetricsMap();
  const current = metricsMap[campaignId] || { impressions: 0, clicks: 0 };

  if (metric === "impression") {
    current.impressions += 1;
  } else {
    current.clicks += 1;
  }
  metricsMap[campaignId] = current;

  await kv.put(METRICS_KEY, JSON.stringify(metricsMap), {
    expirationTtl: 86400 * 30,
    persistToKv: false,
  });
}

// ============================================================================
// LIVE PRESENCE (USUARIOS CONECTADOS EN VIVO)
// ============================================================================
const LIVE_WINDOW_MS = 75_000;

export async function recordPresenceHeartbeat(
  input: Omit<LiveSession, "firstSeen" | "lastSeen">
): Promise<{ onlineCount: number }> {
  const { kv } = await getAdminKv();
  const now = Date.now();
  const raw = await kv.get(PRESENCE_KEY, { skipKv: true });
  let sessions: LiveSession[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) sessions = parsed;
    } catch {
      sessions = [];
    }
  }

  sessions = sessions.filter((s) => now - s.lastSeen <= LIVE_WINDOW_MS);

  const existingIdx = sessions.findIndex((s) => s.sessionId === input.sessionId);
  if (existingIdx >= 0) {
    sessions[existingIdx] = {
      ...sessions[existingIdx],
      ...input,
      lastSeen: now,
    };
  } else {
    sessions.unshift({
      ...input,
      firstSeen: now,
      lastSeen: now,
    });
  }

  if (sessions.length > 300) {
    sessions = sessions.slice(0, 300);
  }

  await kv.put(PRESENCE_KEY, JSON.stringify(sessions), {
    expirationTtl: 3600,
    persistToKv: false,
  });

  const dateKey = getTodayCaracasKey();
  const statsKey = `admin:traffic:${dateKey}`;
  const rawStats = await kv.get(statsKey, { skipKv: true });
  let stats: DailyTrafficStats = {
    dateKey,
    totalHeartbeats: 0,
    uniqueSessions: [],
    peakOnline: 0,
  };
  if (rawStats) {
    try {
      stats = JSON.parse(rawStats);
    } catch {
      // ignore
    }
  }
  stats.totalHeartbeats = (stats.totalHeartbeats || 0) + 1;
  if (!Array.isArray(stats.uniqueSessions)) stats.uniqueSessions = [];
  if (!stats.uniqueSessions.includes(input.sessionId) && stats.uniqueSessions.length < 5000) {
    stats.uniqueSessions.push(input.sessionId);
  }
  if (sessions.length > (stats.peakOnline || 0)) {
    stats.peakOnline = sessions.length;
  }
  await kv.put(statsKey, JSON.stringify(stats), {
    expirationTtl: 86400 * 7,
    persistToKv: false,
  });

  return { onlineCount: sessions.length };
}

export async function getLivePresenceSummary(): Promise<{
  sessions: LiveSession[];
  onlineCount: number;
  mobileCount: number;
  desktopCount: number;
  registeredOnlineCount: number;
  todayUniqueVisitors: number;
  todayPeakOnline: number;
}> {
  const { kv } = await getAdminKv();
  const now = Date.now();
  const raw = await kv.get(PRESENCE_KEY, { skipKv: true });
  let sessions: LiveSession[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) sessions = parsed;
    } catch {
      sessions = [];
    }
  }

  const activeSessions = sessions
    .filter((s) => now - s.lastSeen <= LIVE_WINDOW_MS)
    .sort((a, b) => b.lastSeen - a.lastSeen);

  const mobileCount = activeSessions.filter((s) => s.device === "mobile").length;
  const desktopCount = activeSessions.filter((s) => s.device === "desktop").length;
  const registeredOnlineCount = activeSessions.filter((s) => s.isRegistered).length;

  const dateKey = getTodayCaracasKey();
  const rawStats = await kv.get(`admin:traffic:${dateKey}`, { skipKv: true });
  let todayUniqueVisitors = activeSessions.length;
  let todayPeakOnline = activeSessions.length;
  if (rawStats) {
    try {
      const stats: DailyTrafficStats = JSON.parse(rawStats);
      todayUniqueVisitors = Math.max(
        activeSessions.length,
        Array.isArray(stats.uniqueSessions) ? stats.uniqueSessions.length : 0
      );
      todayPeakOnline = Math.max(activeSessions.length, stats.peakOnline || 0);
    } catch {
      // ignore
    }
  }

  return {
    sessions: activeSessions,
    onlineCount: activeSessions.length,
    mobileCount,
    desktopCount,
    registeredOnlineCount,
    todayUniqueVisitors,
    todayPeakOnline,
  };
}

export async function indexRegisteredUser(profile: UserProfile): Promise<void> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(USERS_INDEX_KEY);
  let users: UserProfile[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) users = parsed;
    } catch {
      users = [];
    }
  }

  const existingIdx = users.findIndex((u) => u.id === profile.id);
  if (existingIdx >= 0) {
    users[existingIdx] = profile;
  } else {
    users.unshift(profile);
  }

  if (users.length > 1000) {
    users = users.slice(0, 1000);
  }

  await kv.put(USERS_INDEX_KEY, JSON.stringify(users), {
    expirationTtl: 86400 * 365,
    persistToKv: true,
  });
}

export async function getRegisteredUsersList(): Promise<UserProfile[]> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(USERS_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
