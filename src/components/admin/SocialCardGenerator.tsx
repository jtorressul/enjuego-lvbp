"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  MapPin,
  Minus,
  Palette,
  Plus,
  RefreshCw,
  Share2,
  Sliders,
  Sparkles,
  Trophy,
  Tv,
  Type,
  Upload,
} from "lucide-react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { MLB_TEAMS } from "@/lib/mlb-teams";
import type { ScheduleGame, StandingRow } from "@/lib/types";
import type { AdCampaign } from "@/lib/admin-store";

import {
  renderSocialCard,
  getTodayCaracasDate,
  ALL_TEAMS,
  type CardTemplateMode,
  type CardSizeFormat,
  type BackgroundTheme,
  type MedallionStyleMode,
  type SponsorDisplayLayout,
  type SlateOverride,
} from "@/lib/social-card-renderer";

interface SocialCardGeneratorProps {
  campaigns: AdCampaign[];
}

export function SocialCardGenerator({ campaigns }: SocialCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVersionRef = useRef<number>(0);

  // League selector ("lvbp" | "mlb")
  const [cardLeague, setCardLeague] = useState<"lvbp" | "mlb">("lvbp");
  const activeTeamList = useMemo(
    () => Object.values(cardLeague === "mlb" ? MLB_TEAMS : LVBP_TEAMS),
    [cardLeague]
  );

  // Standings data
  const [standingsData, setStandingsData] = useState<StandingRow[]>([]);

  useEffect(() => {
    fetch(`/api/lvbp/standings?liga=${cardLeague}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.standings)) setStandingsData(data.standings);
      })
      .catch(() => {});
  }, [cardLeague]);

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
  const [showVenueAndTv, setShowVenueAndTv] = useState<boolean>(true);
  const [showLeagueLogo, setShowLeagueLogo] = useState<boolean>(true);
  const [selectedGameId, setSelectedGameId] = useState<string>("");

  // Editable single-game fields
  const [awayCode, setAwayCode] = useState<string>("LAR");
  const [homeCode, setHomeCode] = useState<string>("ZUL");
  const [awayScore, setAwayScore] = useState<number>(8);
  const [homeScore, setHomeScore] = useState<number>(5);
  const [statusPillText, setStatusPillText] = useState<string>("FINAL");
  const [headlineWord1, setHeadlineWord1] = useState<string>("RESULTADO");
  const [headlineWord2, setHeadlineWord2] = useState<string>("FINAL");
  const [venueText, setVenueText] = useState<string>(
    `${LVBP_TEAMS.ZUL.venue} · ${LVBP_TEAMS.ZUL.venueCity}`
  );
  const [tvChannelsText, setTvChannelsText] = useState<string>(
    "IVC · Televen · 1Baseball · BeisbolPlay"
  );
  const [subInfoText, setSubInfoText] = useState<string>("");
  const [centerBadgeLine1, setCenterBadgeLine1] = useState<string>("");
  const [centerBadgeLine2, setCenterBadgeLine2] = useState<string>("");

  // Optional per-game overrides for Full-Day Slate ("Jornada Completa")
  const [slateOverrides, setSlateOverrides] = useState<Record<string, SlateOverride>>({});

  // Sponsor ("Presentado por:")
  const [sponsorMode, setSponsorMode] = useState<"campaign" | "custom" | "none">("none");
  const [sponsorLayout, setSponsorLayout] = useState<SponsorDisplayLayout>("floating");
  const [removeSponsorWhite, setRemoveSponsorWhite] = useState<boolean>(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns[0]?.id || ""
  );
  const [customSponsorLogo, setCustomSponsorLogo] = useState<string>("");
  const [customSponsorName, setCustomSponsorName] = useState<string>("");
  const [rendering, setRendering] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const [downloadingMobile, setDownloadingMobile] = useState<boolean>(false);
  const [studioTab, setStudioTab] = useState<"matchup" | "style" | "sponsor">("matchup");
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  const VENEZUELA_TV_CHANNELS = [
    "IVC",
    "Televen",
    "Venevisión",
    "1Baseball",
    "ByM Sport",
    "Meridiano TV",
    "SimpleTV",
    "BeisbolPlay",
    "ESPN",
    "MLB.TV",
  ];

  const toggleTvChannelChip = (channel: string) => {
    const currentParts = tvChannelsText
      .split(/[·,|/]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = currentParts.some(
      (p) => p.toLowerCase() === channel.toLowerCase()
    );
    const nextParts = exists
      ? currentParts.filter((p) => p.toLowerCase() !== channel.toLowerCase())
      : [...currentParts, channel];
    setTvChannelsText(nextParts.join(" · "));
  };

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

      const homeMeta = ALL_TEAMS[game.homeTeam.code];
      const resolvedVenue =
        game.venue ||
        (homeMeta ? `${homeMeta.venue} · ${homeMeta.venueCity}` : "");
      setVenueText(resolvedVenue);

      const resolvedTv =
        game.tvChannels && game.tvChannels.length > 0
          ? game.tvChannels.join(" · ")
          : game.tv || "BeisbolPlay · Circuito Radial";
      setTvChannelsText(resolvedTv);

      if (activeMode === "preview_single") {
        setHeadlineWord1("JUEGO");
        setHeadlineWord2("DE HOY");
        setStatusPillText(game.time || "7:00 PM");
      } else if (activeMode === "live_single") {
        setHeadlineWord1("EN");
        setHeadlineWord2("VIVO");
        let pill = (game.inning || "EN JUEGO").trim().toUpperCase();
        if (/^IN\s*PROGRESS/i.test(pill) || pill === "IN_PROGRESS" || pill === "LIVE") {
          pill = "EN JUEGO";
        }
        setStatusPillText(pill);
      } else {
        setHeadlineWord1("RESULTADO");
        setHeadlineWord2("FINAL");
        setStatusPillText("FINAL");
      }
    },
    [templateMode]
  );

  const fetchSchedule = useCallback(async (leagueOverride?: "lvbp" | "mlb") => {
    const targetLeague = leagueOverride || cardLeague;
    setLoadingGames(true);
    try {
      const res = await fetch(`/api/lvbp/schedule?season=2026&league=${targetLeague}`);
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
          const homeMeta = ALL_TEAMS[lastFinished.homeTeam.code];
          setVenueText(
            lastFinished.venue ||
              (homeMeta ? `${homeMeta.venue} · ${homeMeta.venueCity}` : "")
          );
          const resolvedTv =
            lastFinished.tvChannels && lastFinished.tvChannels.length > 0
              ? lastFinished.tvChannels.join(" · ")
              : lastFinished.tv || (targetLeague === "mlb" ? "ESPN · MLB.TV" : "IVC · BeisbolPlay");
          setTvChannelsText(resolvedTv);
        } else {
          const uniqueDates = Array.from(
            new Set(data.games.map((g: ScheduleGame) => g.date))
          ).sort() as string[];
          const todayKey = getTodayCaracasDate();
          const upcoming =
            uniqueDates.find((d) => d >= todayKey) || uniqueDates[uniqueDates.length - 1];
          if (upcoming) setSelectedDate(upcoming);
          const first = data.games[0] as ScheduleGame;
          if (first) {
            setAwayCode(first.awayTeam.code);
            setHomeCode(first.homeTeam.code);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingGames(false);
    }
  }, [cardLeague]);

  useEffect(() => {
    fetchSchedule(cardLeague);
  }, [cardLeague, fetchSchedule]);

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
    if (nextMode === "standings") {
      setHeadlineWord1("TABLA DE");
      setHeadlineWord2("POSICIONES");
      setStatusPillText(cardLeague === "mlb" ? "MLB 2026" : "TEMPORADA REGULAR");
    } else if (nextMode === "slate_all") {
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
      const offscreen = await renderSocialCard(
        {
          sizeFormat,
          backgroundTheme,
          medallionStyle,
          showTeamNames,
          showVenueAndTv,
          headlineWord1,
          headlineWord2,
          templateMode,
          awayCode,
          homeCode,
          awayScore,
          homeScore,
          statusPillText,
          venueText,
          tvChannelsText,
          subInfoText,
          gamesForDate,
          slateOverrides,
          centerBadgeLine1,
          centerBadgeLine2,
          sponsorMode,
          sponsorLayout,
          removeSponsorWhite,
          activeSponsorImageUrl,
          activeSponsorLabel,
          league: cardLeague,
          showLeagueLogo,
          standingsData,
        },
        () => version !== renderVersionRef.current
      );
      if (!offscreen || version !== renderVersionRef.current) return;
      const W = offscreen.width;
      const H = offscreen.height;

      if (version !== renderVersionRef.current) return;

      visibleCanvas.width = W;
      visibleCanvas.height = H;
      const vctx = visibleCanvas.getContext("2d");
      if (vctx) {
        vctx.clearRect(0, 0, W, H);
        vctx.drawImage(offscreen, 0, 0);
      }
      try {
        setPreviewDataUrl(visibleCanvas.toDataURL("image/png", 1.0));
      } catch {
        // ignore if tainted
      }
    } finally {
      if (version === renderVersionRef.current) setRendering(false);
    }
  }, [
    sizeFormat,
    backgroundTheme,
    medallionStyle,
    showTeamNames,
    showVenueAndTv,
    showLeagueLogo,
    cardLeague,
    headlineWord1,
    headlineWord2,
    templateMode,
    awayCode,
    homeCode,
    awayScore,
    homeScore,
    statusPillText,
    venueText,
    tvChannelsText,
    subInfoText,
    gamesForDate,
    slateOverrides,
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

  const getDownloadFilename = () => {
    const suffix =
      templateMode === "slate_all"
        ? `jornada-${selectedDate}`
        : `${awayCode}-vs-${homeCode}-${selectedDate}`;
    return `enjuego-${templateMode}-${suffix}.png`;
  };

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(",");
    const byteStr = atob(parts[1] || "");
    const ab = new ArrayBuffer(byteStr.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteStr.length; i++) {
      ia[i] = byteStr.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/png" });
  };

  const triggerServerAttachmentDownload = (dataUrl: string, filename: string) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/admin/download-card";
    form.style.display = "none";

    const inputData = document.createElement("input");
    inputData.type = "hidden";
    inputData.name = "dataUrl";
    inputData.value = dataUrl;
    form.appendChild(inputData);

    const inputName = document.createElement("input");
    inputName.type = "hidden";
    inputName.name = "filename";
    inputName.value = filename;
    form.appendChild(inputName);

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      if (document.body.contains(form)) document.body.removeChild(form);
    }, 3000);
  };

  const handleDownloadPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloadingMobile(true);
    try {
      const filename = getDownloadFilename();
      const dataUrl = canvas.toDataURL("image/png", 1.0);

      // Fast, zero-server-overhead direct blob download
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
      } catch {
        // Fallback to server attachment if client-side blob creation fails
        triggerServerAttachmentDownload(dataUrl, filename);
      }
    } finally {
      setTimeout(() => setDownloadingMobile(false), 600);
    }
  };

  const handleShareOrSaveMobile = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloadingMobile(true);
    try {
      const filename = getDownloadFilename();
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], filename, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (typeof nav.share === "function" && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          files: [file],
          title: "EnJuego · Arte Deportivo",
        });
        return;
      }

      // Fallback if Web Share API with files is not supported on this device/browser
      triggerServerAttachmentDownload(dataUrl, filename);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const canvasEl = canvasRef.current;
        if (canvasEl) {
          triggerServerAttachmentDownload(
            canvasEl.toDataURL("image/png", 1.0),
            getDownloadFilename()
          );
        }
      }
    } finally {
      setDownloadingMobile(false);
    }
  };

  const handleCopyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopiedFeedback(true);
        setTimeout(() => setCopiedFeedback(false), 2500);
      }, "image/png");
    } catch (err) {
      console.warn("Clipboard copy failed", err);
    }
  };

  const optionBtn = (active: boolean) =>
    `p-2.5 rounded-xl border text-center transition cursor-pointer ${
      active
        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
    }`;

  return (
    <div className="space-y-5">
      {/* ── TOP HERO HEADER & LEAGUE / MODE CONTROL ── */}
      <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">
                  Estudio de Artes para Redes
                </h2>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70">
                  PNG HD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Genera publicaciones oficiales para Instagram, WhatsApp y Twitter con escudos, marcadores y canales en alta definición.
              </p>
            </div>
          </div>

          {/* League Segmented Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 inline-flex shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setCardLeague("lvbp");
                setAwayCode("LAR");
                setHomeCode("ZUL");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                cardLeague === "lvbp"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🇻🇪 LVBP
            </button>
            <button
              type="button"
              onClick={() => {
                setCardLeague("mlb");
                setAwayCode("LAD");
                setHomeCode("NYY");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                cardLeague === "mlb"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⚾ MLB
            </button>
          </div>
        </div>

        {/* Template Mode Pills */}
        <div className="border-t border-slate-100 pt-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Tipo de Publicación
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "final_single", label: "Resultado Final", desc: "Pizarra de 1 juego" },
              { id: "preview_single", label: "Juego de Hoy", desc: "Previa, estadio y TV" },
              { id: "live_single", label: "En Vivo", desc: "Marcador en curso" },
              { id: "slate_all", label: "Jornada Completa", desc: "Todos los juegos del día" },
              { id: "standings", label: "Tabla Posiciones", desc: "Clasificación oficial" },
            ].map((item) => {
              const active = templateMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeChange(item.id as CardTemplateMode)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <div className="text-xs font-semibold flex items-center justify-between">
                    <span>{item.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN STUDIO WORKBENCH ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: STUDIO TOOLS (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Studio Tab Bar */}
          <div className="bg-slate-200/70 p-1 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setStudioTab("matchup")}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                studioTab === "matchup"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>1. Partido</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioTab("style")}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                studioTab === "style"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>2. Diseño</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioTab("sponsor")}
              className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                studioTab === "sponsor"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>3. Patrocinador</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              TAB 1: MATCHUP & SCORES (PARTIDO, MARCADOR, SEDE, TV)
             ───────────────────────────────────────────────────────────── */}
          {studioTab === "matchup" && (
            <div className="space-y-4">
              {/* Calendario & Selector de Partido */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-900">
                      Jornada en Calendario ({cardLeague.toUpperCase()})
                    </span>
                    {loadingGames && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Cargando…
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDate}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        setSelectedDate(nextDate);
                        const firstInDate = allGames.find((g) => g.date === nextDate);
                        if (firstInDate) selectGame(firstInDate);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-slate-900"
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

                    <button
                      type="button"
                      onClick={() => fetchSchedule(cardLeague)}
                      className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
                      title="Refrescar partidos desde MLB StatsAPI"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingGames ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {gamesForDate.length > 0 ? (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Cargar datos con 1 clic:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {gamesForDate.map((g) => {
                        const isSelected = selectedGameId === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => selectGame(g)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                            }`}
                          >
                            <span>{g.awayTeam.code}</span>
                            <span className="mx-1 text-slate-400">vs</span>
                            <span>{g.homeTeam.code}</span>
                            {(g.awayScore !== undefined || g.homeScore !== undefined) && (
                              <span className={`ml-1.5 font-bold tabular-nums ${isSelected ? "text-rose-300" : "text-rose-600"}`}>
                                {g.awayScore ?? 0}-{g.homeScore ?? 0}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-100">
                    No hay juegos en la fecha seleccionada. Puedes editar los equipos manualmente abajo.
                  </p>
                )}
              </div>

              {/* Matchup Scoreboard Box (Single Game) */}
              {templateMode !== "slate_all" ? (
                <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                    {/* Left: Away Team */}
                    <div className="md:col-span-5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Visitante (Izquierda)
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-700">
                          {awayCode}
                        </span>
                      </div>
                      <select
                        value={awayCode}
                        onChange={(e) => setAwayCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs focus:outline-none focus:border-slate-900"
                      >
                        {activeTeamList.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name} ({t.code})
                          </option>
                        ))}
                      </select>

                      {/* Away Score Stepper */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-medium text-slate-600">Carreras:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAwayScore((s) => Math.max(0, s - 1))}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={awayScore}
                            onChange={(e) => setAwayScore(Math.max(0, Number(e.target.value) || 0))}
                            className="w-12 h-7 rounded-lg border border-slate-200 bg-white text-center font-bold text-sm text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setAwayScore((s) => s + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Center: Status Pill */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        VS
                      </span>
                      <input
                        type="text"
                        value={statusPillText}
                        onChange={(e) => setStatusPillText(e.target.value)}
                        placeholder="FINAL"
                        className="w-20 mt-1 px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-center text-slate-800 uppercase focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    {/* Right: Home Team */}
                    <div className="md:col-span-5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Home Club (Derecha)
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-700">
                          {homeCode}
                        </span>
                      </div>
                      <select
                        value={homeCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setHomeCode(code);
                          const meta = ALL_TEAMS[code];
                          if (meta) {
                            setVenueText(`${meta.venue} · ${meta.venueCity}`);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-2xs focus:outline-none focus:border-slate-900"
                      >
                        {activeTeamList.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.name} ({t.code})
                          </option>
                        ))}
                      </select>

                      {/* Home Score Stepper */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-medium text-slate-600">Carreras:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setHomeScore((s) => Math.max(0, s - 1))}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={homeScore}
                            onChange={(e) => setHomeScore(Math.max(0, Number(e.target.value) || 0))}
                            className="w-12 h-7 rounded-lg border border-slate-200 bg-white text-center font-bold text-sm text-slate-900 tabular-nums focus:outline-none focus:border-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setHomeScore((s) => s + 1)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Venue and Channels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Estadio y Ciudad</span>
                      </label>
                      <input
                        type="text"
                        value={venueText}
                        onChange={(e) => setVenueText(e.target.value)}
                        placeholder="Ej. Estadio Monumental Simón Bolívar · Caracas"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-slate-400" />
                        <span>Canales de TV</span>
                      </label>
                      <input
                        type="text"
                        value={tvChannelsText}
                        onChange={(e) => setTvChannelsText(e.target.value)}
                        placeholder="Ej. IVC · Televen · 1Baseball · BeisbolPlay"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Quick TV Channel Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Canales Rápidos (Haz clic para activar/quitar):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {VENEZUELA_TV_CHANNELS.map((ch) => {
                        const active = tvChannelsText
                          .toLowerCase()
                          .split(/[·,|/]/)
                          .map((s) => s.trim())
                          .includes(ch.toLowerCase());
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => toggleTvChannelChip(ch)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition cursor-pointer shadow-2xs ${
                              active
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                            }`}
                          >
                            {active ? `✓ ${ch}` : `+ ${ch}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Headline Words */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Palabra 1
                      </label>
                      <input
                        type="text"
                        value={headlineWord1}
                        onChange={(e) => setHeadlineWord1(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-rose-600 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Palabra 2
                      </label>
                      <input
                        type="text"
                        value={headlineWord2}
                        onChange={(e) => setHeadlineWord2(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Sello Centro 1
                      </label>
                      <input
                        type="text"
                        value={centerBadgeLine1}
                        onChange={(e) => setCenterBadgeLine1(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Sello Centro 2
                      </label>
                      <input
                        type="text"
                        value={centerBadgeLine2}
                        onChange={(e) => setCenterBadgeLine2(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Slate Full-Day Editor */
                <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Juegos de la Jornada ({gamesForDate.length} en fecha)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Personaliza marcadores, estado y transmisión
                    </span>
                  </div>
                  {gamesForDate.slice(0, 4).map((g) => {
                    const ov = slateOverrides[g.id] || {};
                    const homeMeta = ALL_TEAMS[g.homeTeam.code];
                    const valVenue =
                      ov.venue !== undefined
                        ? ov.venue
                        : g.venue || (homeMeta ? homeMeta.venue : "");
                    const valTv =
                      ov.tv !== undefined
                        ? ov.tv
                        : g.tvChannels && g.tvChannels.length > 0
                          ? g.tvChannels.join(" · ")
                          : g.tv || "BeisbolPlay";
                    const valTime = ov.time !== undefined ? ov.time : g.time || "7:00 PM";
                    const valStatus = (ov.status || g.status || "SCHEDULED") as "SCHEDULED" | "IN_PROGRESS" | "FINISHED";
                    const valAwayScore = ov.awayScore !== undefined ? ov.awayScore : g.awayScore;
                    const valHomeScore = ov.homeScore !== undefined ? ov.homeScore : g.homeScore;
                    const valInning = ov.inning !== undefined ? ov.inning : g.inning || (valStatus === "IN_PROGRESS" ? "EN VIVO" : "FINAL");

                    return (
                      <div
                        key={g.id}
                        className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                      >
                        {/* Header: Teams + Status Selector */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {g.awayTeam.name} <span className="font-mono text-slate-400 font-normal">vs</span> {g.homeTeam.name}
                            </span>
                          </div>

                          {/* Quick Status Buttons */}
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                            {[
                              { id: "SCHEDULED", label: "⏰ Programado" },
                              { id: "IN_PROGRESS", label: "🔴 En Vivo" },
                              { id: "FINISHED", label: "🏁 Final" },
                            ].map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() =>
                                  setSlateOverrides((prev) => ({
                                    ...prev,
                                    [g.id]: {
                                      ...prev[g.id],
                                      status: st.id as "SCHEDULED" | "IN_PROGRESS" | "FINISHED",
                                      inning:
                                        st.id === "IN_PROGRESS"
                                          ? prev[g.id]?.inning || g.inning || "EN VIVO"
                                          : st.id === "FINISHED"
                                          ? "FINAL"
                                          : prev[g.id]?.inning,
                                    },
                                  }))
                                }
                                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition cursor-pointer ${
                                  valStatus === st.id
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Scores & Inning (If In Progress or Finished) */}
                        {valStatus !== "SCHEDULED" && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/80">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                                {g.awayTeam.code} (Visitante)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSlateOverrides((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        ...prev[g.id],
                                        awayScore: Math.max(0, valAwayScore - 1),
                                      },
                                    }))
                                  }
                                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={valAwayScore}
                                  onChange={(e) =>
                                    setSlateOverrides((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        ...prev[g.id],
                                        awayScore: parseInt(e.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="w-12 text-center py-0.5 rounded border border-slate-200 text-xs font-mono font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSlateOverrides((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        ...prev[g.id],
                                        awayScore: valAwayScore + 1,
                                      },
                                    }))
                                  }
                                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                                {g.homeTeam.code} (Homeclub)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSlateOverrides((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        ...prev[g.id],
                                        homeScore: Math.max(0, valHomeScore - 1),
                                      },
                                    }))
                                  }
                                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={valHomeScore}
                                  onChange={(e) =>
                                    setSlateOverrides((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        ...prev[g.id],
                                        homeScore: parseInt(e.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="w-12 text-center py-0.5 rounded border border-slate-200 text-xs font-mono font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSlateOverrides((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        ...prev[g.id],
                                        homeScore: valHomeScore + 1,
                                      },
                                    }))
                                  }
                                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                                Inning / Estado
                              </label>
                              <input
                                type="text"
                                value={valInning}
                                placeholder="ej. ALTA 8°, FINAL"
                                onChange={(e) =>
                                  setSlateOverrides((prev) => ({
                                    ...prev,
                                    [g.id]: { ...prev[g.id], inning: e.target.value },
                                  }))
                                }
                                className="w-full px-2 py-0.5 rounded border border-slate-200 text-xs font-medium"
                              />
                            </div>
                          </div>
                        )}

                        {/* Stadium, TV, Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500">
                              Estadio
                            </label>
                            <input
                              type="text"
                              value={valVenue}
                              onChange={(e) =>
                                setSlateOverrides((prev) => ({
                                  ...prev,
                                  [g.id]: { ...prev[g.id], venue: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500">
                              Canales TV
                            </label>
                            <input
                              type="text"
                              value={valTv}
                              onChange={(e) =>
                                setSlateOverrides((prev) => ({
                                  ...prev,
                                  [g.id]: { ...prev[g.id], tv: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500">
                              Hora (Programado)
                            </label>
                            <input
                              type="text"
                              value={valTime}
                              onChange={(e) =>
                                setSlateOverrides((prev) => ({
                                  ...prev,
                                  [g.id]: { ...prev[g.id], time: e.target.value },
                                }))
                              }
                              className="w-full px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: STYLE & DESIGN (TAMAÑO, FONDO, ESCUDOS, TOGGLES)
             ───────────────────────────────────────────────────────────── */}
          {studioTab === "style" && (
            <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              {/* Formato y Tamaño */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Tamaño de Descarga
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "post_4_5", label: "Post (4:5)", dim: "1080×1350", desc: "Instagram & Móvil" },
                    { id: "story_9_16", label: "Historia (9:16)", dim: "1080×1920", desc: "Stories / Estados" },
                    { id: "square_1_1", label: "Cuadrado (1:1)", dim: "1080×1080", desc: "Twitter / Web" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setSizeFormat(fmt.id as CardSizeFormat)}
                      className={optionBtn(sizeFormat === fmt.id)}
                    >
                      <div className="text-xs font-semibold">{fmt.label}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">{fmt.dim}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tema de Fondo */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tema de Fondo</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: "editorial_light",
                      label: "Editorial Claro",
                      sub: "Prensa limpia y nítida",
                      swatch: "linear-gradient(135deg,#ffffff,#e9e6e1)",
                    },
                    {
                      id: "stadium_night",
                      label: "Estadio Nocturno",
                      sub: "Azul medianoche profundo",
                      swatch: "linear-gradient(135deg,#0a0f1e,#1e2b55)",
                    },
                    {
                      id: "club_duel",
                      label: "Duelo de Clubes",
                      sub: "Colores de los equipos",
                      swatch: `linear-gradient(120deg,${
                        ALL_TEAMS[awayCode]?.color || "#b3161a"
                      } 50%,${ALL_TEAMS[homeCode]?.color || "#121734"} 50%)`,
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBackgroundTheme(t.id as BackgroundTheme)}
                      className={optionBtn(backgroundTheme === t.id)}
                    >
                      <div
                        className="h-6 w-full rounded-md mb-1.5 border border-black/10 shadow-2xs"
                        style={{ background: t.swatch }}
                      />
                      <div className="text-xs font-semibold">{t.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{t.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Estilo de los Escudos */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Tratamiento de los Escudos
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "floating_shield", label: "Escudo Flotante", sub: "Oficial con sombra 3D" },
                    { id: "pearl_medallion", label: "Medallón Perla", sub: "Base blanca perlada" },
                    { id: "mascot_color", label: "Mascota HD", sub: "Sobre color del club" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setMedallionStyle(st.id as MedallionStyleMode)}
                      className={optionBtn(medallionStyle === st.id)}
                    >
                      <div className="text-xs font-semibold">{st.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{st.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles Visuales */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLeagueLogo}
                    onChange={(e) => setShowLeagueLogo(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
                  />
                  <span>Incluir logo oficial {cardLeague === "mlb" ? "MLB" : "LVBP"} en la cabecera del arte</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVenueAndTv}
                    onChange={(e) => setShowVenueAndTv(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
                  />
                  <span>Mostrar cintillo de Estadio y Canales de TV</span>
                </label>

                {templateMode !== "slate_all" && (
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTeamNames}
                      onChange={(e) => setShowTeamNames(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
                    />
                    <span>Mostrar nombres de los equipos debajo del escudo</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: SPONSOR / "PRESENTADO POR"
             ───────────────────────────────────────────────────────────── */}
          {studioTab === "sponsor" && (
            <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Origen del Patrocinador
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "campaign", label: `Anunciante (${campaigns.length})`, desc: "Del panel admin" },
                    { id: "custom", label: "Logo Personalizado", desc: "Subir imagen PNG/JPG" },
                    { id: "none", label: "Sin Patrocinador", desc: "Arte limpio EnJuego" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSponsorMode(opt.id as "campaign" | "custom" | "none")}
                      className={optionBtn(sponsorMode === opt.id)}
                    >
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {sponsorMode !== "none" && (
                <>
                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                      Estilo de Presentación
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "floating", label: "Logo Limpio", sub: "Flotante sin caja" },
                        { id: "adaptive_card", label: "Tarjeta Ajustada", sub: "Tarjeta con fondo sutil" },
                        { id: "full_banner", label: "Banner Completo", sub: "Cintillo 970×90 en base" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSponsorLayout(opt.id as SponsorDisplayLayout)}
                          className={optionBtn(sponsorLayout === opt.id)}
                        >
                          <div className="text-xs font-semibold">{opt.label}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {sponsorLayout !== "full_banner" && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={removeSponsorWhite}
                        onChange={(e) => setRemoveSponsorWhite(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
                      />
                      <span>Remover fondo blanco del logo automáticamente</span>
                    </label>
                  )}
                </>
              )}

              {sponsorMode === "campaign" && campaigns.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Seleccionar Anuncio del Panel
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 shadow-2xs focus:outline-none focus:border-slate-900"
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
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer transition shadow-2xs">
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
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
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
                      placeholder="Nombre alternativo"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: WORKBENCH CANVAS & ACTIONS (5 cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 sm:p-5 shadow-xl text-white space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-semibold text-slate-200">
                  Previsualización en Vivo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 tabular-nums">
                  {sizeFormat === "story_9_16"
                    ? "1080×1920 (9:16)"
                    : sizeFormat === "square_1_1"
                      ? "1080×1080 (1:1)"
                      : "1080×1350 (4:5)"}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Sincronizado" />
              </div>
            </div>

            {/* Workbench Viewport */}
            <div className="w-full rounded-lg overflow-hidden bg-slate-900/90 border border-slate-800/80 flex flex-col justify-center items-center p-3 relative min-h-[360px]">
              {rendering && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-10">
                  <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className={
                  previewDataUrl
                    ? "hidden"
                    : "w-full max-w-[340px] h-auto rounded-lg shadow-2xl ring-1 ring-white/10"
                }
              />
              {previewDataUrl && (
                <img
                  src={previewDataUrl}
                  alt="Arte Deportivo EnJuego"
                  className="w-full max-w-[340px] h-auto rounded-lg shadow-2xl ring-1 ring-white/10 select-auto transition-transform hover:scale-[1.01]"
                />
              )}
            </div>

            {/* Actions Bar */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={rendering || downloadingMobile}
                className="w-full py-3 px-4 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)" }}
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingMobile
                    ? "Generando archivo..."
                    : `Descargar PNG HD (${
                        sizeFormat === "story_9_16"
                          ? "1080×1920"
                          : sizeFormat === "square_1_1"
                            ? "1080×1080"
                            : "1080×1350"
                      })`}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Copiar imagen al portapapeles para pegar directo en WhatsApp Web o Twitter"
                >
                  {copiedFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Imagen</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareOrSaveMobile}
                  disabled={rendering || downloadingMobile}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
