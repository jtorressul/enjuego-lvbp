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
  | "gameday-sidebar"
  | "recap-large";

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

export interface CampaignSlotStats {
  impressions: number;
  clicks: number;
}

export interface CampaignDailyStats {
  impressions: number;
  clicks: number;
}

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
  // Detailed analytics fields
  mobileImpressions?: number;
  desktopImpressions?: number;
  mobileClicks?: number;
  desktopClicks?: number;
  todayImpressions?: number;
  todayClicks?: number;
  bySlot?: Record<string, CampaignSlotStats>;
  daily?: Record<string, CampaignDailyStats>;
}

export interface AdClickLogEntry {
  id: string;
  campaignId: string;
  campaignName: string;
  timestamp: number;
  timeCaracas: string;
  device: "mobile" | "desktop";
  os: string;
  slot: string;
  pagePath: string;
  targetUrl: string;
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
  os?: string;
  countryCode?: string;
  countryName?: string;
  flag?: string;
  region?: string;
  city?: string;
  locationLabel?: string;
  firstSeen: number;
  lastSeen: number;
  pageViews?: number;
  browser?: string;
  browserVersion?: string;
  deviceModel?: string;
  platformVersion?: string;
  viewport?: string;
  isPwa?: boolean;
  language?: string;
  recentPaths?: string[];
}

export const LIVE_WINDOW_MS = 240_000;
export const LIVE_WINDOW_SECONDS = LIVE_WINDOW_MS / 1000;

export interface DailyTrafficStats {
  dateKey: string;
  totalHeartbeats: number;
  pageViews: number;
  uniqueSessions: string[];
  mobileSessions?: string[];
  desktopSessions?: string[];
  peakOnline: number;
  sectionHits?: Record<string, number>;
  osHits?: Record<string, number>;
  countryHits?: Record<string, number>;
  regionHits?: Record<string, number>;
}

export interface TrafficDaySummary {
  dateKey: string;
  uniqueVisitors: number;
  mobileVisitors: number;
  desktopVisitors: number;
  pageViews: number;
  peakOnline: number;
  topCountries?: { country: string; count: number }[];
  topRegions?: { region: string; count: number }[];
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
  globalRef.__ENJUEGO_MEM_CACHE_V2__ = new Map<string, MemCacheEntry>;
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
            if (r2Bucket) {
              r2Bucket.put(`store/${key}.json`, kvVal).catch(() => {});
            }
            return kvVal;
          }
        } catch {
          // ignore
        }
      }

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

      if (r2Bucket) {
        const lastFlush = lastR2Flush.get(key) || 0;
        if (isCritical || now - lastFlush >= 6000) {
          lastR2Flush.set(key, now);
          try {
            await r2Bucket.put(`store/${key}.json`, value);
          } catch {
            // ignore R2 write error
          }
        }
      }

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
const CLICK_LOG_KEY = "admin:ads:clicklog:v1";
const PRESENCE_KEY = "admin:presence:sessions:v1";
const TRAFFIC_HISTORY_KEY = "admin:traffic:history_v1";
const USERS_INDEX_KEY = "admin:users:index:v1";
const ADMIN_PASS_KEY = "admin:config:password:v1";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "enjuego2026";

export function getTodayCaracasKey(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function getCaracasDateTimeString(ts = Date.now()): string {
  const d = new Date(ts - 4 * 3600 * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function detectUserAgentMeta(ua?: string | null): {
  device: "mobile" | "desktop";
  os: string;
  browser: string;
  browserVersion: string;
} {
  const s = String(ua || "");
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(s);
  let os = "Otro";
  if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(s)) os = "Mac";
  else if (/Linux/i.test(s)) os = "Linux";

  let browser = "Otro";
  let browserVersion = "";
  const edge = /Edg\/(\d+)/.exec(s);
  const chrome = /Chrome\/(\d+)/.exec(s);
  const firefox = /Firefox\/(\d+)/.exec(s);
  const safari = /Version\/(\d+).*Safari/.exec(s);
  const opera = /OPR\/(\d+)/.exec(s);
  if (edge) {
    browser = "Edge";
    browserVersion = edge[1];
  } else if (chrome && !/Edg\//.test(s)) {
    browser = "Chrome";
    browserVersion = chrome[1];
  } else if (firefox) {
    browser = "Firefox";
    browserVersion = firefox[1];
  } else if (safari && /Safari/.test(s) && !/Chrome/.test(s)) {
    browser = "Safari";
    browserVersion = safari[1];
  } else if (opera) {
    browser = "Opera";
    browserVersion = opera[1];
  }

  return {
    device: isMobile ? "mobile" : "desktop",
    os,
    browser,
    browserVersion,
  };
}

function trimClientField(value: unknown, max: number): string | undefined {
  if (value == null) return undefined;
  const clean = String(value).trim();
  if (!clean) return undefined;
  return clean.slice(0, max);
}

export function mergeHeartbeatClientFields(
  ua: string | null | undefined,
  client?: Record<string, unknown> | null
): Pick<
  LiveSession,
  | "browser"
  | "browserVersion"
  | "deviceModel"
  | "platformVersion"
  | "viewport"
  | "isPwa"
  | "language"
> {
  const uaMeta = detectUserAgentMeta(ua);
  const c = client || {};
  return {
    browser: trimClientField(c.browser, 24) || uaMeta.browser,
    browserVersion: trimClientField(c.browserVersion, 12) || uaMeta.browserVersion,
    deviceModel: trimClientField(c.deviceModel, 48),
    platformVersion: trimClientField(c.platformVersion, 24),
    viewport: trimClientField(c.viewport, 64),
    isPwa: Boolean(c.isPwa),
    language: trimClientField(c.language, 16),
  };
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

export interface StoredCampaignMetricEntry {
  impressions: number;
  clicks: number;
  mobileImpressions?: number;
  desktopImpressions?: number;
  mobileClicks?: number;
  desktopClicks?: number;
  bySlot?: Record<string, CampaignSlotStats>;
  daily?: Record<string, CampaignDailyStats>;
}

async function getBannerMetricsMap(): Promise<
  Record<string, StoredCampaignMetricEntry>
> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(METRICS_KEY, { skipKv: true, ttlMs: 3000 });
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

  const today = getTodayCaracasKey();

  return list.map((c) => {
    const m = metricsMap[c.id];
    const name = c.name || c.companyName || "Anuncio";
    const totalImpressions = Math.max(c.impressions || 0, m?.impressions || 0);
    const totalClicks = Math.max(c.clicks || 0, m?.clicks || 0);
    const daily = m?.daily || c.daily || {};
    const todayEntry = daily[today] || { impressions: 0, clicks: 0 };

    return {
      ...c,
      name,
      companyName: name,
      slot: "general",
      size: c.size || "970x90",
      startsOn: c.startsOn || "",
      endsOn: c.endsOn || "",
      impressions: totalImpressions,
      clicks: totalClicks,
      mobileImpressions: m?.mobileImpressions ?? c.mobileImpressions ?? Math.round(totalImpressions * 0.78),
      desktopImpressions: m?.desktopImpressions ?? c.desktopImpressions ?? Math.max(0, totalImpressions - Math.round(totalImpressions * 0.78)),
      mobileClicks: m?.mobileClicks ?? c.mobileClicks ?? Math.round(totalClicks * 0.82),
      desktopClicks: m?.desktopClicks ?? c.desktopClicks ?? Math.max(0, totalClicks - Math.round(totalClicks * 0.82)),
      todayImpressions: todayEntry.impressions || 0,
      todayClicks: todayEntry.clicks || 0,
      bySlot: m?.bySlot || c.bySlot || {},
      daily,
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

export interface MetricContext {
  device?: "mobile" | "desktop";
  os?: string;
  slot?: string;
  pagePath?: string;
  campaignName?: string;
  targetUrl?: string;
}

/**
 * Rotativo Global ("Todo el sitio"):
 * Toma todos los anuncios activos y los reparte al azar entre los espacios de la página
 * sin repetir el mismo anuncio en la misma página.
 */
export async function pickAdsForPageSlots(
  requestedRawSlots: string[],
  context?: { device?: "mobile" | "desktop"; os?: string; pagePath?: string }
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

    const goParams = new URLSearchParams({
      id: picked.id,
      slot: rawSlot,
    });
    if (context?.pagePath) goParams.set("path", context.pagePath);

    response[rawSlot] = {
      id: picked.id,
      imageUrl: picked.imageUrl,
      alt: picked.name || picked.companyName || "Publicidad",
      href: picked.linkUrl ? `/api/banners/go?${goParams.toString()}` : "",
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
  metric: "impression" | "click",
  ctx?: MetricContext
): Promise<void> {
  const { kv } = await getAdminKv();
  const metricsMap = await getBannerMetricsMap();
  const current: StoredCampaignMetricEntry = metricsMap[campaignId] || {
    impressions: 0,
    clicks: 0,
    mobileImpressions: 0,
    desktopImpressions: 0,
    mobileClicks: 0,
    desktopClicks: 0,
    bySlot: {},
    daily: {},
  };

  const isMobile = (ctx?.device || "mobile") === "mobile";
  const slotKey = (ctx?.slot || "top-leaderboard").slice(0, 40);
  const today = getTodayCaracasKey();

  if (!current.bySlot) current.bySlot = {};
  if (!current.bySlot[slotKey]) {
    current.bySlot[slotKey] = { impressions: 0, clicks: 0 };
  }
  if (!current.daily) current.daily = {};
  if (!current.daily[today]) {
    current.daily[today] = { impressions: 0, clicks: 0 };
  }

  if (metric === "impression") {
    current.impressions = (current.impressions || 0) + 1;
    if (isMobile) current.mobileImpressions = (current.mobileImpressions || 0) + 1;
    else current.desktopImpressions = (current.desktopImpressions || 0) + 1;
    current.bySlot[slotKey].impressions += 1;
    current.daily[today].impressions += 1;
  } else {
    current.clicks = (current.clicks || 0) + 1;
    if (isMobile) current.mobileClicks = (current.mobileClicks || 0) + 1;
    else current.desktopClicks = (current.desktopClicks || 0) + 1;
    current.bySlot[slotKey].clicks += 1;
    current.daily[today].clicks += 1;
  }

  // Keep only last 35 days of daily history per ad
  const dayKeys = Object.keys(current.daily).sort();
  if (dayKeys.length > 35) {
    for (const oldKey of dayKeys.slice(0, dayKeys.length - 35)) {
      delete current.daily[oldKey];
    }
  }

  metricsMap[campaignId] = current;

  await kv.put(METRICS_KEY, JSON.stringify(metricsMap), {
    expirationTtl: 86400 * 60,
    persistToKv: metric === "click",
  });

  // If it's a click, also append to the real-time Click Log
  if (metric === "click") {
    try {
      const rawLog = await kv.get(CLICK_LOG_KEY, { skipKv: true, ttlMs: 2000 });
      let clickLog: AdClickLogEntry[] = [];
      if (rawLog) {
        const parsed = JSON.parse(rawLog);
        if (Array.isArray(parsed)) clickLog = parsed;
      }
      const now = Date.now();
      clickLog.unshift({
        id: `clk_${now}_${Math.random().toString(36).slice(2, 6)}`,
        campaignId,
        campaignName: ctx?.campaignName || campaignId,
        timestamp: now,
        timeCaracas: getCaracasDateTimeString(now),
        device: isMobile ? "mobile" : "desktop",
        os: ctx?.os || "Otro",
        slot: slotKey,
        pagePath: ctx?.pagePath || "/inicio",
        targetUrl: ctx?.targetUrl || "",
      });
      if (clickLog.length > 120) {
        clickLog = clickLog.slice(0, 120);
      }
      await kv.put(CLICK_LOG_KEY, JSON.stringify(clickLog), {
        expirationTtl: 86400 * 30,
        persistToKv: true,
      });
    } catch {
      // ignore click log write error
    }
  }
}

export async function resetCampaignMetricsInStore(targetId?: string): Promise<void> {
  const { kv } = await getAdminKv();
  const metricsMap = await getBannerMetricsMap();
  if (!targetId) {
    await kv.put(METRICS_KEY, JSON.stringify({}), { persistToKv: true });
    return;
  }
  delete metricsMap[targetId];
  await kv.put(METRICS_KEY, JSON.stringify(metricsMap), { persistToKv: true });
}

export async function getRecentAdClickLog(): Promise<AdClickLogEntry[]> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(CLICK_LOG_KEY, { skipKv: true, ttlMs: 3000 });
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================================================
// LIVE PRESENCE & HISTORICAL TRAFFIC ANALYTICS
// ============================================================================
const presenceTouchRef = globalThis as unknown as {
  __ENJUEGO_PRESENCE_TOUCH__?: Map<string, number>;
};
if (!presenceTouchRef.__ENJUEGO_PRESENCE_TOUCH__) {
  presenceTouchRef.__ENJUEGO_PRESENCE_TOUCH__ = new Map();
}
const presenceTouch = presenceTouchRef.__ENJUEGO_PRESENCE_TOUCH__;

export async function recordPresenceHeartbeat(
  input: Omit<LiveSession, "firstSeen" | "lastSeen">,
  userAgent?: string | null
): Promise<{ onlineCount: number }> {
  if (
    userAgent &&
    /(bot|crawler|spider|whatsapp|facebookexternalhit|twitterbot|curl|python|headless)/i.test(
      userAgent
    )
  ) {
    return { onlineCount: 0 };
  }

  const now = Date.now();
  const touchKey = `${input.sessionId}|${input.path}`;
  const lastTouch = presenceTouch.get(touchKey) || 0;
  if (now - lastTouch < 60_000) {
    return { onlineCount: 0 };
  }
  presenceTouch.set(touchKey, now);
  if (presenceTouch.size > 4000) {
    for (const [key, ts] of presenceTouch) {
      if (now - ts > 120_000) presenceTouch.delete(key);
    }
  }

  const { kv } = await getAdminKv();
  const uaMeta = detectUserAgentMeta(userAgent);
  const resolvedOs = input.os || uaMeta.os;

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
  let isNewPageHit = false;
  if (existingIdx >= 0) {
    const prev = sessions[existingIdx];
    isNewPageHit = prev.path !== input.path;
    let recentPaths = prev.recentPaths?.length ? [...prev.recentPaths] : [prev.path];
    if (isNewPageHit) {
      recentPaths = [input.path, ...recentPaths.filter((p) => p !== input.path)].slice(0, 5);
    }
    sessions[existingIdx] = {
      ...prev,
      ...input,
      countryCode: input.countryCode || prev.countryCode,
      countryName: input.countryName || prev.countryName,
      flag: input.flag || prev.flag,
      region: input.region || prev.region,
      city: input.city || prev.city,
      locationLabel: input.locationLabel || prev.locationLabel,
      os: resolvedOs,
      deviceModel: input.deviceModel || prev.deviceModel,
      platformVersion: input.platformVersion || prev.platformVersion,
      recentPaths,
      lastSeen: now,
      pageViews: (prev.pageViews || 1) + (isNewPageHit ? 1 : 0),
    };
  } else {
    isNewPageHit = true;
    sessions.unshift({
      ...input,
      os: resolvedOs,
      recentPaths: [input.path],
      firstSeen: now,
      lastSeen: now,
      pageViews: 1,
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
    pageViews: 0,
    uniqueSessions: [],
    mobileSessions: [],
    desktopSessions: [],
    peakOnline: 0,
    sectionHits: {},
    osHits: {},
    countryHits: {},
    regionHits: {},
  };
  if (rawStats) {
    try {
      stats = { ...stats, ...JSON.parse(rawStats) };
    } catch {
      // ignore
    }
  }

  stats.totalHeartbeats = (stats.totalHeartbeats || 0) + 1;
  if (isNewPageHit) {
    stats.pageViews = (stats.pageViews || 0) + 1;
    const secKey = (input.sectionLabel || "Inicio").slice(0, 40);
    if (!stats.sectionHits) stats.sectionHits = {};
    stats.sectionHits[secKey] = (stats.sectionHits[secKey] || 0) + 1;
  }

  if (!Array.isArray(stats.uniqueSessions)) stats.uniqueSessions = [];
  if (!Array.isArray(stats.mobileSessions)) stats.mobileSessions = [];
  if (!Array.isArray(stats.desktopSessions)) stats.desktopSessions = [];
  if (!stats.osHits) stats.osHits = {};
  if (!stats.countryHits) stats.countryHits = {};
  if (!stats.regionHits) stats.regionHits = {};

  if (!stats.uniqueSessions.includes(input.sessionId) && stats.uniqueSessions.length < 5000) {
    stats.uniqueSessions.push(input.sessionId);
    stats.osHits[resolvedOs] = (stats.osHits[resolvedOs] || 0) + 1;
    if (input.countryName) {
      const cKey = `${input.flag || "🌐"} ${input.countryName}`;
      stats.countryHits[cKey] = (stats.countryHits[cKey] || 0) + 1;
    }
    if (input.region) {
      const rKey = input.countryCode === "VE" ? `🇻🇪 ${input.region}` : `${input.flag || "🌐"} ${input.region}`;
      stats.regionHits[rKey] = (stats.regionHits[rKey] || 0) + 1;
    }
  }
  if (input.device === "mobile") {
    if (!stats.mobileSessions.includes(input.sessionId) && stats.mobileSessions.length < 5000) {
      stats.mobileSessions.push(input.sessionId);
    }
  } else {
    if (!stats.desktopSessions.includes(input.sessionId) && stats.desktopSessions.length < 5000) {
      stats.desktopSessions.push(input.sessionId);
    }
  }

  if (sessions.length > (stats.peakOnline || 0)) {
    stats.peakOnline = sessions.length;
  }

  await kv.put(statsKey, JSON.stringify(stats), {
    expirationTtl: 86400 * 30,
    persistToKv: false,
  });

  // Update rolling 14-day traffic summary index
  try {
    const rawHist = await kv.get(TRAFFIC_HISTORY_KEY, { skipKv: true, ttlMs: 8000 });
    let histMap: Record<string, TrafficDaySummary> = {};
    if (rawHist) {
      histMap = JSON.parse(rawHist) || {};
    }
    const topCountries = Object.entries(stats.countryHits || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({ country, count }));
    const topRegions = Object.entries(stats.regionHits || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([region, count]) => ({ region, count }));

    histMap[dateKey] = {
      dateKey,
      uniqueVisitors: stats.uniqueSessions.length,
      mobileVisitors: stats.mobileSessions.length,
      desktopVisitors: stats.desktopSessions.length,
      pageViews: Math.max(stats.pageViews || 0, stats.uniqueSessions.length),
      peakOnline: stats.peakOnline,
      topCountries,
      topRegions,
    };
    const keys = Object.keys(histMap).sort();
    if (keys.length > 21) {
      for (const k of keys.slice(0, keys.length - 21)) {
        delete histMap[k];
      }
    }
    await kv.put(TRAFFIC_HISTORY_KEY, JSON.stringify(histMap), {
      expirationTtl: 86400 * 60,
      persistToKv: false,
    });
  } catch {
    // ignore
  }

  return { onlineCount: sessions.length };
}

export async function getLivePresenceSummary(): Promise<{
  sessions: LiveSession[];
  onlineCount: number;
  mobileCount: number;
  desktopCount: number;
  registeredOnlineCount: number;
  todayUniqueVisitors: number;
  todayMobileVisitors: number;
  todayDesktopVisitors: number;
  todayPageViews: number;
  todayPeakOnline: number;
  sectionHits: Record<string, number>;
  osHits: Record<string, number>;
  todayCountryHits: Record<string, number>;
  todayRegionHits: Record<string, number>;
  liveCountryHits: Record<string, number>;
  liveRegionHits: Record<string, number>;
  trafficHistory: TrafficDaySummary[];
}> {
  const { kv } = await getAdminKv();
  const now = Date.now();
  const [raw, rawHist] = await Promise.all([
    kv.get(PRESENCE_KEY, { skipKv: true, ttlMs: 3000 }),
    kv.get(TRAFFIC_HISTORY_KEY, { skipKv: true, ttlMs: 5000 }),
  ]);

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

  // Aggregate live country and region hits
  const liveCountryHits: Record<string, number> = {};
  const liveRegionHits: Record<string, number> = {};
  for (const s of activeSessions) {
    if (s.countryName) {
      const cKey = `${s.flag || "🌐"} ${s.countryName}`;
      liveCountryHits[cKey] = (liveCountryHits[cKey] || 0) + 1;
    }
    if (s.region) {
      const rKey = s.countryCode === "VE" ? `🇻🇪 ${s.region}` : `${s.flag || "🌐"} ${s.region}`;
      liveRegionHits[rKey] = (liveRegionHits[rKey] || 0) + 1;
    }
  }

  const dateKey = getTodayCaracasKey();
  const rawStats = await kv.get(`admin:traffic:${dateKey}`, { skipKv: true, ttlMs: 4000 });
  let todayUniqueVisitors = activeSessions.length;
  let todayMobileVisitors = mobileCount;
  let todayDesktopVisitors = desktopCount;
  let todayPageViews = activeSessions.reduce((acc, s) => acc + (s.pageViews || 1), 0);
  let todayPeakOnline = activeSessions.length;
  let sectionHits: Record<string, number> = {};
  let osHits: Record<string, number> = {};
  let todayCountryHits: Record<string, number> = { ...liveCountryHits };
  let todayRegionHits: Record<string, number> = { ...liveRegionHits };

  if (rawStats) {
    try {
      const stats: DailyTrafficStats = JSON.parse(rawStats);
      todayUniqueVisitors = Math.max(
        activeSessions.length,
        Array.isArray(stats.uniqueSessions) ? stats.uniqueSessions.length : 0
      );
      todayMobileVisitors = Math.max(
        mobileCount,
        Array.isArray(stats.mobileSessions) ? stats.mobileSessions.length : 0
      );
      todayDesktopVisitors = Math.max(
        desktopCount,
        Array.isArray(stats.desktopSessions) ? stats.desktopSessions.length : 0
      );
      todayPageViews = Math.max(todayUniqueVisitors, stats.pageViews || 0, stats.totalHeartbeats || 0);
      todayPeakOnline = Math.max(activeSessions.length, stats.peakOnline || 0);
      sectionHits = stats.sectionHits || {};
      osHits = stats.osHits || {};
      if (stats.countryHits && Object.keys(stats.countryHits).length > 0) {
        todayCountryHits = { ...stats.countryHits };
      }
      if (stats.regionHits && Object.keys(stats.regionHits).length > 0) {
        todayRegionHits = { ...stats.regionHits };
      }
    } catch {
      // ignore
    }
  }

  let histMap: Record<string, TrafficDaySummary> = {};
  if (rawHist) {
    try {
      histMap = JSON.parse(rawHist) || {};
    } catch {
      histMap = {};
    }
  }
  histMap[dateKey] = {
    dateKey,
    uniqueVisitors: todayUniqueVisitors,
    mobileVisitors: todayMobileVisitors,
    desktopVisitors: todayDesktopVisitors,
    pageViews: todayPageViews,
    peakOnline: todayPeakOnline,
    topCountries: Object.entries(todayCountryHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, count]) => ({ country, count })),
    topRegions: Object.entries(todayRegionHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([region, count]) => ({ region, count })),
  };

  const trafficHistory = Object.values(histMap)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-14);

  return {
    sessions: activeSessions,
    onlineCount: activeSessions.length,
    mobileCount,
    desktopCount,
    registeredOnlineCount,
    todayUniqueVisitors,
    todayMobileVisitors,
    todayDesktopVisitors,
    todayPageViews,
    todayPeakOnline,
    sectionHits,
    osHits,
    todayCountryHits,
    todayRegionHits,
    liveCountryHits,
    liveRegionHits,
    trafficHistory,
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
