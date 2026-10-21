"use client";

import React, { useState } from "react";
import type { SoccerMatch } from "@/lib/soccer-service";
import { X, Calendar, MapPin, Clock, Share2, Check, Trophy, ExternalLink } from "lucide-react";

interface SoccerMatchModalProps {
  match: SoccerMatch | null;
  onClose: () => void;
  onViewStandings?: () => void;
}

export function SoccerMatchModal({
  match,
  onClose,
  onViewStandings,
}: SoccerMatchModalProps) {
  const [copied, setCopied] = useState(false);

  if (!match) return null;

  const isLive = match.status === "IN_PROGRESS";
  const isFinished = match.status === "FINISHED";
  const isScheduled = match.status === "SCHEDULED";

  const handleShare = () => {
    const text = isFinished
      ? `⚽ ${match.leagueName}: ${match.awayTeam.name} ${match.awayTeam.score ?? 0} - ${match.homeTeam.score ?? 0} ${match.homeTeam.name} (Final). Sigue el fútbol europeo en https://enjuego.online/futbol?liga=${match.leagueId}`
      : isLive
      ? `⚽ EN VIVO: ${match.awayTeam.name} ${match.awayTeam.score ?? 0} - ${match.homeTeam.score ?? 0} ${match.homeTeam.name} (${match.statusText}). Sigue el minuto a minuto en https://enjuego.online/futbol?liga=${match.leagueId}`
      : `⚽ ${match.leagueName}: ${match.awayTeam.name} vs ${match.homeTeam.name} · ${match.dateCaracas} a las ${match.timeCaracas} (Hora Caracas). Míralo en https://enjuego.online/futbol?liga=${match.leagueId}`;

    if (navigator.share) {
      navigator.share({ title: `${match.awayTeam.shortName} vs ${match.homeTeam.shortName}`, text, url: `https://enjuego.online/futbol?liga=${match.leagueId}` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 truncate">
              {match.leagueName}
            </span>
            <span className="text-slate-500">•</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                isLive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                  : isFinished
                  ? "bg-slate-800 text-slate-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {match.statusText}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Main Teams & Score Display */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 flex items-center justify-between gap-4">
            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-2 shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm sm:text-base font-black text-slate-900 mt-2 line-clamp-2 leading-tight">
                {match.awayTeam.name}
              </span>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5">Visitante</span>
            </div>

            {/* Score / Status Pill */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2">
              {isFinished || isLive ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xl sm:text-4xl font-black px-3.5 py-1.5 rounded-2xl tabular-nums shadow-xs ${
                      match.awayTeam.score !== undefined &&
                      match.homeTeam.score !== undefined &&
                      match.awayTeam.score > match.homeTeam.score
                        ? "bg-slate-950 text-white"
                        : "bg-white text-slate-900 border border-slate-200"
                    }`}
                  >
                    {match.awayTeam.score ?? 0}
                  </span>
                  <span className="text-xl font-bold text-slate-400">:</span>
                  <span
                    className={`text-2xl sm:text-4xl font-black px-3.5 py-1.5 rounded-2xl tabular-nums shadow-xs ${
                      match.awayTeam.score !== undefined &&
                      match.homeTeam.score !== undefined &&
                      match.homeTeam.score > match.awayTeam.score
                        ? "bg-slate-950 text-white"
                        : "bg-white text-slate-900 border border-slate-200"
                    }`}
                  >
                    {match.homeTeam.score ?? 0}
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs mb-1">
                    VS
                  </span>
                  <span className="block text-sm font-black text-slate-800">
                    {match.timeCaracas}
                  </span>
                </div>
              )}

              <span className="text-[11px] font-bold text-slate-500 mt-2">
                {isFinished ? "Resultado Final" : isLive ? "En Disputa" : "Hora Oficial Vzla"}
              </span>
            </div>

            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-2 shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm sm:text-base font-black text-slate-900 mt-2 line-clamp-2 leading-tight">
                {match.homeTeam.name}
              </span>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5">Local</span>
            </div>
          </div>

          {/* Match Details List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Hora en Caracas:</span>
              </span>
              <span className="font-black text-slate-900">{match.timeCaracas} (Vzla)</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-bold text-slate-500">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Fecha del partido:</span>
              </span>
              <span className="font-black text-slate-900">{match.dateCaracas}</span>
            </div>

            {match.venue && (
              <div className="flex items-center justify-between text-slate-600 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5 font-bold text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Estadio / Sede:</span>
                </span>
                <span className="font-black text-slate-900 text-right max-w-[220px] truncate">
                  {match.venue}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleShare}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer select-none active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Copiado para WhatsApp!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Compartir por WhatsApp</span>
                </>
              )}
            </button>

            {onViewStandings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewStandings();
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Ver Clasificación</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
