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
      <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="text-xs text-slate-400 mt-2">
          Líderes de la temporada disponibles al actualizar estadísticas.
        </p>
      </article>
    );
  }

  const [top, ...rest] = current.players;

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-4 flex flex-col justify-between shadow-2xs">
      <div>
        <header className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</h3>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveKey(cat.key)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer select-none ${
                  current.key === cat.key
                    ? "dark-pill shadow-2xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        {/* #1 Leader Clean Editorial Highlight */}
        <div className="mt-3 rounded-xl bg-slate-50/90 p-3 border border-slate-200/80">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60">
            <span className="inline-flex items-center gap-1 rounded-md dark-pill px-2 py-0.5 text-[10px] font-black uppercase">
              1° Líder
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {STAT_FULL_NAMES[current.key] || current.label}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src={top.photo}
                  alt={top.name}
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    if (top.teamLogo) (e.currentTarget as HTMLImageElement).src = top.teamLogo;
                  }}
                  className="w-11 h-11 rounded-full object-cover bg-white border border-slate-200 shadow-2xs"
                />
                {top.teamLogo && (
                  <img
                    src={top.teamLogo}
                    alt={top.team || "Logo equipo"}
                    width={18}
                    height={18}
                    loading="lazy"
                    decoding="async"
                    className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-white p-0.5 border border-slate-200 object-contain"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-950 leading-tight truncate">
                  {top.name}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                  <span>{top.teamName || top.team}</span>
                  <span>·</span>
                  <span className="font-bold text-slate-700">{top.position}</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 pl-2">
              <div className="text-xl font-black text-slate-950 tabular-nums leading-none">
                {top.value}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {current.label}
              </div>
            </div>
          </div>
        </div>

        {/* #2 to #5 List */}
        <ol className="mt-2 divide-y divide-slate-100">
          {rest.slice(0, 4).map((player, idx) => (
            <li key={player.id} className="py-2 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-4 text-slate-400 font-bold text-center text-[11px] shrink-0 tabular-nums">
                  {idx + 2}
                </span>
                <img
                  src={player.photo}
                  alt={player.name}
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    if (player.teamLogo) (e.currentTarget as HTMLImageElement).src = player.teamLogo;
                  }}
                  className="w-7 h-7 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate text-xs">
                    {player.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    {player.teamName || player.team} · {player.position}
                  </div>
                </div>
              </div>
              <b className="font-black text-slate-900 text-xs tabular-nums shrink-0 pl-2">
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
  compact = false,
}: {
  hitting: LeaderCategory[];
  pitching: LeaderCategory[];
  compact?: boolean;
}) {
  const [tab, setTab] = useState<"hitting" | "pitching">("hitting");

  if (compact) {
    const activeCategories = tab === "hitting" ? hitting : pitching;
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setTab("hitting")}
            className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              tab === "hitting" ? "dark-pill shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Líderes de Bateo
          </button>
          <button
            type="button"
            onClick={() => setTab("pitching")}
            className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              tab === "pitching" ? "dark-pill shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Líderes de Pitcheo
          </button>
        </div>
        <SingleLeaderCard
          title={tab === "hitting" ? "Bateo Individual" : "Pitcheo Individual"}
          categories={activeCategories}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
      <SingleLeaderCard title="Líderes de Bateo" categories={hitting} />
      <SingleLeaderCard title="Líderes de Pitcheo" categories={pitching} />
    </div>
  );
}
