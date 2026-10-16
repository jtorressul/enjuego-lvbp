"use client";

import React, { useState } from "react";
import { GamedayData, HitSprayPoint } from "@/lib/types";

const FAIR = "M125 199 L26.7 100.7 C55 55 95 45 125 45 C155 45 195 55 223.3 100.7 Z";
const FENCE = "M26.7 100.7 C55 55 95 45 125 45 C155 45 195 55 223.3 100.7";
const HIT_TYPES = new Set(["single", "double", "triple", "home_run"]);

function sprayColor(hit: HitSprayPoint): string {
  if (hit.eventType === "home_run") return "#facc15"; // Dorado Jonrón
  if (hit.eventType === "triple" || hit.eventType === "double") return "#f97316"; // Naranja Extrabase
  if (hit.eventType === "single") return "#22c55e"; // Verde Sencillo
  if (hit.eventType === "field_error") return "#3b82f6";
  return "#94a3b8"; // Gris Out
}

export function SprayChartSvg({ game }: { game: GamedayData }) {
  const [filter, setFilter] = useState<"all" | "away" | "home">("all");
  const [selectedHit, setSelectedHit] = useState<HitSprayPoint | null>(null);

  const hits = (game.hits || []).filter((h) => filter === "all" || h.side === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800">
          {(
            [
              ["all", "Todos"],
              ["away", `${game.awayTeam.nick} (${game.awayTeam.shortName})`],
              ["home", `${game.homeTeam.nick} (${game.homeTeam.shortName})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                filter === key
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Jonrón
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Doble / Triple
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Sencillo
          </span>
          <span className="flex items-center gap-1.5">
            <i className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Out en juego
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto overflow-hidden rounded-xl border border-slate-800 bg-[#0b2015] p-2">
        <svg viewBox="0 20 250 212" className="w-full h-auto block" role="img" aria-label="Mapa de bateo">
          <defs>
            <radialGradient id="spray-grass" cx="50%" cy="85%" r="85%">
              <stop offset="0%" stopColor="#3aa064" />
              <stop offset="100%" stopColor="#1e6237" />
            </radialGradient>
            <clipPath id="spray-fair">
              <path d={FAIR} />
            </clipPath>
          </defs>
          <rect x="0" y="20" width="250" height="212" fill="#0b2015" />
          <path d={FAIR} fill="#b98b5b" />
          <g transform="translate(125 199) scale(0.945) translate(-125 -199)">
            <path d={FAIR} fill="url(#spray-grass)" />
          </g>
          <path d={FENCE} fill="none" stroke="#facc15" strokeWidth="1.6" />
          <circle cx="125" cy="176" r="45" fill="#c99a62" clipPath="url(#spray-fair)" />
          <circle cx="125" cy="199" r="15" fill="#c99a62" />
          <path d="M125 156.5 L141.3 173.5 L125 190.4 L108.7 173.5 Z" fill="url(#spray-grass)" />
          <path d="M125 199 L150.5 173.5 L125 148 L99.5 173.5 Z" fill="none" stroke="#f8fafc" strokeWidth="0.9" />
          <path d="M125 199 L26.7 100.7 M125 199 L223.3 100.7" stroke="#f8fafc" strokeWidth="0.8" />

          {hits.map((hit, idx) => {
            const isHit = HIT_TYPES.has(hit.eventType);
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onClick={() => setSelectedHit(hit)}
              >
                <line
                  x1="125"
                  y1="199"
                  x2={hit.x}
                  y2={hit.y}
                  stroke={sprayColor(hit)}
                  strokeWidth="0.7"
                  strokeOpacity={isHit ? "0.45" : "0.2"}
                />
                <circle
                  cx={hit.x}
                  cy={hit.y}
                  r={hit.eventType === "home_run" ? 4.8 : isHit ? 3.8 : 2.8}
                  fill={sprayColor(hit)}
                  stroke="#0f172a"
                  strokeWidth="0.9"
                  opacity={isHit ? 1 : 0.75}
                >
                  <title>{`${hit.side === "away" ? "Alta" : "Baja"} ${hit.inning}° · ${hit.batterName}: ${hit.text}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedHit ? (
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 text-xs text-slate-200 flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-400 mr-2">
              {selectedHit.side === "away" ? "Alta" : "Baja"} del {selectedHit.inning}° · {selectedHit.batterName}
            </span>
            <span>{selectedHit.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedHit(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-slate-400">
          {hits.length} {hits.length === 1 ? "batazo en juego" : "batazos en juego"}. Haz clic o pasa el cursor sobre cualquier punto para ver el detalle.
        </p>
      )}
    </div>
  );
}
