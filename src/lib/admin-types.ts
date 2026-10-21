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

export interface MonthlyTrafficSummary {
  monthKey: string;
  monthLabel: string;
  uniqueVisitors: number;
  mobileVisitors: number;
  desktopVisitors: number;
  pageViews: number;
  peakOnline: number;
  daysCounted: number;
  avgDailyVisitors: number;
}

const MONTH_NAMES_ES: Record<string, string> = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
};

export function getMonthLabel(monthKey: string): string {
  const parts = monthKey.split("-");
  const year = parts[0] || "";
  const month = parts[1] || "";
  const name = MONTH_NAMES_ES[month] || month;
  return `${name} ${year}`;
}
