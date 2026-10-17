import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { UserProfile } from "@/lib/user-auth";

export type AdSlotType = "top-leaderboard" | "in-feed" | "gameday-sidebar";

export interface AdCampaign {
  id: string;
  companyName: string;
  title: string;
  subtitle: string;
  ctaText: string;
  linkUrl: string;
  imageUrl?: string;
  accentColor: string;
  slots: AdSlotType[];
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

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const memoryKv = new Map<string, string>();

export async function getAdminKv(): Promise<{ kv: KVNamespaceLike; isCloudflareKv: boolean }> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
      return { kv: env.ENJUEGO_KV as KVNamespaceLike, isCloudflareKv: true };
    }
  } catch {
    // Fallback in local Node dev mode
  }

  return {
    kv: {
      async get(key: string) {
        return memoryKv.get(key) ?? null;
      },
      async put(key: string, value: string) {
        memoryKv.set(key, value);
      },
    },
    isCloudflareKv: false,
  };
}

const CAMPAIGNS_KEY = "admin:ads:campaigns:v1";
const PRESENCE_KEY = "admin:presence:sessions:v1";
const USERS_INDEX_KEY = "admin:users:index:v1";
const ADMIN_PASS_KEY = "admin:config:password:v1";
const ROTATION_SECONDS_KEY = "admin:config:rotation_sec:v1";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "enjuego2026";

export const DEFAULT_5_CAMPAIGNS: AdCampaign[] = [
  {
    id: "emp_1",
    companyName: "Empresa #1 · Disponible",
    title: "Impulsa tu marca en EnJuego.online",
    subtitle: "Espacio preferencial #1 visible en toda la jornada en vivo.",
    ctaText: "Pautar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%231",
    imageUrl: "",
    accentColor: "#e11d48",
    slots: ["top-leaderboard", "in-feed", "gameday-sidebar"],
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_2",
    companyName: "Empresa #2 · Disponible",
    title: "Conecta con miles de fanáticos del béisbol",
    subtitle: "Destaca tu negocio o servicio durante cada inning de la liga.",
    ctaText: "Anunciar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%232",
    imageUrl: "",
    accentColor: "#d97706",
    slots: ["top-leaderboard", "in-feed", "gameday-sidebar"],
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_3",
    companyName: "Empresa #3 · Disponible",
    title: "Patrocina la Pizarra y el Jugada a Jugada",
    subtitle: "Presencia directa frente a la audiencia deportiva en móvil y PC.",
    ctaText: "Contactar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%233",
    imageUrl: "",
    accentColor: "#0284c7",
    slots: ["top-leaderboard", "in-feed", "gameday-sidebar"],
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_4",
    companyName: "Empresa #4 · Disponible",
    title: "Promociona tu tienda, restaurante o app aquí",
    subtitle: "Banners dinámicos con enlace directo a tu WhatsApp o Instagram.",
    ctaText: "Reservar",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%234",
    imageUrl: "",
    accentColor: "#059669",
    slots: ["top-leaderboard", "in-feed", "gameday-sidebar"],
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
  {
    id: "emp_5",
    companyName: "Empresa #5 · Disponible",
    title: "Alianzas comerciales temporada 2026-2027",
    subtitle: "Reserva tu espacio en el carrusel de patrocinadores de EnJuego.online.",
    ctaText: "Info",
    linkUrl:
      "https://wa.me/?text=Hola%20EnJuego.online,%20me%20interesa%20el%20Espacio%20Publicitario%20%235",
    imageUrl: "",
    accentColor: "#7c3aed",
    slots: ["top-leaderboard", "in-feed", "gameday-sidebar"],
    active: true,
    impressions: 0,
    clicks: 0,
    updatedAt: Date.now(),
  },
];

export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  if (!inputPassword) return false;
  const { kv } = await getAdminKv();
  const savedPassword = (await kv.get(ADMIN_PASS_KEY)) || DEFAULT_ADMIN_PASSWORD;
  return inputPassword.trim() === savedPassword.trim();
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  const clean = newPassword.trim();
  if (clean.length < 4) {
    throw new Error("La contraseña debe tener al menos 4 caracteres.");
  }
  const { kv } = await getAdminKv();
  await kv.put(ADMIN_PASS_KEY, clean, { expirationTtl: 86400 * 365 });
}

export async function getRotationSeconds(): Promise<number> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(ROTATION_SECONDS_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 3 && parsed <= 60 ? parsed : 6;
}

export async function setRotationSeconds(seconds: number): Promise<number> {
  const clamped = Math.max(3, Math.min(60, Math.round(seconds || 6)));
  const { kv } = await getAdminKv();
  await kv.put(ROTATION_SECONDS_KEY, String(clamped), { expirationTtl: 86400 * 365 });
  return clamped;
}

export async function getAdCampaigns(): Promise<AdCampaign[]> {
  const { kv } = await getAdminKv();
  const raw = await kv.get(CAMPAIGNS_KEY);
  if (!raw) {
    await kv.put(CAMPAIGNS_KEY, JSON.stringify(DEFAULT_5_CAMPAIGNS), {
      expirationTtl: 86400 * 365,
    });
    return DEFAULT_5_CAMPAIGNS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore parse error and restore default
  }
  return DEFAULT_5_CAMPAIGNS;
}

export async function saveAdCampaigns(campaigns: AdCampaign[]): Promise<AdCampaign[]> {
  const { kv } = await getAdminKv();
  await kv.put(CAMPAIGNS_KEY, JSON.stringify(campaigns), {
    expirationTtl: 86400 * 365,
  });
  return campaigns;
}

export async function recordBannerMetric(
  campaignId: string,
  metric: "impression" | "click"
): Promise<void> {
  const campaigns = await getAdCampaigns();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) return;

  if (metric === "impression") {
    campaigns[idx].impressions = (campaigns[idx].impressions || 0) + 1;
  } else {
    campaigns[idx].clicks = (campaigns[idx].clicks || 0) + 1;
  }
  await saveAdCampaigns(campaigns);
}

// ============================================================================
// LIVE PRESENCE (USUARIOS CONECTADOS EN VIVO)
// ============================================================================
const LIVE_WINDOW_MS = 75_000; // 75 seconds active window

function getTodayCaracasKey(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function recordPresenceHeartbeat(
  input: Omit<LiveSession, "firstSeen" | "lastSeen">
): Promise<{ onlineCount: number }> {
  const { kv } = await getAdminKv();
  const now = Date.now();
  const raw = await kv.get(PRESENCE_KEY);
  let sessions: LiveSession[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) sessions = parsed;
    } catch {
      sessions = [];
    }
  }

  // Keep only active sessions within LIVE_WINDOW_MS
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

  // Cap max stored live sessions at 300 to keep KV payload super fast
  if (sessions.length > 300) {
    sessions = sessions.slice(0, 300);
  }

  await kv.put(PRESENCE_KEY, JSON.stringify(sessions), { expirationTtl: 3600 });

  // Also update today's traffic stats
  const dateKey = getTodayCaracasKey();
  const statsKey = `admin:traffic:${dateKey}`;
  const rawStats = await kv.get(statsKey);
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
  await kv.put(statsKey, JSON.stringify(stats), { expirationTtl: 86400 * 14 });

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
  const raw = await kv.get(PRESENCE_KEY);
  let sessions: LiveSession[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) sessions = parsed;
    } catch {
      sessions = [];
    }
  }

  // Filter strictly to active sessions in the last 75 seconds
  const activeSessions = sessions
    .filter((s) => now - s.lastSeen <= LIVE_WINDOW_MS)
    .sort((a, b) => b.lastSeen - a.lastSeen);

  const mobileCount = activeSessions.filter((s) => s.device === "mobile").length;
  const desktopCount = activeSessions.filter((s) => s.device === "desktop").length;
  const registeredOnlineCount = activeSessions.filter((s) => s.isRegistered).length;

  const dateKey = getTodayCaracasKey();
  const rawStats = await kv.get(`admin:traffic:${dateKey}`);
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

// ============================================================================
// REGISTERED USERS DIRECTORY INDEX
// ============================================================================
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

  await kv.put(USERS_INDEX_KEY, JSON.stringify(users), { expirationTtl: 86400 * 365 });
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
