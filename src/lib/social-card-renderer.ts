// Shared canvas renderer for EnJuego social-media cards.
// Used by the admin "Generador de Artes" and by the public "Compartir" button.
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { MLB_TEAMS } from "@/lib/mlb-teams";
import type { ScheduleGame } from "@/lib/types";

export type CardTemplateMode =
  | "final_single"
  | "preview_single"
  | "live_single"
  | "slate_all";

export type CardSizeFormat = "post_4_5" | "story_9_16" | "square_1_1";

/** Background theme of the whole poster */
export type BackgroundTheme = "editorial_light" | "stadium_night" | "club_duel";

/** How team logos are presented */
export type MedallionStyleMode = "floating_shield" | "pearl_medallion" | "mascot_color";

/** How the sponsor ("Presentado por:") is presented */
export type SponsorDisplayLayout = "floating" | "adaptive_card" | "full_banner";

export const ALL_TEAMS: Record<string, any> = { ...LVBP_TEAMS, ...MLB_TEAMS };

/** Official LVBP shields with the white background removed (512x512 transparent PNG) */
export const TEAM_CLEAN_SHIELD = (code: string) =>
  MLB_TEAMS[code] ? MLB_TEAMS[code].logoSvg : `/logos/clean/${code}.png`;
/** Illustrated mascots (512x512 transparent PNG) */
export const TEAM_MASCOT = (code: string) =>
  MLB_TEAMS[code] ? MLB_TEAMS[code].logoSvg : `/teams/${code}.png`;

export const BRAND_LOGO_SRC = "/logo.png";

export function getTodayCaracasDate(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------
const imageCache = new Map<string, HTMLImageElement>();

export function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), 4000);
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      clearTimeout(timer);
      imageCache.set(src, img);
      finish(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
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
export function drawRoundedRect(
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

export function ensureSportsFontsLoaded(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (fontsLoadedPromise) return fontsLoadedPromise;

  fontsLoadedPromise = Promise.race([
    (async () => {
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
      }
    })(),
    new Promise<void>((r) => setTimeout(r, 1500)),
  ]);

  return fontsLoadedPromise;
}

export interface ThemePalette {
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

export const THEME_PALETTES: Record<BackgroundTheme, ThemePalette> = {
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


export interface SocialCardOptions {
  sizeFormat: CardSizeFormat;
  backgroundTheme: BackgroundTheme;
  medallionStyle: MedallionStyleMode;
  showTeamNames: boolean;
  showVenueAndTv: boolean;
  headlineWord1: string;
  headlineWord2: string;
  templateMode: CardTemplateMode;
  awayCode: string;
  homeCode: string;
  awayScore: number;
  homeScore: number;
  statusPillText: string;
  venueText: string;
  tvChannelsText: string;
  subInfoText: string;
  gamesForDate: ScheduleGame[];
  slateOverrides: Record<string, { venue?: string; tv?: string; time?: string }>;
  centerBadgeLine1: string;
  centerBadgeLine2: string;
  sponsorMode: "campaign" | "custom" | "none";
  sponsorLayout: SponsorDisplayLayout;
  removeSponsorWhite: boolean;
  activeSponsorImageUrl: string;
  activeSponsorLabel: string;
  league?: "lvbp" | "mlb";
  showLeagueLogo?: boolean;
}

/** Renders a social card to an offscreen 1080px-wide canvas. Returns null if stale/unavailable. */
export async function renderSocialCard(
  opts: SocialCardOptions,
  isStale: () => boolean = () => false
): Promise<HTMLCanvasElement | null> {
  const {
    sizeFormat, backgroundTheme, medallionStyle, showTeamNames, showVenueAndTv,
    headlineWord1, headlineWord2, templateMode, awayCode, homeCode, awayScore, homeScore,
    statusPillText, venueText, tvChannelsText, subInfoText, gamesForDate, slateOverrides,
    centerBadgeLine1, centerBadgeLine2, sponsorMode, sponsorLayout, removeSponsorWhite,
    activeSponsorImageUrl, activeSponsorLabel,
    showLeagueLogo = true,
  } = opts;
  void sponsorMode;

      await ensureSportsFontsLoaded();

      const theme = THEME_PALETTES[backgroundTheme];
      const awayTeam = ALL_TEAMS[awayCode] || LVBP_TEAMS.LAR;
      const homeTeam = ALL_TEAMS[homeCode] || LVBP_TEAMS.ZUL;
      const detectedLeague: "lvbp" | "mlb" =
        opts.league ||
        (MLB_TEAMS[awayCode] || MLB_TEAMS[homeCode] ? "mlb" : "lvbp");

      const leagueLogoSrc =
        detectedLeague === "mlb"
          ? theme.isDark
            ? "/logos/mlb-dark.svg"
            : "/logos/mlb.svg"
          : theme.isDark
            ? "/logos/lvbp-official-white.png"
            : "/logos/lvbp-official.png";

      const logoSrcFor = (code: string) =>
        medallionStyle === "mascot_color" ? TEAM_MASCOT(code) : TEAM_CLEAN_SHIELD(code);

      const slateGames = gamesForDate.slice(0, 4);

      const [awayLogo, homeLogo, rawSponsor, brandImg, leagueImg, slateLogos] = await Promise.all([
        loadImageElement(logoSrcFor(awayTeam.code)),
        loadImageElement(logoSrcFor(homeTeam.code)),
        loadImageElement(activeSponsorImageUrl),
        loadImageElement(BRAND_LOGO_SRC),
        showLeagueLogo ? loadImageElement(leagueLogoSrc) : Promise.resolve(null),
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

      if (isStale()) return null;

      const W = 1080;
      const H = sizeFormat === "story_9_16" ? 1920 : sizeFormat === "square_1_1" ? 1080 : 1350;
      const isSquare = sizeFormat === "square_1_1";
      const isStory = sizeFormat === "story_9_16";

      const offscreen = document.createElement("canvas");
      offscreen.width = W;
      offscreen.height = H;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return null;
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
      // 2. OFFICIAL ENJUEGO WORDMARK + OFFICIAL LEAGUE LOGO (LVBP / MLB)
      // ----------------------------------------------------------------------
      const topOffset = isStory ? 200 : isSquare ? 100 : 140;
      if (brandImg) {
        const brand = getBrandLogo(brandImg, theme.isDark ? "dark" : "light");
        const logoH = isSquare ? 72 : 84;
        const logoW = (brand.width / brand.height) * logoH;
        const pillW = 124;
        const pillH = 38;
        const gap = 14;

        const leagueMaxH = isSquare ? 62 : 72;
        const leagueMaxW = detectedLeague === "mlb" ? 116 : 76;
        const leagueDim = leagueImg ? fitInside(leagueImg, leagueMaxW, leagueMaxH) : { w: 0, h: 0 };
        const dividerSpace = leagueImg ? 42 : 0;

        const totalW = logoW + gap + pillW + dividerSpace + leagueDim.w;
        const startX = (W - totalW) / 2;
        ctx.drawImage(brand, startX, topOffset - logoH / 2, logoW, logoH);

        const pillX = startX + logoW + gap;
        const pillY = topOffset - pillH / 2 + 8;
        ctx.fillStyle = theme.isDark ? "#ffffff" : "#121734";
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 19);
        ctx.fill();
        ctx.font = '800 23px "Montserrat", "Segoe UI", sans-serif';
        ctx.fillStyle = theme.isDark ? "#121734" : "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(".online", pillX + pillW / 2, pillY + pillH / 2 + 1);

        if (leagueImg) {
          const divX = pillX + pillW + dividerSpace / 2;
          ctx.save();
          ctx.strokeStyle = theme.isDark ? "rgba(255,255,255,0.28)" : "rgba(18,23,52,0.22)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(divX, topOffset - 24);
          ctx.lineTo(divX, topOffset + 28);
          ctx.stroke();

          const lx = pillX + pillW + dividerSpace;
          const ly = topOffset - leagueDim.h / 2 + 4;
          ctx.drawImage(leagueImg, lx, ly, leagueDim.w, leagueDim.h);
          ctx.restore();
        }
      }

      // ----------------------------------------------------------------------
      // 3. HEADLINE
      // ----------------------------------------------------------------------
      const headlineCenterY = isStory ? 465 : isSquare ? 258 : 368;
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

      // Vector Map Pin Icon helper
      const drawPinIcon = (x: number, y: number, size: number, color: string) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y - size * 0.25, size * 0.38, Math.PI, 0, false);
        ctx.quadraticCurveTo(x + size * 0.38, y + size * 0.15, x, y + size * 0.55);
        ctx.quadraticCurveTo(x - size * 0.38, y + size * 0.15, x - size * 0.38, y - size * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.isDark ? "#0e1630" : "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y - size * 0.25, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      // Vector TV Screen Icon helper
      const drawTvIcon = (x: number, y: number, size: number, color: string) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        const w = size * 0.95;
        const h = size * 0.68;
        drawRoundedRect(ctx, x - w / 2, y - h / 2 + 2, w, h, 4);
        ctx.stroke();
        // Antenna V
        ctx.beginPath();
        ctx.moveTo(x - size * 0.22, y - h / 2 - size * 0.18);
        ctx.lineTo(x, y - h / 2 + 2);
        ctx.lineTo(x + size * 0.22, y - h / 2 - size * 0.18);
        ctx.stroke();
        ctx.restore();
      };

      // ----------------------------------------------------------------------
      // 5. MATCHUP / SLATE
      // ----------------------------------------------------------------------
      if (templateMode !== "slate_all") {
        const centerY = isStory ? 950 : isSquare ? 535 : 720;
        const r = isSquare ? 102 : 118;
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
          const nameY = centerY + r + 48;
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
          let previewPill = (statusPillText || "7:00 PM").trim().toUpperCase();
          if (
            previewPill === "IN PROGRESS" ||
            previewPill === "IN_PROGRESS" ||
            previewPill === "LIVE" ||
            /^IN\s*PROGRESS/i.test(previewPill)
          ) {
            previewPill = "EN VIVO";
          }
          ctx.fillText(
            previewPill,
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

          let label = (statusPillText || "FINAL").trim().toUpperCase();
          if (
            label === "IN PROGRESS" ||
            label === "IN_PROGRESS" ||
            label === "LIVE" ||
            /^IN\s*PROGRESS/i.test(label)
          ) {
            label = "EN VIVO";
          }
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

        // BROADCAST BAR: ESTADIO + CANALES DE TV
        let infoCursorY = centerY + r + (showTeamNames ? 96 : 54);
        if (showVenueAndTv) {
          const cleanVenue = venueText.trim().toUpperCase();
          const cleanTv = tvChannelsText.trim().toUpperCase();

          if (cleanVenue) {
            ctx.save();
            ctx.font = '700 28px "Barlow Condensed", sans-serif';
            const textW = ctx.measureText(cleanVenue).width;
            const iconGap = 28;
            const totalW = textW + iconGap;
            const startX = (W - totalW) / 2;

            drawPinIcon(
              startX + 10,
              infoCursorY - 8,
              24,
              theme.isDark ? "#f87171" : "#b3161a"
            );
            ctx.fillStyle = theme.footerText;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(cleanVenue, startX + iconGap, infoCursorY);
            ctx.restore();
            infoCursorY += isSquare ? 46 : 54;
          }

          if (cleanTv) {
            ctx.save();
            const tvLabel = `TRANSMITE: ${cleanTv}`;
            ctx.font = '700 25px "Barlow Condensed", sans-serif';
            const textW = ctx.measureText(tvLabel).width;
            const iconSpace = 34;
            const pillW = Math.min(W - 180, textW + iconSpace + 48);
            const pillH = 44;
            const pillX = (W - pillW) / 2;
            const pillY = infoCursorY - 31;

            ctx.fillStyle = theme.isDark
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(18, 23, 52, 0.08)";
            drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 22);
            ctx.fill();

            const contentW = textW + iconSpace;
            const contentStartX = (W - contentW) / 2;
            drawTvIcon(
              contentStartX + 12,
              pillY + pillH / 2,
              22,
              theme.isDark ? "#fbbf24" : "#b3161a"
            );

            ctx.fillStyle = theme.isDark ? "#ffffff" : "#121734";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(
              tvLabel,
              contentStartX + iconSpace,
              pillY + pillH / 2 + 1
            );
            ctx.restore();
            infoCursorY += isSquare ? 44 : 52;
          }
        }

        if (subInfoText.trim()) {
          ctx.save();
          ctx.font = '600 26px "Barlow Condensed", sans-serif';
          ctx.fillStyle = theme.footerMuted;
          ctx.textAlign = "center";
          ctx.fillText(subInfoText.trim().toUpperCase(), W / 2, infoCursorY);
          ctx.restore();
        }
      } else {
        // FULL DAY SLATE ("JORNADA COMPLETA") WITH ESTADIO & TV PER GAME
        const startY = isStory ? 635 : isSquare ? 372 : 505;
        const rowH = isSquare ? 116 : showVenueAndTv ? 142 : 124;
        const rowGap = isSquare ? 12 : 16;

        slateGames.forEach((g, i) => {
          const logos = (slateLogos as Array<[HTMLImageElement | null, HTMLImageElement | null]>)[i] || [null, null];
          const ry = startY + i * (rowH + rowGap);
          const rx = 92;
          const rw = W - 184;
          const mainH = showVenueAndTv ? rowH - 36 : rowH;
          const cy = ry + mainH / 2;

          ctx.save();
          ctx.shadowColor = theme.isDark ? "rgba(0,0,0,0.35)" : "rgba(18,23,52,0.08)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 5;
          ctx.fillStyle = theme.isDark ? "rgba(255,255,255,0.09)" : "#ffffff";
          drawRoundedRect(ctx, rx, ry, rw, rowH, 22);
          ctx.fill();
          ctx.restore();

          const aColor = ALL_TEAMS[g.awayTeam.code]?.color || "#121734";
          const hColor = ALL_TEAMS[g.homeTeam.code]?.color || "#121734";
          const logoR = isSquare ? 36 : 40;
          drawTeamLogo(rx + 66, cy, logoR, aColor, logos[0]);
          drawTeamLogo(rx + rw - 66, cy, logoR, hColor, logos[1]);

          const ov = slateOverrides[g.id] || {};
          const homeMeta = ALL_TEAMS[g.homeTeam.code];
          const gVenue =
            ov.venue !== undefined
              ? ov.venue
              : g.venue || (homeMeta ? homeMeta.venue : "");
          const gTv =
            ov.tv !== undefined
              ? ov.tv
              : g.tvChannels && g.tvChannels.length > 0
                ? g.tvChannels.join(" · ")
                : g.tv || "BeisbolPlay";
          const gTime = ov.time || g.time || "7:00 PM";

          ctx.save();
          ctx.font = '400 38px "Bebas Neue", sans-serif';
          ctx.fillStyle = theme.footerText;
          ctx.textBaseline = "middle";
          ctx.textAlign = "left";
          ctx.fillText(g.awayTeam.nick.toUpperCase(), rx + 124, cy + 2);
          ctx.textAlign = "right";
          ctx.fillText(g.homeTeam.nick.toUpperCase(), rx + rw - 124, cy + 2);
          ctx.textAlign = "center";

          if (g.status === "FINISHED" || g.status === "IN_PROGRESS") {
            ctx.font = '600 54px "Teko", "Bebas Neue", sans-serif';
            ctx.fillStyle = theme.isDark ? "#ffffff" : "#b3161a";
            ctx.fillText(`${g.awayScore}  -  ${g.homeScore}`, W / 2, cy - 4);
            let slateInning = (g.inning || (g.status === "IN_PROGRESS" ? "EN VIVO" : "FINAL")).trim().toUpperCase();
            if (
              slateInning === "IN PROGRESS" ||
              slateInning === "IN_PROGRESS" ||
              slateInning === "LIVE" ||
              /^IN\s*PROGRESS/i.test(slateInning)
            ) {
              slateInning = "EN VIVO";
            }
            ctx.fillText(slateInning, W / 2, cy + 28);
          } else {
            ctx.fillStyle = "#b3161a";
            drawRoundedRect(ctx, W / 2 - 78, cy - 22, 156, 44, 22);
            ctx.fill();
            ctx.font = '700 26px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#ffffff";
            ctx.fillText(gTime, W / 2, cy + 1);
          }

          // Bottom Stadium + TV strip inside each game row
          if (showVenueAndTv && (gVenue || gTv)) {
            const barY = ry + mainH;
            ctx.strokeStyle = theme.isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(18,23,52,0.07)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx + 24, barY);
            ctx.lineTo(rx + rw - 24, barY);
            ctx.stroke();

            const stripCy = barY + 18;
            ctx.font = '700 19px "Barlow Condensed", sans-serif';
            if (gVenue) {
              drawPinIcon(
                rx + 36,
                stripCy,
                15,
                theme.isDark ? "#f87171" : "#b3161a"
              );
              ctx.fillStyle = theme.footerMuted;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(gVenue.toUpperCase(), rx + 50, stripCy + 1);
            }
            if (gTv) {
              const tvStr = `TV: ${gTv.toUpperCase()}`;
              ctx.fillStyle = theme.isDark ? "#fbbf24" : "#b3161a";
              ctx.textAlign = "right";
              ctx.textBaseline = "middle";
              ctx.fillText(tvStr, rx + rw - 28, stripCy + 1);
            }
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

      // Optional center badge or Official League Crest (LVBP / MLB)
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
      } else if (leagueImg) {
        ctx.save();
        const maxW = detectedLeague === "mlb" ? 112 : 76;
        const maxH = 66;
        const { w: lw, h: lh } = fitInside(leagueImg, maxW, maxH);
        ctx.drawImage(leagueImg, W / 2 - lw / 2, footerBaseY - 66, lw, lh);
        ctx.font = '700 22px "Barlow Condensed", sans-serif';
        ctx.fillStyle = theme.footerMuted;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(
          detectedLeague === "mlb" ? "POSTEMPORADA MLB 2026" : "TEMPORADA LVBP 2026-27",
          W / 2,
          footerBaseY + 32
        );
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
              const ly = areaBottom - lh;
              ctx.fillText("PRESENTADO POR", rightX, ly - 12);
              if (theme.isDark) {
                ctx.shadowColor = "rgba(0,0,0,0.35)";
                ctx.shadowBlur = 10;
              }
              ctx.drawImage(sponsor, rightX - lw, ly, lw, lh);
            }
          } else if (activeSponsorLabel.trim()) {
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


  if (isStale()) return null;
  return offscreen;
}
