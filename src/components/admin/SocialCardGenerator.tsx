"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Download,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Share2,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { MLB_TEAMS } from "@/lib/mlb-teams";
import type { ScheduleGame } from "@/lib/types";
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
  const [slateOverrides, setSlateOverrides] = useState<
    Record<string, { venue?: string; tv?: string; time?: string }>
  >({});

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-600" />
                  <span>Generador de Artes Deportivos (PNG HD)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea y descarga artes de <strong>LVBP</strong> o <strong>MLB</strong> con escudos oficiales, estadio y canales de TV.
                </p>
              </div>

              {/* Liga LVBP / MLB selector */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setCardLeague("lvbp");
                    setAwayCode("LAR");
                    setHomeCode("ZUL");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    cardLeague === "lvbp"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-950"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    cardLeague === "mlb"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  ⚾ MLB
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">
                1. Tipo de Arte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "final_single", label: "Resultado Final", sub: "1 Juego (Ej. 8 - 5)" },
                  { id: "preview_single", label: "Juego de Hoy", sub: "Previa, Estadio y TV" },
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
              <div className="pt-2.5 flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLeagueLogo}
                    onChange={(e) => setShowLeagueLogo(e.target.checked)}
                    className="w-4 h-4 rounded accent-rose-600"
                  />
                  <img
                    src={cardLeague === "mlb" ? "/logos/mlb.svg" : "/logos/lvbp-official.png"}
                    alt={cardLeague.toUpperCase()}
                    className="w-5 h-5 object-contain"
                  />
                  <span>Incluir logo oficial {cardLeague === "mlb" ? "MLB" : "LVBP"} en el banner</span>
                </label>
              </div>
            </div>
          </section>

          {/* 2. GAME, STADIUM & TV CHANNELS */}
          <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <span>3. Partido, Estadio y Canales de TV ({cardLeague.toUpperCase()})</span>
              </h3>
              <button
                type="button"
                onClick={() => fetchSchedule(cardLeague)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGames ? "animate-spin" : ""}`} />
                <span>Cargar calendario {cardLeague.toUpperCase()}</span>
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

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVenueAndTv}
                  onChange={(e) => setShowVenueAndTv(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Mostrar Estadio y Canales de TV en el arte</span>
              </label>

              {templateMode !== "slate_all" && (
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTeamNames}
                    onChange={(e) => setShowTeamNames(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Mostrar nombres de equipos</span>
                </label>
              )}
            </div>

            {templateMode !== "slate_all" ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
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
                      {activeTeamList.map((t) => (
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
                      Centro / Hora
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
                      Equipo Home Club (Derecha)
                    </label>
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                    >
                      {activeTeamList.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      📍 Estadio (Sede del Juego)
                    </label>
                    <input
                      type="text"
                      value={venueText}
                      onChange={(e) => setVenueText(e.target.value)}
                      placeholder="Ej. Estadio Monumental Simón Bolívar · Caracas"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* TV CHANNELS INPUT + QUICK PICK CHIPS */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[11px] font-bold text-slate-600">
                      📺 Canales que transmiten el juego (haz clic para activar/quitar)
                    </label>
                  </div>

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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                            active
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          {active ? `✓ ${ch}` : `+ ${ch}`}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={tvChannelsText}
                    onChange={(e) => setTvChannelsText(e.target.value)}
                    placeholder="Ej. IVC · Televen · 1Baseball · BeisbolPlay"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            ) : (
              /* SLATE PER-GAME VENUE & TV EDITOR */
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-extrabold uppercase text-slate-600">
                  Editar Estadio, Hora y TV de cada partido de la jornada
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

                  return (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 space-y-2"
                    >
                      <div className="text-xs font-black text-slate-900">
                        {g.awayTeam.name} ({g.awayTeam.code}) vs {g.homeTeam.name} (
                        {g.homeTeam.code})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            📍 Estadio
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
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            📺 Canales de TV
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
                            placeholder="Ej. IVC · Televen"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500">
                            🕒 Hora
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
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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

            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex flex-col justify-center items-center p-2">
              <canvas
                ref={canvasRef}
                className={
                  previewDataUrl
                    ? "hidden"
                    : "w-full max-w-[380px] h-auto rounded-lg shadow-md"
                }
              />
              {previewDataUrl && (
                <img
                  src={previewDataUrl}
                  alt="Arte Deportivo EnJuego"
                  className="w-full max-w-[380px] h-auto rounded-lg shadow-md select-auto"
                />
              )}
              <p className="text-[11px] text-slate-500 font-semibold mt-2 text-center sm:hidden">
                💡 También puedes mantener presionada la imagen para guardarla en Fotos
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={rendering || downloadingMobile}
                className="w-full py-3.5 px-5 rounded-xl text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)" }}
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingMobile
                    ? "Preparando PNG..."
                    : "Descargar Arte en PNG (Alta Calidad)"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShareOrSaveMobile}
                disabled={rendering || downloadingMobile}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 disabled:opacity-60 sm:hidden"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Guardar en Fotos / Compartir (WhatsApp · IG)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
