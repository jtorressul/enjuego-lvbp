"use client";

import React, { useState } from "react";
import { LeaderCategory } from "@/lib/types";

const STAT_FULL_NAMES: Record<string, string> = {
  avg: "Promedio de bateo",
  homeRuns: "Jonrones conectados",
  rbi: "Carreras impulsadas",
  runs: "Carreras anotadas",
  era: "Efectividad (EFE)",
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
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="text-xs text-slate-400 mt-3">Se actualizan con los juegos del día.</p>
      </article>
    );
  }

  const [top, ...rest] = current.players;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-xs">
      <div>
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveKey(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer select-none ${
                  current.key === cat.key
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        {/* #1 Leader Hero Card */}
        <div className="mt-3.5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white p-3.5 border border-amber-200/90 shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-200/60">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase shadow-2xs">
              ★ 1° Líder de la Liga
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              {STAT_FULL_NAMES[current.key] || current.label}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={top.photo}
                  alt={top.name}
                  onError={(e) => {
                    if (top.teamLogo) (e.currentTarget as HTMLImageElement).src = top.teamLogo;
                  }}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover bg-white border-2 border-amber-400 shadow-xs"
                />
                {top.teamLogo && (
                  <img
                    src={top.teamLogo}
                    alt=""
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white p-0.5 border border-slate-200 shadow-2xs object-contain"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm sm:text-base font-black text-slate-950 leading-tight">
                  {top.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-1">
                  <span>{top.teamName || top.team}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-amber-700">{top.position}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 pl-2">
              <div className="text-2xl sm:text-3xl font-black text-amber-600 tabular-nums leading-none">
                {top.value}
              </div>
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">
                {current.label}
              </div>
            </div>
          </div>
        </div>

        {/* #2 to #5 List */}
        <ol className="mt-3 divide-y divide-slate-100">
          {rest.map((player, idx) => (
            <li key={player.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-4 text-slate-400 font-extrabold text-center text-xs shrink-0">
                  {idx + 2}
                </span>
                <div className="relative shrink-0">
                  <img
                    src={player.photo}
                    alt={player.name}
                    onError={(e) => {
                      if (player.teamLogo) (e.currentTarget as HTMLImageElement).src = player.teamLogo;
                    }}
                    className="w-8 h-8 rounded-full object-cover bg-slate-100 border border-slate-200 shadow-2xs"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-slate-900 truncate text-xs sm:text-sm">
                    {player.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    {player.teamLogo && (
                      <img src={player.teamLogo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                    )}
                    <span>
                      {player.teamName || player.team} · {player.position}
                    </span>
                  </div>
                </div>
              </div>
              <b className="font-black text-slate-900 text-sm tabular-nums shrink-0 pl-2">
                {player.value}
              </b>
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
