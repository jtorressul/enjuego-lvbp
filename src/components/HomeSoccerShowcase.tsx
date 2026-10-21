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

  const previewMatches = [...matches]
    .sort((a, b) => {
      const order = { IN_PROGRESS: 0, SCHEDULED: 1, FINISHED: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .slice(0, 4);

  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <section
      id="bloque-futbol-europeo"
      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-4"
    >
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0">
            <img
              src={currentLeague.logo}
              alt={currentLeague.name}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Fútbol Europeo · {currentLeague.country}
              </span>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-black uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <span>{liveCount} en vivo</span>
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-950 leading-tight truncate">
              {currentLeague.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/futbol?liga=${selectedLeague}#tabla-clasificacion`}
            className="dark-pill inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-2xs"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Tabla</span>
          </Link>
          <Link
            href={`/futbol?liga=${selectedLeague}`}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 text-xs font-extrabold transition cursor-pointer"
          >
            <span>Ver todos ›</span>
          </Link>
        </div>
      </div>

      {/* Competition Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {SOCCER_LEAGUES_LIST.map((lg) => {
          const isSel = selectedLeague === lg.id;
          return (
            <button
              key={lg.id}
              type="button"
              onClick={() => setSelectedLeague(lg.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 select-none ${
                isSel
                  ? "dark-pill shadow-2xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
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

      {/* 2-Column Match Cards Grid (Clean & Proportional) */}
      {loading && previewMatches.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-36 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse"
            />
          ))}
        </div>
      ) : previewMatches.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 text-center text-slate-500">
          <p className="text-xs font-bold text-slate-700">
            No hay partidos programados hoy en {currentLeague.name}.
          </p>
          <Link
            href={`/futbol?liga=${selectedLeague}`}
            className="inline-block mt-1.5 text-xs font-black text-amber-600 hover:underline"
          >
            Ver clasificación y jornada completa de {currentLeague.shortName} ›
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                className="rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white p-3.5 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between text-slate-900 cursor-pointer group select-none"
              >
                {/* Top Bar: Status & Venue */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      isLive
                        ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 animate-pulse"
                        : isFinished
                        ? "bg-slate-200/70 text-slate-700 font-black"
                        : "bg-amber-500/15 text-amber-800 font-extrabold"
                    }`}
                  >
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    <span>{m.statusText}</span>
                  </span>
                  <span className="font-semibold text-slate-400 text-[11px] truncate max-w-[150px]">
                    {m.venue || currentLeague.shortName}
                  </span>
                </div>

                {/* Teams & Scores */}
                <div className="space-y-2 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.awayTeam.logo}
                        alt={m.awayTeam.name}
                        className="w-6 h-6 object-contain shrink-0"
                        loading="lazy"
                      />
                      <span
                        className={`text-sm truncate ${
                          awayWon ? "font-black text-slate-950" : "font-bold text-slate-700"
                        }`}
                      >
                        {m.awayTeam.shortName}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-black px-2 py-0.5 rounded-md min-w-[28px] text-center tabular-nums ${
                        isFinished || isLive
                          ? awayWon
                            ? "dark-pill"
                            : "bg-slate-100 text-slate-800"
                          : "text-slate-400 font-medium text-xs"
                      }`}
                    >
                      {isFinished || isLive ? (m.awayTeam.score ?? 0) : "–"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.homeTeam.logo}
                        alt={m.homeTeam.name}
                        className="w-6 h-6 object-contain shrink-0"
                        loading="lazy"
                      />
                      <span
                        className={`text-sm truncate ${
                          homeWon ? "font-black text-slate-950" : "font-bold text-slate-700"
                        }`}
                      >
                        {m.homeTeam.shortName}
                      </span>
                    </div>
                    <span
                      className={`text-sm font-black px-2 py-0.5 rounded-md min-w-[28px] text-center tabular-nums ${
                        isFinished || isLive
                          ? homeWon
                            ? "dark-pill"
                            : "bg-slate-100 text-slate-800"
                          : "text-slate-400 font-medium text-xs"
                      }`}
                    >
                      {isFinished || isLive ? (m.homeTeam.score ?? 0) : "–"}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium text-slate-400">{m.timeCaracas} (VET)</span>
                  <span className="font-extrabold text-slate-700 group-hover:text-amber-600 flex items-center gap-0.5">
                    <span>Centro de Partido</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
