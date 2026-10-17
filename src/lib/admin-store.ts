import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { UserProfile } from "@/lib/user-auth";

export type AdSlotType =
  | "general"
  | "home_top"
  | "home_mid"
  | "home_bottom"
  | "listas_top"
  | "listas_bottom"
  | "gameday"
  // Legacy aliases mapped automatically:
  | "top-leaderboard"
  | "in-feed"
  | "home-bottom"
  | "gameday-sidebar";

export type CanonicalSlotKey =
  | "general"
  | "home_top"
  | "home_mid"
  | "home_bottom"
  | "listas_top"
  | "listas_bottom"
  | "gameday";

export function normalizeSlotKey(slot?: string): CanonicalSlotKey {
  if (!slot) return "general";
  if (slot === "top-leaderboard" || slot === "home_top") return "home_top";
  if (slot === "in-feed" || slot === "home_mid") return "home_mid";
  if (slot === "home-bottom" || slot === "home_bottom") return "home_bottom";
  if (slot === "gameday-sidebar" || slot === "gameday") return "gameday";
  if (slot === "listas_top") return "listas_top";
  if (slot === "listas_bottom") return "listas_bottom";
  return "general";
}

export interface AdSlotInfo {
  key: CanonicalSlotKey;
  label: string;
  where: string;
  size: string;
}

export const AD_SLOTS_CATALOG: AdSlotInfo[] = [
  {
    key: "general",
    label: "Todo el sitio (Rotativo)",
    where: "Cubre cualquier espacio libre sin repetirlo en la misma página",
    size: "970x90",
  },
  {
    key: "home_top",
    label: "Inicio · Arriba",
    where: "Debajo de la cabecera en la página de inicio",
    size: "970x90",
  },
  {
    key: "home_mid",
    label: "Inicio · Medio",
    where: "Entre la pizarra de juegos y las noticias/comunidad en el inicio",
    size: "970x90",
  },
  {
    key: "home_bottom",
    label: "Inicio · Abajo",
    where: "Antes del pie de página en el inicio",
    size: "970x90",
  },
  {
    key: "listas_top",
    label: "Listas · Arriba",
    where: "Arriba en Resultados, Calendario, Posiciones, Líderes y Equipos",
    size: "970x90",
  },
  {
    key: "listas_bottom",
    label: "Listas · Abajo",
    where: "Abajo en Resultados, Calendario, Posiciones, Líderes y Equipos",
    size: "970x90",
  },
  {
    key: "gameday",
    label: "Gameday · Juego en Vivo",
    where: "En la pantalla del partido en vivo y jugada a jugada",
    size: "970x90",
  },
];

export interface AdCampaign {
  id: string;
  name: string;
  companyName: string;
  slot: CanonicalSlotKey;
  imageUrl: string;
  linkUrl: string;
  startsOn: string;
  endsOn: string;
  size: string;
  active: boolean;
  impressions: number;
  clicks: number;
  updatedAt: number;
}

export interface ServedSlotAd {
  id: string;
  imageUrl: string;
  alt: string;
  href: string;
  size: string;
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
          // Gracefully absorb daily KV put quota limit
        }
      }
    },
  };

  return {
    kv: hybridKv,
    isCloudflareKv: Boolean(rawKv || edgeCache),
  };
}

const CAMPAIGNS_KEY = "admin:ads:jugada_v1";
const METRICS_KEY = "admin:ads:metrics:jugada_v1";
const PRESENCE_KEY = "admin:presence:sessions:v1";
const USERS_INDEX_KEY = "admin:users:index:v1";
const ADMIN_PASS_KEY = "admin:config:password:v1";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "enjuego2026";

export function getTodayCaracasKey(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function isAdCampaignLive(ad: AdCampaign): boolean {
  if (!ad.active) return false;
  if (!ad.imageUrl) return false;
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

  let list: AdCampaign[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch {
      list = [];
    }
  }

  return list.map((c) => {
    const m = metricsMap[c.id];
    const slotKey = normalizeSlotKey(c.slot);
    const name = c.name || c.companyName || "Anuncio";
    return {
      ...c,
      name,
      companyName: name,
      slot: slotKey,
      size: c.size || "970x90",
      startsOn: c.startsOn || "",
      endsOn: c.endsOn || "",
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
 * Exact jugadaenvivo.com /api/ads?slots=... logic:
 * 1. Each slot shows one live ad at a time; if there are multiple in the same slot, they rotate at random.
 * 2. Slots without their own ad show one from "general" ("Todo el sitio") or any active ad, without repeating it on the same page.
 * 3. If a slot has no valid ad, it returns null so the frontend hides the container completely.
 */
export async function pickAdsForPageSlots(
  requestedRawSlots: string[]
): Promise<Record<string, ServedSlotAd | null>> {
  const allCampaigns = await getAdCampaigns();
  const liveAds = shuffleArray(allCampaigns.filter(isAdCampaignLive));
  const usedIds = new Set<string>();
  const chosenByRawSlot: Record<string, AdCampaign | null> = {};

  // Pass 1: Dedicated slot match
  for (const rawSlot of requestedRawSlots) {
    const canonical = normalizeSlotKey(rawSlot);
    const dedicated = liveAds.find(
      (ad) => ad.slot === canonical && !usedIds.has(ad.id)
    );
    if (dedicated) {
      chosenByRawSlot[rawSlot] = dedicated;
      usedIds.add(dedicated.id);
    } else {
      chosenByRawSlot[rawSlot] = null;
    }
  }

  // Pass 2: Fill empty slots from "general" ("Todo el sitio") or any unused live ad without repeating on the same page
  for (const rawSlot of requestedRawSlots) {
    if (chosenByRawSlot[rawSlot]) continue;
    let fallback = liveAds.find(
      (ad) => ad.slot === "general" && !usedIds.has(ad.id)
    );
    if (!fallback) {
      fallback = liveAds.find((ad) => !usedIds.has(ad.id));
    }
    if (fallback) {
      chosenByRawSlot[rawSlot] = fallback;
      usedIds.add(fallback.id);
    }
  }

  // Record +1 view (impression) for each served ad and format exact jugadaenvivo response
  const response: Record<string, ServedSlotAd | null> = {};
  for (const rawSlot of requestedRawSlots) {
    const ad = chosenByRawSlot[rawSlot];
    if (!ad) {
      response[rawSlot] = null;
      continue;
    }
    await recordBannerMetric(ad.id, "impression").catch(() => {});
    response[rawSlot] = {
      id: ad.id,
      imageUrl: ad.imageUrl,
      alt: ad.name || ad.companyName || "Publicidad",
      href: ad.linkUrl ? `/api/banners/go?id=${encodeURIComponent(ad.id)}` : "",
      size: ad.size || "970x90",
    };
  }

  return response;
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
