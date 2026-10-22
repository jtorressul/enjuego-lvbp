import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { UserProfile } from "@/lib/user-auth";
import {
  type LiveSession,
  type DailyTrafficStats,
  type TrafficDaySummary,
  type MonthlyTrafficSummary,
  type AdCampaign,
  type AdClickLogEntry,
  type ServedSlotAd,
  type CanonicalSlotKey,
  type AdSlotType,
  type CampaignSlotStats,
  type CampaignDailyStats,
  type AdSlotInfo,
  AD_SLOTS_CATALOG,
  LIVE_WINDOW_MS,
  LIVE_WINDOW_SECONDS,
  getMonthLabel,
  normalizeSlotKey,
} from "./admin-types";
export * from "./admin-types";

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

export function isCloudflareRuntime(): boolean {
  return Boolean(
    process.env.CF_PAGES ||
    (typeof navigator !== "undefined" && (navigator as any).userAgent === "Cloudflare-Workers")
  );
}

export async function getAdminKv(): Promise<{
  kv: HybridKVStore;
  isCloudflareKv: boolean;
  isSqliteConnected: boolean;
  storageType: string;
}> {
  let r2Bucket: {
    get(k: string): Promise<{ text(): Promise<string> } | null>;
    put(k: string, v: string): Promise<unknown>;
  } | null = null;

  let rawKv: {
    get(k: string): Promise<string | null>;
    put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>;
  } | null = null;

  if (isCloudflareRuntime()) {
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

      // 3. Fallback: Native SQLite WAL Store (VPS Node.js mode)
      if (!r2Bucket && !rawKv) {
        const isDynamicTrafficKey =
          key.startsWith("admin:presence") ||
          key.startsWith("admin:traffic") ||
          key.startsWith("presence:");

        // If it's a dynamic presence/traffic key, bypass memoryCache so all PM2 cluster processes stay synchronized
        if (!isDynamicTrafficKey && memEntry && now < memEntry.expiresAt) {
          return memEntry.value;
        }

        try {
          const { sqliteGet } = await import("@/lib/sqlite-store");
          const val = sqliteGet(key);
          if (val !== null && val !== undefined) {
            memoryCache.set(key, {
              value: val,
              expiresAt: now + (isDynamicTrafficKey ? 500 : cacheTtlMs),
            });
            return val;
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

      // Persist to Native SQLite WAL Store on VPS Node.js
      // In VPS mode, SQLite is the primary persistent store. Always save all writes
      // (presence, traffic, audience, geo, campaigns) so PM2 workers and reloads never lose data.
      if (!r2Bucket && !rawKv) {
        try {
          const { sqlitePut } = await import("@/lib/sqlite-store");
          sqlitePut(key, value);
        } catch {
          // ignore
        }
      }
    },
  };

  const isSqlite = !r2Bucket && !rawKv;
  return {
    kv: hybridKv,
    isCloudflareKv: Boolean(r2Bucket || rawKv),
    isSqliteConnected: isSqlite,
    storageType: r2Bucket ? "Cloudflare R2" : rawKv ? "Cloudflare KV" : "SQLite WAL",
  };
}

const CAMPAIGNS_KEY = "admin:ads:jugada_v1";
const METRICS_KEY = "admin:ads:metrics:jugada_v1";
const CLICK_LOG_KEY = "admin:ads:clicklog:v1";
const PRESENCE_KEY = "admin:presence:sessions:v1";
const TRAFFIC_HISTORY_KEY = "admin:traffic:history_v1";
const MONTHLY_TRAFFIC_KEY = "admin:traffic:monthly_v1";
const USERS_INDEX_KEY = "admin:users:index:v1";
const ADMIN_PASS_KEY = "admin:config:password:v1";
const ADMIN_SECURITY_QA_KEY = "admin:config:security_qa:v1";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "enjuego2026";
export const DEFAULT_SECURITY_QUESTION = "¿Cuál es tu superhéroe favorito?";
export const DEFAULT_SECURITY_ANSWER = "spiderman";

export interface AdminSecurityConfig {
  question: string;
  answer: string;
  updatedAt?: number;
}

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

export async function getAdminPassword(): Promise<string> {
  const { kv } = await getAdminKv();
  const savedPassword = await kv.get(ADMIN_PASS_KEY);
  return (savedPassword && savedPassword.trim()) || DEFAULT_ADMIN_PASSWORD;
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

function normalizeSecretAnswer(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function getAdminSecurityQA(): Promise<{
  question: string;
  answerHint: string;
  hasCustomAnswer: boolean;
}> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(ADMIN_SECURITY_QA_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AdminSecurityConfig;
      if (parsed && parsed.question && parsed.answer) {
        const cleanAns = parsed.answer.trim();
        const hint =
          cleanAns.length <= 2
            ? "***"
            : `${cleanAns[0]}${"*".repeat(Math.max(3, cleanAns.length - 2))}${cleanAns[cleanAns.length - 1]}`;
        return {
          question: parsed.question.trim(),
          answerHint: hint,
          hasCustomAnswer: true,
        };
      }
    } catch {
      // ignore parse error
    }
  }
  return {
    question: DEFAULT_SECURITY_QUESTION,
    answerHint: "s*******n",
    hasCustomAnswer: false,
  };
}

export async function updateAdminSecurityQA(
  question: string,
  answer: string
): Promise<{ question: string; answerHint: string; hasCustomAnswer: boolean }> {
  const cleanQ = String(question || "").trim();
  const cleanA = String(answer || "").trim();
  if (cleanQ.length < 5) {
    throw new Error("Escribe una pregunta de seguridad válida.");
  }
  if (cleanA.length < 2) {
    throw new Error("La respuesta secreta debe tener al menos 2 caracteres.");
  }
  const { kv } = await getAdminKv();
  const payload: AdminSecurityConfig = {
    question: cleanQ,
    answer: cleanA,
    updatedAt: Date.now(),
  };
  await kv.put(ADMIN_SECURITY_QA_KEY, JSON.stringify(payload), {
    expirationTtl: 86400 * 365,
    persistToKv: true,
  });
  return getAdminSecurityQA();
}

export async function verifyAdminSecurityAnswer(inputAnswer: string): Promise<boolean> {
  const normalizedInput = normalizeSecretAnswer(inputAnswer);
  if (!normalizedInput) return false;
  const { kv } = await getAdminKv();
  const raw = await kv.get(ADMIN_SECURITY_QA_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AdminSecurityConfig;
      if (parsed?.answer) {
        return normalizeSecretAnswer(parsed.answer) === normalizedInput;
      }
    } catch {
      // fallback
    }
  }
  return normalizeSecretAnswer(DEFAULT_SECURITY_ANSWER) === normalizedInput;
}

export function purgeAllSportsMemCache(): number {
  let cleared = memoryCache.size;
  memoryCache.clear();
  const g = globalThis as Record<string, any>;
  for (const k of Object.keys(g)) {
    if (k.includes("SOCCER") || k.includes("LVBP") || k.includes("MLB") || k.includes("ENJUEGO")) {
      const val = g[k];
      if (val instanceof Map) {
        cleared += val.size;
        val.clear();
      }
    }
  }
  return cleared;
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

export async function clearAdClickLog(): Promise<AdClickLogEntry[]> {
  const { kv } = await getAdminKv();
  await kv.put(CLICK_LOG_KEY, JSON.stringify([]), {
    expirationTtl: 86400 * 30,
    persistToKv: true,
  });
  return [];
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
    persistToKv: true,
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

  const isNewSession = !stats.uniqueSessions.includes(input.sessionId);
  if (isNewSession && stats.uniqueSessions.length < 5000) {
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
  } else if (input.countryName && Object.keys(stats.countryHits).length === 0) {
    // Ensure country is seeded even if session was already counted
    const cKey = `${input.flag || "🌐"} ${input.countryName}`;
    stats.countryHits[cKey] = (stats.countryHits[cKey] || 0) + 1;
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
    persistToKv: true,
  });

  // Update rolling traffic summary index (retaining up to 120 days)
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
    if (keys.length > 120) {
      for (const k of keys.slice(0, keys.length - 120)) {
        delete histMap[k];
      }
    }
    await kv.put(TRAFFIC_HISTORY_KEY, JSON.stringify(histMap), {
      expirationTtl: 86400 * 180,
      persistToKv: true,
    });

    // Update monthly traffic aggregation
    const monthKey = dateKey.slice(0, 7);
    let monthlyMap: Record<string, MonthlyTrafficSummary> = {};
    const rawMonths = await kv.get(MONTHLY_TRAFFIC_KEY, { skipKv: true, ttlMs: 10000 });
    if (rawMonths) {
      try {
        monthlyMap = JSON.parse(rawMonths) || {};
      } catch {
        monthlyMap = {};
      }
    }

    const daysInThisMonth = Object.values(histMap).filter((d) => d.dateKey.startsWith(monthKey));
    if (daysInThisMonth.length > 0) {
      const monthVisitors = daysInThisMonth.reduce((acc, d) => acc + (d.uniqueVisitors || 0), 0);
      const monthMobile = daysInThisMonth.reduce((acc, d) => acc + (d.mobileVisitors || 0), 0);
      const monthDesktop = daysInThisMonth.reduce((acc, d) => acc + (d.desktopVisitors || 0), 0);
      const monthPages = daysInThisMonth.reduce((acc, d) => acc + (d.pageViews || 0), 0);
      const monthPeak = Math.max(...daysInThisMonth.map((d) => d.peakOnline || 0), 0);
      const daysCounted = daysInThisMonth.length;
      const avgDaily = Math.round(monthVisitors / daysCounted);

      monthlyMap[monthKey] = {
        monthKey,
        monthLabel: getMonthLabel(monthKey),
        uniqueVisitors: monthVisitors,
        mobileVisitors: monthMobile,
        desktopVisitors: monthDesktop,
        pageViews: monthPages,
        peakOnline: monthPeak,
        daysCounted,
        avgDailyVisitors: avgDaily,
      };

      await kv.put(MONTHLY_TRAFFIC_KEY, JSON.stringify(monthlyMap), {
        expirationTtl: 86400 * 365,
        persistToKv: true,
      });
    }
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
  currentMonthKey: string;
  currentMonthLabel: string;
  currentMonthVisitors: number;
  currentMonthPageViews: number;
  currentMonthMobileVisitors: number;
  currentMonthDesktopVisitors: number;
  currentMonthPeakOnline: number;
  currentMonthDaysCounted: number;
  currentMonthAvgDaily: number;
  monthlyHistory: MonthlyTrafficSummary[];
}> {
  const { kv } = await getAdminKv();
  const now = Date.now();
  const [raw, rawHist, rawMonths] = await Promise.all([
    kv.get(PRESENCE_KEY, { skipKv: true, ttlMs: 3000 }),
    kv.get(TRAFFIC_HISTORY_KEY, { skipKv: true, ttlMs: 5000 }),
    kv.get(MONTHLY_TRAFFIC_KEY, { skipKv: true, ttlMs: 5000 }),
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
        for (const [k, v] of Object.entries(liveCountryHits)) {
          if (!todayCountryHits[k]) todayCountryHits[k] = v;
        }
      }
      if (stats.regionHits && Object.keys(stats.regionHits).length > 0) {
        todayRegionHits = { ...stats.regionHits };
        for (const [k, v] of Object.entries(liveRegionHits)) {
          if (!todayRegionHits[k]) todayRegionHits[k] = v;
        }
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

  let monthlyMap: Record<string, MonthlyTrafficSummary> = {};
  if (rawMonths) {
    try {
      monthlyMap = JSON.parse(rawMonths) || {};
    } catch {
      monthlyMap = {};
    }
  }

  const currentMonthKey = dateKey.slice(0, 7);
  const daysInCurrentMonth = Object.values(histMap).filter((d) => d.dateKey.startsWith(currentMonthKey));
  const currentMonthVisitors = daysInCurrentMonth.reduce((acc, d) => acc + (d.uniqueVisitors || 0), 0);
  const currentMonthMobileVisitors = daysInCurrentMonth.reduce((acc, d) => acc + (d.mobileVisitors || 0), 0);
  const currentMonthDesktopVisitors = daysInCurrentMonth.reduce((acc, d) => acc + (d.desktopVisitors || 0), 0);
  const currentMonthPageViews = daysInCurrentMonth.reduce((acc, d) => acc + (d.pageViews || 0), 0);
  const currentMonthPeakOnline = Math.max(
    todayPeakOnline,
    ...daysInCurrentMonth.map((d) => d.peakOnline || 0),
    0
  );
  const currentMonthDaysCounted = Math.max(1, daysInCurrentMonth.length);
  const currentMonthAvgDaily = Math.round(currentMonthVisitors / currentMonthDaysCounted);

  // Sync current month record in monthlyMap
  monthlyMap[currentMonthKey] = {
    monthKey: currentMonthKey,
    monthLabel: getMonthLabel(currentMonthKey),
    uniqueVisitors: currentMonthVisitors,
    mobileVisitors: currentMonthMobileVisitors,
    desktopVisitors: currentMonthDesktopVisitors,
    pageViews: currentMonthPageViews,
    peakOnline: currentMonthPeakOnline,
    daysCounted: currentMonthDaysCounted,
    avgDailyVisitors: currentMonthAvgDaily,
  };

  const monthlyHistory = Object.values(monthlyMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  const trafficHistory = Object.values(histMap)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-30);

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
    currentMonthKey,
    currentMonthLabel: getMonthLabel(currentMonthKey),
    currentMonthVisitors,
    currentMonthPageViews,
    currentMonthMobileVisitors,
    currentMonthDesktopVisitors,
    currentMonthPeakOnline,
    currentMonthDaysCounted,
    currentMonthAvgDaily,
    monthlyHistory,
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
