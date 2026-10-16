"use client";

import React, { useEffect, useState } from "react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { RosterPlayer, ScheduleGame } from "@/lib/types";
import { Users, MapPin, Calendar, Shield, Tv } from "lucide-react";

const POS_ORDER = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DH"];

export function TeamRosterView({
  selectedTeamCode,
  onSelectTeam,
  schedule,
  onOpenGame,
}: {
  selectedTeamCode: string;
  onSelectTeam: (code: string) => void;
  schedule: ScheduleGame[];
  onOpenGame: (gameId: string) => void;
}) {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"roster" | "calendar" | "story">("roster");

  const currentTeam = LVBP_TEAMS[selectedTeamCode] || LVBP_TEAMS.CAR;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/lvbp/roster?team=${currentTeam.code}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setRoster(data.players || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentTeam.code]);

  // Group roster by position
  const grouped = new Map<string, RosterPlayer[]>();
  for (const p of roster) {
    const pos = p.position || "P";
    if (!grouped.has(pos)) grouped.set(pos, []);
    grouped.get(pos)!.push(p);
  }
  const sortedPositions = [...grouped.keys()].sort((a, b) => {
    const ia = POS_ORDER.indexOf(a);
    const ib = POS_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const teamGames = schedule
    .filter((g) => g.awayTeam.code === currentTeam.code || g.homeTeam.code === currentTeam.code)
    .slice(0, 16);

  return (
    <div className="space-y-5">
      {/* 8 LVBP Teams Selector Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {Object.values(LVBP_TEAMS).map((team) => {
          const isSelected = team.code === currentTeam.code;
          return (
            <button
              key={team.code}
              type="button"
              onClick={() => onSelectTeam(team.code)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 border transition cursor-pointer ${
                isSelected
                  ? "bg-amber-50 border-amber-400 text-slate-950 ring-2 ring-amber-400/30 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:border-amber-400"
              }`}
            >
              <img src={team.logoSvg} alt={team.name} className="w-10 h-10 object-contain" />
              <span className="text-xs font-extrabold">{team.nick}</span>
            </button>
          );
        })}
      </div>

      {/* Team Hero Header (Clean Light Editorial Card) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 relative overflow-hidden shadow-xs">
        <div
          className="h-1.5 w-full absolute top-0 inset-x-0"
          style={{ background: currentTeam.color }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentTeam.logoSvg}
              alt={currentTeam.name}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-xs"
            />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                {currentTeam.code} · Temporada 2026-2027
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950">{currentTeam.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" /> {currentTeam.venue} (
                  {currentTeam.venueCity})
                </span>
                <span>· Fundado en {currentTeam.founded}</span>
                <span>· Capacidad: {currentTeam.capacity.toLocaleString("es-VE")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center">
            {(
              [
                ["roster", "Roster Activo", Users],
                ["calendar", "Calendario del Club", Calendar],
                ["story", "Historia y Sede", Shield],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSubTab(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  subTab === key
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SUBTAB 1: ROSTER ACTIVO */}
      {subTab === "roster" && (
        <div className="space-y-5 animate-view-enter">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Cargando roster oficial de {currentTeam.name}…
            </div>
          ) : roster.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              El roster activo se está sincronizando desde MLB Winter Leagues.
            </div>
          ) : (
            sortedPositions.map((pos) => (
              <section key={pos} className="space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-xs font-black">
                    {pos}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-950">
                    {pos === "P"
                      ? "Lanzadores (Pitchers)"
                      : pos === "C"
                        ? "Receptores (Catchers)"
                        : ["1B", "2B", "3B", "SS"].includes(pos)
                          ? `Cuadro Interior (${pos})`
                          : ["LF", "CF", "RF", "OF"].includes(pos)
                            ? `Jardineros (${pos})`
                            : `Bateadores (${pos})`}
                  </h3>
                  <span className="text-xs text-slate-500">({grouped.get(pos)?.length} peloteros)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped.get(pos)!.map((player) => (
                    <article
                      key={player.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-amber-400 transition shadow-2xs"
                    >
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-14 h-14 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-amber-600">
                            #{player.number}
                          </span>
                          <strong className="text-sm font-bold text-slate-950 truncate">
                            {player.name}
                          </strong>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {[player.positionName, player.batSide, player.throwSide]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {[player.height, player.weight, player.birthDate].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 2: CALENDARIO DEL CLUB — CLARO DESDE LA PERSPECTIVA DEL EQUIPO */}
      {subTab === "calendar" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 animate-view-enter shadow-xs">
          <h3 className="text-sm font-black text-slate-950">
            Calendario y Resultados de {currentTeam.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamGames.map((g) => {
              const isHome = g.homeTeam.code === currentTeam.code;
              const opp = isHome ? g.awayTeam : g.homeTeam;
              const myScore = isHome ? g.homeScore : g.awayScore;
              const oppScore = isHome ? g.awayScore : g.homeScore;
              const isFinished = g.status === "FINISHED";
              const won = isFinished && myScore > oppScore;
              const tvChannels = g.tvChannels?.length ? g.tvChannels : ["IVC", "BeisbolPlay"];

              return (
                <div
                  key={g.id}
                  onClick={() => onOpenGame(g.id)}
                  className="flex flex-col justify-between gap-2.5 rounded-xl bg-slate-50/70 border border-slate-200 p-3.5 hover:border-amber-400 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-700">{g.date}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                        isHome
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-sky-50 text-sky-800 border-sky-200"
                      }`}
                    >
                      {isHome ? "🏠 En Casa vs" : "✈️ Visitante @"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img src={opp.logoUrl} alt={opp.name} className="w-8 h-8 object-contain" />
                      <div>
                        <strong className="text-sm font-black text-slate-950 block">
                          {opp.name}
                        </strong>
                        <span className="text-[11px] text-slate-500">📍 {g.venue}</span>
                      </div>
                    </div>

                    {isFinished ? (
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                          won
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-rose-50 text-rose-800 border-rose-300"
                        }`}
                      >
                        {won ? "GANÓ" : "PERDIÓ"} {myScore}-{oppScore}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold">
                        🕒 {g.time}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px]">
                    <span className="text-slate-600 flex items-center gap-1 font-bold">
                      <Tv className="w-3.5 h-3.5 text-amber-600" /> {tvChannels.join(" · ")}
                    </span>
                    <span className="font-extrabold text-amber-700">Gameday ›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SUBTAB 3: HISTORIA Y SEDE */}
      {subTab === "story" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 animate-view-enter shadow-xs">
          <h3 className="text-base font-black text-slate-950">Historia de {currentTeam.name}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{currentTeam.story}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <span className="text-slate-500 block">Estadio Sede</span>
              <strong className="text-slate-950 text-sm">{currentTeam.venue}</strong>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <span className="text-slate-500 block">Dimensiones Oficiales</span>
              <strong className="text-slate-950 text-sm">{currentTeam.dimensions}</strong>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <span className="text-slate-500 block">Emisora Oficial</span>
              <strong className="text-slate-950 text-sm">{currentTeam.radioName}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
