"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import type { ScheduleGame } from "@/lib/types";
import type { AdCampaign } from "@/lib/admin-store";

interface SocialCardGeneratorProps {
  campaigns: AdCampaign[];
}

type CardTemplateMode =
  | "final_single"
  | "preview_single"
  | "live_single"
  | "slate_all";

type CardSizeFormat = "post_4_5" | "story_9_16" | "square_1_1";

/** Background theme of the whole poster */
type BackgroundTheme = "editorial_light" | "stadium_night" | "club_duel";

/** How team logos are presented */
type MedallionStyleMode = "floating_shield" | "pearl_medallion" | "mascot_color";

/** How the sponsor ("Presentado por:") is presented */
type SponsorDisplayLayout = "floating" | "adaptive_card" | "full_banner";

const TEAM_LIST = Object.values(LVBP_TEAMS);

/** Official LVBP shields with the white background removed (512x512 transparent PNG) */
const TEAM_CLEAN_SHIELD = (code: string) => `/logos/clean/${code}.png`;
/** Illustrated mascots (512x512 transparent PNG) */
const TEAM_MASCOT = (code: string) => `/teams/${code}.png`;

const BRAND_LOGO_SRC = "/logo.png";

function getTodayCaracasDate(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------
const imageCache = new Map<string, HTMLImageElement>();

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type Drawable = HTMLImageElement | HTMLCanvasElement;

/** Crops transparent margins of a canvas. */
function trimCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext("2d");
  if (!ctx) return src;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return src;
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")?.drawImage(src, -minX, -minY);
  return out;
}

/** Average colour of the 4 corners of an image (used for adaptive sponsor cards). */
function sampleCornerColor(img: Drawable): { r: number; g: number; b: number; a: number } | null {
  try {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 32, 32);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    const pts = [0, 31, 31 * 32, 31 * 32 + 31];
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (const p of pts) {
      r += d[p * 4];
      g += d[p * 4 + 1];
      b += d[p * 4 + 2];
      a += d[p * 4 + 3];
    }
    return { r: r / 4, g: g / 4, b: b / 4, a: a / 4 };
  } catch {
    return null;
  }
}

const sponsorCache = new Map<string, Drawable>();

/**
 * Prepares a sponsor logo: optionally removes the white/light background that touches
 * the image borders (flood fill), then trims empty margins.
 */
function prepareSponsorImage(img: HTMLImageElement, src: string, removeWhite: boolean): Drawable {
  const key = `${src.slice(0, 120)}|${src.length}|${removeWhite}`;
  const cached = sponsorCache.get(key);
  if (cached) return cached;

  try {
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return img;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    if (removeWhite) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      const visited = new Uint8Array(w * h);
      const stack: number[] = [];
      for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
      for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

      while (stack.length) {
        const idx = stack.pop() as number;
        if (visited[idx]) continue;
        visited[idx] = 1;
        const o = idx * 4;
        const r = d[o],
          g = d[o + 1],
          b = d[o + 2],
          a = d[o + 3];
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        const isBg = a < 20 || (minC > 225 && maxC - minC < 28);
        if (!isBg) {
          // Anti-aliased light edge: fade it instead of leaving a white halo
          if (minC > 190 && maxC - minC < 40) {
            d[o + 3] = Math.min(a, Math.max(0, Math.round((240 - minC) * 5)));
          }
          continue;
        }
        d[o + 3] = 0;
        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0) stack.push(idx - 1);
        if (x < w - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - w);
        if (y < h - 1) stack.push(idx + w);
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const trimmed = trimCanvas(c);
    sponsorCache.set(key, trimmed);
    return trimmed;
  } catch {
    // Tainted canvas (cross-origin) → fall back to the raw image
    return img;
  }
}

const brandCache = new Map<string, Drawable>();

/**
 * Returns the official EnJuego wordmark tinted for the theme:
 * - light theme: the white "en" becomes navy, red "juego" + ball stay red.
 * - dark theme: original colours (white + red).
 */
function getBrandLogo(img: HTMLImageElement, variant: "light" | "dark"): Drawable {
  const cached = brandCache.get(variant);
  if (cached) return cached;
  try {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    if (!ctx) return img;
    ctx.drawImage(img, 0, 0);
    if (variant === "light") {
      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2],
          a = d[i + 3];
        if (a < 10) continue;
        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        // Neutral (white / light gray) pixels → navy
        if (maxC - minC < 40 && minC > 120) {
          d[i] = 18;
          d[i + 1] = 23;
          d[i + 2] = 52;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    const trimmed = trimCanvas(c);
    brandCache.set(variant, trimmed);
    return trimmed;
  } catch {
    return img;
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fitInside(img: Drawable, maxW: number, maxH: number) {
  const scale = Math.min(maxW / img.width, maxH / img.height);
  return { w: img.width * scale, h: img.height * scale };
}

let fontsLoadedPromise: Promise<void> | null = null;

function ensureSportsFontsLoaded(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (fontsLoadedPromise) return fontsLoadedPromise;

  fontsLoadedPromise = (async () => {
    const linkId = "enjuego-social-google-fonts";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Bebas+Neue&family=Montserrat:wght@600;700;800;900&family=Teko:wght@500;600;700&display=swap";
      document.head.appendChild(link);
      await new Promise((r) => setTimeout(r, 150));
    }
    const fonts = (document as any).fonts;
    if (fonts?.load) {
      await Promise.allSettled([
        fonts.load('400 160px "Bebas Neue"'),
        fonts.load('600 160px "Teko"'),
        fonts.load('700 40px "Barlow Condensed"'),
        fonts.load('600 30px "Barlow Condensed"'),
        fonts.load('800 30px "Montserrat"'),
        fonts.load('900 40px "Montserrat"'),
      ]);
      await fonts.ready;
    }
  })();

  return fontsLoadedPromise;
}

interface ThemePalette {
  isDark: boolean;
  headline1: string;
  headline2: string;
  score: string;
  pillBg: string;
  pillText: string;
  footerText: string;
  footerMuted: string;
  teamName: string;
}

const THEME_PALETTES: Record<BackgroundTheme, ThemePalette> = {
  editorial_light: {
    isDark: false,
    headline1: "#b3161a",
    headline2: "#121734",
    score: "#121734",
    pillBg: "#e6e4e1",
    pillText: "#121734",
    footerText: "#121734",
    footerMuted: "#475569",
    teamName: "#121734",
  },
  stadium_night: {
    isDark: true,
    headline1: "#ef2b35",
    headline2: "#ffffff",
    score: "#ffffff",
    pillBg: "rgba(255,255,255,0.14)",
    pillText: "#ffffff",
    footerText: "#ffffff",
    footerMuted: "rgba(255,255,255,0.72)",
    teamName: "rgba(255,255,255,0.9)",
  },
  club_duel: {
    isDark: true,
    headline1: "#ffffff",
    headline2: "#ffffff",
    score: "#ffffff",
    pillBg: "rgba(255,255,255,0.18)",
    pillText: "#ffffff",
    footerText: "#ffffff",
    footerMuted: "rgba(255,255,255,0.78)",
    teamName: "rgba(255,255,255,0.92)",
  },
};

export function SocialCardGenerator({ campaigns }: SocialCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVersionRef = useRef<number>(0);

  // Schedule state
  const [allGames, setAllGames] = useState<ScheduleGame[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCaracasDate());
  const [loadingGames, setLoadingGames] = useState<boolean>(false);

  // Card configuration
  const [templateMode, setTemplateMode] = useState<CardTemplateMode>("final_single");
  const [sizeFormat, setSizeFormat] = useState<CardSizeFormat>("post_4_5");
  const [backgroundTheme, setBackgroundTheme] =
    useState<BackgroundTheme>("editorial_light");
  const [medallionStyle, setMedallionStyle] =
    useState<MedallionStyleMode>("floating_shield");
  const [showTeamNames, setShowTeamNames] = useState<boolean>(true);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Editable single-game fields
  const [awayCode, setAwayCode] = useState<string>("LAR");
  const [homeCode, setHomeCode] = useState<string>("ZUL");
  const [awayScore, setAwayScore] = useState<number>(8);
  const [homeScore, setHomeScore] = useState<number>(5);
  const [statusPillText, setStatusPillText] = useState<string>("FINAL");
  const [headlineWord1, setHeadlineWord1] = useState<string>("RESULTADO");
  const [headlineWord2, setHeadlineWord2] = useState<string>("FINAL");
  const [subInfoText, setSubInfoText] = useState<string>("");
  const [centerBadgeLine1, setCenterBadgeLine1] = useState<string>("");
  const [centerBadgeLine2, setCenterBadgeLine2] = useState<string>("");

  // Sponsor ("Presentado por:")
  const [sponsorMode, setSponsorMode] = useState<"campaign" | "custom" | "none">(
    campaigns.length > 0 ? "campaign" : "custom"
  );
  const [sponsorLayout, setSponsorLayout] = useState<SponsorDisplayLayout>("floating");
  const [removeSponsorWhite, setRemoveSponsorWhite] = useState<boolean>(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ""
  );
  const [customSponsorLogo, setCustomSponsorLogo] = useState<string>("");
  const [customSponsorName, setCustomSponsorName] = useState<string>("TuZapp");
  const [rendering, setRendering] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedLogo = window.localStorage.getItem("enjuego_social_sponsor_logo");
      const savedName = window.localStorage.getItem("enjuego_social_sponsor_name");
      if (savedLogo) setCustomSponsorLogo(savedLogo);
      if (savedName) setCustomSponsorName(savedName);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
      setSponsorMode("campaign");
    }
  }, [campaigns, selectedCampaignId]);

  const selectGame = useCallback(
    (game: ScheduleGame, modeOverride?: CardTemplateMode) => {
      const activeMode = modeOverride || templateMode;
      setSelectedGameId(game.id);
      setAwayCode(game.awayTeam.code);
      setHomeCode(game.homeTeam.code);
      setAwayScore(game.awayScore || 0);
      setHomeScore(game.homeScore || 0);

      if (activeMode === "preview_single") {
        setHeadlineWord1("JUEGO");
        setHeadlineWord2("DE HOY");
        setStatusPillText(game.time || "7:00 PM");
        const tvText =
          game.tvChannels && game.tvChannels.length > 0
            ? game.tvChannels.join(" · ")
            : game.tv || "";
        setSubInfoText(tvText ? `${game.venue} · TV: ${tvText}` : game.venue || "");
      } else if (activeMode === "live_single") {
        setHeadlineWord1("EN");
        setHeadlineWord2("VIVO");
        setStatusPillText((game.inning || "EN JUEGO").toUpperCase());
        setSubInfoText(game.venue || "");
      } else {
        setHeadlineWord1("RESULTADO");
        setHeadlineWord2("FINAL");
        setStatusPillText("FINAL");
        setSubInfoText("");
      }
    },
    [templateMode]
  );

  const fetchSchedule = useCallback(async () => {
    setLoadingGames(true);
    try {
      const res = await fetch("/api/lvbp/schedule?season=2026");
      const data = await res.json();
      if (Array.isArray(data.games) && data.games.length > 0) {
        setAllGames(data.games);
        const finishedGames = data.games.filter(
          (g: ScheduleGame) =>
            g.status === "FINISHED" || (g.awayScore || 0) > 0 || (g.homeScore || 0) > 0
        );
        if (finishedGames.length > 0) {
          const lastFinished = finishedGames[finishedGames.length - 1];
          setSelectedDate(lastFinished.date);
          setSelectedGameId(lastFinished.id);
          setAwayCode(lastFinished.awayTeam.code);
          setHomeCode(lastFinished.homeTeam.code);
          setAwayScore(lastFinished.awayScore || 0);
          setHomeScore(lastFinished.homeScore || 0);
        } else {
          const uniqueDates = Array.from(
            new Set(data.games.map((g: ScheduleGame) => g.date))
          ).sort() as string[];
          const todayKey = getTodayCaracasDate();
          const upcoming =
            uniqueDates.find((d) => d >= todayKey) || uniqueDates[uniqueDates.length - 1];
          if (upcoming) setSelectedDate(upcoming);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const gamesForDate = useMemo(
    () => allGames.filter((g) => g.date === selectedDate),
    [allGames, selectedDate]
  );

  const availableDates = useMemo(
    () => Array.from(new Set(allGames.map((g) => g.date))).sort(),
    [allGames]
  );

  const handleModeChange = (nextMode: CardTemplateMode) => {
    setTemplateMode(nextMode);
    const currentGame = gamesForDate.find((g) => g.id === selectedGameId);
    if (nextMode === "slate_all") {
      const allFinished =
        gamesForDate.length > 0 && gamesForDate.every((g) => g.status === "FINISHED");
      setHeadlineWord1(allFinished ? "RESULTADOS" : "JUEGOS");
      setHeadlineWord2("DE HOY");
    } else if (currentGame) {
      selectGame(currentGame, nextMode);
    } else if (nextMode === "preview_single") {
      setHeadlineWord1("JUEGO");
      setHeadlineWord2("DE HOY");
      setStatusPillText("7:00 PM");
    } else if (nextMode === "live_single") {
      setHeadlineWord1("EN");
      setHeadlineWord2("VIVO");
      setStatusPillText("ALTA 7°");
    } else {
      setHeadlineWord1("RESULTADO");
      setHeadlineWord2("FINAL");
      setStatusPillText("FINAL");
    }
  };

  const handleUploadSponsorLogo = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result || "");
      setCustomSponsorLogo(dataUrl);
      setSponsorMode("custom");
      try {
        window.localStorage.setItem("enjuego_social_sponsor_logo", dataUrl);
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);
  };

  const activeSponsorImageUrl = useMemo(() => {
    if (sponsorMode === "none") return "";
    if (sponsorMode === "custom") return customSponsorLogo;
    const found = campaigns.find((c) => c.id === selectedCampaignId);
    return found?.imageUrl || "";
  }, [sponsorMode, customSponsorLogo, campaigns, selectedCampaignId]);

  const activeSponsorLabel = useMemo(() => {
    if (sponsorMode === "none") return "";
    if (sponsorMode === "custom") return customSponsorName;
    const found = campaigns.find((c) => c.id === selectedCampaignId);
    return found?.companyName || found?.name || "";
  }, [sponsorMode, customSponsorName, campaigns, selectedCampaignId]);

  // ==========================================================================
  // ATOMIC OFFSCREEN RENDERER
  // ==========================================================================
  const renderCardToCanvas = useCallback(async () => {
    const visibleCanvas = canvasRef.current;
    if (!visibleCanvas) return;

    const version = ++renderVersionRef.current;
    setRendering(true);

    try {
      await ensureSportsFontsLoaded();

      const theme = THEME_PALETTES[backgroundTheme];
      const awayTeam = LVBP_TEAMS[awayCode] || LVBP_TEAMS.LAR;
      const homeTeam = LVBP_TEAMS[homeCode] || LVBP_TEAMS.ZUL;

      const logoSrcFor = (code: string) =>
        medallionStyle === "mascot_color" ? TEAM_MASCOT(code) : TEAM_CLEAN_SHIELD(code);

      const slateGames = gamesForDate.slice(0, 4);

      const [awayLogo, homeLogo, rawSponsor, brandImg, slateLogos] = await Promise.all([
        loadImageElement(logoSrcFor(awayTeam.code)),
        loadImageElement(logoSrcFor(homeTeam.code)),
        loadImageElement(activeSponsorImageUrl),
        loadImageElement(BRAND_LOGO_SRC),
        templateMode === "slate_all"
          ? Promise.all(
              slateGames.map((g) =>
                Promise.all([
                  loadImageElement(logoSrcFor(g.awayTeam.code)),
                  loadImageElement(logoSrcFor(g.homeTeam.code)),
                ])
              )
            )
          : Promise.resolve([] as Array<[HTMLImageElement | null, HTMLImageElement | null]>),
      ]);

      if (version !== renderVersionRef.current) return;

      const W = 1080;
      const H = sizeFormat === "story_9_16" ? 1920 : sizeFormat === "square_1_1" ? 1080 : 1350;
      const isSquare = sizeFormat === "square_1_1";
      const isStory = sizeFormat === "story_9_16";

      const offscreen = document.createElement("canvas");
      offscreen.width = W;
      offscreen.height = H;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const awayColor = awayTeam.color || "#b3161a";
      const homeColor = homeTeam.color || "#121734";

      // ----------------------------------------------------------------------
      // 1. BACKGROUND THEMES
      // ----------------------------------------------------------------------
      if (backgroundTheme === "editorial_light") {
        const base = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.5, H * 0.85);
        base.addColorStop(0, "#ffffff");
        base.addColorStop(0.55, "#f6f5f2");
        base.addColorStop(1, "#e9e6e1");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, W, H);

        // Soft diagonal light beams
        ctx.save();
        ctx.globalAlpha = 0.55;
        const beam = (x1: number, x2: number, alpha: number) => {
          const g = ctx.createLinearGradient(0, 0, W, H);
          g.addColorStop(0, `rgba(255,255,255,0)`);
          g.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
          g.addColorStop(1, `rgba(255,255,255,0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x1, 0);
          ctx.lineTo(x2, 0);
          ctx.lineTo(x2 - W * 0.9, H);
          ctx.lineTo(x1 - W * 0.9, H);
          ctx.closePath();
          ctx.fill();
        };
        beam(W * 0.55, W * 0.72, 0.9);
        beam(W * 0.95, W * 1.05, 0.7);
        ctx.restore();

        // Thin brand accent bar at the very top
        const accent = ctx.createLinearGradient(0, 0, W, 0);
        accent.addColorStop(0, "#b3161a");
        accent.addColorStop(1, "#121734");
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, 10);
      } else if (backgroundTheme === "stadium_night") {
        const base = ctx.createLinearGradient(0, 0, 0, H);
        base.addColorStop(0, "#0a0f1e");
        base.addColorStop(0.55, "#0e1630");
        base.addColorStop(1, "#070b16");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, W, H);

        // Team-coloured stadium light glows
        const glow = (cx: number, cy: number, color: string, radius: number, alpha: number) => {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          g.addColorStop(0, rgba(color, alpha));
          g.addColorStop(1, rgba(color, 0));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        };
        glow(-80, H * 0.55, awayColor, W * 0.85, 0.42);
        glow(W + 80, H * 0.55, homeColor, W * 0.85, 0.42);
        glow(W / 2, -120, "#ffffff", W * 0.7, 0.08);

        // Fine diagonal texture
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.025)";
        ctx.lineWidth = 2;
        for (let x = -H; x < W; x += 26) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + H, H);
          ctx.stroke();
        }
        ctx.restore();

        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      } else {
        // CLUB DUEL — split diagonal with both club colours
        ctx.fillStyle = "#0a0f1e";
        ctx.fillRect(0, 0, W, H);

        const leftGrad = ctx.createLinearGradient(0, 0, W * 0.6, H);
        leftGrad.addColorStop(0, rgba(awayColor, 1));
        leftGrad.addColorStop(1, rgba(awayColor, 0.55));
        ctx.fillStyle = leftGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W * 0.62, 0);
        ctx.lineTo(W * 0.38, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();

        const rightGrad = ctx.createLinearGradient(W, 0, W * 0.4, H);
        rightGrad.addColorStop(0, rgba(homeColor, 1));
        rightGrad.addColorStop(1, rgba(homeColor, 0.55));
        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.moveTo(W * 0.62, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, H);
        ctx.lineTo(W * 0.38, H);
        ctx.closePath();
        ctx.fill();

        // Dark overlay for legibility
        const overlay = ctx.createLinearGradient(0, 0, 0, H);
        overlay.addColorStop(0, "rgba(7,11,22,0.55)");
        overlay.addColorStop(0.5, "rgba(7,11,22,0.38)");
        overlay.addColorStop(1, "rgba(7,11,22,0.78)");
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, W, H);

        // Bright split line
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(W * 0.62, 0);
        ctx.lineTo(W * 0.38, H);
        ctx.stroke();
        ctx.restore();
      }

      // Baseball stitch watermark (bottom-right) — subtle on every theme
      ctx.save();
      const seamCx = W * 1.08;
      const seamCy = H * 0.86;
      const seamR = 300;
      ctx.strokeStyle = theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(179,22,26,0.10)";
      ctx.lineCap = "round";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(seamCx, seamCy, seamR, Math.PI * 0.6, Math.PI * 1.32);
      ctx.stroke();
      for (let a = Math.PI * 0.64; a <= Math.PI * 1.28; a += 0.06) {
        const sx = seamCx + Math.cos(a) * seamR;
        const sy = seamCy + Math.sin(a) * seamR;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        const tx = -ny;
        const ty = nx;
        ctx.beginPath();
        ctx.moveTo(sx - nx * 20 + tx * 9, sy - ny * 20 + ty * 9);
        ctx.lineTo(sx - tx * 3, sy - ty * 3);
        ctx.lineTo(sx + nx * 20 + tx * 9, sy + ny * 20 + ty * 9);
        ctx.stroke();
      }
      ctx.restore();

      // ----------------------------------------------------------------------
      // 2. OFFICIAL ENJUEGO WORDMARK
      // ----------------------------------------------------------------------
      const topOffset = isStory ? 200 : isSquare ? 100 : 140;
      if (brandImg) {
        const brand = getBrandLogo(brandImg, theme.isDark ? "dark" : "light");
        const logoH = isSquare ? 74 : 86;
        const logoW = (brand.width / brand.height) * logoH;
        const pillW = 128;
        const pillH = 40;
        const gap = 14;
        const totalW = logoW + gap + pillW;
        const startX = (W - totalW) / 2;
        ctx.drawImage(brand, startX, topOffset - logoH / 2, logoW, logoH);

        const pillX = startX + logoW + gap;
        const pillY = topOffset - pillH / 2 + 10;
        ctx.fillStyle = theme.isDark ? "#ffffff" : "#121734";
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 20);
        ctx.fill();
        ctx.font = '800 24px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillStyle = theme.isDark ? "#121734" : "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(".online", pillX + pillW / 2, pillY + pillH / 2 + 1);
      }

      // ----------------------------------------------------------------------
      // 3. HEADLINE
      // ----------------------------------------------------------------------
      const headlineCenterY = isStory ? 470 : isSquare ? 265 : 375;
      {
        ctx.save();
        const w1 = (headlineWord1 || "RESULTADO").trim().toUpperCase();
        const w2 = (headlineWord2 || "FINAL").trim().toUpperCase();
        let fontPx = 176;
        const spacePx = 26;
        ctx.font = `400 ${fontPx}px "Bebas Neue", "Impact", sans-serif`;
        let w1W = ctx.measureText(w1).width;
        let w2W = ctx.measureText(w2).width;
        let total = w1W + spacePx + w2W;
        const maxW = 850;
        if (total > maxW) {
          fontPx = Math.floor((fontPx * maxW) / total);
          ctx.font = `400 ${fontPx}px "Bebas Neue", "Impact", sans-serif`;
          w1W = ctx.measureText(w1).width;
          w2W = ctx.measureText(w2).width;
          total = w1W + spacePx + w2W;
        }
        ctx.translate(W / 2, headlineCenterY);
        ctx.transform(1, 0, -0.14, isSquare ? 1.2 : 1.34, 0, 0);
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        if (theme.isDark) {
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 6;
        }
        ctx.fillStyle = theme.headline1;
        ctx.fillText(w1, -total / 2, 0);
        ctx.fillStyle = theme.headline2;
        ctx.fillText(w2, -total / 2 + w1W + spacePx, 0);
        ctx.restore();
      }

      // ----------------------------------------------------------------------
      // 4. TEAM LOGO PRESENTATION
      // ----------------------------------------------------------------------
      const drawTeamLogo = (
        cx: number,
        cy: number,
        r: number,
        teamColor: string,
        logo: HTMLImageElement | null
      ) => {
        ctx.save();
        if (medallionStyle === "floating_shield") {
          // Soft team glow behind the shield + studio drop shadow
          const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.35);
          glow.addColorStop(0, rgba(teamColor, theme.isDark ? 0.45 : 0.16));
          glow.addColorStop(1, rgba(teamColor, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
          ctx.fill();
          if (logo) {
            const { w, h } = fitInside(logo, r * 2.05, r * 2.05);
            ctx.shadowColor = theme.isDark ? "rgba(0,0,0,0.55)" : "rgba(18,23,52,0.28)";
            ctx.shadowBlur = r * 0.22;
            ctx.shadowOffsetY = r * 0.1;
            ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
          }
        } else if (medallionStyle === "pearl_medallion") {
          // Ivory medallion with a thin club-colour bezel
          ctx.shadowColor = theme.isDark ? "rgba(0,0,0,0.5)" : "rgba(18,23,52,0.22)";
          ctx.shadowBlur = r * 0.25;
          ctx.shadowOffsetY = r * 0.1;
          const pearl = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
          pearl.addColorStop(0, "#ffffff");
          pearl.addColorStop(1, "#ece9e3");
          ctx.fillStyle = pearl;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.lineWidth = Math.max(3, r * 0.065);
          ctx.strokeStyle = teamColor;
          ctx.beginPath();
          ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = Math.max(1, r * 0.015);
          ctx.strokeStyle = "rgba(18,23,52,0.12)";
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
          ctx.stroke();
          if (logo) {
            const { w, h } = fitInside(logo, r * 1.42, r * 1.42);
            ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
          }
        } else {
          // Mascot over a club-colour gradient disc (no white ring)
          ctx.shadowColor = theme.isDark ? "rgba(0,0,0,0.5)" : "rgba(18,23,52,0.22)";
          ctx.shadowBlur = r * 0.25;
          ctx.shadowOffsetY = r * 0.1;
          const disc = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
          disc.addColorStop(0, teamColor);
          disc.addColorStop(1, rgba(teamColor, 0.78));
          ctx.fillStyle = disc;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = Math.max(2, r * 0.03);
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
          ctx.stroke();
          if (logo) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
            ctx.clip();
            const { w, h } = fitInside(logo, r * 1.4, r * 1.4);
            ctx.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
            ctx.restore();
          }
        }
        ctx.restore();
      };

      // ----------------------------------------------------------------------
      // 5. MATCHUP / SLATE
      // ----------------------------------------------------------------------
      if (templateMode !== "slate_all") {
        const centerY = isStory ? 990 : isSquare ? 575 : 770;
        const r = isSquare ? 108 : 122;
        const awayCx = 240;
        const homeCx = W - 240;

        drawTeamLogo(awayCx, centerY, r, awayColor, awayLogo);
        drawTeamLogo(homeCx, centerY, r, homeColor, homeLogo);

        if (showTeamNames) {
          ctx.save();
          ctx.font = '400 36px "Bebas Neue", "Barlow Condensed", sans-serif';
          ctx.fillStyle = theme.teamName;
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          const nameY = centerY + r + 52;
          ctx.fillText(awayTeam.nick.toUpperCase(), awayCx, nameY);
          ctx.fillText(homeTeam.nick.toUpperCase(), homeCx, nameY);
          ctx.restore();
        }

        if (templateMode === "preview_single") {
          ctx.save();
          ctx.font = '400 120px "Bebas Neue", sans-serif';
          ctx.fillStyle = theme.score;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("VS", W / 2, centerY - 28);

          const pillW = 190;
          const pillH = 54;
          ctx.fillStyle = "#b3161a";
          drawRoundedRect(ctx, W / 2 - pillW / 2, centerY + 40, pillW, pillH, 27);
          ctx.fill();
          ctx.font = '700 32px "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#ffffff";
          ctx.fillText(
            (statusPillText || "7:00 PM").toUpperCase(),
            W / 2,
            centerY + 40 + pillH / 2 + 1
          );
          ctx.restore();
        } else {
          ctx.save();
          ctx.font = '600 176px "Teko", "Bebas Neue", sans-serif';
          ctx.fillStyle = theme.score;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (theme.isDark) {
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = 20;
          }
          ctx.fillText(String(awayScore), 430, centerY + 14);
          ctx.fillText(String(homeScore), W - 430, centerY + 14);
          ctx.restore();

          const label = (statusPillText || "FINAL").toUpperCase();
          ctx.save();
          ctx.font = '400 34px "Bebas Neue", sans-serif';
          const pillW = Math.max(120, ctx.measureText(label).width + 44);
          const pillH = 46;
          const isLive = templateMode === "live_single";
          ctx.fillStyle = isLive ? "#d92d20" : theme.pillBg;
          drawRoundedRect(ctx, W / 2 - pillW / 2, centerY - pillH / 2, pillW, pillH, 23);
          ctx.fill();
          ctx.fillStyle = isLive ? "#ffffff" : theme.pillText;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, W / 2, centerY + 2);
          ctx.restore();
        }

        if (subInfoText.trim()) {
          ctx.save();
          ctx.font = '600 28px "Barlow Condensed", sans-serif';
          ctx.fillStyle = theme.footerMuted;
          ctx.textAlign = "center";
          ctx.fillText(
            subInfoText.trim().toUpperCase(),
            W / 2,
            centerY + r + (showTeamNames ? 104 : 64)
          );
          ctx.restore();
        }
      } else {
        const startY = isStory ? 660 : isSquare ? 390 : 530;
        const rowH = isSquare ? 108 : 126;
        const rowGap = isSquare ? 14 : 20;
        slateGames.forEach((g, i) => {
          const logos = (slateLogos as Array<[HTMLImageElement | null, HTMLImageElement | null]>)[i] || [null, null];
          const ry = startY + i * (rowH + rowGap);
          const rx = 96;
          const rw = W - 192;
          const cy = ry + rowH / 2;

          ctx.save();
          ctx.shadowColor = theme.isDark ? "rgba(0,0,0,0.35)" : "rgba(18,23,52,0.08)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 5;
          ctx.fillStyle = theme.isDark ? "rgba(255,255,255,0.08)" : "#ffffff";
          drawRoundedRect(ctx, rx, ry, rw, rowH, 22);
          ctx.fill();
          ctx.restore();

          const aColor = LVBP_TEAMS[g.awayTeam.code]?.color || "#121734";
          const hColor = LVBP_TEAMS[g.homeTeam.code]?.color || "#121734";
          drawTeamLogo(rx + 70, cy, 42, aColor, logos[0]);
          drawTeamLogo(rx + rw - 70, cy, 42, hColor, logos[1]);

          ctx.save();
          ctx.font = '400 40px "Bebas Neue", sans-serif';
          ctx.fillStyle = theme.footerText;
          ctx.textBaseline = "middle";
          ctx.textAlign = "left";
          ctx.fillText(g.awayTeam.nick.toUpperCase(), rx + 130, cy + 2);
          ctx.textAlign = "right";
          ctx.fillText(g.homeTeam.nick.toUpperCase(), rx + rw - 130, cy + 2);
          ctx.textAlign = "center";
          if (g.status === "FINISHED" || g.status === "IN_PROGRESS") {
            ctx.font = '600 58px "Teko", "Bebas Neue", sans-serif';
            ctx.fillStyle = theme.isDark ? "#ffffff" : "#b3161a";
            ctx.fillText(`${g.awayScore}  -  ${g.homeScore}`, W / 2, cy - 2);
            ctx.font = '700 20px "Barlow Condensed", sans-serif';
            ctx.fillStyle = theme.footerMuted;
            ctx.fillText((g.inning || "FINAL").toUpperCase(), W / 2, cy + 34);
          } else {
            ctx.fillStyle = "#b3161a";
            drawRoundedRect(ctx, W / 2 - 80, cy - 24, 160, 48, 24);
            ctx.fill();
            ctx.font = '700 28px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#ffffff";
            ctx.fillText(g.time || "7:00 PM", W / 2, cy + 1);
          }
          ctx.restore();
        });
      }

      // ----------------------------------------------------------------------
      // 6. FOOTER + SPONSOR
      // ----------------------------------------------------------------------
      const sponsor: Drawable | null = rawSponsor
        ? prepareSponsorImage(
            rawSponsor,
            activeSponsorImageUrl,
            removeSponsorWhite && sponsorLayout !== "full_banner"
          )
        : null;

      const hasFullBanner = sponsorMode !== "none" && sponsorLayout === "full_banner" && !!sponsor;
      const bannerH = hasFullBanner ? Math.round((W - 192) / 8.63) : 0;
      const footerBaseY = hasFullBanner ? H - bannerH - 120 : H - 110;

      // Divider line above footer
      ctx.save();
      ctx.strokeStyle = theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(18,23,52,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(96, footerBaseY - 92);
      ctx.lineTo(W - 96, footerBaseY - 92);
      ctx.stroke();
      ctx.restore();

      // Left column
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = theme.footerText;
      ctx.font = '400 38px "Bebas Neue", sans-serif';
      ctx.fillText("RESULTADOS Y", 96, footerBaseY - 36);
      ctx.fillText("PLAY BY PLAY", 96, footerBaseY);
      ctx.font = '600 28px "Barlow Condensed", sans-serif';
      ctx.fillStyle = theme.footerMuted;
      ctx.fillText("www.enjuego.online", 96, footerBaseY + 32);
      ctx.restore();

      // Optional center badge
      if (centerBadgeLine1.trim() || centerBadgeLine2.trim()) {
        ctx.save();
        ctx.textAlign = "center";
        if (centerBadgeLine1.trim()) {
          ctx.fillStyle = theme.isDark ? "#ffffff" : "#dc2626";
          ctx.font = '900 42px "Montserrat", sans-serif';
          ctx.fillText(centerBadgeLine1.trim().toUpperCase(), W / 2, footerBaseY - 6);
        }
        if (centerBadgeLine2.trim()) {
          ctx.fillStyle = "#f97316";
          ctx.font = '900 36px "Montserrat", sans-serif';
          ctx.fillText(centerBadgeLine2.trim().toUpperCase(), W / 2, footerBaseY + 32);
        }
        ctx.restore();
      }

      if (sponsorMode !== "none") {
        const rightX = W - 96;
        const labelColor = theme.footerMuted;

        if (hasFullBanner && sponsor) {
          const bx = 96;
          const bw = W - 192;
          const by = H - bannerH - 48;
          ctx.save();
          ctx.font = '700 22px "Barlow Condensed", sans-serif';
          ctx.fillStyle = labelColor;
          ctx.textAlign = "right";
          ctx.fillText("PRESENTADO POR", rightX, by - 12);
          ctx.shadowColor = "rgba(0,0,0,0.18)";
          ctx.shadowBlur = 16;
          ctx.shadowOffsetY = 4;
          drawRoundedRect(ctx, bx, by, bw, bannerH, 14);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.shadowColor = "transparent";
          drawRoundedRect(ctx, bx, by, bw, bannerH, 14);
          ctx.clip();
          ctx.drawImage(sponsor, bx, by, bw, bannerH);
          ctx.restore();
        } else {
          const maxLogoW = 270;
          const maxLogoH = 92;
          const areaBottom = footerBaseY + 36;

          ctx.save();
          ctx.font = '700 22px "Barlow Condensed", sans-serif';
          ctx.fillStyle = labelColor;
          ctx.textAlign = "right";
          ctx.textBaseline = "alphabetic";

          if (sponsor) {
            const { w: lw, h: lh } = fitInside(sponsor, maxLogoW, maxLogoH);

            if (sponsorLayout === "adaptive_card") {
              // Card that hugs the logo: no empty dark sides
              const padX = 22;
              const padY = 14;
              const cw = lw + padX * 2;
              const ch = lh + padY * 2;
              const cx = rightX - cw;
              const cy = areaBottom - ch;
              let cardColor = "#ffffff";
              if (!removeSponsorWhite) {
                const corner = sampleCornerColor(rawSponsor as HTMLImageElement);
                if (corner && corner.a > 200) {
                  cardColor = `rgb(${Math.round(corner.r)}, ${Math.round(corner.g)}, ${Math.round(corner.b)})`;
                }
              }
              ctx.fillText("PRESENTADO POR", rightX, cy - 12);
              ctx.shadowColor = theme.isDark ? "rgba(0,0,0,0.4)" : "rgba(18,23,52,0.14)";
              ctx.shadowBlur = 18;
              ctx.shadowOffsetY = 6;
              ctx.fillStyle = cardColor;
              drawRoundedRect(ctx, cx, cy, cw, ch, 16);
              ctx.fill();
              ctx.shadowColor = "transparent";
              ctx.drawImage(sponsor, cx + padX, cy + padY, lw, lh);
            } else {
              // Floating: logo sits directly on the poster, right-aligned
              const ly = areaBottom - lh;
              ctx.fillText("PRESENTADO POR", rightX, ly - 12);
              if (theme.isDark) {
                ctx.shadowColor = "rgba(0,0,0,0.35)";
                ctx.shadowBlur = 10;
              }
              ctx.drawImage(sponsor, rightX - lw, ly, lw, lh);
            }
          } else if (activeSponsorLabel.trim()) {
            // Text-only sponsor chip
            const text = activeSponsorLabel.trim();
            ctx.font = '800 34px "Montserrat", sans-serif';
            const tw = ctx.measureText(text).width;
            const cw = tw + 44;
            const ch = 64;
            const cx = rightX - cw;
            const cy = areaBottom - ch;
            ctx.fillStyle = theme.isDark ? "#ffffff" : "#121734";
            drawRoundedRect(ctx, cx, cy, cw, ch, 14);
            ctx.fill();
            ctx.fillStyle = theme.isDark ? "#121734" : "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, cx + cw / 2, cy + ch / 2 + 1);
            ctx.font = '700 22px "Barlow Condensed", sans-serif';
            ctx.fillStyle = labelColor;
            ctx.textAlign = "right";
            ctx.textBaseline = "alphabetic";
            ctx.fillText("PRESENTADO POR", rightX, cy - 12);
          }
          ctx.restore();
        }
      }

      if (version !== renderVersionRef.current) return;

      visibleCanvas.width = W;
      visibleCanvas.height = H;
      const vctx = visibleCanvas.getContext("2d");
      if (vctx) {
        vctx.clearRect(0, 0, W, H);
        vctx.drawImage(offscreen, 0, 0);
      }
    } finally {
      if (version === renderVersionRef.current) setRendering(false);
    }
  }, [
    sizeFormat,
    backgroundTheme,
    medallionStyle,
    showTeamNames,
    headlineWord1,
    headlineWord2,
    templateMode,
    awayCode,
    homeCode,
    awayScore,
    homeScore,
    statusPillText,
    subInfoText,
    gamesForDate,
    centerBadgeLine1,
    centerBadgeLine2,
    sponsorMode,
    sponsorLayout,
    removeSponsorWhite,
    activeSponsorImageUrl,
    activeSponsorLabel,
  ]);

  useEffect(() => {
    renderCardToCanvas();
  }, [renderCardToCanvas]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    const suffix =
      templateMode === "slate_all"
        ? `jornada-${selectedDate}`
        : `${awayCode}-vs-${homeCode}-${selectedDate}`;
    link.download = `enjuego-${templateMode}-${suffix}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const optionBtn = (active: boolean) =>
    `p-2 rounded-xl border text-center transition cursor-pointer ${
      active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
    }`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT CONTROLS */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. TEMPLATE, SIZE & DESIGN */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-600" />
                <span>Generador de Artes Deportivos (PNG HD)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea y descarga artes de <strong>Resultado Final</strong> o{" "}
                <strong>Juegos de Hoy</strong> con escudos oficiales en alta definición.
              </p>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                1. Tipo de Arte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "final_single", label: "Resultado Final", sub: "1 Juego (Ej. 8 - 5)" },
                  { id: "preview_single", label: "Juego de Hoy", sub: "Previa y Hora" },
                  { id: "live_single", label: "En Vivo", sub: "Pizarra Parcial" },
                  { id: "slate_all", label: "Jornada Completa", sub: "Todos los Juegos" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleModeChange(item.id as CardTemplateMode)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      templateMode === item.id
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-black">{item.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        templateMode === item.id ? "text-rose-100" : "text-slate-500"
                      }`}
                    >
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                2. Tamaño de Descarga
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "post_4_5", label: "Post (4:5)", dim: "1080×1350" },
                  { id: "story_9_16", label: "Historia (9:16)", dim: "1080×1920" },
                  { id: "square_1_1", label: "Cuadrado (1:1)", dim: "1080×1080" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSizeFormat(fmt.id as CardSizeFormat)}
                    className={optionBtn(sizeFormat === fmt.id)}
                  >
                    <div className="text-[11px] font-black">{fmt.label}</div>
                    <div className="text-[10px] opacity-75 font-mono">{fmt.dim}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-600" />
                Fondo del Arte
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    id: "editorial_light",
                    label: "Editorial Claro",
                    sub: "Estilo prensa limpia",
                    swatch: "linear-gradient(135deg,#ffffff,#e9e6e1)",
                  },
                  {
                    id: "stadium_night",
                    label: "Estadio Nocturno",
                    sub: "Estilo ESPN / MLB",
                    swatch: "linear-gradient(135deg,#0a0f1e,#1e2b55)",
                  },
                  {
                    id: "club_duel",
                    label: "Duelo de Clubes",
                    sub: "Colores de ambos equipos",
                    swatch: `linear-gradient(120deg,${
                      LVBP_TEAMS[awayCode]?.color || "#b3161a"
                    } 50%,${LVBP_TEAMS[homeCode]?.color || "#121734"} 50%)`,
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBackgroundTheme(t.id as BackgroundTheme)}
                    className={optionBtn(backgroundTheme === t.id)}
                  >
                    <div
                      className="h-6 w-full rounded-md mb-1.5 border border-black/10"
                      style={{ background: t.swatch }}
                    />
                    <div className="text-[11px] font-black">{t.label}</div>
                    <div className="text-[9px] opacity-75">{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                Estilo de los Escudos
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "floating_shield", label: "Escudo Flotante", sub: "Oficial, sin fondo" },
                  { id: "pearl_medallion", label: "Medallón Perla", sub: "Blanco con bisel" },
                  { id: "mascot_color", label: "Mascota HD", sub: "Sobre color del club" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setMedallionStyle(st.id as MedallionStyleMode)}
                    className={optionBtn(medallionStyle === st.id)}
                  >
                    <div className="text-[11px] font-black">{st.label}</div>
                    <div className="text-[9px] opacity-75">{st.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. GAME & SCOREBOARD */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>3. Elegir Partido o Editar Marcador</span>
              </h3>
              <button
                type="button"
                onClick={fetchSchedule}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGames ? "animate-spin" : ""}`} />
                <span>Cargar calendario LVBP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Fecha de la Jornada
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setSelectedDate(nextDate);
                    const firstInDate = allGames.find((g) => g.date === nextDate);
                    if (firstInDate) selectGame(firstInDate);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                >
                  {availableDates.length === 0 && (
                    <option value={selectedDate}>{selectedDate}</option>
                  )}
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Juegos del Día ({gamesForDate.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {gamesForDate.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGame(g)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                        selectedGameId === g.id
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                      }`}
                    >
                      {g.awayTeam.code} {g.awayScore}-{g.homeScore} {g.homeTeam.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {templateMode !== "slate_all" && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-slate-600">
                    Equipos y Pizarra
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTeamNames}
                      onChange={(e) => setShowTeamNames(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Mostrar nombres de los equipos</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Equipo Izquierda
                    </label>
                    <select
                      value={awayCode}
                      onChange={(e) => setAwayCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                    >
                      {TEAM_LIST.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Carreras Izq.
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={awayScore}
                      onChange={(e) => setAwayScore(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-black text-center text-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Carreras Der.
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={homeScore}
                      onChange={(e) => setHomeScore(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-black text-center text-slate-950"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Centro (Ej. FINAL)
                    </label>
                    <input
                      type="text"
                      value={statusPillText}
                      onChange={(e) => setStatusPillText(e.target.value)}
                      placeholder="FINAL / 7:00 PM"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-center text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Equipo Derecha
                    </label>
                    <select
                      value={homeCode}
                      onChange={(e) => setHomeCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                    >
                      {TEAM_LIST.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Texto extra debajo (opcional: Estadio / TV)
                    </label>
                    <input
                      type="text"
                      value={subInfoText}
                      onChange={(e) => setSubInfoText(e.target.value)}
                      placeholder="Ej. Estadio Antonio Herrera Gutiérrez"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Título Palabra 1
                </label>
                <input
                  type="text"
                  value={headlineWord1}
                  onChange={(e) => setHeadlineWord1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-rose-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Título Palabra 2
                </label>
                <input
                  type="text"
                  value={headlineWord2}
                  onChange={(e) => setHeadlineWord2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Sello Centro L1 (Opcional)
                </label>
                <input
                  type="text"
                  value={centerBadgeLine1}
                  onChange={(e) => setCenterBadgeLine1(e.target.value)}
                  placeholder="Ej. SOY"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Sello Centro L2 (Opcional)
                </label>
                <input
                  type="text"
                  value={centerBadgeLine2}
                  onChange={(e) => setCenterBadgeLine2(e.target.value)}
                  placeholder="Ej. LARENSE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>
          </section>

          {/* 3. SPONSOR */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>4. Patrocinador (&ldquo;Presentado por&rdquo;)</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "campaign", label: `Usar anunciante del panel (${campaigns.length})` },
                { id: "custom", label: "Subir logo de patrocinador" },
                { id: "none", label: "Sin patrocinador" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSponsorMode(opt.id as "campaign" | "custom" | "none")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    sponsorMode === opt.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {sponsorMode !== "none" && (
              <>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { id: "floating", label: "Logo Limpio", sub: "Directo sobre el arte, sin caja" },
                    { id: "adaptive_card", label: "Tarjeta Ajustada", sub: "Se adapta al tamaño del logo" },
                    { id: "full_banner", label: "Banner Completo", sub: "Cintillo 970×90 inferior" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSponsorLayout(opt.id as SponsorDisplayLayout)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        sponsorLayout === opt.id
                          ? "bg-rose-50 border-rose-600 text-rose-950"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="text-[11px] font-black">{opt.label}</div>
                      <div className="text-[9px] text-slate-500">{opt.sub}</div>
                    </button>
                  ))}
                </div>

                {sponsorLayout !== "full_banner" && (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeSponsorWhite}
                      onChange={(e) => setRemoveSponsorWhite(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Quitar fondo blanco del logo automáticamente</span>
                  </label>
                )}
              </>
            )}

            {sponsorMode === "campaign" && campaigns.length > 0 && (
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.name}
                  </option>
                ))}
              </select>
            )}

            {sponsorMode === "custom" && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir logo PNG/JPG</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleUploadSponsorLogo(e.target.files?.[0])}
                  />
                </label>
                {customSponsorLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSponsorLogo("");
                      try {
                        window.localStorage.removeItem("enjuego_social_sponsor_logo");
                      } catch {
                        // ignore
                      }
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    Quitar logo
                  </button>
                )}
                <input
                  type="text"
                  value={customSponsorName}
                  onChange={(e) => {
                    setCustomSponsorName(e.target.value);
                    try {
                      window.localStorage.setItem("enjuego_social_sponsor_name", e.target.value);
                    } catch {
                      // ignore
                    }
                  }}
                  placeholder="Nombre (se usa si no hay logo)"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
            )}
          </section>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-rose-600" />
                Vista Previa en Tiempo Real
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {sizeFormat === "story_9_16"
                  ? "1080×1920"
                  : sizeFormat === "square_1_1"
                    ? "1080×1080"
                    : "1080×1350"}{" "}
                PNG
              </span>
            </div>

            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex justify-center items-center p-2">
              <canvas ref={canvasRef} className="w-full max-w-[380px] h-auto rounded-lg shadow-md" />
            </div>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={rendering}
              className="w-full py-3.5 px-5 rounded-xl text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
              style={{ background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)" }}
            >
              <Download className="w-4 h-4" />
              <span>Descargar Arte en PNG (Alta Calidad)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
