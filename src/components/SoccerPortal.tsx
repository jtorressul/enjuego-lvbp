"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SOCCER_LEAGUES,
  SOCCER_LEAGUES_LIST,
  parseSoccerLeague,
  type SoccerLeagueId,
} from "@/lib/soccer-leagues";
import type { SoccerMatch, SoccerStandingRow } from "@/lib/soccer-service";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  ChevronRight,
  Shield,
  Activity,
  ArrowLeft,
  Share2,
} from "lucide-react";

interface SoccerPortalProps {
  initialLeague: SoccerLeagueId;
  initialMatches: SoccerMatch[];
  initialStandings: SoccerStandingRow[];
}

export function SoccerPortal({
  initialLeague,
  initialMatches,
  initialStandings,
}: SoccerPortalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeLeague, setActiveLeague] = useState<SoccerLeagueId>(initialLeague);
  const [matches, setMatches] = useState<SoccerMatch[]>(initialMatches);
  const [standings, setStandings] = useState<SoccerStandingRow[]>(initialStandings);
  const [loading, setLoading] = useState(false);
  const [matchesFilter, setMatchesFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "FINISHED">("ALL");

  const currentLeague = SOCCER_LEAGUES[activeLeague] || SOCCER_LEAGUES["uefa.champions"];

  // Sync league if searchParams change
  useEffect(() => {
    const raw = searchParams.get("liga") || searchParams.get("league");
    if (raw) {
      const parsed = parseSoccerLeague(raw);
      if (parsed !== activeLeague) {
        switchLeague(parsed);
      }
    }
  }, [searchParams]);

  const switchLeague = async (nextLeague: SoccerLeagueId) => {
    setActiveLeague(nextLeague);
    setLoading(true);

    try {
      const [resMatches, resStandings] = await Promise.all([
        fetch(`/api/soccer/scoreboard?league=${nextLeague}`).then((r) => r.json()),
        fetch(`/api/soccer/standings?league=${nextLeague}`).then((r) => r.json()),
      ]);

      if (Array.isArray(resMatches?.matches)) {
        setMatches(resMatches.matches);
      }
      if (Array.isArray(resStandings?.standings)) {
        setStandings(resStandings.standings);
      }
    } catch (err) {
      console.error("[SoccerPortal] Error loading league data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLeague = (id: SoccerLeagueId) => {
    switchLeague(id);
    startTransition(() => {
      router.push(`/futbol?liga=${id}`);
    });
  };

  const filteredMatches = matches.filter((m) => {
    if (matchesFilter === "LIVE") return m.status === "IN_PROGRESS";
    if (matchesFilter === "UPCOMING") return m.status === "SCHEDULED";
    if (matchesFilter === "FINISHED") return m.status === "FINISHED";
    return true;
  });

  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900 pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#060a12] border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/inicio"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Béisbol</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <span className="text-sm sm:text-base font-black tracking-tight text-white">
                Fútbol Europeo
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600/30 text-rose-300 border border-rose-500/40">
                Champions & Big 5
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/inicio"
              className="rounded-full border border-slate-700 bg-slate-900/70 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white transition"
            >
              Volver a LVBP
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-6">
        {/* League Selector Horizontal Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>Competición Europea</span>
            {loading && (
              <span className="flex items-center gap-1 text-amber-600 font-bold normal-case">
                <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
            {SOCCER_LEAGUES_LIST.map((lg) => {
              const isSel = activeLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  type="button"
                  onClick={() => handleSelectLeague(lg.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 select-none ${
                    isSel
                      ? "bg-slate-950 text-white shadow-sm ring-2 ring-slate-950/20"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                  }`}
                >
                  <span className="text-base">{lg.flag}</span>
                  <span>{lg.shortName}</span>
                  {isSel && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero League Banner */}
        <section className="rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-lg border border-slate-800 text-white" style={{ backgroundColor: "#0b1220" }}>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 p-2 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-xs">
                <img
                  src={currentLeague.logo}
                  alt={currentLeague.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <span>{currentLeague.country}</span>
                  <span>•</span>
                  <span>Temporada 2026-27</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                  {currentLeague.name}
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Pizarra de marcadores, partidos en vivo y tabla de clasificación oficial.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{liveCount} en juego</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 1: MATCHES / SCOREBOARD */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                Pizarra de Juegos
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-950">
                Jornada y Resultados ({currentLeague.shortName})
              </h2>
            </div>

            {/* Filter buttons */}
            <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs self-start">
              {[
                { key: "ALL", label: "Todos" },
                { key: "LIVE", label: `En Vivo (${liveCount})` },
                { key: "UPCOMING", label: "Próximos" },
                { key: "FINISHED", label: "Finalizados" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setMatchesFilter(f.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer select-none ${
                    matchesFilter === f.key
                      ? "bg-slate-950 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-xs">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold">No hay partidos en esta categoría para la jornada.</p>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona "Todos" para revisar el calendario completo de la fecha.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMatches.map((m) => {
                const isLive = m.status === "IN_PROGRESS";
                const isFinished = m.status === "FINISHED";

                return (
                  <article
                    key={m.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    {/* Card Header: League & Status */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                      <span className="font-extrabold text-slate-500 text-[11px] truncate max-w-[170px]">
                        {m.venue || currentLeague.shortName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                            className="w-6 h-6 object-contain shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {m.awayTeam.shortName}
                          </span>
                        </div>
                        <span
                          className={`text-base font-black px-2 py-0.5 rounded-lg ${
                            isFinished || isLive
                              ? "text-slate-950 font-black bg-slate-100"
                              : "text-slate-400"
                          }`}
                        >
                          {m.awayTeam.score}
                        </span>
                      </div>

                      {/* Home Team */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={m.homeTeam.logo}
                            alt={m.homeTeam.name}
                            className="w-6 h-6 object-contain shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {m.homeTeam.shortName}
                          </span>
                        </div>
                        <span
                          className={`text-base font-black px-2 py-0.5 rounded-lg ${
                            isFinished || isLive
                              ? "text-slate-950 font-black bg-slate-100"
                              : "text-slate-400"
                          }`}
                        >
                          {m.homeTeam.score}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Date Caracas */}
                    <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Hora Vzla: {m.timeCaracas}</span>
                      </span>
                      <span>{m.dateCaracas}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: STANDINGS TABLE */}
        <section className="space-y-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                Clasificación Oficial
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-950">
                Tabla de Posiciones ({currentLeague.name})
              </h2>
            </div>

            {/* Zones Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-extrabold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                <span>Champions League</span>
              </span>
              {activeLeague !== "uefa.champions" && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                    <span>Europa League</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                    <span>Descenso</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs no-scrollbar">
            <table className="w-full min-w-[700px] text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold">
                  <th className="py-3 px-3 text-left w-14">POS</th>
                  <th className="py-3 px-3 text-left">CLUB</th>
                  <th className="py-3 px-2.5">PJ</th>
                  <th className="py-3 px-2.5 text-emerald-600">G</th>
                  <th className="py-3 px-2.5 text-slate-600">E</th>
                  <th className="py-3 px-2.5 text-rose-600">P</th>
                  <th className="py-3 px-2.5">GF</th>
                  <th className="py-3 px-2.5">GC</th>
                  <th className="py-3 px-2.5 font-bold">DG</th>
                  <th className="py-3 px-3 font-black text-slate-950 bg-amber-50/70 text-right">
                    PTS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {standings.map((row) => {
                  let zoneBorder = "border-l-4 border-transparent";
                  if (row.zone === "champions") zoneBorder = "border-l-4 border-blue-600";
                  else if (row.zone === "champions_playoff") zoneBorder = "border-l-4 border-cyan-500";
                  else if (row.zone === "europa") zoneBorder = "border-l-4 border-amber-500";
                  else if (row.zone === "conference") zoneBorder = "border-l-4 border-emerald-500";
                  else if (row.zone === "relegation") zoneBorder = "border-l-4 border-rose-600";

                  return (
                    <tr
                      key={row.team.id}
                      className={`hover:bg-amber-50/40 transition-colors ${zoneBorder}`}
                    >
                      <td className="py-2.5 px-3 text-left font-black text-slate-700">
                        {row.rank}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={row.team.logo}
                            alt={row.team.name}
                            className="w-5 h-5 object-contain shrink-0"
                            loading="lazy"
                          />
                          <span className="font-extrabold text-slate-900 truncate">
                            {row.team.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700">{row.gamesPlayed}</td>
                      <td className="py-2.5 px-2.5 font-bold text-emerald-700">{row.wins}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{row.ties}</td>
                      <td className="py-2.5 px-2.5 text-rose-600">{row.losses}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{row.goalsFor}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{row.goalsAgainst}</td>
                      <td
                        className={`py-2.5 px-2.5 font-bold ${
                          row.goalDiff > 0
                            ? "text-emerald-700"
                            : row.goalDiff < 0
                            ? "text-rose-600"
                            : "text-slate-600"
                        }`}
                      >
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-950 bg-amber-50/70 text-right text-sm">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
