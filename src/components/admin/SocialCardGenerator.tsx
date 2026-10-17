"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
  Image as ImageIcon,
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

type MedallionStyleMode = "reference_mix" | "clean_flat" | "baseball_crest";

type SponsorDisplayLayout = "corner_badge" | "corner_text" | "full_banner";

const TEAM_LIST = Object.values(LVBP_TEAMS);

// High-definition transparent 512x512 team mascot/emblem assets
const TEAM_HD_ICON: Record<string, string> = {
  LAR: "/teams/LAR.png",
  ZUL: "/teams/ZUL.png",
  CAR: "/teams/CAR.png",
  MAG: "/teams/MAG.png",
  LAG: "/teams/LAG.png",
  ARA: "/teams/ARA.png",
  MAR: "/teams/MAR.png",
  ANZ: "/teams/ANZ.png",
};

// Carefully tuned medallion palettes so every HD mascot pops with maximum contrast
const TEAM_MEDALLION_PALETTE: Record<
  string,
  {
    outerBg: string;
    ringBg: string;
    ringText: string;
    defaultCrest: boolean;
  }
> = {
  LAR: {
    outerBg: "#c4161c",
    ringBg: "#b9141a",
    ringText: "CARDENALES DE LARA",
    defaultCrest: true, // Matches reference graphic (Cardenales baseball crest)
  },
  ZUL: {
    outerBg: "#fed154",
    ringBg: "#f59e0b",
    ringText: "ÁGUILAS DEL ZULIA",
    defaultCrest: false, // Matches reference graphic (Clean yellow circle + Eagle)
  },
  CAR: {
    outerBg: "#121a34",
    ringBg: "#b9141a",
    ringText: "LEONES DEL CARACAS",
    defaultCrest: false,
  },
  MAG: {
    outerBg: "#fbd043",
    ringBg: "#163e8c",
    ringText: "NAVEGANTES DEL MAGALLANES",
    defaultCrest: false,
  },
  LAG: {
    outerBg: "#0ea5e9",
    ringBg: "#121a34",
    ringText: "TIBURONES DE LA GUAIRA",
    defaultCrest: false,
  },
  ARA: {
    outerBg: "#121a34",
    ringBg: "#c4161c",
    ringText: "TIGRES DE ARAGUA",
    defaultCrest: false,
  },
  MAR: {
    outerBg: "#bae6fd",
    ringBg: "#0d9488",
    ringText: "BRAVOS DE MARGARITA",
    defaultCrest: false,
  },
  ANZ: {
    outerBg: "#121a34",
    ringBg: "#ea580c",
    ringText: "CARIBES DE ANZOÁTEGUI",
    defaultCrest: false,
  },
};

function getTodayCaracasDate(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
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

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawArcTextTop(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  totalArcRad: number
) {
  const chars = text.split("");
  if (chars.length === 0) return;
  const step = chars.length > 1 ? totalArcRad / (chars.length - 1) : 0;
  const startAngle = -Math.PI / 2 - totalArcRad / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + i * step;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
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
        "https://fonts.googleapis.com/css2?family=Antonio:wght@600;700&family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Bebas+Neue&family=Montserrat:ital,wght@0,700;0,800;0,900;1,800;1,900&family=Teko:wght@500;600;700&display=swap";
      document.head.appendChild(link);
      // Give the browser a brief moment to register the stylesheet
      await new Promise((r) => setTimeout(r, 120));
    }

    if ((document as any).fonts?.load) {
      await Promise.allSettled([
        (document as any).fonts.load('400 160px "Bebas Neue"'),
        (document as any).fonts.load('700 160px "Antonio"'),
        (document as any).fonts.load('600 160px "Teko"'),
        (document as any).fonts.load('700 160px "Teko"'),
        (document as any).fonts.load('italic 900 120px "Barlow Condensed"'),
        (document as any).fonts.load('700 48px "Barlow Condensed"'),
        (document as any).fonts.load('italic 900 72px "Montserrat"'),
        (document as any).fonts.load('900 44px "Montserrat"'),
      ]);
      await (document as any).fonts.ready;
    }
  })();

  return fontsLoadedPromise;
}

export function SocialCardGenerator({ campaigns }: SocialCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVersionRef = useRef<number>(0);

  // Schedule state
  const [allGames, setAllGames] = useState<ScheduleGame[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCaracasDate());
  const [loadingGames, setLoadingGames] = useState<boolean>(false);

  // Card Configuration State
  const [templateMode, setTemplateMode] =
    useState<CardTemplateMode>("final_single");
  const [sizeFormat, setSizeFormat] = useState<CardSizeFormat>("post_4_5");
  const [medallionStyle, setMedallionStyle] =
    useState<MedallionStyleMode>("reference_mix");
  const [showTeamNames, setShowTeamNames] = useState<boolean>(false);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Editable Single-Game Fields (Default to LAR 8 - 5 ZUL like reference)
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

  // Sponsor ("Presentado por:") state
  const [sponsorMode, setSponsorMode] = useState<"campaign" | "custom" | "none">(
    campaigns.length > 0 ? "campaign" : "custom"
  );
  const [sponsorLayout, setSponsorLayout] =
    useState<SponsorDisplayLayout>("corner_badge");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ""
  );
  const [customSponsorLogo, setCustomSponsorLogo] = useState<string>("");
  const [customSponsorName, setCustomSponsorName] = useState<string>("TuZapp");
  const [rendering, setRendering] = useState<boolean>(false);

  // Load saved custom sponsor logo from localStorage
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

  // Apply a game to the form fields
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
            : game.tv || "LVBP";
        setSubInfoText(`${game.venue} · TV: ${tvText}`);
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

  // Fetch LVBP schedule
  const fetchSchedule = useCallback(async () => {
    setLoadingGames(true);
    try {
      const res = await fetch("/api/lvbp/schedule?season=2026");
      const data = await res.json();
      if (Array.isArray(data.games) && data.games.length > 0) {
        setAllGames(data.games);
        // Prefer the most recent date that has FINISHED games so "Resultado Final" shows real scores instead of 0-0
        const finishedGames = data.games.filter(
          (g: ScheduleGame) =>
            g.status === "FINISHED" ||
            (g.awayScore || 0) > 0 ||
            (g.homeScore || 0) > 0
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
            uniqueDates.find((d) => d >= todayKey) ||
            uniqueDates[uniqueDates.length - 1];
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

  // Games for the selected date
  const gamesForDate = useMemo(
    () => allGames.filter((g) => g.date === selectedDate),
    [allGames, selectedDate]
  );

  // Available dates in schedule
  const availableDates = useMemo(() => {
    return Array.from(new Set(allGames.map((g) => g.date))).sort();
  }, [allGames]);

  // Update headlines when templateMode changes
  const handleModeChange = (nextMode: CardTemplateMode) => {
    setTemplateMode(nextMode);
    const currentGame = gamesForDate.find((g) => g.id === selectedGameId);
    if (nextMode === "slate_all") {
      const allFinished =
        gamesForDate.length > 0 &&
        gamesForDate.every((g) => g.status === "FINISHED");
      if (allFinished) {
        setHeadlineWord1("RESULTADOS");
        setHeadlineWord2("DE HOY");
      } else {
        setHeadlineWord1("JUEGOS");
        setHeadlineWord2("DE HOY");
      }
    } else if (currentGame) {
      selectGame(currentGame, nextMode);
    } else if (nextMode === "preview_single") {
      setHeadlineWord1("JUEGO");
      setHeadlineWord2("DE HOY");
      setStatusPillText("6:00 PM");
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

  // Resolve active sponsor image URL
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
    return found?.companyName || found?.name || "TuZapp";
  }, [sponsorMode, customSponsorName, campaigns, selectedCampaignId]);

  // ============================================================================
  // ATOMIC OFFSCREEN HTML5 CANVAS RENDERER (ZERO RACE CONDITIONS)
  // ============================================================================
  const renderCardToCanvas = useCallback(async () => {
    const visibleCanvas = canvasRef.current;
    if (!visibleCanvas) return;

    const currentRenderVersion = ++renderVersionRef.current;
    setRendering(true);

    try {
      // 1. Preload Google Fonts + all required images BEFORE touching any canvas
      await ensureSportsFontsLoaded();

      const awayTeam = LVBP_TEAMS[awayCode] || LVBP_TEAMS.LAR;
      const homeTeam = LVBP_TEAMS[homeCode] || LVBP_TEAMS.ZUL;

      const awayIconSrc = TEAM_HD_ICON[awayTeam.code] || awayTeam.logoSvg;
      const homeIconSrc = TEAM_HD_ICON[homeTeam.code] || homeTeam.logoSvg;

      const [awayLogoImg, homeLogoImg, sponsorImg] = await Promise.all([
        loadImageElement(awayIconSrc),
        loadImageElement(homeIconSrc),
        loadImageElement(activeSponsorImageUrl),
      ]);

      // Preload slate icons if in slate mode
      const slateGames =
        gamesForDate.length > 0 ? gamesForDate.slice(0, 4) : [];
      const slateLogos =
        templateMode === "slate_all"
          ? await Promise.all(
              slateGames.map((g) =>
                Promise.all([
                  loadImageElement(
                    TEAM_HD_ICON[g.awayTeam.code] || g.awayTeam.logoUrl
                  ),
                  loadImageElement(
                    TEAM_HD_ICON[g.homeTeam.code] || g.homeTeam.logoUrl
                  ),
                ])
              )
            )
          : [];

      // Abort if a newer state update occurred while awaiting assets
      if (currentRenderVersion !== renderVersionRef.current) return;

      const W = 1080;
      const H =
        sizeFormat === "story_9_16"
          ? 1920
          : sizeFormat === "square_1_1"
            ? 1080
            : 1350;

      // Render onto an offscreen canvas first so the visible canvas never flickers or double-draws
      const offscreen = document.createElement("canvas");
      offscreen.width = W;
      offscreen.height = H;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // ------------------------------------------------------------------------
      // 1. EDITORIAL CREAM BACKGROUND + DIAGONAL LIGHT RAYS (EXACT REFERENCE)
      // ------------------------------------------------------------------------
      ctx.fillStyle = "#f7f6f4";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      // Top-left subtle warm diagonal
      ctx.fillStyle = "#f1efec";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.36, 0);
      ctx.lineTo(0, H * 0.28);
      ctx.closePath();
      ctx.fill();

      // Center-right diagonal light beam
      ctx.fillStyle = "#f2f0ed";
      ctx.beginPath();
      ctx.moveTo(W, H * 0.28);
      ctx.lineTo(W, H * 0.62);
      ctx.lineTo(W * 0.32, H);
      ctx.lineTo(W * 0.14, H);
      ctx.closePath();
      ctx.fill();

      // Bright diagonal highlight ray
      ctx.fillStyle = "#faf9f8";
      ctx.beginPath();
      ctx.moveTo(W, H * 0.42);
      ctx.lineTo(W, H * 0.52);
      ctx.lineTo(W * 0.36, H);
      ctx.lineTo(W * 0.22, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ------------------------------------------------------------------------
      // 2. BOTTOM-RIGHT 3D BASEBALL SPHERE & RED STITCHING WATERMARK
      // ------------------------------------------------------------------------
      ctx.save();
      const ballCx = W * 0.94;
      const ballCy = H * 0.87;
      const ballR = 295;

      const ballGrad = ctx.createRadialGradient(
        ballCx - 80,
        ballCy - 80,
        20,
        ballCx,
        ballCy,
        ballR
      );
      ballGrad.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      ballGrad.addColorStop(0.6, "rgba(239, 237, 233, 0.78)");
      ballGrad.addColorStop(1, "rgba(222, 219, 214, 0.42)");

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ballCx, ballCy, ballR, 0, Math.PI * 2);
      ctx.fill();

      // Soft V-shaped red baseball stitches matching reference bottom-right
      ctx.strokeStyle = "rgba(190, 35, 45, 0.11)";
      ctx.lineCap = "round";
      const seamCx = ballCx + 150;
      const seamCy = ballCy - 10;
      const seamR = 240;

      for (let a = Math.PI * 0.62; a <= Math.PI * 1.28; a += 0.055) {
        const sx = seamCx + Math.cos(a) * seamR;
        const sy = seamCy + Math.sin(a) * seamR;
        const tx = -Math.sin(a);
        const ty = Math.cos(a);
        const nx = Math.cos(a);
        const ny = Math.sin(a);

        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(sx - nx * 24 + tx * 8, sy - ny * 24 + ty * 8);
        ctx.lineTo(sx - tx * 4, sy - ty * 4);
        ctx.lineTo(sx + nx * 24 + tx * 8, sy + ny * 24 + ty * 8);
        ctx.stroke();
      }
      ctx.restore();

      // ------------------------------------------------------------------------
      // 3. TOP BRAND WORDMARK ("EnJuego" + red pill ".online")
      // ------------------------------------------------------------------------
      const topOffset =
        sizeFormat === "story_9_16"
          ? 205
          : sizeFormat === "square_1_1"
            ? 105
            : 152;

      ctx.save();
      ctx.font = 'italic 900 66px "Montserrat", "Segoe UI", sans-serif';
      const brandWord = "EnJuego";
      const pillWord = "en vivo";
      const brandW = ctx.measureText(brandWord).width;
      const pillW = 172;
      const pillH = 50;
      const gap = 14;
      const totalHeaderW = brandW + gap + pillW;
      const headerStartX = (W - totalHeaderW) / 2;

      // "EnJuego" in deep midnight navy (#151934)
      ctx.fillStyle = "#151934";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(brandWord, headerStartX, topOffset);

      // Red pill ("en vivo")
      const pillX = headerStartX + brandW + gap;
      const pillY = topOffset - pillH / 2 - 2;
      ctx.fillStyle = "#b3161a";
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 25);
      ctx.fill();

      ctx.font = '900 33px "Montserrat", "Segoe UI", sans-serif';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(pillWord, pillX + pillW / 2, topOffset - 1);
      ctx.restore();

      // ------------------------------------------------------------------------
      // 4. ULTRA-TALL CONDENSED POSTER HEADLINE ("RESULTADO FINAL")
      //    Exact reference proportions: ~850px wide, ~215px tall, 8.5° oblique
      // ------------------------------------------------------------------------
      const headlineCenterY =
        sizeFormat === "story_9_16"
          ? 470
          : sizeFormat === "square_1_1"
            ? 280
            : 395;

      ctx.save();
      const w1 = (headlineWord1 || "RESULTADO").trim().toUpperCase();
      const w2 = (headlineWord2 || "FINAL").trim().toUpperCase();

      // Measure in Bebas Neue / Antonio
      let fontPx = 178;
      ctx.font = `400 ${fontPx}px "Bebas Neue", "Antonio", "Impact", sans-serif`;
      const spacePx = 26;
      let w1Measured = ctx.measureText(w1).width;
      let w2Measured = ctx.measureText(w2).width;
      let combinedW = w1Measured + spacePx + w2Measured;

      const targetMaxW = 856;
      if (combinedW > targetMaxW) {
        fontPx = Math.floor((fontPx * targetMaxW) / combinedW);
        ctx.font = `400 ${fontPx}px "Bebas Neue", "Antonio", "Impact", sans-serif`;
        w1Measured = ctx.measureText(w1).width;
        w2Measured = ctx.measureText(w2).width;
        combinedW = w1Measured + spacePx + w2Measured;
      }

      // Apply authentic sports poster vertical stretch (1.38x) and right italic slant (-0.145)
      const verticalScale = sizeFormat === "square_1_1" ? 1.24 : 1.38;
      ctx.translate(W / 2, headlineCenterY);
      ctx.transform(1, 0, -0.145, verticalScale, 0, 0);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      const startHx = -combinedW / 2;
      // Word 1 in Crimson (#b3161a)
      ctx.fillStyle = "#b3161a";
      ctx.fillText(w1, startHx, 0);

      // Word 2 in Midnight Navy (#121734)
      ctx.fillStyle = "#121734";
      ctx.fillText(w2, startHx + w1Measured + spacePx, 0);
      ctx.restore();

      // ------------------------------------------------------------------------
      // 5. CENTER AREA: SINGLE GAME MATCHUP OR FULL DAY SLATE
      // ------------------------------------------------------------------------
      const drawTeamMedallion = (
        cx: number,
        cy: number,
        r: number,
        code: string,
        logoImg: HTMLImageElement | null,
        teamNick: string
      ) => {
        const pal = TEAM_MEDALLION_PALETTE[code] || {
          outerBg: "#121a34",
          ringBg: "#b3161a",
          ringText: teamNick.toUpperCase(),
          defaultCrest: false,
        };

        const useCrest =
          medallionStyle === "baseball_crest" ||
          (medallionStyle === "reference_mix" && pal.defaultCrest);

        // Outer solid circle
        ctx.save();
        ctx.fillStyle = pal.outerBg;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        if (useCrest) {
          // Authentic circular baseball crest (like Cardenales in reference)
          const outerRingR = r * 0.78;
          const innerBallR = r * 0.52;

          // Coloured ring with thin dark outline
          ctx.fillStyle = pal.ringBg;
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = Math.max(2, r * 0.022);
          ctx.beginPath();
          ctx.arc(cx, cy, outerRingR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Curved club name along top of ring
          ctx.fillStyle = "#ffffff";
          const fontSize = Math.max(10, Math.round(r * 0.13));
          ctx.font = `700 ${fontSize}px "Bebas Neue", "Barlow Condensed", sans-serif`;
          drawArcTextTop(
            ctx,
            pal.ringText,
            cx,
            cy,
            (outerRingR + innerBallR) / 2,
            Math.PI * 1.18
          );

          // 5 white stars along bottom of ring
          const starRadius = (outerRingR + innerBallR) / 2;
          for (let s = -2; s <= 2; s++) {
            const sa = Math.PI / 2 + s * 0.34;
            drawStar(
              ctx,
              cx + Math.cos(sa) * starRadius,
              cy + Math.sin(sa) * starRadius,
              r * 0.052,
              r * 0.024
            );
          }

          // Inner white baseball with red stitches
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = Math.max(2, r * 0.02);
          ctx.beginPath();
          ctx.arc(cx, cy, innerBallR, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Red seams inside white baseball
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, innerBallR - 1, 0, Math.PI * 2);
          ctx.clip();
          ctx.strokeStyle = "#c4161c";
          ctx.lineWidth = Math.max(1.5, r * 0.018);
          ctx.beginPath();
          ctx.arc(cx - innerBallR * 0.88, cy, innerBallR * 0.72, -0.7, 0.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(
            cx + innerBallR * 0.88,
            cy,
            innerBallR * 0.72,
            Math.PI - 0.7,
            Math.PI + 0.7
          );
          ctx.stroke();
          ctx.restore();

          // Draw HD mascot centered over the baseball
          if (logoImg) {
            const iconSize = r * 1.06;
            const scale = Math.min(
              iconSize / logoImg.width,
              iconSize / logoImg.height
            );
            const lw = logoImg.width * scale;
            const lh = logoImg.height * scale;
            ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
          }
        } else {
          // Clean flat circle + large HD mascot (exact Zulia style in reference)
          if (logoImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
            ctx.clip();
            const iconSize = r * 1.44;
            const scale = Math.min(
              iconSize / logoImg.width,
              iconSize / logoImg.height
            );
            const lw = logoImg.width * scale;
            const lh = logoImg.height * scale;
            ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
            ctx.restore();
          }
        }
        ctx.restore();

        if (showTeamNames) {
          ctx.save();
          ctx.font = '700 28px "Bebas Neue", "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#121734";
          ctx.textAlign = "center";
          ctx.fillText(teamNick.toUpperCase(), cx, cy + r + 36);
          ctx.restore();
        }
      };

      if (templateMode !== "slate_all") {
        const centerY =
          sizeFormat === "story_9_16"
            ? 980
            : sizeFormat === "square_1_1"
              ? 575
              : 776;
        const medallionR = sizeFormat === "square_1_1" ? 102 : 112;
        const awayCx = 262;
        const homeCx = W - 262;

        drawTeamMedallion(
          awayCx,
          centerY,
          medallionR,
          awayTeam.code,
          awayLogoImg,
          awayTeam.nick
        );
        drawTeamMedallion(
          homeCx,
          centerY,
          medallionR,
          homeTeam.code,
          homeLogoImg,
          homeTeam.nick
        );

        if (templateMode === "preview_single") {
          // PREVIEW MODE: "VS" + Game Time Pill
          ctx.save();
          ctx.font = '400 105px "Bebas Neue", "Antonio", sans-serif';
          ctx.fillStyle = "#121734";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("VS", W / 2, centerY - 22);

          const pillW = 176;
          const pillH = 50;
          ctx.fillStyle = "#b3161a";
          drawRoundedRect(
            ctx,
            W / 2 - pillW / 2,
            centerY + 34,
            pillW,
            pillH,
            25
          );
          ctx.fill();

          ctx.font = '700 32px "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#ffffff";
          ctx.fillText(
            (statusPillText || "7:00 PM").toUpperCase(),
            W / 2,
            centerY + 34 + pillH / 2 + 1
          );
          ctx.restore();
        } else {
          // FINAL OR LIVE SCORE MODE — Slender athletic numbers ("8  [FINAL]  5")
          const awayScoreX = 426;
          const homeScoreX = W - 426;

          ctx.save();
          ctx.translate(0, centerY + 6);
          ctx.scale(0.92, 1.18);
          ctx.font = '600 156px "Teko", "Bebas Neue", "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#121734";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(awayScore), awayScoreX / 0.92, 0);
          ctx.fillText(String(homeScore), homeScoreX / 0.92, 0);
          ctx.restore();

          // Center Light-Gray Pill ("FINAL")
          const pillW = 128;
          const pillH = 44;
          ctx.save();
          ctx.fillStyle = "#e2e2e2";
          drawRoundedRect(
            ctx,
            W / 2 - pillW / 2,
            centerY - pillH / 2 + 4,
            pillW,
            pillH,
            22
          );
          ctx.fill();

          ctx.font = '400 34px "Bebas Neue", "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#121734";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            (statusPillText || "FINAL").toUpperCase(),
            W / 2,
            centerY + 6
          );
          ctx.restore();
        }

        if (subInfoText.trim()) {
          ctx.save();
          ctx.font = '700 28px "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#334155";
          ctx.textAlign = "center";
          ctx.fillText(
            subInfoText.trim().toUpperCase(),
            W / 2,
            centerY + medallionR + (showTeamNames ? 82 : 56)
          );
          ctx.restore();
        }
      } else {
        // FULL DAY SLATE MODE (UP TO 4 GAMES)
        const startY =
          sizeFormat === "story_9_16"
            ? 670
            : sizeFormat === "square_1_1"
              ? 400
              : 540;
        const rowH = sizeFormat === "square_1_1" ? 110 : 128;
        const rowGap = sizeFormat === "square_1_1" ? 16 : 22;

        for (let i = 0; i < slateGames.length; i++) {
          const g = slateGames[i];
          const [aImg, hImg] = slateLogos[i] || [null, null];
          const ry = startY + i * (rowH + rowGap);
          const rx = 100;
          const rw = W - 200;

          ctx.save();
          ctx.shadowColor = "rgba(18, 23, 52, 0.06)";
          ctx.shadowBlur = 16;
          ctx.shadowOffsetY = 4;
          ctx.fillStyle = "#ffffff";
          drawRoundedRect(ctx, rx, ry, rw, rowH, 24);
          ctx.fill();
          ctx.restore();

          const cy = ry + rowH / 2;
          drawTeamMedallion(
            rx + 72,
            cy,
            44,
            g.awayTeam.code,
            aImg,
            g.awayTeam.nick
          );
          drawTeamMedallion(
            rx + rw - 72,
            cy,
            44,
            g.homeTeam.code,
            hImg,
            g.homeTeam.nick
          );

          ctx.save();
          ctx.font = '400 40px "Bebas Neue", "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#121734";
          ctx.textBaseline = "middle";
          ctx.textAlign = "left";
          ctx.fillText(g.awayTeam.nick.toUpperCase(), rx + 134, cy + 2);

          ctx.textAlign = "right";
          ctx.fillText(g.homeTeam.nick.toUpperCase(), rx + rw - 134, cy + 2);

          ctx.textAlign = "center";
          if (g.status === "FINISHED" || g.status === "IN_PROGRESS") {
            ctx.font = '600 56px "Teko", "Bebas Neue", sans-serif';
            ctx.fillStyle = "#b3161a";
            ctx.fillText(`${g.awayScore}  -  ${g.homeScore}`, W / 2, cy - 4);
            ctx.font = '700 20px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#64748b";
            ctx.fillText(
              (g.inning || "FINAL").toUpperCase(),
              W / 2,
              cy + 32
            );
          } else {
            ctx.fillStyle = "#121734";
            drawRoundedRect(ctx, W / 2 - 82, cy - 25, 164, 50, 14);
            ctx.fill();
            ctx.font = '700 28px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#ffffff";
            ctx.fillText(g.time || "7:00 PM", W / 2, cy + 1);
          }
          ctx.restore();
        }
      }

      // ------------------------------------------------------------------------
      // 6. BOTTOM FOOTER BAR (Exact match to reference layout)
      // ------------------------------------------------------------------------
      const hasFullBanner =
        sponsorMode !== "none" &&
        sponsorLayout === "full_banner" &&
        Boolean(sponsorImg);

      const footerBaseY = hasFullBanner ? H - 205 : H - 120;

      // Left Column: RESULTADOS Y / PLAY BY PLAY / www.enjuego.online
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#121734";
      ctx.font = '400 38px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.fillText("RESULTADOS Y", 104, footerBaseY - 38);
      ctx.fillText("PLAY BY PLAY", 104, footerBaseY);
      ctx.font = '600 31px "Barlow Condensed", sans-serif';
      ctx.fillText("www.enjuego.online", 104, footerBaseY + 34);
      ctx.restore();

      // Center Optional Badge (like "SOY LARENSE" in reference)
      if (centerBadgeLine1.trim() || centerBadgeLine2.trim()) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        if (centerBadgeLine1.trim()) {
          ctx.fillStyle = "#dc2626";
          ctx.font = '900 44px "Montserrat", "Arial Black", sans-serif';
          ctx.fillText(
            centerBadgeLine1.trim().toUpperCase(),
            W / 2,
            footerBaseY - 4
          );
        }
        if (centerBadgeLine2.trim()) {
          ctx.fillStyle = "#f97316";
          ctx.font = '900 38px "Montserrat", "Arial Black", sans-serif';
          ctx.fillText(
            centerBadgeLine2.trim().toUpperCase(),
            W / 2,
            footerBaseY + 34
          );
        }
        ctx.restore();
      }

      // Right Column: "Presentado por:" + Sponsor Badge OR Full Bottom Banner
      if (sponsorMode !== "none") {
        if (hasFullBanner && sponsorImg) {
          // Full-width 970x90 leaderboard strip across the bottom
          const bannerW = W - 208;
          const bannerH = Math.round(bannerW / 8.63);
          const bannerX = 104;
          const bannerY = H - bannerH - 42;

          ctx.save();
          ctx.textAlign = "right";
          ctx.fillStyle = "#121734";
          ctx.font = '700 20px "Barlow Condensed", "Segoe UI", sans-serif';
          ctx.fillText(
            "Presentado por:",
            bannerX + bannerW - 4,
            bannerY - 10
          );

          ctx.fillStyle = "#121734";
          drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 14);
          ctx.fill();

          drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 14);
          ctx.clip();
          ctx.drawImage(sponsorImg, bannerX, bannerY, bannerW, bannerH);
          ctx.restore();
        } else {
          // Corner Badge (exact Fly251 box style in reference: 242x80 dark navy rounded box)
          const boxW = 242;
          const boxH = 80;
          const boxX = W - 96 - boxW;
          const boxY = footerBaseY - 44;

          ctx.save();
          ctx.textAlign = "right";
          ctx.fillStyle = "#121734";
          ctx.font = '700 22px "Barlow Condensed", "Segoe UI", sans-serif';
          ctx.fillText("Presentado por:", boxX + boxW - 4, boxY - 11);

          ctx.fillStyle = "#121734";
          drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 14);
          ctx.fill();

          const isUltraWideBanner =
            sponsorImg && sponsorImg.width / sponsorImg.height > 4.5;

          if (
            sponsorImg &&
            sponsorLayout === "corner_badge" &&
            !isUltraWideBanner
          ) {
            // Standard logo (square or 3:1) fits cleanly inside the badge
            ctx.save();
            drawRoundedRect(ctx, boxX + 8, boxY + 8, boxW - 16, boxH - 16, 10);
            ctx.clip();
            const padW = boxW - 24;
            const padH = boxH - 18;
            const scale = Math.min(
              padW / sponsorImg.width,
              padH / sponsorImg.height
            );
            const sw = sponsorImg.width * scale;
            const sh = sponsorImg.height * scale;
            ctx.drawImage(
              sponsorImg,
              boxX + (boxW - sw) / 2,
              boxY + (boxH - sh) / 2,
              sw,
              sh
            );
            ctx.restore();
          } else if (
            sponsorImg &&
            sponsorLayout === "corner_badge" &&
            isUltraWideBanner
          ) {
            // Smart crop: extract the left brand logo section (first 28% width) of a 970x90 banner so it fills the badge cleanly!
            ctx.save();
            drawRoundedRect(ctx, boxX + 6, boxY + 6, boxW - 12, boxH - 12, 10);
            ctx.clip();
            const cropW = Math.min(
              sponsorImg.width,
              Math.round(sponsorImg.height * 2.95)
            );
            const cropH = sponsorImg.height;
            ctx.drawImage(
              sponsorImg,
              0,
              0,
              cropW,
              cropH,
              boxX + 6,
              boxY + 6,
              boxW - 12,
              boxH - 12
            );
            ctx.restore();
          } else {
            // Crisp typographic sponsor badge (like "Fly251" in reference)
            const label = (activeSponsorLabel || "TuZapp").trim();
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = '800 38px "Montserrat", "Segoe UI", sans-serif';
            ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2 + 2);
          }
          ctx.restore();
        }
      }

      // Final check before atomic copy to visible canvas
      if (currentRenderVersion !== renderVersionRef.current) return;

      visibleCanvas.width = W;
      visibleCanvas.height = H;
      const visibleCtx = visibleCanvas.getContext("2d");
      if (visibleCtx) {
        visibleCtx.clearRect(0, 0, W, H);
        visibleCtx.drawImage(offscreen, 0, 0);
      }
    } finally {
      if (currentRenderVersion === renderVersionRef.current) {
        setRendering(false);
      }
    }
  }, [
    sizeFormat,
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT CONTROLS (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. SELECCIÓN DE PLANTILLA Y FORMATO */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-600" />
                  <span>Generador de Artes Deportivos (PNG HD)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea y descarga imágenes de <strong>Resultado Final</strong> o{" "}
                  <strong>Juegos de Hoy</strong> con tipografía deportiva y escudos en
                  alta definición.
                </p>
              </div>
            </div>

            {/* Template Type Selector */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                1. Tipo de Arte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: "final_single",
                    label: "Resultado Final",
                    sub: "1 Juego (Ej. 8 - 5)",
                  },
                  {
                    id: "preview_single",
                    label: "Juego de Hoy",
                    sub: "Previa y Hora",
                  },
                  {
                    id: "live_single",
                    label: "En Vivo",
                    sub: "Pizarra Parcial",
                  },
                  {
                    id: "slate_all",
                    label: "Jornada Completa",
                    sub: "Todos los Juegos",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      handleModeChange(item.id as CardTemplateMode)
                    }
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      templateMode === item.id
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-black">{item.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        templateMode === item.id
                          ? "text-rose-100"
                          : "text-slate-500"
                      }`}
                    >
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format / Size Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                  2. Tamaño de Descarga
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: "post_4_5",
                      label: "Post (4:5)",
                      dim: "1080×1350",
                    },
                    {
                      id: "story_9_16",
                      label: "Story (9:16)",
                      dim: "1080×1920",
                    },
                    {
                      id: "square_1_1",
                      label: "1:1",
                      dim: "1080×1080",
                    },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSizeFormat(fmt.id as CardSizeFormat)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        sizeFormat === fmt.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="text-[11px] font-black">{fmt.label}</div>
                      <div className="text-[10px] opacity-75 font-mono">
                        {fmt.dim}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                  Estilo de Medallones
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: "reference_mix",
                      label: "Original",
                      sub: "Estilo Referencia",
                    },
                    {
                      id: "clean_flat",
                      label: "Minimalista",
                      sub: "Círculo Limpio",
                    },
                    {
                      id: "baseball_crest",
                      label: "Sello Béisbol",
                      sub: "Anillo + Estrellas",
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() =>
                        setMedallionStyle(st.id as MedallionStyleMode)
                      }
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        medallionStyle === st.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="text-[11px] font-black">{st.label}</div>
                      <div className="text-[9px] opacity-75">{st.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 2. CARGAR DESDE CALENDARIO EN VIVO O EDITAR MANUALMENTE */}
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
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingGames ? "animate-spin" : ""}`}
                />
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
                    const firstInDate = allGames.find(
                      (g) => g.date === nextDate
                    );
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
                      {g.awayTeam.code} {g.awayScore}-{g.homeScore}{" "}
                      {g.homeTeam.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editable Matchup Controls */}
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
                    <span>Mostrar nombres debajo del círculo</span>
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
                      onChange={(e) =>
                        setAwayScore(Math.max(0, Number(e.target.value) || 0))
                      }
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
                      onChange={(e) =>
                        setHomeScore(Math.max(0, Number(e.target.value) || 0))
                      }
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
                      placeholder="FINAL / 6:00 PM"
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

            {/* Headline & Footer Customization */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Título Palabra 1 (Rojo)
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
                  Título Palabra 2 (Azul)
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

          {/* 3. PATROCINADOR ("PRESENTADO POR:") */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>4. Patrocinador (&ldquo;Presentado por:&rdquo;)</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSponsorMode("campaign")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  sponsorMode === "campaign"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Usar anunciante del panel ({campaigns.length})
              </button>
              <button
                type="button"
                onClick={() => setSponsorMode("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  sponsorMode === "custom"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Subir logo de patrocinador
              </button>
              <button
                type="button"
                onClick={() => setSponsorMode("none")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  sponsorMode === "none"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Sin patrocinador
              </button>
            </div>

            {sponsorMode !== "none" && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  {
                    id: "corner_badge",
                    label: "Logo en Caja",
                    sub: "Esquina Derecha (Auto-recorte)",
                  },
                  {
                    id: "corner_text",
                    label: "Nombre en Caja",
                    sub: "Estilo Fly251 Texto",
                  },
                  {
                    id: "full_banner",
                    label: "Banner Completo",
                    sub: "Cintillo 970×90 Inferior",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setSponsorLayout(opt.id as SponsorDisplayLayout)
                    }
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
            )}

            {sponsorMode === "campaign" && campaigns.length > 0 && (
              <div>
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
              </div>
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
                    onChange={(e) =>
                      handleUploadSponsorLogo(e.target.files?.[0])
                    }
                  />
                </label>

                <input
                  type="text"
                  value={customSponsorName}
                  onChange={(e) => {
                    setCustomSponsorName(e.target.value);
                    try {
                      window.localStorage.setItem(
                        "enjuego_social_sponsor_name",
                        e.target.value
                      );
                    } catch {
                      // ignore
                    }
                  }}
                  placeholder="Texto del patrocinador (Ej. Fly251)"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>
            )}
          </section>
        </div>

        {/* RIGHT LIVE PREVIEW & DOWNLOAD (5 COLS) */}
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
              <canvas
                ref={canvasRef}
                className="w-full max-w-[380px] h-auto rounded-lg shadow-md"
              />
            </div>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={rendering}
              className="w-full py-3.5 px-5 rounded-xl text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
              style={{
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
              }}
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
