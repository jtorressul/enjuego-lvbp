"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  Image as ImageIcon,
  MessageCircle,
  Palette,
  RefreshCw,
  Share2,
  X,
} from "lucide-react";
import type { ScheduleGame } from "@/lib/types";
import { MLB_TEAMS } from "@/lib/mlb-teams";
import { LeagueId, leagueOfTeamCode } from "@/lib/leagues";
import {
  ALL_TEAMS,
  renderSocialCard,
  type BackgroundTheme,
  type CardSizeFormat,
  type CardTemplateMode,
} from "@/lib/social-card-renderer";

interface ShareGameBannerModalProps {
  game: ScheduleGame | null;
  onClose: () => void;
}

export function ShareGameBannerModal({ game, onClose }: ShareGameBannerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVersionRef = useRef(0);

  const [sizeFormat, setSizeFormat] = useState<CardSizeFormat>("post_4_5");
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>("stadium_night");
  const [rendering, setRendering] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const detectedLeague: LeagueId =
    game ? leagueOfTeamCode(game.awayTeam.code || game.homeTeam.code) : "lvbp";

  const templateMode: CardTemplateMode =
    !game || game.status === "SCHEDULED"
      ? "preview_single"
      : game.status === "IN_PROGRESS"
        ? "live_single"
        : "final_single";

  const headlineWord1 =
    templateMode === "preview_single"
      ? "JUEGO"
      : templateMode === "live_single"
        ? "EN"
        : "RESULTADO";

  const headlineWord2 =
    templateMode === "preview_single"
      ? "DE HOY"
      : templateMode === "live_single"
        ? "VIVO"
        : "FINAL";

  const resolveInningPill = (inning?: string) => {
    if (!inning || !inning.trim()) return "EN VIVO";
    const clean = inning.trim();
    if (
      /^in\s*progress/i.test(clean) ||
      /^in_progress/i.test(clean) ||
      /^live/i.test(clean)
    ) {
      return "EN VIVO";
    }
    if (/^final/i.test(clean)) return "FINAL";
    return clean.toUpperCase();
  };

  const statusPillText = !game
    ? "HOY"
    : templateMode === "preview_single"
      ? game.time || "7:00 PM"
      : templateMode === "live_single"
        ? resolveInningPill(game.inning)
        : "FINAL";

  const renderBanner = useCallback(async () => {
    if (!game) return;
    const version = ++renderVersionRef.current;
    setRendering(true);

    try {
      const homeMeta = ALL_TEAMS[game.homeTeam.code];
      const venueText =
        game.venue || (homeMeta ? `${homeMeta.venue} · ${homeMeta.venueCity}` : "");
      const tvChannelsText =
        game.tvChannels && game.tvChannels.length > 0
          ? game.tvChannels.join(" · ")
          : game.tv || (detectedLeague === "mlb" ? "ESPN · MLB.TV" : "IVC · Televen · BeisbolPlay");

      const subInfoText =
        game.status === "FINISHED" && game.decisions?.winner
          ? `PG: ${game.decisions.winner}${game.decisions.loser ? ` · PP: ${game.decisions.loser}` : ""}${game.decisions.save ? ` · S: ${game.decisions.save}` : ""}`
          : "";

      const offscreen = await renderSocialCard(
        {
          sizeFormat,
          backgroundTheme,
          medallionStyle: "floating_shield",
          showTeamNames: true,
          showVenueAndTv: true,
          headlineWord1,
          headlineWord2,
          templateMode,
          awayCode: game.awayTeam.code,
          homeCode: game.homeTeam.code,
          awayScore: game.awayScore || 0,
          homeScore: game.homeScore || 0,
          statusPillText,
          venueText,
          tvChannelsText,
          subInfoText,
          gamesForDate: [game],
          slateOverrides: {},
          centerBadgeLine1: "",
          centerBadgeLine2: "",
          sponsorMode: "none",
          sponsorLayout: "floating",
          removeSponsorWhite: true,
          activeSponsorImageUrl: "",
          activeSponsorLabel: "",
          league: detectedLeague,
          showLeagueLogo: true,
        },
        () => version !== renderVersionRef.current
      );

      if (!offscreen || version !== renderVersionRef.current) return;

      const visibleCanvas = canvasRef.current;
      if (visibleCanvas) {
        visibleCanvas.width = offscreen.width;
        visibleCanvas.height = offscreen.height;
        const ctx = visibleCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, offscreen.width, offscreen.height);
          ctx.drawImage(offscreen, 0, 0);
        }
      }

      try {
        setPreviewDataUrl(offscreen.toDataURL("image/png", 1.0));
      } catch {
        // ignore if tainted
      }
    } finally {
      if (version === renderVersionRef.current) {
        setRendering(false);
      }
    }
  }, [
    game,
    sizeFormat,
    backgroundTheme,
    templateMode,
    headlineWord1,
    headlineWord2,
    statusPillText,
    detectedLeague,
  ]);

  useEffect(() => {
    renderBanner();
  }, [renderBanner]);

  if (!game) return null;

  const gameUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/juego/${game.id}`
      : `https://enjuego.online/juego/${game.id}`;

  const shareCaption =
    game.status === "SCHEDULED"
      ? `⚾ Juego de Hoy (${detectedLeague.toUpperCase()}): ${game.awayTeam.nick} vs ${game.homeTeam.nick} (${game.time}) | Síguelo en vivo: ${gameUrl}`
      : game.status === "IN_PROGRESS"
        ? `🔴 EN VIVO (${detectedLeague.toUpperCase()}): ${game.awayTeam.nick} ${game.awayScore} - ${game.homeScore} ${game.homeTeam.nick} (${game.inning}) | Jugada a jugada: ${gameUrl}`
        : `🏁 Resultado Final (${detectedLeague.toUpperCase()}): ${game.awayTeam.nick} ${game.awayScore} - ${game.homeScore} ${game.homeTeam.nick} | Box Score y detalles: ${gameUrl}`;

  const filename = `enjuego-${detectedLeague}-${game.awayTeam.code.toLowerCase()}-vs-${game.homeTeam.code.toLowerCase()}-${sizeFormat}.png`;

  const handleNativeShareImage = async () => {
    if (!previewDataUrl) return;
    try {
      const res = await fetch(previewDataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${game.awayTeam.nick} vs ${game.homeTeam.nick} · En Juego`,
          text: shareCaption,
          files: [file],
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${game.awayTeam.nick} vs ${game.homeTeam.nick} · En Juego`,
          text: shareCaption,
          url: gameUrl,
        });
        return;
      }

      // Desktop fallback: download image
      await handleDownloadImage();
    } catch {
      // user cancelled or unsupported
    }
  };

  const handleDownloadImage = async () => {
    if (!previewDataUrl) return;
    setDownloading(true);
    try {
      try {
        const res = await fetch(previewDataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
      } catch {
        // Fallback to server attachment form
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "/api/admin/download-card";
        form.style.display = "none";

        const inputData = document.createElement("input");
        inputData.type = "hidden";
        inputData.name = "dataUrl";
        inputData.value = previewDataUrl;
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
      }
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  const handleWhatsAppShareText = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareCaption)}`,
      "_blank",
      "noopener"
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const stateBadgeLabel =
    templateMode === "preview_single"
      ? "Banner de Previa · Juego de Hoy"
      : templateMode === "live_single"
        ? "Banner En Vivo · Pizarra Actual"
        : "Banner Oficial · Resultado Final";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-900 max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={detectedLeague === "mlb" ? "/logos/mlb-dark.svg" : "/logos/lvbp-official-white.png"}
              alt={detectedLeague.toUpperCase()}
              className="w-6 h-6 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black truncate">
                Compartir Banner · {game.awayTeam.nick} vs {game.homeTeam.nick}
              </div>
              <div className="text-[10px] text-amber-400 font-bold truncate">
                {stateBadgeLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Quick Format & Theme Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              {(
                [
                  ["post_4_5", "Post (4:5)"],
                  ["story_9_16", "Historia (9:16)"],
                  ["square_1_1", "1:1"],
                ] as const
              ).map(([fmt, label]) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSizeFormat(fmt)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    sizeFormat === fmt
                      ? "bg-amber-400 text-slate-950 shadow-2xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              {(
                [
                  ["stadium_night", "Nocturno"],
                  ["editorial_light", "Claro"],
                  ["club_duel", "Duelo"],
                ] as const
              ).map(([th, label]) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setBackgroundTheme(th)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                    backgroundTheme === th
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Palette className="w-3 h-3 opacity-75" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Canvas / Image Preview */}
          <div className="relative rounded-2xl bg-slate-900/95 border border-slate-200 p-3 flex items-center justify-center min-h-[280px]">
            <canvas ref={canvasRef} className="hidden" />
            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt={`Banner ${game.awayTeam.nick} vs ${game.homeTeam.nick}`}
                className="max-h-[46dvh] w-auto object-contain rounded-xl shadow-lg select-auto"
              />
            ) : (
              <div className="py-16 flex flex-col items-center gap-2 text-slate-300 text-xs font-bold">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>Generando banner oficial del partido...</span>
              </div>
            )}
            {rendering && previewDataUrl && (
              <div className="absolute top-3 right-3 bg-slate-950/80 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Actualizando...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!previewDataUrl || rendering}
              onClick={handleNativeShareImage}
              className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir Imagen del Juego</span>
            </button>

            <button
              type="button"
              disabled={!previewDataUrl || downloading}
              onClick={handleDownloadImage}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{downloading ? "Descargando..." : "Descargar PNG HD"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleWhatsAppShareText}
            className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
            <span>Enviar marcador y link por WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
