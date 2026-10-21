"use client";

import React, { useState, useEffect } from "react";
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
  ArrowRightLeft,
  BarChart3,
} from "lucide-react";

interface SoccerGamedayViewProps {
  matchId: string;
  leagueId: SoccerLeagueId;
  onBack: () => void;
  onViewStandings?: () => void;
}

/** Clean vector soccer ball / goal SVG icon (no OS emojis) */
function GoalVectorIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 7 16.5 10.2 14.8 15.5 9.2 15.5 7.5 10.2" fill="currentColor" fillOpacity="0.18" />
      <line x1="12" y1="2" x2="12" y2="7" />
      <line x1="21.5" y1="8.9" x2="16.5" y2="10.2" />
      <line x1="17.9" y1="20.1" x2="14.8" y2="15.5" />
      <line x1="6.1" y1="20.1" x2="9.2" y2="15.5" />
      <line x1="2.5" y1="8.9" x2="7.5" y2="10.2" />
    </svg>
  );
}

/** Format raw English ESPN event text into clean Spanish editorial text */
function formatEventSpanish(
  ev: SoccerMatchDetail["events"][number],
  teamName: string
): { title: string; subtitle: string } {
  const player = ev.player || teamName;
  if (ev.type === "goal") {
    const isPen = /penalty/i.test(ev.text || "") || /penal/i.test(ev.shortText || "");
    const isOwn = /own goal/i.test(ev.text || "");
    const tag = isOwn ? " (Gol en propia puerta)" : isPen ? " (Penal)" : "";
    return {
      title: `Gol de ${player}${tag}`,
      subtitle: ev.assist
        ? `Asistencia de ${ev.assist} · Anotación oficial para ${teamName}.`
        : `Anotación oficial para ${teamName}.`,
    };
  }
  if (ev.type === "yellow-card") {
    return {
      title: player,
      subtitle: `Tarjeta amarilla amonestada (${teamName}).`,
    };
  }
  if (ev.type === "red-card") {
    return {
      title: player,
      subtitle: `Tarjeta roja — expulsión registrada (${teamName}).`,
    };
  }
  if (ev.type === "sub") {
    return {
      title: `Cambio en ${teamName}`,
      subtitle: ev.subOut
        ? `Ingresa al campo ${player} en sustitución de ${ev.subOut}.`
        : `Ingresa al campo ${player}.`,
    };
  }
  return {
    title: player,
    subtitle: `Incidencia registrada para ${teamName}.`,
  };
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
        ? `EN VIVO (${match.statusText})`
        : match.status === "FINISHED"
        ? `FINALIZADO`
        : `${match.dateCaracas} · ${match.timeCaracas} (Caracas)`;

    const scoreLine =
      match.status === "SCHEDULED"
        ? `${match.awayTeam.name} vs ${match.homeTeam.name}`
        : `${match.awayTeam.name} ${match.awayTeam.score ?? 0} - ${match.homeTeam.score ?? 0} ${match.homeTeam.name}`;

    const text = `${match.leagueName}\n${scoreLine}\n${statusText}\n\nSigue el partido en directo en En Juego:\n${url}`;

    if (navigator?.share) {
      navigator.share({ title: `${match.awayTeam.name} vs ${match.homeTeam.name}`, text, url }).catch(() => {});
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  };

  if (loading && !match) {
    return (
      <div className="space-y-4 w-full py-2">
        <div className="h-10 w-44 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-56 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 h-80 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          <div className="lg:col-span-4 h-80 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Partido no disponible</h2>
        <p className="text-sm text-slate-600">{error || "No se encontró la información del encuentro seleccionado."}</p>
        <button
          type="button"
          onClick={onBack}
          className="dark-pill inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver a Partidos</span>
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

  return (
    <div className="space-y-5 w-full pb-10 animate-in fade-in duration-200">
      {/* 1. TOP ACTION BAR (Full Width, matching Baseball GamedayView) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="dark-pill inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
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
              <span>Tabla de Posiciones</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-2xs active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir Partido</span>
          </button>
        </div>
      </div>

      {/* 2. HERO SCOREBOARD DUEL (100% Aligned with Baseball GamedayView) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        {/* Top Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{match.venue || "Estadio Oficial"}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-slate-600">{match.dateCaracas}</span>
            <span className="text-slate-300">·</span>
            <span className="font-extrabold text-amber-600 uppercase tracking-wide text-[11px]">
              {match.leagueName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Hora Caracas: {match.timeCaracas}</span>
            {match.attendance && (
              <>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{match.attendance}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3-Column Duel Grid: Away Team | Center Status | Home Team */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3 sm:gap-4">
          {/* Away Team Card */}
          <div
            className={`md:col-span-4 flex items-center justify-between rounded-2xl p-4 sm:p-5 border transition relative overflow-hidden ${
              awayWon
                ? "bg-amber-50/50 border-amber-300 shadow-2xs"
                : "bg-slate-50/80 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={match.awayTeam.logo}
                alt={match.awayTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black text-slate-950 truncate">
                  {match.awayTeam.name}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <span>Visitante</span>
                  {awayWon && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                      GANADOR
                    </span>
                  )}
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
                  <span>EN VIVO · {match.statusText}</span>
                </span>
                <p className="mt-1.5 text-xs font-bold text-slate-500">{match.venue}</p>
              </>
            ) : isFinished ? (
              <>
                <span className="dark-pill inline-flex items-center rounded-full px-4 py-1 text-xs font-black uppercase tracking-wider shadow-2xs">
                  FINAL
                </span>
                <p className="mt-1.5 text-xs font-bold text-slate-500">Tiempo Completo</p>
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3.5 py-1 text-xs font-black text-slate-800 uppercase tracking-wider">
                  {match.timeCaracas} (Caracas)
                </span>
                <p className="mt-1.5 text-xs font-bold text-slate-500">Partido Programado</p>
              </>
            )}
          </div>

          {/* Home Team Card */}
          <div
            className={`md:col-span-4 flex items-center justify-between rounded-2xl p-4 sm:p-5 border transition relative overflow-hidden ${
              homeWon
                ? "bg-amber-50/50 border-amber-300 shadow-2xs"
                : "bg-slate-50/80 border-slate-200"
            }`}
          >
            <span className="text-3xl sm:text-5xl font-black text-slate-950 tabular-nums ml-3 md:ml-0 md:mr-3 order-2 md:order-1">
              {isScheduled ? "–" : (match.homeTeam.score ?? 0)}
            </span>

            <div className="flex items-center gap-3.5 min-w-0 order-1 md:order-2 md:text-right">
              <img
                src={match.homeTeam.logo}
                alt={match.homeTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 md:order-2 drop-shadow-xs"
                loading="lazy"
              />
              <div className="min-w-0 md:order-1">
                <div className="text-base sm:text-lg font-black text-slate-950 truncate">
                  {match.homeTeam.name}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center md:justify-end gap-1.5 mt-0.5">
                  {homeWon && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                      GANADOR
                    </span>
                  )}
                  <span>Local</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Goal Scorers Summary Strip (Vector Icon, Zero Emojis) */}
        {goals.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            {goals.map((g) => (
              <div
                key={g.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 font-bold text-slate-800"
              >
                <GoalVectorIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-black text-slate-950">{g.player || "Gol"}</span>
                <span className="text-amber-700 font-extrabold tabular-nums">{g.minute}</span>
                <span className="text-[10px] uppercase font-black text-slate-400">
                  · {g.isHome ? match.homeTeam.abbreviation : match.awayTeam.abbreviation}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. TABS NAVIGATION BAR (Matching Baseball GamedayView pill style) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs w-fit overflow-x-auto no-scrollbar max-w-full">
        {[
          { key: "resumen", label: "Resumen y Jugadas" },
          { key: "stats", label: "Estadísticas" },
          { key: "lineups", label: "Alineaciones" },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as any)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer select-none shrink-0 ${
                active
                  ? "bg-amber-400 text-slate-950 shadow-2xs"
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT: RESUMEN (12-Column Grid matching Baseball GamedayView) */}
      {tab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 Columns: Match Timeline */}
          <div className="lg:col-span-8 space-y-4">
            {match.events.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Cronología de Incidencias
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {match.events.length} eventos
                  </span>
                </div>

                <div className="space-y-2.5">
                  {match.events.map((ev) => {
                    const isGoal = ev.type === "goal";
                    const isYellow = ev.type === "yellow-card";
                    const isRed = ev.type === "red-card";
                    const isSub = ev.type === "sub";

                    const teamObj = ev.isHome ? match.homeTeam : match.awayTeam;
                    const formatted = formatEventSpanish(ev, teamObj.shortName);

                    return (
                      <div
                        key={ev.id}
                        className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition ${
                          isGoal
                            ? "bg-amber-50/60 border-amber-300/90"
                            : isRed
                            ? "bg-rose-50/50 border-rose-200"
                            : "bg-slate-50/70 border-slate-200/90"
                        }`}
                      >
                        {/* Minute badge */}
                        <span className="dark-pill px-2.5 py-1 rounded-lg font-black text-xs shrink-0 tabular-nums min-w-[40px] text-center">
                          {ev.minute || "–"}
                        </span>

                        {/* Event Vector Indicator */}
                        <div className="shrink-0 flex items-center justify-center w-7 h-7">
                          {isGoal && (
                            <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xs">
                              <GoalVectorIcon className="w-4 h-4" />
                            </span>
                          )}
                          {isYellow && (
                            <span
                              className="w-4 h-5.5 rounded-xs bg-amber-400 border border-amber-500 inline-block shadow-2xs"
                              title="Tarjeta Amarilla"
                            />
                          )}
                          {isRed && (
                            <span
                              className="w-4 h-5.5 rounded-xs bg-rose-600 border border-rose-700 inline-block shadow-2xs"
                              title="Tarjeta Roja"
                            />
                          )}
                          {isSub && (
                            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                              <ArrowRightLeft className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        {/* Formatted Spanish Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <img
                              src={teamObj.logo}
                              alt=""
                              className="w-4 h-4 object-contain shrink-0"
                            />
                            <span className="text-xs sm:text-sm font-black text-slate-950 truncate">
                              {formatted.title}
                            </span>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase shrink-0">
                              · {teamObj.shortName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {formatted.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-3 shadow-xs">
                <Calendar className="w-9 h-9 text-amber-500 mx-auto" />
                <h3 className="text-base font-black text-slate-900">
                  {isScheduled ? "Partido Programado" : "Sin incidencias registradas"}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {isScheduled
                    ? `El encuentro iniciará a las ${match.timeCaracas} (hora de Caracas). Tan pronto comience el partido, verás aquí la cronología en directo.`
                    : "Los detalles de este encuentro se actualizarán automáticamente."}
                </p>
              </div>
            )}
          </div>

          {/* Right 4 Columns: Quick Stats Preview + Venue Info */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <span>Resumen Estadístico</span>
                </span>
                {match.stats.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTab("stats")}
                    className="text-[11px] font-black text-amber-600 hover:text-amber-700 cursor-pointer"
                  >
                    Ver todas ›
                  </button>
                )}
              </div>

              {match.stats.length > 0 ? (
                <div className="space-y-3.5">
                  {match.stats.slice(0, 5).map((s) => {
                    const total = s.awayValue + s.homeValue || 1;
                    const awayPct = Math.min(100, Math.max(0, Math.round((s.awayValue / total) * 100)));
                    const homePct = 100 - awayPct;
                    return (
                      <div key={s.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-black">
                          <span className="text-slate-950 tabular-nums">{s.awayDisplay}</span>
                          <span className="text-slate-500 font-bold text-[11px]">{s.label}</span>
                          <span className="text-slate-950 tabular-nums">{s.homeDisplay}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                          <div
                            className="bg-slate-900 h-full"
                            style={{ width: `${awayPct}%`, backgroundColor: "#0f172a" }}
                          />
                          <div
                            className="bg-amber-400 h-full"
                            style={{ width: `${homePct}%`, backgroundColor: "#f59e0b" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Estadísticas disponibles al iniciar el partido.
                </p>
              )}
            </div>

            {/* Match Technical Sheet */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
                Ficha del Partido
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">Competición</span>
                  <span className="font-black text-slate-900">{match.leagueName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">Estadio</span>
                  <span className="font-bold text-slate-900 text-right">{match.venue || "Por confirmar"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">Fecha</span>
                  <span className="font-bold text-slate-900">{match.dateCaracas}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-semibold">Hora (Caracas)</span>
                  <span className="font-black text-amber-700">{match.timeCaracas}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: ESTADÍSTICAS COMPARATIVAS */}
      {tab === "stats" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
              <span className="text-xs sm:text-sm font-black text-slate-950">{match.awayTeam.name}</span>
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Comparativa Oficial
            </span>

            <div className="flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-black text-slate-950">{match.homeTeam.name}</span>
              <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>

          {match.stats.length > 0 ? (
            <div className="space-y-4">
              {match.stats.map((s) => {
                const total = s.awayValue + s.homeValue || 1;
                const awayPct = Math.min(100, Math.max(0, Math.round((s.awayValue / total) * 100)));
                const homePct = 100 - awayPct;

                return (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-black">
                      <span className="text-slate-950 tabular-nums w-14 text-left">{s.awayDisplay}</span>
                      <span className="text-slate-600 font-extrabold text-xs text-center flex-1">
                        {s.label}
                      </span>
                      <span className="text-slate-950 tabular-nums w-14 text-right">{s.homeDisplay}</span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${awayPct}%`, backgroundColor: "#0f172a" }}
                      />
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${homePct}%`, backgroundColor: "#f59e0b" }}
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
                  <div className="flex items-center gap-2.5">
                    <img src={match.awayTeam.logo} alt="" className="w-6 h-6 object-contain" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-950">{match.awayTeam.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Visitante</p>
                    </div>
                  </div>
                  {match.lineups.away.formation && (
                    <span className="dark-pill px-2.5 py-0.5 rounded-lg font-black text-xs">
                      {match.lineups.away.formation}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Once Titular ({match.lineups.away.starters.length})
                  </h5>
                  <div className="divide-y divide-slate-100">
                    {match.lineups.away.starters.map((p) => (
                      <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center font-black text-slate-400 tabular-nums text-[11px]">
                            {p.jersey || "–"}
                          </span>
                          <span className="font-bold text-slate-900 truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                          {p.position || "JUG"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {match.lineups.away.bench.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Suplentes ({match.lineups.away.bench.length})
                    </h5>
                    <div className="divide-y divide-slate-100 text-xs">
                      {match.lineups.away.bench.map((p) => (
                        <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
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
                  <div className="flex items-center gap-2.5">
                    <img src={match.homeTeam.logo} alt="" className="w-6 h-6 object-contain" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-950">{match.homeTeam.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Local</p>
                    </div>
                  </div>
                  {match.lineups.home.formation && (
                    <span className="dark-pill px-2.5 py-0.5 rounded-lg font-black text-xs">
                      {match.lineups.home.formation}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Once Titular ({match.lineups.home.starters.length})
                  </h5>
                  <div className="divide-y divide-slate-100">
                    {match.lineups.home.starters.map((p) => (
                      <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center font-black text-slate-400 tabular-nums text-[11px]">
                            {p.jersey || "–"}
                          </span>
                          <span className="font-bold text-slate-900 truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                          {p.position || "JUG"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {match.lineups.home.bench.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Suplentes ({match.lineups.home.bench.length})
                    </h5>
                    <div className="divide-y divide-slate-100 text-xs">
                      {match.lineups.home.bench.map((p) => (
                        <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
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
