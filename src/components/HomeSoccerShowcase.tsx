"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SOCCER_LEAGUES, SOCCER_LEAGUES_LIST, type SoccerLeagueId } from "@/lib/soccer-leagues";
import type { SoccerMatch } from "@/lib/soccer-service";
import { SoccerMatchModal } from "@/components/SoccerMatchModal";
import { Clock, Trophy, ChevronRight, Activity, Calendar } from "lucide-react";

export function HomeSoccerShowcase() {
  const [selectedLeague, setSelectedLeague] = useState<SoccerLeagueId>("uefa.champions");
  const [matches, setMatches] = useState<SoccerMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<SoccerMatch | null>(null);

  const currentLeague = SOCCER_LEAGUES[selectedLeague] || SOCCER_LEAGUES["uefa.champions"];

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(`/api/soccer/scoreboard?league=${selectedLeague}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isCancelled && Array.isArray(data?.matches)) {
          setMatches(data.matches);
        }
      })
      .catch((err) => {
        console.error("[HomeSoccerShowcase] Error fetching soccer matches:", err);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedLeague]);

  const liveMatches = matches.filter((m) => m.status === "IN_PROGRESS");
  // Show up to 4 games to keep /inicio snappy and clean
  const previewMatches = matches.slice(0, 4);

  return (
    <section className="rounded-3xl border border-slate-800 bg-[#070d18] text-white p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background glowing accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Section Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
              <img
                src={currentLeague.logo}
                alt={currentLeague.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                  Fútbol Europeo
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  Champions & Big 5
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
                <span>{currentLeague.name}</span>
                {liveMatches.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{liveMatches.length} en vivo</span>
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/futbol?liga=${selectedLeague}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 transition shadow-xs cursor-pointer select-none active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950" />
              <span>Ver Pizarra y Posiciones ›</span>
            </Link>
          </div>
        </div>

        {/* League Selector Horizontal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-1">
          {SOCCER_LEAGUES_LIST.map((lg) => {
            const isSel = selectedLeague === lg.id;
            return (
              <button
                key={lg.id}
                type="button"
                onClick={() => setSelectedLeague(lg.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${
                  isSel
                    ? "bg-white text-slate-950 shadow-sm"
                    : "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10"
                }`}
              >
                <span>{lg.flag}</span>
                <span>{lg.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Matches Grid */}
        {loading && previewMatches.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-40 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : previewMatches.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
            <Calendar className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold">No hay partidos programados para hoy en {currentLeague.name}.</p>
            <Link
              href={`/futbol?liga=${selectedLeague}`}
              className="inline-block mt-2 text-xs font-black text-amber-400 hover:underline"
            >
              Revisar calendario completo y tabla oficial ›
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {previewMatches.map((m) => {
              const isLive = m.status === "IN_PROGRESS";
              const isFinished = m.status === "FINISHED";

              return (
                <article
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between text-slate-900 cursor-pointer group select-none active:scale-[0.99]"
                >
                  {/* Top Bar: Venue & Status */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                    <span className="font-extrabold text-slate-500 text-[10px] truncate max-w-[130px]">
                      {m.venue || currentLeague.shortName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isLive
                          ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 animate-pulse"
                          : isFinished
                          ? "bg-slate-100 text-slate-700 font-black"
                          : "bg-amber-500/15 text-amber-800 font-extrabold"
                      }`}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      <span>{m.statusText}</span>
                    </span>
                  </div>

                  {/* Teams & Scores */}
                  <div className="space-y-2 py-0.5">
                    {/* Away Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={m.awayTeam.logo}
                          alt={m.awayTeam.name}
                          className="w-5 h-5 object-contain shrink-0"
                          loading="lazy"
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {m.awayTeam.shortName}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-black px-2 py-0.5 rounded-lg min-w-[28px] text-center tabular-nums ${
                          isFinished || isLive
                            ? m.awayTeam.score !== undefined &&
                              m.homeTeam.score !== undefined &&
                              m.awayTeam.score > m.homeTeam.score
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-800"
                            : "text-slate-400 font-medium text-xs"
                        }`}
                      >
                        {isFinished || isLive ? (m.awayTeam.score ?? 0) : "–"}
                      </span>
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={m.homeTeam.logo}
                          alt={m.homeTeam.name}
                          className="w-5 h-5 object-contain shrink-0"
                          loading="lazy"
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {m.homeTeam.shortName}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-black px-2 py-0.5 rounded-lg min-w-[28px] text-center tabular-nums ${
                          isFinished || isLive
                            ? m.awayTeam.score !== undefined &&
                              m.homeTeam.score !== undefined &&
                              m.homeTeam.score > m.awayTeam.score
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-800"
                            : "text-slate-400 font-medium text-xs"
                        }`}
                      >
                        {isFinished || isLive ? (m.homeTeam.score ?? 0) : "–"}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{m.timeCaracas}</span>
                    </span>
                    <span className="font-black text-amber-600 group-hover:text-amber-700 flex items-center gap-0.5">
                      <span>Ver Detalle</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Detail Modal */}
      <SoccerMatchModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onViewStandings={() => {
          window.location.href = `/futbol?liga=${selectedLeague}`;
        }}
      />
    </section>
  );
}
