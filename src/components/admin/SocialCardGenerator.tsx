"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
  Image as ImageIcon,
  Layers,
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

const TEAM_LIST = Object.values(LVBP_TEAMS);

// Distinctive medallion background colors matching each LVBP club's identity
const TEAM_MEDALLION_COLORS: Record<string, { bg: string; ring: string }> = {
  LAR: { bg: "#c41e24", ring: "#991b1b" }, // Cardenales de Lara
  ZUL: { bg: "#fcd34d", ring: "#f59e0b" }, // Águilas del Zulia
  CAR: { bg: "#1e3a8a", ring: "#c8102e" }, // Leones del Caracas
  MAG: { bg: "#1d4ed8", ring: "#eab308" }, // Navegantes del Magallanes
  LAG: { bg: "#0284c7", ring: "#e11d48" }, // Tiburones de La Guaira
  ARA: { bg: "#991b1b", ring: "#1e3a8a" }, // Tigres de Aragua
  MAR: { bg: "#0d9488", ring: "#0f172a" }, // Bravos de Margarita
  ANZ: { bg: "#ea580c", ring: "#1e293b" }, // Caribes de Anzoátegui
};

function getTodayCaracasDate(): string {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
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

export function SocialCardGenerator({ campaigns }: SocialCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Schedule state
  const [allGames, setAllGames] = useState<ScheduleGame[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayCaracasDate());
  const [loadingGames, setLoadingGames] = useState<boolean>(false);

  // Card Configuration State
  const [templateMode, setTemplateMode] =
    useState<CardTemplateMode>("final_single");
  const [sizeFormat, setSizeFormat] = useState<CardSizeFormat>("post_4_5");
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Editable Single-Game Fields
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

  // Fetch LVBP schedule
  const fetchSchedule = useCallback(async () => {
    setLoadingGames(true);
    try {
      const res = await fetch("/api/lvbp/schedule?season=2026");
      const data = await res.json();
      if (Array.isArray(data.games) && data.games.length > 0) {
        setAllGames(data.games);
        // Check if selectedDate has games; otherwise pick the closest date with games
        const todayGames = data.games.filter(
          (g: ScheduleGame) => g.date === selectedDate
        );
        if (todayGames.length === 0) {
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
  }, [selectedDate]);

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

  // Auto-select first game when date changes
  useEffect(() => {
    if (gamesForDate.length > 0) {
      const currentStillInDate = gamesForDate.find(
        (g) => g.id === selectedGameId
      );
      if (!currentStillInDate) {
        selectGame(gamesForDate[0]);
      }
    }
  }, [gamesForDate, selectedGameId, selectGame]);

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
    return found?.companyName || found?.name || "";
  }, [sponsorMode, customSponsorName, campaigns, selectedCampaignId]);

  // ============================================================================
  // HIGH-PRECISION HTML5 CANVAS RENDERER (1080x1350 / 1080x1920 / 1080x1080)
  // ============================================================================
  const renderCardToCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);

    try {
      if (typeof document !== "undefined" && (document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }

      const W = 1080;
      const H =
        sizeFormat === "story_9_16"
          ? 1920
          : sizeFormat === "square_1_1"
            ? 1080
            : 1350;

      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. WARM OFF-WHITE / CREAM BACKGROUND + SUBTLE DIAGONAL STRIPES
      ctx.fillStyle = "#f6f4f0";
      ctx.fillRect(0, 0, W, H);

      // Diagonal geometric light beams (exact style of reference image)
      ctx.save();
      ctx.fillStyle = "#efeae2";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.42, 0);
      ctx.lineTo(0, H * 0.35);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fbfaf8";
      ctx.beginPath();
      ctx.moveTo(W, H * 0.18);
      ctx.lineTo(W, H * 0.55);
      ctx.lineTo(W * 0.18, H);
      ctx.lineTo(0, H);
      ctx.lineTo(0, H * 0.78);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f0ece4";
      ctx.beginPath();
      ctx.moveTo(W * 0.55, H);
      ctx.lineTo(W, H * 0.62);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. SUBTLE BASEBALL SPHERE & RED STITCHING WATERMARK IN BOTTOM-RIGHT
      ctx.save();
      const ballCx = W * 0.92;
      const ballCy = H * 0.86;
      const ballR = 290;

      const ballGrad = ctx.createRadialGradient(
        ballCx - 70,
        ballCy - 70,
        30,
        ballCx,
        ballCy,
        ballR
      );
      ballGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      ballGrad.addColorStop(0.65, "rgba(236, 232, 224, 0.75)");
      ballGrad.addColorStop(1, "rgba(218, 212, 202, 0.35)");

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ballCx, ballCy, ballR, 0, Math.PI * 2);
      ctx.fill();

      // Curved baseball seam + red stitches
      ctx.strokeStyle = "rgba(196, 30, 58, 0.13)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ballCx + 130, ballCy - 30, 220, Math.PI * 0.58, Math.PI * 1.32);
      ctx.stroke();

      // Stitch ticks along the seam
      const seamCx = ballCx + 130;
      const seamCy = ballCy - 30;
      const seamR = 220;
      for (let a = Math.PI * 0.62; a <= Math.PI * 1.28; a += 0.065) {
        const sx = seamCx + Math.cos(a) * seamR;
        const sy = seamCy + Math.sin(a) * seamR;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx - nx * 18 - ny * 8, sy - ny * 18 + nx * 8);
        ctx.lineTo(sx + nx * 18 + ny * 8, sy + ny * 18 - nx * 8);
        ctx.stroke();
      }
      ctx.restore();

      const topOffset = sizeFormat === "story_9_16" ? 190 : sizeFormat === "square_1_1" ? 95 : 135;

      // 3. TOP BRAND HEADER ("EnJuego" + red pill ".online" — exact match to reference header)
      ctx.save();
      ctx.font = 'italic 900 68px "Barlow Condensed", "Impact", sans-serif';
      const brandText = "EnJuego";
      const pillText = ".online";
      const brandWidth = ctx.measureText(brandText).width;
      const pillW = 166;
      const pillH = 54;
      const gap = 14;
      const totalBrandW = brandWidth + gap + pillW;
      const startX = (W - totalBrandW) / 2;

      // Draw "EnJuego" in deep navy (#111c38)
      ctx.fillStyle = "#111c38";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(brandText, startX, topOffset);

      // Draw red pill ".online"
      const pillX = startX + brandWidth + gap;
      const pillY = topOffset - pillH / 2 - 2;
      ctx.fillStyle = "#b91c1c";
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 27);
      ctx.fill();

      ctx.font = '900 36px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(pillText, pillX + pillW / 2, topOffset - 1);
      ctx.restore();

      // 4. BIG CONDENSED ITALIC HEADLINE ("RESULTADO FINAL" / "JUEGO DE HOY")
      const headlineY =
        sizeFormat === "story_9_16"
          ? 410
          : sizeFormat === "square_1_1"
            ? 245
            : 330;

      ctx.save();
      // Tall condensed poster typography
      const w1 = (headlineWord1 || "RESULTADO").trim().toUpperCase();
      const w2 = (headlineWord2 || "FINAL").trim().toUpperCase();
      const fullHeadline = `${w1} ${w2}`;

      // Dynamically fit font size so any headline fits within 920px width
      let baseFontPx = 152;
      ctx.font = `italic 900 ${baseFontPx}px "Barlow Condensed", "Impact", "Arial Narrow", sans-serif`;
      let measuredTotal = ctx.measureText(fullHeadline).width;
      if (measuredTotal > 920) {
        baseFontPx = Math.floor((baseFontPx * 920) / measuredTotal);
        ctx.font = `italic 900 ${baseFontPx}px "Barlow Condensed", "Impact", "Arial Narrow", sans-serif`;
      }

      const w1Width = ctx.measureText(w1 + " ").width;
      const w2Width = ctx.measureText(w2).width;
      const totalHeadlineW = w1Width + w2Width;
      const hxStart = (W - totalHeadlineW) / 2;

      // Vertical stretch for authentic stadium condensed look
      ctx.translate(0, headlineY);
      ctx.scale(1, 1.32);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      // Word 1 in Crimson Red (#be1622)
      ctx.fillStyle = "#be1622";
      ctx.fillText(w1, hxStart, 0);

      // Word 2 in Deep Navy (#111c38)
      ctx.fillStyle = "#111c38";
      ctx.fillText(w2, hxStart + w1Width, 0);
      ctx.restore();

      // 5. CENTER AREA: SINGLE GAME OR FULL DAY SLATE
      if (templateMode !== "slate_all") {
        const awayTeam = LVBP_TEAMS[awayCode] || LVBP_TEAMS.LAR;
        const homeTeam = LVBP_TEAMS[homeCode] || LVBP_TEAMS.ZUL;
        const [awayLogoImg, homeLogoImg] = await Promise.all([
          loadImageElement(awayTeam.logoSvg),
          loadImageElement(homeTeam.logoSvg),
        ]);

        const centerY =
          sizeFormat === "story_9_16"
            ? 940
            : sizeFormat === "square_1_1"
              ? 560
              : 735;
        const medallionR = sizeFormat === "square_1_1" ? 115 : 132;
        const awayCx = 252;
        const homeCx = W - 252;

        // Helper to draw circular team medallion + logo
        const drawTeamMedallion = (
          cx: number,
          cy: number,
          r: number,
          code: string,
          logoImg: HTMLImageElement | null,
          teamName: string
        ) => {
          const palette = TEAM_MEDALLION_COLORS[code] || {
            bg: "#1e293b",
            ring: "#334155",
          };
          ctx.save();
          // Subtle drop shadow
          ctx.shadowColor = "rgba(17, 28, 56, 0.14)";
          ctx.shadowBlur = 24;
          ctx.shadowOffsetY = 8;

          ctx.fillStyle = palette.bg;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Draw team logo centered inside medallion
          if (logoImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
            ctx.clip();
            const maxLogoSize = r * 1.52;
            const ratio = Math.min(
              maxLogoSize / logoImg.width,
              maxLogoSize / logoImg.height
            );
            const lw = logoImg.width * ratio;
            const lh = logoImg.height * ratio;
            ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
            ctx.restore();
          }

          // Team Nickname below medallion
          ctx.save();
          ctx.font = '800 26px "Barlow Condensed", system-ui, sans-serif';
          ctx.fillStyle = "#334155";
          ctx.textAlign = "center";
          ctx.fillText(teamName.toUpperCase(), cx, cy + r + 36);
          ctx.restore();
        };

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
          // PREVIEW MODE: "VS" + Game Time Pill + Stadium/TV
          ctx.save();
          ctx.font = 'italic 900 92px "Barlow Condensed", "Impact", sans-serif';
          ctx.fillStyle = "#111c38";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("VS", W / 2, centerY - 22);

          // Time Pill
          const pillW = 190;
          const pillH = 54;
          ctx.fillStyle = "#be1622";
          drawRoundedRect(
            ctx,
            W / 2 - pillW / 2,
            centerY + 34,
            pillW,
            pillH,
            27
          );
          ctx.fill();

          ctx.font = '800 32px "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#ffffff";
          ctx.fillText(
            (statusPillText || "6:00 PM").toUpperCase(),
            W / 2,
            centerY + 34 + pillH / 2 + 1
          );
          ctx.restore();
        } else {
          // FINAL OR LIVE SCORE MODE (Exact match to "8 [FINAL] 5" in reference)
          const awayScoreX = 432;
          const homeScoreX = W - 432;

          ctx.save();
          ctx.translate(0, centerY);
          ctx.scale(1, 1.25);
          ctx.font = '800 148px "Barlow Condensed", "Impact", sans-serif';
          ctx.fillStyle = "#111c38";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(awayScore), awayScoreX, 0);
          ctx.fillText(String(homeScore), homeScoreX, 0);
          ctx.restore();

          // Center Gray Pill ("FINAL")
          const pillW = 142;
          const pillH = 48;
          ctx.save();
          ctx.fillStyle = "#e3e5e8";
          drawRoundedRect(
            ctx,
            W / 2 - pillW / 2,
            centerY - pillH / 2 + 4,
            pillW,
            pillH,
            24
          );
          ctx.fill();

          ctx.font = '800 31px "Barlow Condensed", system-ui, sans-serif';
          ctx.fillStyle = "#111c38";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            (statusPillText || "FINAL").toUpperCase(),
            W / 2,
            centerY + 5
          );
          ctx.restore();
        }

        // Optional subInfoText below the matchup
        if (subInfoText.trim()) {
          ctx.save();
          ctx.font = '700 27px "Barlow Condensed", system-ui, sans-serif';
          ctx.fillStyle = "#475569";
          ctx.textAlign = "center";
          ctx.fillText(
            subInfoText.trim().toUpperCase(),
            W / 2,
            centerY + medallionR + 88
          );
          ctx.restore();
        }
      } else {
        // FULL DAY SLATE MODE (4 GAMES OF THE DAY)
        const slateGames =
          gamesForDate.length > 0 ? gamesForDate.slice(0, 4) : [];
        const startY =
          sizeFormat === "story_9_16"
            ? 650
            : sizeFormat === "square_1_1"
              ? 395
              : 515;
        const rowH = sizeFormat === "square_1_1" ? 112 : 132;
        const rowGap = sizeFormat === "square_1_1" ? 16 : 22;

        for (let i = 0; i < slateGames.length; i++) {
          const g = slateGames[i];
          const ry = startY + i * (rowH + rowGap);
          const rx = 95;
          const rw = W - 190;

          // White rounded card
          ctx.save();
          ctx.shadowColor = "rgba(17, 28, 56, 0.08)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 5;
          ctx.fillStyle = "#ffffff";
          drawRoundedRect(ctx, rx, ry, rw, rowH, 24);
          ctx.fill();
          ctx.restore();

          const [aImg, hImg] = await Promise.all([
            loadImageElement(g.awayTeam.logoUrl),
            loadImageElement(g.homeTeam.logoUrl),
          ]);

          const cy = ry + rowH / 2;
          const logoR = 44;

          // Away Medallion
          const aPal = TEAM_MEDALLION_COLORS[g.awayTeam.code] || {
            bg: "#1e293b",
          };
          ctx.fillStyle = aPal.bg;
          ctx.beginPath();
          ctx.arc(rx + 68, cy, logoR, 0, Math.PI * 2);
          ctx.fill();
          if (aImg) {
            ctx.drawImage(aImg, rx + 68 - 30, cy - 30, 60, 60);
          }

          // Home Medallion
          const hPal = TEAM_MEDALLION_COLORS[g.homeTeam.code] || {
            bg: "#1e293b",
          };
          ctx.fillStyle = hPal.bg;
          ctx.beginPath();
          ctx.arc(rx + rw - 68, cy, logoR, 0, Math.PI * 2);
          ctx.fill();
          if (hImg) {
            ctx.drawImage(hImg, rx + rw - 68 - 30, cy - 30, 60, 60);
          }

          // Team Names
          ctx.font = '800 36px "Barlow Condensed", sans-serif';
          ctx.fillStyle = "#111c38";
          ctx.textBaseline = "middle";
          ctx.textAlign = "left";
          ctx.fillText(g.awayTeam.nick.toUpperCase(), rx + 128, cy);

          ctx.textAlign = "right";
          ctx.fillText(g.homeTeam.nick.toUpperCase(), rx + rw - 128, cy);

          // Center Score or Time
          ctx.textAlign = "center";
          if (g.status === "FINISHED" || g.status === "IN_PROGRESS") {
            ctx.font = '900 54px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#be1622";
            ctx.fillText(`${g.awayScore}  -  ${g.homeScore}`, W / 2, cy - 8);
            ctx.font = '800 22px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#64748b";
            ctx.fillText(
              (g.inning || "FINAL").toUpperCase(),
              W / 2,
              cy + 32
            );
          } else {
            ctx.fillStyle = "#111c38";
            drawRoundedRect(ctx, W / 2 - 85, cy - 28, 170, 56, 16);
            ctx.fill();
            ctx.font = '800 30px "Barlow Condensed", sans-serif';
            ctx.fillStyle = "#ffffff";
            ctx.fillText(g.time || "7:00 PM", W / 2, cy + 1);
          }
        }
      }

      // 6. BOTTOM FOOTER BAR (Left: RESULTADOS Y PLAY BY PLAY + www.enjuego.online | Center: Optional Badge | Right: Presentado por:)
      const footerBaseY = H - 115;

      // Left Column
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#111c38";
      ctx.font = '800 35px "Barlow Condensed", system-ui, sans-serif';
      ctx.fillText("RESULTADOS Y", 96, footerBaseY - 36);
      ctx.fillText("PLAY BY PLAY", 96, footerBaseY);
      ctx.font = '600 31px "Barlow Condensed", system-ui, sans-serif';
      ctx.fillText("www.enjuego.online", 96, footerBaseY + 34);
      ctx.restore();

      // Center Optional Badge (like "SOY LARENSE" in the reference)
      if (centerBadgeLine1.trim() || centerBadgeLine2.trim()) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        if (centerBadgeLine1.trim()) {
          ctx.fillStyle = "#dc2626";
          ctx.font = '900 44px "Arial Black", "Impact", sans-serif';
          ctx.fillText(
            centerBadgeLine1.trim().toUpperCase(),
            W / 2 - 15,
            footerBaseY - 6
          );
        }
        if (centerBadgeLine2.trim()) {
          ctx.fillStyle = "#f97316";
          ctx.font = '900 38px "Arial Black", "Impact", sans-serif';
          ctx.fillText(
            centerBadgeLine2.trim().toUpperCase(),
            W / 2 - 15,
            footerBaseY + 32
          );
        }
        ctx.restore();
      }

      // Right Column: "Presentado por:" + Sponsor Box
      if (sponsorMode !== "none") {
        const boxW = 258;
        const boxH = 82;
        const boxX = W - 96 - boxW;
        const boxY = footerBaseY - 46;

        ctx.save();
        ctx.textAlign = "right";
        ctx.fillStyle = "#111c38";
        ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
        ctx.fillText("Presentado por:", boxX + boxW - 4, boxY - 12);

        // Dark Navy Sponsor Box (like Fly251 in reference)
        ctx.fillStyle = "#111c38";
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 16);
        ctx.fill();

        const sponsorImg = await loadImageElement(activeSponsorImageUrl);
        if (sponsorImg) {
          ctx.save();
          drawRoundedRect(ctx, boxX + 6, boxY + 6, boxW - 12, boxH - 12, 12);
          ctx.clip();
          const padW = boxW - 20;
          const padH = boxH - 16;
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
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = '900 34px "Barlow Condensed", sans-serif';
          ctx.fillText(
            activeSponsorLabel || "ENJUEGO.ONLINE",
            boxX + boxW / 2,
            boxY + boxH / 2 + 2
          );
        }
        ctx.restore();
      }
    } finally {
      setRendering(false);
    }
  }, [
    sizeFormat,
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
      {/* Load Barlow Condensed Google Font for authentic tall sports poster typography */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,800;1,900&display=swap');
      `}</style>

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
                  <strong>Juegos de Hoy</strong> listas para Instagram, WhatsApp y X.
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
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                2. Tamaño de Descarga
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "post_4_5",
                    label: "Post Vertical (4:5)",
                    dim: "1080 × 1350 px",
                  },
                  {
                    id: "story_9_16",
                    label: "Historia / Estado (9:16)",
                    dim: "1080 × 1920 px",
                  },
                  {
                    id: "square_1_1",
                    label: "Cuadrado (1:1)",
                    dim: "1080 × 1080 px",
                  },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSizeFormat(fmt.id as CardSizeFormat)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      sizeFormat === fmt.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-black">{fmt.label}</div>
                    <div className="text-[10px] opacity-75 font-mono">
                      {fmt.dim}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2. CARGAR DESDE CALENDARIO EN VIVO O EDITAR MANUALMENTE */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>3. Elegir Fecha y Partido de la LVBP</span>
              </h3>
              <button
                type="button"
                onClick={fetchSchedule}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingGames ? "animate-spin" : ""}`}
                />
                <span>Actualizar juegos</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Fecha de la Jornada
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
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
                <div className="text-xs font-extrabold uppercase text-slate-600">
                  Personalizar Equipos y Marcador en Vivo
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Equipo Visitante (Izquierda)
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
                      Carreras Vis.
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
                      Carreras Home
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
                      Equipo Local / Home Club (Derecha)
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
                      Texto extra debajo (opcional: Estadio / TV / Pitchers)
                    </label>
                    <input
                      type="text"
                      value={subInfoText}
                      onChange={(e) => setSubInfoText(e.target.value)}
                      placeholder="Ej. Estadio Monumental · Televen"
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
                  placeholder="Ej. CARAQUEÑO"
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

            {sponsorMode === "campaign" && (
              <div>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No tienes anunciantes subidos aún. Elige &ldquo;Subir logo de
                    patrocinador&rdquo; para cargar uno.
                  </p>
                ) : (
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
                  placeholder="Nombre del patrocinador (si no hay logo)"
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
