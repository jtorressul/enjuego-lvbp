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
  Trophy,
  X,
} from "lucide-react";
import type { StandingRow } from "@/lib/types";
import {
  renderSocialCard,
  type BackgroundTheme,
  type CardSizeFormat,
} from "@/lib/social-card-renderer";
import type { LeagueId } from "@/lib/leagues";

interface ShareStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  standings: StandingRow[];
  league?: LeagueId;
}

export function ShareStandingsModal({
  isOpen,
  onClose,
  standings,
  league = "lvbp",
}: ShareStandingsModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderVersionRef = useRef(0);

  const [sizeFormat, setSizeFormat] = useState<CardSizeFormat>("post_4_5");
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>("stadium_night");
  const [rendering, setRendering] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const leagueTitle =
    league === "mlb"
      ? "Grandes Ligas (MLB)"
      : league === "lidom"
      ? "LIDOM Rep. Dominicana"
      : league === "lmp"
      ? "LMP Liga ARCO Mexicana"
      : "LVBP Béisbol Venezolano";
  const sharePath = league === "lvbp" ? "/posiciones" : `/posiciones/${league}`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : `https://enjuego.online${sharePath}`;
  const shareCaption = `📊 ¡Así marcha la Tabla de Posiciones de la ${league.toUpperCase()}! ⚾🔥 Sigue cada jugada en vivo y transmisiones oficiales en ${shareUrl}`;

  // Render social card to offscreen canvas and copy to preview
  const handleRender = useCallback(async () => {
    const version = ++renderVersionRef.current;
    setRendering(true);

    try {
      const offscreen = await renderSocialCard(
        {
          sizeFormat,
          backgroundTheme,
          medallionStyle: "floating_shield",
          showTeamNames: true,
          showVenueAndTv: true,
          headlineWord1: "TABLA DE",
          headlineWord2: "POSICIONES",
          templateMode: "standings",
          awayCode: "CAR",
          homeCode: "MAG",
          awayScore: 0,
          homeScore: 0,
          statusPillText: league === "mlb" ? "MLB 2026" : "TEMPORADA REGULAR",
          venueText: "",
          tvChannelsText: "",
          subInfoText: "LVBP · TEMPORADA 2026-2027",
          gamesForDate: [],
          slateOverrides: {},
          centerBadgeLine1: "",
          centerBadgeLine2: "",
          sponsorMode: "none",
          sponsorLayout: "floating",
          removeSponsorWhite: true,
          activeSponsorImageUrl: "",
          activeSponsorLabel: "",
          league,
          showLeagueLogo: true,
          standingsData: standings,
        },
        () => version !== renderVersionRef.current
      );

      if (version !== renderVersionRef.current || !offscreen) return;

      const display = canvasRef.current;
      if (display) {
        display.width = offscreen.width;
        display.height = offscreen.height;
        const ctx = display.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, display.width, display.height);
          ctx.drawImage(offscreen, 0, 0);
        }
      }

      setPreviewDataUrl(offscreen.toDataURL("image/png"));
    } catch (err) {
      console.error("[ShareStandingsModal] Render error:", err);
    } finally {
      if (version === renderVersionRef.current) {
        setRendering(false);
      }
    }
  }, [sizeFormat, backgroundTheme, standings, league]);

  useEffect(() => {
    if (isOpen) {
      handleRender();
    }
  }, [isOpen, handleRender]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!previewDataUrl || downloading) return;
    setDownloading(true);

    try {
      const filename = `tabla-posiciones-${league}-${sizeFormat}.png`;
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
        const a = document.createElement("a");
        a.href = previewDataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  const handleNativeShare = async () => {
    try {
      if (previewDataUrl && navigator.share && navigator.canShare) {
        const res = await fetch(previewDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `posiciones-${league}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Tabla de Posiciones ${leagueTitle}`,
            text: shareCaption,
            files: [file],
          });
          return;
        }
      }
    } catch {}

    // Fallback to Web Share or WhatsApp
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tabla de Posiciones ${leagueTitle}`,
          text: shareCaption,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    handleWhatsAppShare();
  };

  const handleWhatsAppShare = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareCaption)}`,
      "_blank",
      "noopener"
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

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
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-2xs shrink-0">
              <Trophy className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate leading-tight">
                Compartir Tabla de Posiciones
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Arte oficial {league.toUpperCase()} para redes sociales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Format & Theme Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Format (4:5 Post vs 9:16 Story) */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" /> Formato:
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  ["post_4_5", "Post 4:5"],
                  ["story_9_16", "Historia"],
                  ["square_1_1", "1:1"],
                ].map(([fKey, fLabel]) => (
                  <button
                    key={fKey}
                    type="button"
                    onClick={() => setSizeFormat(fKey as CardSizeFormat)}
                    className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      sizeFormat === fKey
                        ? "bg-amber-400 text-slate-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {fLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme (Night vs Light) */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-600" /> Estilo:
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  ["stadium_night", "Oscuro Pro"],
                  ["editorial_light", "Claro Limpio"],
                ].map(([tKey, tLabel]) => (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setBackgroundTheme(tKey as BackgroundTheme)}
                    className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      backgroundTheme === tKey
                        ? "bg-amber-400 text-slate-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {tLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas Preview Container */}
          <div className="relative rounded-2xl border border-slate-200 bg-slate-950/90 p-2 sm:p-3 overflow-hidden flex items-center justify-center min-h-[300px] shadow-inner">
            {rendering && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 text-white">
                <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                <span className="text-xs font-black tracking-wide">Generando arte oficial…</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="max-h-[340px] sm:max-h-[400px] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black transition cursor-pointer shadow-xs active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir en Redes</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{downloading ? "Descargando…" : "Descargar Imagen"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Copiar enlace de la tabla de posiciones"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Copiado!</span>
              </>
            ) : (
              <span>Copiar Enlace</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
