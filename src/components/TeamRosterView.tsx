"use client";

import React, { useEffect, useState } from "react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { RosterPlayer, ScheduleGame } from "@/lib/types";
import { Users, MapPin, Calendar, Shield } from "lucide-react";

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
    .slice(0, 14);

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
                  ? "bg-slate-800 border-amber-400 text-white shadow-lg"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              <img src={team.logoSvg} alt={team.name} className="w-9 h-9" />
              <span className="text-xs font-extrabold">{team.nick}</span>
            </button>
          );
        })}
      </div>

      {/* Team Hero Header */}
      <section
        className="rounded-2xl border border-slate-800 p-5 sm:p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentTeam.color}33 0%, #090d16 70%)`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={currentTeam.logoSvg} alt={currentTeam.name} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                {currentTeam.code} · Temporada 2026-2027
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentTeam.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {currentTeam.venue} ({currentTeam.venueCity})
                </span>
                <span>· Fundado en {currentTeam.founded}</span>
                <span>· Capacidad: {currentTeam.capacity.toLocaleString("es-VE")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-center">
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  subTab === key
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
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
        <div className="space-y-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando roster oficial de {currentTeam.name}…
            </div>
          ) : roster.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
              El roster activo se está sincronizando desde MLB Winter Leagues.
            </div>
          ) : (
            sortedPositions.map((pos) => (
              <section key={pos} className="space-y-2.5">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-xs font-black">
                    {pos}
                  </span>
                  <h3 className="text-sm font-extrabold text-white">
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
                  <span className="text-xs text-slate-400">({grouped.get(pos)?.length} peloteros)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grouped.get(pos)!.map((player) => (
                    <article
                      key={player.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3 hover:border-slate-700 transition"
                    >
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-14 h-14 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-amber-400">
                            #{player.number}
                          </span>
                          <strong className="text-sm font-bold text-white truncate">
                            {player.name}
                          </strong>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {[player.positionName, player.batSide, player.throwSide]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
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

      {/* SUBTAB 2: CALENDARIO DEL CLUB */}
      {subTab === "calendar" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
          <h3 className="text-sm font-black text-white">Partidos de {currentTeam.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamGames.map((g) => (
              <div
                key={g.id}
                onClick={() => onOpenGame(g.id)}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/80 border border-slate-800 p-3 hover:border-amber-400/60 cursor-pointer transition"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-400">{g.date} · {g.inning}</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <img src={g.awayTeam.logoUrl} alt="" className="w-4 h-4" />
                    <span>{g.awayTeam.nick}</span>
                    <b className="text-amber-300">{g.status !== "SCHEDULED" ? g.awayScore : ""}</b>
                    <span className="text-slate-500">vs</span>
                    <img src={g.homeTeam.logoUrl} alt="" className="w-4 h-4" />
                    <span>{g.homeTeam.nick}</span>
                    <b className="text-amber-300">{g.status !== "SCHEDULED" ? g.homeScore : ""}</b>
                  </div>
                  <p className="text-[11px] text-slate-400">{g.venue}</p>
                </div>
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                  Ver Gameday ›
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUBTAB 3: HISTORIA Y SEDE */}
      {subTab === "story" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
          <h3 className="text-base font-black text-white">Historia de {currentTeam.name}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{currentTeam.story}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block">Estadio Sede</span>
              <strong className="text-white text-sm">{currentTeam.venue}</strong>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block">Dimensiones Oficiales</span>
              <strong className="text-white text-sm">{currentTeam.dimensions}</strong>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-400 block">Emisora Oficial</span>
              <strong className="text-white text-sm">{currentTeam.radioName}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
