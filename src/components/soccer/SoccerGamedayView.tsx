"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { SoccerMatchDetail } from "@/lib/soccer-service";
import type { SoccerLeagueId } from "@/lib/soccer-leagues";
import {
  ChevronLeft,
  Share2,
  MapPin,
  Clock,
  Calendar,
  Users,
  Trophy,
  Shield,
  Activity,
  ArrowRightLeft,
  Check,
} from "lucide-react";

interface SoccerGamedayViewProps {
  matchId: string;
  leagueId: SoccerLeagueId;
  onBack: () => void;
  onViewStandings?: () => void;
}

export function SoccerGamedayView({
  matchId,
  leagueId,
  onBack,
  onViewStandings,
}: SoccerGamedayViewProps) {
  const [match, setMatch] = useState<SoccerMatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"resumen" | "stats" | "lineups">("resumen");
  const [copiedShare, setCopiedShare] = useState(false);

  // Load match detail from API
  useEffect(() => {
    let active = true;

    async function loadDetail() {
      try {
        const res = await fetch(`/api/soccer/match?liga=${leagueId}&id=${matchId}`);
        if (!res.ok) throw new Error("No se pudo cargar el partido");
        const json = await res.json();
        if (active && json.match) {
          setMatch(json.match);
          setError(null);
        }
      } catch (err: any) {
        if (active) setError(err?.message || "Error al cargar");
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    loadDetail();

    // Auto-refresh every 20s if match is in progress
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDetail();
      }
    }, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [leagueId, matchId]);

  const handleShare = () => {
    if (!match) return;
    const url = typeof window !== "undefined" ? window.location.href : "https://www.enjuego.online/futbol";
    const statusText =
      match.status === "IN_PROGRESS"
        ? `🔴 EN VIVO (${match.statusText})`
        : match.status === "FINISHED"
        ? `✅ FINAL`
        : `🗓️ ${match.dateCaracas} ${match.timeCaracas} (Caracas)`;

    const scoreLine =
      match.status === "SCHEDULED"
        ? `${match.awayTeam.name} vs ${match.homeTeam.name}`
        : `${match.awayTeam.name} ${match.awayTeam.score ?? 0} - ${match.homeTeam.score ?? 0} ${match.homeTeam.name}`;

    const text = `⚽ ${match.leagueName}\n${scoreLine}\n${statusText}\n\nSigue el fútbol europeo en vivo aquí:\n${url}`;

    if (navigator?.share) {
      navigator.share({ title: `${match.awayTeam.name} vs ${match.homeTeam.name}`, text, url }).catch(() => {});
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  };

  if (loading && !match) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-4">
        <div className="h-10 w-40 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Partido no disponible</h2>
        <p className="text-sm text-slate-600">{error || "No se encontró la información del encuentro seleccionado."}</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-black transition cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a la Pizarra</span>
        </button>
      </div>
    );
  }

  const isLive = match.status === "IN_PROGRESS";
  const isFinished = match.status === "FINISHED";
  const isScheduled = match.status === "SCHEDULED";

  const awayWon = isFinished && (match.awayTeam.score ?? 0) > (match.homeTeam.score ?? 0);
  const homeWon = isFinished && (match.homeTeam.score ?? 0) > (match.awayTeam.score ?? 0);

  const goals = match.events.filter((e) => e.type === "goal");
  const otherEvents = match.events.filter((e) => e.type !== "goal");

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. TOP ACTION ROW: Volver Button + Share */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Partidos</span>
        </button>

        <div className="flex items-center gap-2">
          {onViewStandings && (
            <button
              type="button"
              onClick={onViewStandings}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver Tabla</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir</span>
          </button>
        </div>
      </div>

      {/* 2. HERO SCOREBOARD DUEL (IDENTICAL IN AESTHETIC & GRANDEUR TO BASEBALL GAMEDAYVIEW) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        {/* Top Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-900 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{match.venue || "Estadio Principal"}</span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-600">{match.dateCaracas}</span>
            <span className="text-slate-400">·</span>
            <span className="font-bold text-amber-600">{match.leagueName}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-semibold text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Hora Caracas: {match.timeCaracas}</span>
            {match.attendance && (
              <>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{match.attendance} espectadores</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3-Column Duel Grid: Away Team | Center Status | Home Team */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3 sm:gap-4">
          {/* Away Team Card */}
          <div
            className={`md:col-span-4 flex items-center justify-between rounded-2xl p-4 sm:p-5 border transition ${
              awayWon
                ? "bg-amber-50/60 border-amber-300 shadow-xs"
                : "bg-slate-50/80 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={match.awayTeam.logo}
                alt={match.awayTeam.name}
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain shrink-0 drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="text-base sm:text-xl font-black text-slate-950 truncate">
                  {match.awayTeam.name}
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>Visitante</span>
                  {awayWon && <span className="text-amber-600 font-black">◀ Ganador</span>}
                </div>
              </div>
            </div>

            <span className="text-3xl sm:text-5xl font-black text-slate-950 tabular-nums ml-3">
              {isScheduled ? "–" : (match.awayTeam.score ?? 0)}
            </span>
          </div>

          {/* Center Status / Time / Kickoff */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center py-2">
            {isLive ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3.5 py-1 text-xs font-black text-red-700 uppercase tracking-wider shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>{match.statusText || "EN VIVO"}</span>
                </span>
                <p className="mt-1 text-xs font-extrabold text-amber-600">Tiempo de Juego</p>
              </>
            ) : isFinished ? (
              <>
                <span className="inline-flex items-center rounded-full bg-slate-900 text-white px-4 py-1 text-xs font-black uppercase tracking-wider shadow-2xs">
                  FINAL
                </span>
                <p className="mt-1 text-[11px] font-bold text-slate-400">Partido Concluido</p>
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-3.5 py-1 text-xs font-black text-amber-900 uppercase tracking-wider">
                  {match.timeCaracas} (Vzla)
                </span>
                <p className="mt-1 text-[11px] font-bold text-slate-500">Por Iniciar</p>
              </>
            )}
          </div>

          {/* Home Team Card */}
          <div
            className={`md:col-span-4 flex items-center justify-between rounded-2xl p-4 sm:p-5 border transition ${
              homeWon
                ? "bg-amber-50/60 border-amber-300 shadow-xs"
                : "bg-slate-50/80 border-slate-200"
            }`}
          >
            <span className="text-3xl sm:text-5xl font-black text-slate-950 tabular-nums ml-3 md:ml-0 md:mr-3 order-2 md:order-1">
              {isScheduled ? "–" : (match.homeTeam.score ?? 0)}
            </span>

            <div className="flex items-center gap-3.5 min-w-0 order-1 md:order-2 md:text-right pr-1">
              <img
                src={match.homeTeam.logo}
                alt={match.homeTeam.name}
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain shrink-0 md:order-2 drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0 md:order-1">
                <div className="text-base sm:text-xl font-black text-slate-950 truncate">
                  {match.homeTeam.name}
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center md:justify-end gap-1">
                  {homeWon && <span className="text-amber-600 font-black">Ganador ▶</span>}
                  <span>Local</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Goal Scorers Strip (if goals exist) */}
        {goals.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-[10px] font-black">
                  ⚽
                </span>
                <span>{g.player || "Gol"}</span>
                <span className="text-slate-400 font-normal">({g.minute})</span>
                <span className="text-[10px] uppercase font-black text-slate-400">
                  [{g.isHome ? match.homeTeam.abbreviation : match.awayTeam.abbreviation}]
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. TABS NAVIGATION (IDENTICAL TO BASEBALL GAMEDAYVIEW TABS) */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: "resumen", label: "Resumen y Goles" },
          { key: "stats", label: "Estadísticas Cara a Cara" },
          { key: "lineups", label: "Alineaciones" },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as any)}
              className={`pb-3 px-3 text-xs sm:text-sm font-black transition relative cursor-pointer select-none ${
                active ? "text-slate-950" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{t.label}</span>
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT: RESUMEN */}
      {tab === "resumen" && (
        <section className="space-y-4">
          {match.events.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Cronología del Encuentro
              </h3>

              <div className="space-y-3">
                {match.events.map((ev) => {
                  const isGoal = ev.type === "goal";
                  const isYellow = ev.type === "yellow-card";
                  const isRed = ev.type === "red-card";
                  const isSub = ev.type === "sub";

                  const teamObj = ev.isHome ? match.homeTeam : match.awayTeam;

                  return (
                    <div
                      key={ev.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                        isGoal
                          ? "bg-amber-50/70 border-amber-300"
                          : isRed
                          ? "bg-rose-50/60 border-rose-200"
                          : "bg-slate-50/70 border-slate-200"
                      }`}
                    >
                      {/* Minute badge */}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-black text-xs shrink-0 tabular-nums">
                        {ev.minute || "–"}
                      </span>

                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        {isGoal && (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-2xs">
                            ⚽
                          </span>
                        )}
                        {isYellow && (
                          <span className="w-4 h-5.5 rounded-xs bg-amber-400 border border-amber-500 inline-block shadow-2xs" />
                        )}
                        {isRed && (
                          <span className="w-4 h-5.5 rounded-xs bg-rose-600 border border-rose-700 inline-block shadow-2xs" />
                        )}
                        {isSub && (
                          <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <img src={teamObj.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                          <span className="text-xs font-black text-slate-950">
                            {ev.player || teamObj.name}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            · {teamObj.shortName}
                          </span>
                        </div>

                        {isGoal && ev.assist && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            Asistencia: <span className="font-bold text-slate-800">{ev.assist}</span>
                          </p>
                        )}

                        {isSub && ev.subOut && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            Entra: <b className="text-emerald-700">{ev.player}</b> · Sale: <b className="text-slate-500">{ev.subOut}</b>
                          </p>
                        )}

                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {ev.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-3 shadow-xs">
              <Calendar className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-black text-slate-900">
                {isScheduled ? "Partido Programado" : "Sin incidencias registradas aún"}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {isScheduled
                  ? `El encuentro iniciará a las ${match.timeCaracas} (hora de Venezuela). Tan pronto empiece a rodar el balón, aquí verás los goles y jugadas en tiempo real.`
                  : "Los detalles de este partido se actualizarán con las estadísticas de la jornada."}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 5. TAB CONTENT: ESTADÍSTICAS COMPARATIVAS */}
      {tab === "stats" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            {/* Away Header */}
            <div className="flex items-center gap-2">
              <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
              <span className="text-xs sm:text-sm font-black text-slate-900">{match.awayTeam.shortName}</span>
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Estadísticas
            </span>

            {/* Home Header */}
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900">{match.homeTeam.shortName}</span>
              <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>

          {match.stats.length > 0 ? (
            <div className="space-y-4">
              {match.stats.map((s) => {
                const total = (s.awayValue + s.homeValue) || 1;
                const awayPct = Math.min(100, Math.max(0, Math.round((s.awayValue / total) * 100)));
                const homePct = 100 - awayPct;

                return (
                  <div key={s.name} className="space-y-1.5">
                    {/* Numbers + Label */}
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                      <span className="text-slate-950 tabular-nums w-12 text-left">{s.awayDisplay}</span>
                      <span className="text-slate-600 font-extrabold text-[11px] sm:text-xs text-center flex-1">
                        {s.label}
                      </span>
                      <span className="text-slate-950 tabular-nums w-12 text-right">{s.homeDisplay}</span>
                    </div>

                    {/* Progress Bar Dual */}
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        className="bg-slate-900 h-full transition-all duration-300"
                        style={{ width: `${awayPct}%` }}
                      />
                      <div
                        className="bg-amber-400 h-full transition-all duration-300"
                        style={{ width: `${homePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              Las estadísticas oficiales estarán disponibles una vez comience el encuentro.
            </div>
          )}
        </section>
      )}

      {/* 6. TAB CONTENT: ALINEACIONES */}
      {tab === "lineups" && (
        <section className="space-y-4">
          {match.lineups ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Away Lineup */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-950">{match.awayTeam.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400">Visitante</p>
                    </div>
                  </div>
                  {match.lineups.away.formation && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-black text-xs">
                      {match.lineups.away.formation}
                    </span>
                  )}
                </div>

                {/* Starters */}
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Once Inicial ({match.lineups.away.starters.length})
                  </h5>
                  <div className="divide-y divide-slate-100">
                    {match.lineups.away.starters.map((p) => (
                      <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 text-center font-black text-slate-400 tabular-nums text-[11px]">
                            {p.jersey || "–"}
                          </span>
                          <span className="font-bold text-slate-900 truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                          {p.position || "JUG"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bench */}
                {match.lineups.away.bench.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Suplentes ({match.lineups.away.bench.length})
                    </h5>
                    <div className="divide-y divide-slate-100 text-xs">
                      {match.lineups.away.bench.map((p) => (
                        <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 text-center font-bold text-slate-400 tabular-nums text-[11px]">
                              {p.jersey || "–"}
                            </span>
                            <span className="text-slate-700 truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{p.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Home Lineup */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-950">{match.homeTeam.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400">Local</p>
                    </div>
                  </div>
                  {match.lineups.home.formation && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-black text-xs">
                      {match.lineups.home.formation}
                    </span>
                  )}
                </div>

                {/* Starters */}
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Once Inicial ({match.lineups.home.starters.length})
                  </h5>
                  <div className="divide-y divide-slate-100">
                    {match.lineups.home.starters.map((p) => (
                      <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 text-center font-black text-slate-400 tabular-nums text-[11px]">
                            {p.jersey || "–"}
                          </span>
                          <span className="font-bold text-slate-900 truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
                          {p.position || "JUG"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bench */}
                {match.lineups.home.bench.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Suplentes ({match.lineups.home.bench.length})
                    </h5>
                    <div className="divide-y divide-slate-100 text-xs">
                      {match.lineups.home.bench.map((p) => (
                        <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 text-center font-bold text-slate-400 tabular-nums text-[11px]">
                              {p.jersey || "–"}
                            </span>
                            <span className="text-slate-700 truncate">{p.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{p.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-2 shadow-xs">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-black text-slate-900">Alineaciones no confirmadas</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Las formaciones oficiales se publican aproximadamente 1 hora antes del pitazo inicial.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
