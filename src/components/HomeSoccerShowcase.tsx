"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SOCCER_LEAGUES, SOCCER_LEAGUES_LIST, type SoccerLeagueId } from "@/lib/soccer-leagues";
import type { SoccerMatch } from "@/lib/soccer-service";
import { Clock, Trophy, ChevronRight, Calendar, MapPin } from "lucide-react";

export function HomeSoccerShowcase() {
  const router = useRouter();
  const [selectedLeague, setSelectedLeague] = useState<SoccerLeagueId>("uefa.champions");
  const [matches, setMatches] = useState<SoccerMatch[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Prioritize LIVE matches, then SCHEDULED, then FINISHED (top 4 for showcase)
  const previewMatches = [...matches]
    .sort((a, b) => {
      const order = { IN_PROGRESS: 0, SCHEDULED: 1, FINISHED: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .slice(0, 4);

  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <section className="space-y-4 pt-2">
      {/* Editorial Section Header (100% Consistent with Baseball Pizarra Header) */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 p-1.5 shadow-2xs flex items-center justify-center shrink-0">
            <img
              src={currentLeague.logo}
              alt={currentLeague.name}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                Fútbol Europeo · {currentLeague.country}
              </span>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>{liveCount} en vivo</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              {currentLeague.name}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/futbol?liga=${selectedLeague}#tabla-clasificacion`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-2xs"
          >
            <Trophy className="w-3.5 h-3.5 text-slate-950" />
            <span>Tabla de Posiciones ›</span>
          </Link>
          <Link
            href={`/futbol?liga=${selectedLeague}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Jornada Completa ›</span>
          </Link>
        </div>
      </div>

      {/* Competition Selector Strip (Official Logos, Zero Emojis) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        {SOCCER_LEAGUES_LIST.map((lg) => {
          const isSel = selectedLeague === lg.id;
          return (
            <button
              key={lg.id}
              type="button"
              onClick={() => setSelectedLeague(lg.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 select-none ${
                isSel
                  ? "dark-pill shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70"
              }`}
            >
              <span className="w-4 h-4 rounded-xs bg-white p-0.5 flex items-center justify-center shrink-0">
                <img src={lg.logo} alt="" className="w-full h-full object-contain" />
              </span>
              <span>{lg.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* 4-Column Match Cards Grid (100% Matching Baseball Scoreboard Cards) */}
      {loading && previewMatches.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-44 rounded-2xl border border-slate-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : previewMatches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-xs">
          <Calendar className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-700">
            No hay partidos programados hoy en {currentLeague.name}.
          </p>
          <Link
            href={`/futbol?liga=${selectedLeague}`}
            className="inline-block mt-2 text-xs font-black text-amber-600 hover:text-amber-700"
          >
            Consultar tabla de posiciones de {currentLeague.shortName} ›
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {previewMatches.map((m) => {
            const isLive = m.status === "IN_PROGRESS";
            const isFinished = m.status === "FINISHED";
            const awayWon =
              (isFinished || isLive) &&
              m.awayTeam.score !== undefined &&
              m.homeTeam.score !== undefined &&
              Number(m.awayTeam.score) > Number(m.homeTeam.score);
            const homeWon =
              (isFinished || isLive) &&
              m.awayTeam.score !== undefined &&
              m.homeTeam.score !== undefined &&
              Number(m.homeTeam.score) > Number(m.awayTeam.score);

            return (
              <article
                key={m.id}
                onClick={() => router.push(`/futbol?liga=${selectedLeague}&partido=${m.id}`)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between text-slate-900 cursor-pointer group select-none"
              >
                {/* Top Bar: Venue & Status */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                  <span className="font-extrabold text-slate-500 text-[11px] truncate max-w-[165px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">{m.venue || currentLeague.shortName}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
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
                <div className="space-y-3 py-1">
                  {/* Away Team */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.awayTeam.logo}
                        alt={m.awayTeam.name}
                        className="w-7 h-7 object-contain shrink-0"
                        loading="lazy"
                      />
                      <span
                        className={`text-sm truncate ${
                          awayWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                        }`}
                      >
                        {m.awayTeam.shortName}
                      </span>
                    </div>
                    <span
                      className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[34px] text-center tabular-nums ${
                        isFinished || isLive
                          ? awayWon
                            ? "dark-pill shadow-xs"
                            : "bg-slate-100 text-slate-800"
                          : "text-slate-400 font-medium text-xs"
                      }`}
                    >
                      {isFinished || isLive ? (m.awayTeam.score ?? 0) : "–"}
                    </span>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.homeTeam.logo}
                        alt={m.homeTeam.name}
                        className="w-7 h-7 object-contain shrink-0"
                        loading="lazy"
                      />
                      <span
                        className={`text-sm truncate ${
                          homeWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                        }`}
                      >
                        {m.homeTeam.shortName}
                      </span>
                    </div>
                    <span
                      className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[34px] text-center tabular-nums ${
                        isFinished || isLive
                          ? homeWon
                            ? "dark-pill shadow-xs"
                            : "bg-slate-100 text-slate-800"
                          : "text-slate-400 font-medium text-xs"
                      }`}
                    >
                      {isFinished || isLive ? (m.homeTeam.score ?? 0) : "–"}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{m.timeCaracas} (Caracas)</span>
                  </span>
                  <span className="font-black text-[11px] text-amber-600 group-hover:text-amber-700 flex items-center gap-0.5">
                    <span>Gameday</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
