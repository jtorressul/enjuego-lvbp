"use client";

import React, { useState } from "react";
import { Tv, ExternalLink, Info, X, Play, Eye } from "lucide-react";
import { getChannelInfo, openOfficialBroadcast, BroadcastChannelInfo } from "@/lib/official-broadcast-links";

interface BroadcastChannelsRowProps {
  channels: string[];
  gameTitle?: string;
  youtubeVideoId?: string;
  className?: string;
  badgeSize?: "sm" | "md";
}

export function BroadcastChannelsRow({
  channels,
  gameTitle,
  youtubeVideoId,
  className = "",
  badgeSize = "sm",
}: BroadcastChannelsRowProps) {
  const [selectedCableChannel, setSelectedCableChannel] = useState<BroadcastChannelInfo | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedCableChannel && !selectedVideoId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCableChannel(null);
        setSelectedVideoId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCableChannel, selectedVideoId]);

  if (!channels || channels.length === 0) return null;

  const handleChannelClick = (e: React.MouseEvent, ch: string) => {
    e.stopPropagation();
    const info = getChannelInfo(ch);

    // If clicking TVES or OK.ru, open direct live stream in new tab
    if (ch.toLowerCase().includes("ok.ru") || ch.toLowerCase().includes("ok ru") || ch.toLowerCase().includes("tves")) {
      window.open("https://ok.ru/video/14909080673812", "_blank", "noopener,noreferrer");
      return;
    }

    // If clicking YouTube, open inline video player directly in the web (NO PiP popup)
    if (ch.toLowerCase().includes("youtube")) {
      const vId =
        youtubeVideoId ||
        (gameTitle?.toLowerCase().includes("magallanes") || gameTitle?.toLowerCase().includes("cardenales")
          ? "JpQMLHvmpB4"
          : "JpQMLHvmpB4");
      if (vId) {
        setSelectedVideoId(vId);
        return;
      }
    }

    if (info.type === "cable_network" && info.dialInfo) {
      // Show cable dial modal
      setSelectedCableChannel(info);
    } else if (info.isOpenTv) {
      // Open TV channel
      openOfficialBroadcast(ch, gameTitle, "pip");
    } else {
      openOfficialBroadcast(ch, gameTitle, "popout");
    }
  };

  const getStyleForChannel = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes("venevisión") || norm.includes("venevision")) {
      return "bg-blue-600/10 text-blue-700 hover:bg-blue-600 hover:text-white border-blue-200";
    }
    if (norm.includes("televen")) {
      return "bg-red-600/10 text-red-700 hover:bg-red-600 hover:text-white border-red-200";
    }
    if (norm.includes("ivc")) {
      return "bg-teal-600/10 text-teal-700 hover:bg-teal-600 hover:text-white border-teal-200";
    }
    if (norm.includes("bym")) {
      return "bg-purple-600/10 text-purple-700 hover:bg-purple-600 hover:text-white border-purple-200";
    }
    if (norm.includes("beisbolplay")) {
      return "bg-amber-500/15 text-amber-900 hover:bg-amber-500 hover:text-slate-950 border-amber-300 font-black";
    }
    if (norm.includes("ok.ru") || norm.includes("ok ru")) {
      return "bg-orange-600/15 text-orange-800 hover:bg-orange-600 hover:text-white border-orange-300 font-black";
    }
    if (norm.includes("youtube")) {
      return "bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white border-red-300";
    }
    if (norm.includes("meridiano")) {
      return "bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200";
    }
    if (norm.includes("tves") || norm.includes("teves")) {
      return "bg-rose-600/10 text-rose-700 hover:bg-rose-600 hover:text-white border-rose-200";
    }
    if (norm.includes("vtv")) {
      return "bg-slate-700/10 text-slate-800 hover:bg-slate-800 hover:text-white border-slate-300";
    }
    if (norm.includes("canal i") || norm.includes("canali")) {
      return "bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600 hover:text-white border-indigo-200";
    }
    if (norm.includes("tlt")) {
      return "bg-violet-600/10 text-violet-700 hover:bg-violet-600 hover:text-white border-violet-200";
    }
    if (norm.includes("1baseball")) {
      return "bg-sky-600/10 text-sky-700 hover:bg-sky-600 hover:text-white border-sky-200";
    }
    return "bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white border-slate-200";
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 mr-0.5">
          <Tv className="w-3 h-3 text-amber-600 shrink-0" /> TV:
        </span>

        {channels.map((ch) => {
          const info = getChannelInfo(ch);
          const isOpenTv = info.isOpenTv;
          const isCable = info.type === "cable_network";

          return (
            <button
              key={ch}
              type="button"
              onClick={(e) => handleChannelClick(e, ch)}
              title={
                isOpenTv
                  ? `${info.name} (Señal abierta nacional) · Clic para ver transmisión en vivo en ventanita PiP`
                  : isCable
                  ? `${info.name} (Por suscripción / cable) · Clic para ver diales en operadoras`
                  : `${info.description} · Clic para abrir`
              }
              className={`inline-flex items-center gap-1 rounded-md border font-extrabold transition cursor-pointer select-none ${getStyleForChannel(
                ch
              )} ${
                badgeSize === "md"
                  ? "px-2.5 py-1 text-xs shadow-2xs"
                  : "px-2 py-0.5 text-[10px]"
              }`}
            >
              <span>{ch}</span>
              {isOpenTv ? (
                <Play className="w-2.5 h-2.5 fill-current shrink-0" />
              ) : isCable ? (
                <Info className="w-2.5 h-2.5 opacity-60 shrink-0" />
              ) : (
                <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Cable Dial Info Modal */}
      {selectedCableChannel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedCableChannel(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 text-slate-900 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Tv className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950 leading-tight">
                    {selectedCableChannel.name}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Televisión por Suscripción
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCableChannel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed font-medium">
                {selectedCableChannel.description}
              </p>

              {selectedCableChannel.dialInfo && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Guía de Canales (Diales en Venezuela):
                  </span>
                  <div className="font-extrabold text-slate-900 text-xs">
                    {selectedCableChannel.dialInfo}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCableChannel(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cerrar
                </button>
                {selectedCableChannel.officialUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      openOfficialBroadcast(selectedCableChannel.name, gameTitle, "popout");
                      setSelectedCableChannel(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-2xs"
                  >
                    <span>Sitio Oficial</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline YouTube Stream Modal (Sin PiP, embebido directo en la web) */}
      {selectedVideoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedVideoId(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-red-500">
                  Transmisión en Vivo
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800 text-[10px] font-black text-red-300">
                  <Eye className="w-3 h-3 text-red-400" />
                  <span>En vivo en la web</span>
                </span>
                {gameTitle && (
                  <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                    · {gameTitle}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedVideoId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar video"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selectedVideoId}?autoplay=1&rel=0`}
                title={gameTitle || "Transmisión en Vivo"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-3 bg-slate-950 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Reproduciendo directamente en la web sin popups ni PiP.
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${selectedVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white"
              >
                <span>Abrir en YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

