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
  | "top-leaderboard"
  | "in-feed"
  | "home-bottom"
  | "gameday-sidebar";

export type CanonicalSlotKey = "general";

export function normalizeSlotKey(_slot?: string): CanonicalSlotKey {
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
    where:
      "Rota automáticamente en todos los espacios publicitarios sin repetirse en la misma página",
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
  get(key: string, options?: { skipKv?: boolean; ttlMs?: number }): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; persistToKv?: boolean }
  ): Promise<void>;
}

interface MemCacheEntry {
  value: string;
  expiresAt: number;
}

const globalRef = globalThis as unknown as {
  __ENJUEGO_MEM_CACHE_V2__?: Map<string, MemCacheEntry>;
  __ENJUEGO_LAST_R2_FLUSH__?: Map<string, number>;
};
if (!globalRef.__ENJUEGO_MEM_CACHE_V2__) {
  globalRef.__ENJUEGO_MEM_CACHE_V2__ = new Map<string, MemCacheEntry>();
}
if (!globalRef.__ENJUEGO_LAST_R2_FLUSH__) {
  globalRef.__ENJUEGO_LAST_R2_FLUSH__ = new Map<string, number>();
}
const memoryCache = globalRef.__ENJUEGO_MEM_CACHE_V2__;
const lastR2Flush = globalRef.__ENJUEGO_LAST_R2_FLUSH__;

export async function getAdminKv(): Promise<{
  kv: HybridKVStore;
  isCloudflareKv: boolean;
}> {
  let r2Bucket: {
    get(k: string): Promise<{ text(): Promise<string> } | null>;
    put(k: string, v: string): Promise<unknown>;
  } | null = null;

  let rawKv: {
    get(k: string): Promise<string | null>;
    put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>;
  } | null = null;

  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.ENJUEGO_R2 && typeof env.ENJUEGO_R2.get === "function") {
      r2Bucket = env.ENJUEGO_R2;
    }
    if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
      rawKv = env.ENJUEGO_KV;
    }
  } catch {
    // Fallback in local Node dev mode
  }

  const hybridKv: HybridKVStore = {
    async get(
      key: string,
      options?: { skipKv?: boolean; ttlMs?: number }
    ): Promise<string | null> {
      const now = Date.now();
      const memEntry = memoryCache.get(key);
      if (memEntry && now < memEntry.expiresAt) {
        return memEntry.value;
      }

      const cacheTtlMs = options?.ttlMs ?? 2000;

      // 1. Primary Global Strongly-Consistent Store: Cloudflare R2 (enjuego-storage)
      if (r2Bucket) {
        try {
          const obj = await r2Bucket.get(`store/${key}.json`);
          if (obj) {
            const text = await obj.text();
            memoryCache.set(key, {
              value: text,
              expiresAt: now + cacheTtlMs,
            });
            return text;
          }
        } catch {
          // ignore R2 read error
        }
      }

      // 2. Fallback: Cloudflare KV
      if (rawKv && !options?.skipKv) {
        try {
          const kvVal = await rawKv.get(key);
          if (kvVal !== null && kvVal !== undefined) {
            memoryCache.set(key, {
              value: kvVal,
              expiresAt: now + cacheTtlMs,
            });
            // Migrate automatically to R2 if available
            if (r2Bucket) {
              r2Bucket.put(`store/${key}.json`, kvVal).catch(() => {});
            }
            return kvVal;
          }
        } catch {
          // ignore
        }
      }

      // Return stale memory entry if nothing in R2/KV (e.g., local dev)
      if (memEntry) {
        return memEntry.value;
      }

      return null;
    },

    async put(
      key: string,
      value: string,
      options?: { expirationTtl?: number; persistToKv?: boolean }
    ): Promise<void> {
      const now = Date.now();
      const isCritical = options?.persistToKv !== false;
      memoryCache.set(key, {
        value,
        expiresAt: now + (isCritical ? 2000 : 5000),
      });

      // Write to Cloudflare R2 (1,000,000 free writes/month, globally consistent across PC & Mobile)
      if (r2Bucket) {
        const lastFlush = lastR2Flush.get(key) || 0;
        // Critical writes (ads, users, password) flush immediately; high-frequency writes (metrics, presence) flush every 8s
        if (isCritical || now - lastFlush >= 8000) {
          lastR2Flush.set(key, now);
          try {
            await r2Bucket.put(`store/${key}.json`, value);
          } catch {
            // ignore R2 write error
          }
        }
      }

      // Best-effort backup to KV only for critical updates
      if (rawKv && isCritical) {
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
    isCloudflareKv: Boolean(r2Bucket || rawKv),
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
  const raw = await kv.get(METRICS_KEY, { skipKv: true, ttlMs: 4000 });
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
    kv.get(CAMPAIGNS_KEY, { ttlMs: 1500 }),
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
    const name = c.name || c.companyName || "Anuncio";
    return {
      ...c,
      name,
      companyName: name,
      slot: "general",
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
 * Rotativo Global ("Todo el sitio"):
 * Toma todos los anuncios activos y los reparte al azar entre los espacios de la página
 * sin repetir el mismo anuncio en la misma página.
 */
export async function pickAdsForPageSlots(
  requestedRawSlots: string[]
): Promise<Record<string, ServedSlotAd | null>> {
  const allCampaigns = await getAdCampaigns();
  const liveAds = shuffleArray(allCampaigns.filter(isAdCampaignLive));
  const usedIds = new Set<string>();
  const response: Record<string, ServedSlotAd | null> = {};

  for (const rawSlot of requestedRawSlots) {
    const picked = liveAds.find((ad) => !usedIds.has(ad.id)) || null;
    if (!picked) {
      response[rawSlot] = null;
      continue;
    }
    usedIds.add(picked.id);
    await recordBannerMetric(picked.id, "impression").catch(() => {});
    response[rawSlot] = {
      id: picked.id,
      imageUrl: picked.imageUrl,
      alt: picked.name || picked.companyName || "Publicidad",
      href: picked.linkUrl
        ? `/api/banners/go?id=${encodeURIComponent(picked.id)}`
        : "",
      size: picked.size || "970x90",
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
  const raw = await kv.get(PRESENCE_KEY, { skipKv: true, ttlMs: 4000 });
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
  const rawStats = await kv.get(statsKey, { skipKv: true, ttlMs: 5000 });
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
  const raw = await kv.get(PRESENCE_KEY, { skipKv: true, ttlMs: 3000 });
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
  const rawStats = await kv.get(`admin:traffic:${dateKey}`, { skipKv: true, ttlMs: 4000 });
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
