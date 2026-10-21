"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  RefreshCw,
  Shield,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import type {
  SoccerLeagueId,
  SoccerLineupPlayer,
  SoccerMatchDetail,
  SoccerShotEvent,
} from "@/lib/soccer-service";
import { SOCCER_LEAGUES } from "@/lib/soccer-leagues";

export interface SoccerGamedayViewProps {
  leagueId: SoccerLeagueId;
  matchId: string;
  onBack: () => void;
  onViewStandings?: () => void;
}

/** Crisp vector soccer ball icon (Zero Emojis) */
function SoccerBallSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#0f172a" />
      <polygon
        points="12,7.2 16.3,10.2 14.7,15.2 9.3,15.2 7.7,10.2"
        fill="#0f172a"
        stroke="#0f172a"
      />
      <line x1="12" y1="7.2" x2="12" y2="2" stroke="#0f172a" />
      <line x1="16.3" y1="10.2" x2="21.3" y2="8.8" stroke="#0f172a" />
      <line x1="14.7" y1="15.2" x2="18.2" y2="19.8" stroke="#0f172a" />
      <line x1="9.3" y1="15.2" x2="5.8" y2="19.8" stroke="#0f172a" />
      <line x1="7.7" y1="10.2" x2="2.7" y2="8.8" stroke="#0f172a" />
    </svg>
  );
}

/** SVG Soccer Jersey with number, collar, sleeves, and goal/card badges (Matches Screenshot 1) */
function PitchJerseySvg({
  jerseyNumber,
  fillColor,
  textColor = "#ffffff",
  isGoalkeeper = false,
}: {
  jerseyNumber: string;
  fillColor: string;
  textColor?: string;
  isGoalkeeper?: boolean;
}) {
  const bg = isGoalkeeper ? "#4b5563" : fillColor;
  return (
    <svg viewBox="0 0 64 58" className="w-12 h-11 sm:w-13 sm:h-12 drop-shadow-md select-none">
      {/* Jersey body + sleeves */}
      <path
        d="M18 6 L25 4 C27 8.5 37 8.5 39 4 L46 6 L59 18 L51 27 L45 22 L45 53 C45 54.5 43.8 55.5 42 55.5 L22 55.5 C20.2 55.5 19 54.5 19 53 L19 22 L13 27 L5 18 Z"
        fill={bg}
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Collar detail */}
      <path
        d="M24.5 4.5 C27 9.5 37 9.5 39.5 4.5"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.2"
      />
      {/* Sleeve trim */}
      <line x1="51" y1="27" x2="58.5" y2="18.5" stroke="#ffffff" strokeWidth="2" />
      <line x1="13" y1="27" x2="5.5" y2="18.5" stroke="#ffffff" strokeWidth="2" />
      {/* Jersey Number */}
      <text
        x="32"
        y="36"
        textAnchor="middle"
        fill={textColor}
        fontSize="17"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {jerseyNumber}
      </text>
    </svg>
  );
}

/**
 * Compute (x%, y%) coordinates on the vertical formation pitch (Screenshot 1)
 * Top of pitch (y ~ 12%) = Striker (#9)
 * Bottom of pitch (y ~ 88%) = Goalkeeper (#1)
 */
function getFormationPitchCoords(
  formation: string | undefined,
  starters: SoccerLineupPlayer[]
): Array<{ player: SoccerLineupPlayer; x: number; y: number }> {
  // Parse formation lines e.g. "4-2-3-1" -> [4, 2, 3, 1] (from defense to attack)
  const rawParts = (formation || "4-2-3-1")
    .split("-")
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0);
  const lines = rawParts.length >= 2 ? rawParts : [4, 2, 3, 1];

  // Separate GK from outfield players
  const gk =
    starters.find((p) => p.position === "G" || p.position === "GK" || p.formationPlace === 1) ||
    starters[0];
  const outfield = starters.filter((p) => p.id !== gk?.id);

  // Order outfield players from defense to attack using ESPN formationPlace & position code
  const getRoleRank = (p: SoccerLineupPlayer): { rowHint: number; sideHint: number } => {
    const fp = p.formationPlace;
    const pos = (p.position || "").toUpperCase();
    // Standard Opta/ESPN formationPlace mapping:
    // 1: GK
    // 2: RB, 5: RCB, 6: LCB, 3: LB
    // 4/8: DM/CM, 7: RW/AM-R, 10: AM, 11: LW/AM-L, 9: F/ST
    if (pos === "LB" || fp === 3) return { rowHint: 0, sideHint: 0 };
    if (pos === "CD-L" || fp === 6) return { rowHint: 0, sideHint: 1 };
    if (pos === "CD" || pos === "CB") return { rowHint: 0, sideHint: 1.5 };
    if (pos === "CD-R" || fp === 5) return { rowHint: 0, sideHint: 2 };
    if (pos === "RB" || fp === 2) return { rowHint: 0, sideHint: 3 };

    if (fp === 4 || pos === "LM" || pos === "DM-L") return { rowHint: 1, sideHint: 0.8 };
    if (fp === 8 || pos === "RM" || pos === "DM-R" || pos === "CM") return { rowHint: 1, sideHint: 2.2 };

    if (fp === 11 || pos === "AM-L" || pos === "LW") return { rowHint: 2, sideHint: 0.3 };
    if (fp === 10 || pos === "AM" || pos === "CAM") return { rowHint: 2, sideHint: 1.5 };
    if (fp === 7 || pos === "AM-R" || pos === "RW") return { rowHint: 2, sideHint: 2.7 };

    if (fp === 9 || pos.startsWith("F") || pos === "ST") return { rowHint: 3, sideHint: 1.5 };
    return { rowHint: 1.5, sideHint: 1.5 };
  };

  const sortedOutfield = [...outfield].sort((a, b) => {
    const ra = getRoleRank(a);
    const rb = getRoleRank(b);
    if (ra.rowHint !== rb.rowHint) return ra.rowHint - rb.rowHint;
    return ra.sideHint - rb.sideHint;
  });

  const result: Array<{ player: SoccerLineupPlayer; x: number; y: number }> = [];
  if (gk) {
    result.push({ player: gk, x: 50, y: 88 });
  }

  // Y positions from defense (bottom ~70%) to striker (top ~13%)
  const numLines = lines.length;
  const yStart = 69; // Defense line
  const yEnd = 13;   // Striker line
  let cursor = 0;

  for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
    const countInLine = lines[lineIdx];
    const slice = sortedOutfield.slice(cursor, cursor + countInLine);
    cursor += countInLine;

    // Sort players within the same line from left to right
    slice.sort((a, b) => getRoleRank(a).sideHint - getRoleRank(b).sideHint);

    const baseLineY =
      numLines === 1
        ? 45
        : yStart - (lineIdx / (numLines - 1)) * (yStart - yEnd);

    slice.forEach((player, idxInLine) => {
      let x = 50;
      if (slice.length === 1) {
        x = 50;
      } else if (slice.length === 2) {
        x = idxInLine === 0 ? 35 : 65;
      } else if (slice.length === 3) {
        x = idxInLine === 0 ? 21 : idxInLine === 1 ? 50 : 79;
      } else if (slice.length === 4) {
        x = idxInLine === 0 ? 15 : idxInLine === 1 ? 38 : idxInLine === 2 ? 62 : 85;
      } else {
        x = 14 + (idxInLine / (slice.length - 1)) * 72;
      }

      // Slight arch on 4-back defense line like ESPN Screenshot 1 (fullbacks slightly higher than CBs)
      let yAdjust = 0;
      if (lineIdx === 0 && slice.length === 4 && (idxInLine === 0 || idxInLine === 3)) {
        yAdjust = -4;
      }

      result.push({
        player,
        x,
        y: Math.round((baseLineY + yAdjust) * 10) / 10,
      });
    });
  }

  return result;
}

export function SoccerGamedayView({
  leagueId,
  matchId,
  onBack,
}: SoccerGamedayViewProps) {
  const [match, setMatch] = useState<SoccerMatchDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Formation team toggle (Screenshot 1: Home vs Away formation on pitch)
  const [formationSide, setFormationSide] = useState<"home" | "away">("home");

  // Shotmap filters & selected shot (Screenshot 3)
  const [shotPlayerFilter, setShotPlayerFilter] = useState<string>("ALL");
  const [shotTypeFilter, setShotTypeFilter] = useState<"ALL" | "goal" | "saved" | "off_target" | "blocked">("ALL");
  const [selectedShotIndex, setSelectedShotIndex] = useState<number>(0);

  // Bottom feed tab
  const [feedTab, setFeedTab] = useState<"events" | "commentary" | "bench">("events");

  const leagueConfig = SOCCER_LEAGUES[leagueId] || SOCCER_LEAGUES["uefa.champions"];

  const loadDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/soccer/match?liga=${leagueId}&id=${matchId}`);
      if (!res.ok) throw new Error("No se pudo cargar el detalle del partido");
      const data = await res.json();
      if (data.match) {
        setMatch(data.match);
      } else {
        setError("Partido no disponible");
      }
    } catch (err: any) {
      setError(err?.message || "Error de conexión");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail(false);
  }, [leagueId, matchId]);

  useEffect(() => {
    if (!match || match.status !== "IN_PROGRESS") return;
    const timer = setInterval(() => {
      loadDetail(true);
    }, 20_000);
    return () => clearInterval(timer);
  }, [match?.status, leagueId, matchId]);

  // Filtered shots for Shotmap (Screenshot 3)
  const filteredShots = useMemo(() => {
    const allShots = match?.shots || [];
    return allShots.filter((s) => {
      if (shotPlayerFilter !== "ALL" && s.playerName !== shotPlayerFilter) return false;
      if (shotTypeFilter !== "ALL" && s.outcome !== shotTypeFilter) return false;
      return true;
    });
  }, [match?.shots, shotPlayerFilter, shotTypeFilter]);

  useEffect(() => {
    if (filteredShots.length > 0) {
      setSelectedShotIndex(filteredShots.length - 1);
    } else {
      setSelectedShotIndex(0);
    }
  }, [shotPlayerFilter, shotTypeFilter, filteredShots.length]);

  const uniqueShotPlayers = useMemo(() => {
    const set = new Set<string>();
    (match?.shots || []).forEach((s) => set.add(s.playerName));
    return Array.from(set);
  }, [match?.shots]);

  if (loading) {
    return (
      <div className="w-full space-y-5">
        <div className="h-10 w-44 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-52 rounded-2xl bg-white border border-slate-200 animate-pulse shadow-xs" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">
            <div className="h-80 rounded-2xl bg-white border border-slate-200 animate-pulse shadow-xs" />
            <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse shadow-xs" />
          </div>
          <div className="lg:col-span-4 space-y-5">
            <div className="h-[520px] rounded-2xl bg-white border border-slate-200 animate-pulse shadow-xs" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="w-full space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="dark-pill inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Partidos</span>
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-xs">
          <p className="text-base font-black text-slate-900">
            {error || "No se encontró información de este partido"}
          </p>
          <button
            type="button"
            onClick={() => loadDetail(false)}
            className="dark-pill inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 text-white text-xs font-black cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  const isLive = match.status === "IN_PROGRESS";
  const isFinished = match.status === "FINISHED";
  const homeGoals = match.events.filter((e) => e.type === "goal" && e.isHome);
  const awayGoals = match.events.filter((e) => e.type === "goal" && !e.isHome);

  const activeLineup =
    formationSide === "home" ? match.lineups?.home : match.lineups?.away;
  const pitchStarters = activeLineup
    ? getFormationPitchCoords(activeLineup.formation, activeLineup.starters)
    : [];

  const activeShot: SoccerShotEvent | undefined =
    filteredShots[selectedShotIndex] || filteredShots[filteredShots.length - 1];

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="dark-pill inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Partidos</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 shadow-2xs">
            <img
              src={leagueConfig.logo}
              alt={leagueConfig.shortName}
              className="w-4 h-4 object-contain"
            />
            <span>{match.leagueName}</span>
          </div>

          <button
            type="button"
            onClick={() => loadDetail(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs"
            title="Actualizar marcador en vivo"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* HERO SCOREBOARD CARD (Full 12-Col Width) */}
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div
          className={`h-1.5 w-full ${
            isLive
              ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-500"
              : "bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900"
          }`}
        />

        <div className="p-5 sm:p-7">
          {/* Status & Stage Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {match.stage && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                {match.stage}
              </span>
            )}
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-black uppercase tracking-wider shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span>EN VIVO · {match.statusText}</span>
              </span>
            ) : isFinished ? (
              <span className="dark-pill inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
                <span>FINAL</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Hora Venezuela: {match.timeCaracas}</span>
              </span>
            )}
          </div>

          {/* 3-Column Matchup */}
          <div className="grid grid-cols-3 items-center gap-2 sm:gap-6 max-w-4xl mx-auto">
            {/* Home Team */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 flex items-center justify-center shadow-2xs">
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-lg font-black text-slate-950 leading-tight">
                  {match.homeTeam.name}
                </h2>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Local {match.lineups?.home?.formation ? `· ${match.lineups.home.formation}` : ""}
                  {match.homeTeam.record ? ` · (${match.homeTeam.record})` : ""}
                </span>
                {match.homeTeam.form && (
                  <div className="hidden sm:flex items-center justify-center gap-1 pt-1">
                    {match.homeTeam.form.split("-").map((ch, idx) => (
                      <span
                        key={idx}
                        className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                          ch === "G"
                            ? "bg-emerald-500 text-white"
                            : ch === "E"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-rose-500 text-white"
                        }`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center Score */}
            <div className="flex flex-col items-center justify-center">
              {match.status === "SCHEDULED" ? (
                <div className="text-center">
                  <div className="text-2xl sm:text-4xl font-black text-slate-300 tracking-tight">
                    VS
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-1">
                    {match.dateCaracas}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 sm:gap-5">
                  <span className="text-3xl sm:text-5xl font-black tabular-nums text-slate-950">
                    {match.homeTeam.score ?? 0}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-300">-</span>
                  <span className="text-3xl sm:text-5xl font-black tabular-nums text-slate-950">
                    {match.awayTeam.score ?? 0}
                  </span>
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 flex items-center justify-center shadow-2xs">
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-lg font-black text-slate-950 leading-tight">
                  {match.awayTeam.name}
                </h2>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Visitante {match.lineups?.away?.formation ? `· ${match.lineups.away.formation}` : ""}
                  {match.awayTeam.record ? ` · (${match.awayTeam.record})` : ""}
                </span>
                {match.awayTeam.form && (
                  <div className="hidden sm:flex items-center justify-center gap-1 pt-1">
                    {match.awayTeam.form.split("-").map((ch, idx) => (
                      <span
                        key={idx}
                        className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                          ch === "G"
                            ? "bg-emerald-500 text-white"
                            : ch === "E"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-rose-500 text-white"
                        }`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Goal Scorers Summary */}
          {(homeGoals.length > 0 || awayGoals.length > 0) && (
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs max-w-3xl mx-auto">
              <div className="space-y-1 text-right pr-2 border-r border-slate-100">
                {homeGoals.map((g) => (
                  <div
                    key={g.id}
                    className="font-bold text-slate-800 flex items-center justify-end gap-1.5"
                  >
                    <span>{g.player || "Gol"}</span>
                    <span className="text-emerald-700 font-black">{g.minute}</span>
                    <SoccerBallSvg className="w-3.5 h-3.5 shrink-0" />
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-left pl-2">
                {awayGoals.map((g) => (
                  <div
                    key={g.id}
                    className="font-bold text-slate-800 flex items-center justify-start gap-1.5"
                  >
                    <SoccerBallSvg className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-emerald-700 font-black">{g.minute}</span>
                    <span>{g.player || "Gol"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Venue, City, Referee & Attendance Metadata Bar */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-600">
            {match.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {match.venue}
                  {match.city ? ` (${match.city})` : ""}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {match.dateCaracas} · {match.timeCaracas} VET
              </span>
            </span>
            {match.referee && (
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Árbitro: {match.referee}</span>
              </span>
            )}
            {match.attendance && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Asistencia: {match.attendance}</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* MAIN 12-COLUMN INTERACTIVE GAMEDAY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (8 COLS): 2.5D STADIUM + MOMENTUM TIMELINE + SHOTMAP + PLAYS */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. 2.5D STADIUM LIVE GAMECAST WIDGET (Matches Screenshot 4) */}
          {match.latestPlay && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* 2.5D Stadium SVG Graphic */}
              <div className="relative w-full bg-gradient-to-b from-slate-100 to-white pt-2 px-2 overflow-hidden">
                <svg
                  viewBox="0 0 800 290"
                  className="w-full h-auto block select-none"
                  aria-label="Vista de estadio en vivo"
                >
                  <defs>
                    <linearGradient id="stadiumRoofGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="20%" stopColor="#e2e8f0" />
                      <stop offset="50%" stopColor="#f8fafc" />
                      <stop offset="80%" stopColor="#e2e8f0" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <linearGradient id="stadiumWallGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#475569" />
                      <stop offset="15%" stopColor="#cbd5e1" />
                      <stop offset="85%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                  </defs>

                  {/* Curved Stadium Roof */}
                  <path
                    d="M 10 42 Q 400 -4 790 42 L 790 78 Q 400 32 10 78 Z"
                    fill="url(#stadiumRoofGrad)"
                  />
                  <path
                    d="M 10 72 Q 400 28 790 72 L 775 90 Q 400 46 25 90 Z"
                    fill="url(#stadiumWallGrad)"
                  />

                  {/* Stadium Stands (Tiered Seating Background) */}
                  <path
                    d="M 25 82 Q 400 42 775 82 L 735 162 L 65 162 Z"
                    fill="#d8dee9"
                  />
                  {/* Seating Sections */}
                  <polygon points="40,94 145,80 165,152 75,152" fill="#f1f5f9" opacity="0.85" />
                  <polygon points="160,78 310,68 318,152 178,152" fill="#f1f5f9" opacity="0.85" />
                  <polygon points="325,67 475,67 472,152 328,152" fill="#f8fafc" opacity="0.9" />
                  <polygon points="490,68 640,78 622,152 482,152" fill="#f1f5f9" opacity="0.85" />
                  <polygon points="655,80 760,94 725,152 635,152" fill="#f1f5f9" opacity="0.85" />

                  {/* Crowd Dots Pattern in Stands */}
                  {[95, 110, 125, 140].map((rowY, rIdx) =>
                    Array.from({ length: 28 }, (_, cIdx) => {
                      const cx = 75 + cIdx * 23 + (rIdx % 2) * 8;
                      if (cx > 325 && cx < 475) return null;
                      return (
                        <circle
                          key={`${rIdx}-${cIdx}`}
                          cx={cx}
                          cy={rowY}
                          r={3.2}
                          fill={cIdx % 3 === 0 ? "#94a3b8" : "#cbd5e1"}
                          opacity="0.75"
                        />
                      );
                    })
                  )}

                  {/* Stadium Roof Banner Title (MEDIO TIEMPO / FINAL / EN JUEGO) */}
                  <text
                    x="400"
                    y="47"
                    textAnchor="middle"
                    fill="#090d16"
                    fontSize="30"
                    fontWeight="900"
                    letterSpacing="1.5"
                    fontFamily="Impact, system-ui, -apple-system, sans-serif"
                  >
                    {match.latestPlay.bannerTitle}
                  </text>

                  {/* 2.5D Perspective Pitch Base */}
                  <polygon
                    points="95,148 705,148 790,278 10,278"
                    fill="#4d9b50"
                    stroke="#3e8440"
                    strokeWidth="2"
                  />

                  {/* Alternating Turf Stripes in 2.5D Perspective */}
                  <polygon points="95,148 196,148 152,278 10,278" fill="#55a658" />
                  <polygon points="298,148 400,148 400,278 276,278" fill="#55a658" />
                  <polygon points="502,148 604,148 648,278 524,278" fill="#55a658" />

                  {/* Pitch Touchlines & Center Line */}
                  <polygon
                    points="105,153 695,153 772,272 28,272"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.8"
                  />
                  <line
                    x1="400"
                    y1="153"
                    x2="400"
                    y2="272"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.8"
                  />

                  {/* Perspective Center Circle */}
                  <ellipse
                    cx="400"
                    cy="212"
                    rx="66"
                    ry="29"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.8"
                  />
                  <circle cx="400" cy="212" r="2.5" fill="#ffffff" />

                  {/* Left Penalty Area */}
                  <polygon
                    points="105,174 195,174 176,251 45,251"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.6"
                  />
                  <polygon
                    points="105,192 145,192 132,233 65,233"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.5"
                  />

                  {/* Right Penalty Area */}
                  <polygon
                    points="695,174 605,174 624,251 755,251"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.6"
                  />
                  <polygon
                    points="695,192 655,192 668,233 735,233"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.5"
                  />

                  {/* 3D Goal Nets Left & Right */}
                  <polygon
                    points="75,196 92,190 76,228 59,233"
                    fill="rgba(255,255,255,0.35)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <polygon
                    points="725,196 708,190 724,228 741,233"
                    fill="rgba(255,255,255,0.35)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />

                  {/* Ball / Active Play Marker on 2.5D Pitch */}
                  <ellipse cx="400" cy="219" rx="11" ry="4.5" fill="rgba(0,0,0,0.28)" />
                  <circle cx="400" cy="211" r="8.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
                  <polygon points="400,206 404,209 402.5,214 397.5,214 396,209" fill="#0f172a" />
                </svg>
              </div>

              {/* Latest Play Summary Card below Stadium (Matches Screenshot 4) */}
              <div className="px-4 sm:px-5 pb-4 pt-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm sm:text-base font-black text-slate-950">
                      {match.latestPlay.headlineSpanish}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {match.latestPlay.minute && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-900 text-xs font-black tabular-nums">
                          {match.latestPlay.minute}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-800 text-xs font-bold">
                        Última jugada
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {match.latestPlay.detailSpanish}
                  </p>
                </div>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setFeedTab("commentary")}
                    className="text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Comentarios completos
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 2. CRONOLOGÍA Y DINÁMICA DEL PARTIDO / MOMENTUM BAR (Matches Screenshot 2) */}
          {match.momentum && match.momentum.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950">
                  Cronología y Dinámica del Partido
                </h3>
                <span
                  className="text-slate-400 hover:text-slate-600 transition"
                  title="Índice de presión y dominio ofensivo cada 2 minutos"
                >
                  <Info className="w-4 h-4" />
                </span>
              </div>

              {/* Home Team Header */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <img
                  src={match.homeTeam.logo}
                  alt={match.homeTeam.shortName}
                  className="w-7 h-7 object-contain"
                />
                <span className="w-3 h-3 rounded-xs bg-blue-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {match.homeTeam.abbreviation || match.homeTeam.shortName}
                </span>
              </div>

              {/* Momentum Bars Chart Container */}
              <div className="relative rounded-xl bg-slate-50/90 border border-slate-100 px-2 sm:px-3 py-4 overflow-hidden">
                {/* Halftime Vertical Dashed Line (MT) */}
                <div
                  className="absolute top-2 bottom-7 left-1/2 border-l border-dashed border-slate-300 pointer-events-none"
                  aria-hidden="true"
                />

                {/* 46 Two-Minute Columns */}
                <div
                  className="grid items-center h-36 sm:h-40 gap-[2px] relative"
                  style={{ gridTemplateColumns: "repeat(46, minmax(0, 1fr))" }}
                >
                  {match.momentum.map((bin) => {
                    const homeH = Math.max(bin.homePressure > 0 ? 6 : 0, Math.round(bin.homePressure * 0.68));
                    const awayH = Math.max(bin.awayPressure > 0 ? 6 : 0, Math.round(bin.awayPressure * 0.68));
                    const homeGoal = bin.markers.find((m) => m.isHome && m.type === "goal");
                    const awayGoal = bin.markers.find((m) => !m.isHome && m.type === "goal");
                    const homeCard = bin.markers.find(
                      (m) => m.isHome && (m.type === "yellow-card" || m.type === "red-card")
                    );
                    const awayCard = bin.markers.find(
                      (m) => !m.isHome && (m.type === "yellow-card" || m.type === "red-card")
                    );

                    return (
                      <div
                        key={bin.binIndex}
                        className="h-full flex flex-col justify-center items-center relative group"
                        title={`Minuto ${bin.minuteLabel}`}
                      >
                        {/* Top Half: Home Team Momentum Bar (Blue gradient like Screenshot 2) */}
                        <div className="flex-1 w-full flex flex-col justify-end items-center pb-[3px] relative">
                          {homeGoal && (
                            <div className="mb-0.5 z-10 bg-white rounded-full p-0.5 shadow-xs">
                              <SoccerBallSvg className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {homeCard && !homeGoal && (
                            <div className="mb-0.5 z-10 bg-white rounded-full p-0.5 shadow-xs">
                              <span
                                className={`block w-2 h-2.5 rounded-[1px] ${
                                  homeCard.type === "red-card" ? "bg-red-600" : "bg-amber-400"
                                }`}
                              />
                            </div>
                          )}
                          <div
                            className="w-full rounded-t-[2px] bg-gradient-to-t from-blue-400 to-blue-600 transition-all"
                            style={{ height: `${homeH}%` }}
                          />
                        </div>

                        {/* Center Green Timeline Spine */}
                        <div
                          className={`w-full h-1.5 ${
                            match.status === "FINISHED" || bin.minuteStart <= 46
                              ? "bg-emerald-600"
                              : "bg-slate-200"
                          }`}
                        />

                        {/* Bottom Half: Away Team Momentum Bar (Dark charcoal gradient like Screenshot 2) */}
                        <div className="flex-1 w-full flex flex-col justify-start items-center pt-[3px] relative">
                          <div
                            className="w-full rounded-b-[2px] bg-gradient-to-b from-slate-500 to-slate-900 transition-all"
                            style={{ height: `${awayH}%` }}
                          />
                          {awayGoal && (
                            <div className="mt-0.5 z-10 bg-white rounded-full p-0.5 shadow-xs">
                              <SoccerBallSvg className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {awayCard && !awayGoal && (
                            <div className="mt-0.5 z-10 bg-white rounded-full p-0.5 shadow-xs">
                              <span
                                className={`block w-2 h-2.5 rounded-[1px] ${
                                  awayCard.type === "red-card" ? "bg-red-600" : "bg-amber-400"
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Axis Labels: IN ...... MT ...... F */}
                <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                  <span>IN</span>
                  <div className="flex-1 border-b border-dotted border-slate-300 mx-2" />
                  <span>MT</span>
                  <div className="flex-1 border-b border-dotted border-slate-300 mx-2" />
                  <span>F</span>
                </div>
              </div>

              {/* Away Team Footer */}
              <div className="flex items-center gap-2.5 mt-2.5">
                <img
                  src={match.awayTeam.logo}
                  alt={match.awayTeam.shortName}
                  className="w-7 h-7 object-contain"
                />
                <span className="w-3 h-3 rounded-xs bg-slate-900 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {match.awayTeam.abbreviation || match.awayTeam.shortName}
                </span>
              </div>
            </section>
          )}

          {/* 3. INTERACTIVE SHOTMAP + GOAL MOUTH (Matches Screenshot 3) */}
          {match.shots && match.shots.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950">
                  Mapa de Tiros y Peligro (Shotmap)
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {filteredShots.length} {filteredShots.length === 1 ? "disparo" : "disparos"}
                </span>
              </div>

              {/* Player Dropdown & Shot Outcome Filter Pills (Exact Screenshot 3 Controls) */}
              <div className="space-y-2.5">
                <div>
                  <select
                    value={shotPlayerFilter}
                    onChange={(e) => setShotPlayerFilter(e.target.value)}
                    aria-label="Filtrar disparos por jugador"
                    className="rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
                  >
                    <option value="ALL">Todos los jugadores ({match.shots.length})</option>
                    {uniqueShotPlayers.map((pName) => (
                      <option key={pName} value={pName}>
                        {pName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { key: "ALL", label: "Todos" },
                      { key: "goal", label: "Gol" },
                      { key: "saved", label: "Atajadas" },
                      { key: "off_target", label: "Fuera de portería" },
                      { key: "blocked", label: "Bloqueo" },
                    ] as const
                  ).map((pill) => {
                    const isActive = shotTypeFilter === pill.key;
                    return (
                      <button
                        key={pill.key}
                        type="button"
                        onClick={() => setShotTypeFilter(pill.key)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                          isActive
                            ? "dark-pill bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        {pill.key === "goal" && <SoccerBallSvg className="w-3.5 h-3.5" />}
                        {pill.key === "saved" && (
                          <span className="w-3 h-3 rounded-full border-2 border-current inline-block" />
                        )}
                        {pill.key === "off_target" && (
                          <span className="w-3 h-3 rounded-full border-2 border-current inline-block opacity-75" />
                        )}
                        {pill.key === "blocked" && (
                          <span className="w-3 h-3 rounded-full border border-dashed border-current inline-block opacity-60" />
                        )}
                        <span>{pill.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2D Green Pitch with Shot Markers & Dotted Trajectory Line (Matches Screenshot 3) */}
              <div className="rounded-2xl overflow-hidden border border-emerald-700/30 shadow-inner">
                <svg
                  viewBox="0 0 600 320"
                  className="w-full h-auto block select-none"
                  aria-label="Mapa de tiros en la cancha"
                >
                  {/* Striped Turf */}
                  <rect x="0" y="0" width="600" height="320" fill="#4c9a4f" />
                  <rect x="0" y="0" width="100" height="320" fill="#54a357" />
                  <rect x="200" y="0" width="100" height="320" fill="#54a357" />
                  <rect x="400" y="0" width="100" height="320" fill="#54a357" />

                  {/* Pitch Lines */}
                  <line x1="300" y1="0" x2="300" y2="320" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
                  <circle
                    cx="300"
                    cy="160"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <circle cx="300" cy="160" r="2.5" fill="#ffffff" />

                  {/* Left Penalty Box (Away Team Shots Target Left Goal) */}
                  <rect
                    x="0"
                    y="62"
                    width="95"
                    height="196"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="0"
                    y="112"
                    width="34"
                    height="96"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 95 124 A 42 42 0 0 1 95 196"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <circle cx="66" cy="160" r="2" fill="#ffffff" />

                  {/* Right Penalty Box (Home Team Shots Target Right Goal) */}
                  <rect
                    x="505"
                    y="62"
                    width="95"
                    height="196"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="566"
                    y="112"
                    width="34"
                    height="96"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 505 124 A 42 42 0 0 0 505 196"
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="1.5"
                  />
                  <circle cx="534" cy="160" r="2" fill="#ffffff" />

                  {/* Render All Filtered Shots */}
                  {filteredShots.map((shot, idx) => {
                    // Home team shoots to the RIGHT goal (x: 300..600)
                    // Away team shoots to the LEFT goal (x: 300..0)
                    const pitchX = shot.isHome
                      ? (shot.x / 100) * 600
                      : ((100 - shot.x) / 100) * 600;
                    const pitchY = shot.isHome
                      ? (shot.y / 100) * 320
                      : ((100 - shot.y) / 100) * 320;

                    const targetX = shot.isHome ? 600 : 0;
                    const targetY = (shot.goalY / 100) * 320;
                    const isSelected = activeShot?.id === shot.id;
                    const dotColor = shot.isHome ? "#2563eb" : "#18181b";

                    return (
                      <g
                        key={shot.id}
                        onClick={() => setSelectedShotIndex(idx)}
                        className="cursor-pointer"
                      >
                        {/* Dotted Shot Trajectory Line for Active Shot */}
                        {isSelected && (
                          <>
                            <line
                              x1={pitchX}
                              y1={pitchY}
                              x2={targetX}
                              y2={targetY}
                              stroke="#ffffff"
                              strokeWidth="2.4"
                              strokeDasharray="4 4"
                            />
                            <circle cx={targetX} cy={targetY} r="4.5" fill="#ffffff" />
                          </>
                        )}

                        {/* Outer Ring for Selected Shot */}
                        {isSelected && (
                          <circle
                            cx={pitchX}
                            cy={pitchY}
                            r="13"
                            fill="rgba(255,255,255,0.25)"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Shot Marker Circle */}
                        <circle
                          cx={pitchX}
                          cy={pitchY}
                          r={shot.outcome === "goal" ? 9 : 8}
                          fill={shot.outcome === "goal" ? "#16a34a" : dotColor}
                          stroke="#ffffff"
                          strokeWidth="2.2"
                        />

                        {/* Inner symbol depending on outcome */}
                        {shot.outcome === "goal" ? (
                          <circle cx={pitchX} cy={pitchY} r="3.2" fill="#ffffff" />
                        ) : shot.outcome === "saved" ? (
                          <line
                            x1={pitchX - 4}
                            y1={pitchY - 4}
                            x2={pitchX + 4}
                            y2={pitchY + 4}
                            stroke="#ffffff"
                            strokeWidth="1.8"
                          />
                        ) : (
                          <circle cx={pitchX} cy={pitchY} r="2.8" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Active Shot Detail Card with Goal Mouth Net + xG / Distance / Foot (Matches Screenshot 3 bottom) */}
              {activeShot && (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Left: Goal Mouth Net Graphic */}
                    <div className="md:col-span-5 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase text-white ${
                            activeShot.outcome === "goal"
                              ? "bg-emerald-600"
                              : activeShot.outcome === "saved"
                              ? "bg-blue-600"
                              : activeShot.outcome === "blocked"
                              ? "bg-amber-600"
                              : "bg-red-700"
                          }`}
                        >
                          {activeShot.outcome === "goal"
                            ? "Gol"
                            : activeShot.outcome === "saved"
                            ? "Atajada"
                            : activeShot.outcome === "blocked"
                            ? "Bloqueado"
                            : "Fuera de portería"}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={selectedShotIndex <= 0}
                            onClick={() => setSelectedShotIndex((i) => Math.max(0, i - 1))}
                            className="p-1 rounded-md bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                            aria-label="Disparo anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 text-[11px] font-black tabular-nums">
                            {selectedShotIndex + 1} de {filteredShots.length}
                          </span>
                          <button
                            type="button"
                            disabled={selectedShotIndex >= filteredShots.length - 1}
                            onClick={() =>
                              setSelectedShotIndex((i) => Math.min(filteredShots.length - 1, i + 1))
                            }
                            className="p-1 rounded-md bg-white border border-slate-200 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                            aria-label="Disparo siguiente"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Goal Frame SVG with Netting & Ball Spot */}
                      <svg viewBox="0 0 260 125" className="w-full h-auto block mt-1">
                        <defs>
                          <pattern id="goalNetPattern" width="8" height="8" patternUnits="userSpaceOnUse">
                            <path
                              d="M 0 4 L 4 0 L 8 4 L 4 8 Z"
                              fill="none"
                              stroke="#cbd5e1"
                              strokeWidth="0.8"
                            />
                          </pattern>
                        </defs>
                        {/* Goal Netting */}
                        <rect x="42" y="34" width="176" height="86" fill="url(#goalNetPattern)" />
                        {/* Goal Posts & Crossbar */}
                        <path
                          d="M 42 120 L 42 34 L 218 34 L 218 120"
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="4"
                          strokeLinejoin="round"
                        />
                        {/* Ground Line */}
                        <line x1="10" y1="120" x2="250" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />

                        {/* Ball Position on Goal Mouth */}
                        {(() => {
                          // Map goalY (35..65) to SVG X (20..240)
                          const normX = Math.max(18, Math.min(242, ((activeShot.goalY - 30) / 40) * 220 + 20));
                          const normY = Math.max(14, Math.min(112, 118 - (activeShot.goalZ / 100) * 102));
                          return (
                            <circle
                              cx={normX}
                              cy={normY}
                              r="6.5"
                              fill="#ffffff"
                              stroke="#0f172a"
                              strokeWidth="2.2"
                            />
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Right: Shooter Info + xG / Distance / Foot / Situation Grid */}
                    <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 shrink-0">
                            <PitchJerseySvg
                              jerseyNumber={activeShot.jersey || "•"}
                              fillColor={activeShot.isHome ? "#2563eb" : "#18181b"}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm sm:text-base font-black text-slate-950 truncate">
                              {activeShot.playerShortName}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 truncate">
                              {activeShot.teamAbbr} • {activeShot.positionLabel}
                            </div>
                          </div>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-slate-950 tabular-nums shrink-0">
                          {activeShot.minute}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div>
                          <div className="text-sm sm:text-base font-black text-slate-950 tabular-nums">
                            {activeShot.xg}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">xG (Est.)</div>
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-black text-slate-950 tabular-nums">
                            {activeShot.xgot}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">xGTE</div>
                        </div>
                        <div>
                          <div className="text-sm sm:text-base font-black text-slate-950 tabular-nums">
                            {activeShot.distanceMeters} m
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">Distancia</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-950 leading-snug">
                            {activeShot.situation}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">Situación</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-950 leading-snug">
                            {activeShot.shotType}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">Tipo de tiro</div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black text-slate-950 leading-snug">
                            {activeShot.goalZone}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">Zona de gol</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 4. MATCH TIMELINE / FULL SPANISH COMMENTARY / BENCH TABS */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
              {(
                [
                  { id: "events", label: `Eventos Clave (${match.events.length})` },
                  { id: "commentary", label: `Relato Minuto a Minuto (${match.commentary?.length || 0})` },
                  { id: "bench", label: "Suplentes y Plantillas" },
                ] as const
              ).map((t) => {
                const active = feedTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFeedTab(t.id)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
                      active
                        ? "dark-pill bg-slate-950 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-950 hover:bg-white"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {feedTab === "events" && (
              <div className="p-4 sm:p-6">
                {match.events.length === 0 ? (
                  <p className="text-center py-8 text-xs font-bold text-slate-500">
                    Aún no se registran goles, tarjetas o cambios en este encuentro.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {match.events.map((ev) => (
                      <div key={ev.id} className="py-3.5 flex items-start gap-3.5">
                        <div
                          className={`w-12 h-8 rounded-lg flex items-center justify-center text-xs font-black tabular-nums shrink-0 ${
                            ev.type === "goal"
                              ? "bg-emerald-600 text-white"
                              : ev.type === "red-card"
                              ? "bg-red-600 text-white"
                              : ev.type === "yellow-card"
                              ? "bg-amber-400 text-slate-950"
                              : "dark-pill bg-slate-900 text-white"
                          }`}
                        >
                          {ev.minute || "•"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <img
                              src={ev.isHome ? match.homeTeam.logo : match.awayTeam.logo}
                              alt=""
                              className="w-4 h-4 object-contain shrink-0"
                            />
                            <span className="text-xs font-black text-slate-950">
                              {ev.player || (ev.isHome ? match.homeTeam.shortName : match.awayTeam.shortName)}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                ev.type === "goal"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : ev.type === "yellow-card"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : ev.type === "red-card"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {ev.type === "goal"
                                ? "Gol"
                                : ev.type === "yellow-card"
                                ? "Tarjeta Amarilla"
                                : ev.type === "red-card"
                                ? "Tarjeta Roja"
                                : "Cambio"}
                            </span>
                          </div>
                          {ev.assist && (
                            <p className="text-xs text-slate-500 mt-1">
                              Asistencia: <strong className="text-slate-700">{ev.assist}</strong>
                            </p>
                          )}
                          {ev.subOut && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                              <span>Sale del campo: {ev.subOut}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {feedTab === "commentary" && (
              <div className="p-4 sm:p-6 max-h-[540px] overflow-y-auto divide-y divide-slate-100">
                {match.commentary && match.commentary.length > 0 ? (
                  match.commentary.map((c) => (
                    <div key={c.id} className="py-3 flex items-start gap-3">
                      <span className="w-11 shrink-0 text-xs font-black tabular-nums text-slate-900 bg-slate-100 rounded-lg py-1 text-center">
                        {c.minute || "•"}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed flex-1">
                        {c.textSpanish}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-8 text-xs font-bold text-slate-500">
                    Sin comentarios minuto a minuto disponibles para este partido.
                  </p>
                )}
              </div>
            )}

            {feedTab === "bench" && (
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {match.lineups ? (
                  (
                    [
                      { team: match.homeTeam, side: match.lineups.home },
                      { team: match.awayTeam, side: match.lineups.away },
                    ] as const
                  ).map(({ team, side }) => (
                    <div key={team.id} className="space-y-2.5">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                        <h4 className="text-xs font-black uppercase text-slate-900">
                          Suplentes · {team.shortName}
                        </h4>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {side.bench.map((p) => (
                          <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center shrink-0">
                                {p.jersey || "–"}
                              </span>
                              <span className="font-bold text-slate-800 truncate">{p.name}</span>
                              {p.subbedIn && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black">
                                  Entró
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 ml-2">
                              {p.position}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-center py-6 text-xs text-slate-500 font-bold">
                    Plantillas de suplentes aún no publicadas.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT SIDEBAR COLUMN (4 COLS): 2D PITCH FORMATIONS WITH JERSEYS (Screenshot 1) + STATS */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. FORMACIONES Y ALINEACIONES EN CANCHA 2D (Exact Screenshot 1 Design) */}
          {match.lineups &&
            (match.lineups.home.starters.length > 0 || match.lineups.away.starters.length > 0) && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950">
                    Formaciones y Alineaciones
                  </h3>
                </div>

                {/* Segmented Pill Toggle: [ HomeLogo 4-2-3-1 | AwayLogo 4-2-3-1 ] */}
                <div className="grid grid-cols-2 rounded-full border border-slate-300 bg-white p-0.5 shadow-2xs">
                  {(
                    [
                      {
                        key: "home",
                        team: match.homeTeam,
                        formation: match.lineups.home.formation || "4-2-3-1",
                      },
                      {
                        key: "away",
                        team: match.awayTeam,
                        formation: match.lineups.away.formation || "4-2-3-1",
                      },
                    ] as const
                  ).map((tab) => {
                    const isActive = formationSide === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFormationSide(tab.key)}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-black transition cursor-pointer ${
                          isActive
                            ? "dark-pill bg-slate-950 text-white shadow-xs"
                            : "text-slate-700 hover:text-slate-950"
                        }`}
                      >
                        <img
                          src={tab.team.logo}
                          alt={tab.team.shortName}
                          className="w-4.5 h-4.5 object-contain shrink-0"
                        />
                        <span className="tabular-nums">{tab.formation}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Vertical Green Pitch with 11 Jerseys, Numbers, Badges & Name Pills (Matches Screenshot 1) */}
                {activeLineup && (
                  <div className="relative w-full aspect-[3/4.15] rounded-2xl overflow-hidden border border-emerald-800/30 shadow-inner select-none">
                    {/* Pitch Turf Background SVG */}
                    <svg
                      viewBox="0 0 360 498"
                      className="absolute inset-0 w-full h-full block"
                      preserveAspectRatio="none"
                    >
                      {/* Alternating Horizontal Grass Stripes */}
                      <rect x="0" y="0" width="360" height="498" fill="#529e54" />
                      <rect x="0" y="0" width="360" height="71" fill="#5aa85c" />
                      <rect x="0" y="142" width="360" height="71" fill="#5aa85c" />
                      <rect x="0" y="284" width="360" height="71" fill="#5aa85c" />
                      <rect x="0" y="426" width="360" height="72" fill="#5aa85c" />

                      {/* Halfway Line & Center Circle */}
                      <line
                        x1="0"
                        y1="215"
                        x2="360"
                        y2="215"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="1.6"
                      />
                      <circle
                        cx="180"
                        cy="215"
                        r="54"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="1.6"
                      />

                      {/* Bottom Goalkeeper Penalty Box */}
                      <rect
                        x="65"
                        y="392"
                        width="230"
                        height="106"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="1.6"
                      />
                      <rect
                        x="125"
                        y="452"
                        width="110"
                        height="46"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M 135 392 A 48 48 0 0 1 225 392"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="1.6"
                      />
                    </svg>

                    {/* 11 Players with Jerseys + Name Pills */}
                    {pitchStarters.map(({ player, x, y }, idx) => {
                      const isGk =
                        idx === 0 ||
                        player.position === "G" ||
                        player.position === "GK" ||
                        player.formationPlace === 1;
                      return (
                        <div
                          key={player.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                          style={{ left: `${x}%`, top: `${y}%` }}
                          title={`${player.name} (#${player.jersey}) · ${player.positionNameSpanish}`}
                        >
                          <div className="relative">
                            <PitchJerseySvg
                              jerseyNumber={player.jersey}
                              fillColor={activeLineup.uniformColor}
                              textColor={activeLineup.uniformTextColor}
                              isGoalkeeper={isGk}
                            />

                            {/* Goal Badge on Top-Left of Jersey (Like Screenshot 1 "1 ⚽" on #10 Paz) */}
                            {player.goals > 0 && (
                              <span className="absolute -top-1 -left-2.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white text-slate-950 text-[10px] font-black shadow-md border border-slate-200">
                                <span>{player.goals}</span>
                                <SoccerBallSvg className="w-3 h-3" />
                              </span>
                            )}

                            {/* Yellow/Red Card Badge on Top-Right of Jersey */}
                            {(player.yellowCards > 0 || player.redCards > 0) && (
                              <span
                                className={`absolute -top-0.5 -right-1 w-2.5 h-3.5 rounded-[2px] border border-white shadow-sm ${
                                  player.redCards > 0 ? "bg-red-600" : "bg-amber-400"
                                }`}
                              />
                            )}
                          </div>

                          {/* Frosted Name Pill Below Jersey */}
                          <span className="mt-0.5 px-2 py-0.5 rounded-md bg-white/85 backdrop-blur-xs text-slate-950 text-[11px] font-bold leading-tight shadow-xs max-w-[88px] truncate">
                            {player.shortName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setFeedTab("bench")}
                    className="text-xs font-extrabold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Ver suplentes y plantillas completas
                  </button>
                </div>
              </section>
            )}

          {/* 2. COMPARATIVE MATCH STATS CARD */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Estadísticas del Partido
              </span>
              <div className="flex items-center gap-2">
                <img src={match.homeTeam.logo} alt="" className="w-4 h-4 object-contain" />
                <span className="text-[10px] font-bold text-slate-400">vs</span>
                <img src={match.awayTeam.logo} alt="" className="w-4 h-4 object-contain" />
              </div>
            </div>

            {match.stats.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-500">
                Las estadísticas comparativas estarán disponibles al iniciar el partido.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {match.stats.map((st) => {
                  const total = st.homeValue + st.awayValue;
                  const homePct = total > 0 ? Math.round((st.homeValue / total) * 100) : 50;
                  const awayPct = 100 - homePct;
                  const homeLeads = st.homeValue > st.awayValue;
                  const awayLeads = st.awayValue > st.homeValue;

                  return (
                    <div key={st.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`tabular-nums ${
                            homeLeads ? "font-black text-slate-950" : "font-bold text-slate-500"
                          }`}
                        >
                          {st.homeDisplay}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">{st.label}</span>
                        <span
                          className={`tabular-nums ${
                            awayLeads ? "font-black text-slate-950" : "font-bold text-slate-500"
                          }`}
                        >
                          {st.awayDisplay}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex gap-0.5">
                        <div
                          className={`h-full rounded-l-full transition-all ${
                            homeLeads ? "bg-blue-600" : "bg-slate-300"
                          }`}
                          style={{ width: `${homePct}%` }}
                        />
                        <div
                          className={`h-full rounded-r-full transition-all ${
                            awayLeads ? "bg-slate-900" : "bg-slate-300"
                          }`}
                          style={{ width: `${awayPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. FICHA TÉCNICA Y METADATOS DEL PARTIDO */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                <Shield className="w-4 h-4 text-slate-700" />
                <span>Ficha y Metadatos del Partido</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">ID #{match.id}</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-600">
              <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Competición:</span>
                <span className="font-extrabold text-slate-900 text-right">{match.leagueName}</span>
              </div>
              {match.stage && (
                <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Fase / Jornada:</span>
                  <span className="font-bold text-slate-800 text-right">{match.stage}</span>
                </div>
              )}
              {match.venue && (
                <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Estadio:</span>
                  <span className="font-bold text-slate-800 text-right">{match.venue}</span>
                </div>
              )}
              {match.city && (
                <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Ciudad / País:</span>
                  <span className="font-bold text-slate-800 text-right">{match.city}</span>
                </div>
              )}
              {match.referee && (
                <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Árbitro Principal:</span>
                  <span className="font-bold text-slate-800 text-right">{match.referee}</span>
                </div>
              )}
              {match.attendance && (
                <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Asistencia Oficial:</span>
                  <span className="font-bold text-slate-800 text-right">{match.attendance} espectadores</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Fecha y Hora (VET):</span>
                <span className="font-bold text-slate-800 text-right">
                  {match.dateCaracas} · {match.timeCaracas}
                </span>
              </div>
              {match.broadcast && (
                <div className="flex justify-between items-center gap-2 py-1">
                  <span className="text-slate-400 font-semibold">Señal Internacional:</span>
                  <span className="font-bold text-slate-800 text-right">{match.broadcast}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
