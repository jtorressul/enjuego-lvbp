"use client";

import React, { useState } from "react";
import { LeaderCategory } from "@/lib/types";

const STAT_FULL_NAMES: Record<string, string> = {
  avg: "Promedio de bateo",
  homeRuns: "Jonrones conectados",
  rbi: "Carreras impulsadas",
  runs: "Carreras anotadas",
  era: "Efectividad",
  strikeOuts: "Ponches propinados",
  wins: "Juegos ganados",
  saves: "Juegos salvados",
};

function SingleLeaderCard({
  title,
  categories,
}: {
  title: string;
  categories: LeaderCategory[];
}) {
  const [activeKey, setActiveKey] = useState(categories[0]?.key || "");
  const current = categories.find((c) => c.key === activeKey) || categories[0];

  if (!current || !current.players.length) {
    return (
      <article className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
        <h3 className="text-sm font-black text-white">{title}</h3>
        <p className="text-xs text-slate-400 mt-3">Se actualizan con los juegos del día.</p>
      </article>
    );
  }

  const [top, ...rest] = current.players;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between">
      <div>
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <h3 className="text-sm font-black text-white">{title}</h3>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveKey(cat.key)}
                className={`px-2.5 py-1 rounded text-[11px] font-extrabold transition cursor-pointer ${
                  current.key === cat.key
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        {/* #1 Leader Hero */}
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3 border border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={top.photo}
              alt={top.name}
              className="w-14 h-14 rounded-full object-cover bg-slate-800 border-2 border-amber-400 shrink-0"
            />
            <div className="min-w-0">
              <span className="inline-block rounded bg-amber-400/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-black uppercase">
                1° Líder LVBP
              </span>
              <div className="text-sm font-black text-white truncate mt-0.5">{top.name}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <img src={top.teamLogo} alt="" className="w-4 h-4" />
                <span>
                  {top.teamName} · {top.position}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-amber-400 tabular-nums">{top.value}</div>
            <div className="text-[10px] text-slate-400">{STAT_FULL_NAMES[current.key] || current.label}</div>
          </div>
        </div>

        {/* #2 to #5 List */}
        <ol className="mt-3 divide-y divide-slate-800/70">
          {rest.map((player, idx) => (
            <li key={player.id} className="py-2 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-4 text-slate-500 font-extrabold text-center">{idx + 2}</span>
                <img
                  src={player.photo}
                  alt={player.name}
                  className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-slate-200 truncate">{player.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <img src={player.teamLogo} alt="" className="w-3.5 h-3.5" />
                    <span>
                      {player.team} · {player.position}
                    </span>
                  </div>
                </div>
              </div>
              <b className="font-black text-white text-sm tabular-nums">{player.value}</b>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

export function LeadersWidget({
  hitting,
  pitching,
}: {
  hitting: LeaderCategory[];
  pitching: LeaderCategory[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SingleLeaderCard title="Líderes de bateo" categories={hitting} />
      <SingleLeaderCard title="Líderes de pitcheo" categories={pitching} />
    </div>
  );
}
