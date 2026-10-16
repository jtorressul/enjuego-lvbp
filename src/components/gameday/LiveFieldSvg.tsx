"use client";

import React from "react";
import { GamedayData } from "@/lib/types";

const HOME: [number, number] = [125, 199];
const BASE: Record<"first" | "second" | "third", [number, number]> = {
  first: [150.5, 173.5],
  second: [125, 148],
  third: [99.5, 173.5],
};
const FAIR = "M125 199 L26.7 100.7 C55 55 95 45 125 45 C155 45 195 55 223.3 100.7 Z";
const FENCE = "M26.7 100.7 C55 55 95 45 125 45 C155 45 195 55 223.3 100.7";
const FIELDERS: Record<string, [number, number]> = {
  P: [125, 176],
  C: [125, 211],
  "1B": [172, 160],
  "2B": [147, 151],
  SS: [103, 151],
  "3B": [78, 160],
  LF: [63, 108],
  CF: [125, 84],
  RF: [187, 108],
};

function surname(name = ""): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const suffix = /^(jr\.?|sr\.?|ii|iii)$/i;
  return suffix.test(parts[parts.length - 1]) && parts.length > 2
    ? parts.slice(-2).join(" ")
    : parts[parts.length - 1];
}

export function LiveFieldSvg({ game }: { game: GamedayData }) {
  const field = game.field;
  if (!field) return null;

  const batting = field.top ? game.awayTeam : game.homeTeam;
  const fielding = field.top ? game.homeTeam : game.awayTeam;
  const fColor = fielding.color || "#1d4e89";
  const bColor = batting.color || "#c8102e";

  const recentHits = (game.hits || [])
    .filter((h) => h.inning === game.inningState?.inning && (h.side === "away") === Boolean(field.top))
    .slice(-4);

  const bx = field.batSide === "L" ? 139 : 111;

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0f2a1c] shadow-inner">
        <svg viewBox="0 20 250 212" className="w-full h-auto block select-none" role="img" aria-label="Terreno de juego en vivo">
          <defs>
            <radialGradient id="live-grass" cx="50%" cy="85%" r="85%">
              <stop offset="0%" stopColor="#3aa064" />
              <stop offset="100%" stopColor="#1e6237" />
            </radialGradient>
            <clipPath id="live-fair">
              <path d={FAIR} />
            </clipPath>
          </defs>

          <rect x="0" y="20" width="250" height="212" fill="#0b2015" />
          <rect x="0" y="100" width="250" height="132" fill="#143a25" />
          <path d={FAIR} fill="#b98b5b" />
          <g transform="translate(125 199) scale(0.945) translate(-125 -199)">
            <path d={FAIR} fill="url(#live-grass)" />
          </g>
          <g clipPath="url(#live-fair)" opacity="0.08">
            <path d="M0 60h250v10H0zM0 90h250v10H0zM0 120h250v10H0zM0 150h250v10H0z" fill="#fff" />
          </g>
          <path d={FENCE} fill="none" stroke="#facc15" strokeWidth="1.8" opacity="0.85" />

          {/* Infield dirt & grass */}
          <circle cx="125" cy="176" r="45" fill="#c99a62" clipPath="url(#live-fair)" />
          <circle cx="125" cy="199" r="15" fill="#c99a62" />
          <path d="M125 156.5 L141.3 173.5 L125 190.4 L108.7 173.5 Z" fill="url(#live-grass)" />
          <path d="M125 199 L150.5 173.5 L125 148 L99.5 173.5 Z" fill="none" stroke="#f8fafc" strokeWidth="0.9" opacity="0.9" />
          <path d="M125 199 L26.7 100.7 M125 199 L223.3 100.7" stroke="#f8fafc" strokeWidth="0.8" opacity="0.85" />

          {/* Pitcher's mound & batter boxes */}
          <circle cx="125" cy="175" r="4.6" fill="#d8ac74" />
          <rect x="123" y="174.4" width="4" height="1.3" fill="#fff" />
          <rect x="107" y="193" width="9" height="13" fill="none" stroke="#f4f7f9" strokeWidth="0.7" opacity="0.8" />
          <rect x="134" y="193" width="9" height="13" fill="none" stroke="#f4f7f9" strokeWidth="0.7" opacity="0.8" />

          {/* Recent hit trails */}
          {recentHits.map((hit, idx) => {
            const isLast = idx === recentHits.length - 1;
            return (
              <g key={`${hit.inning}-${idx}`}>
                <path
                  d={`M${HOME[0]} ${HOME[1]} L${hit.x} ${hit.y}`}
                  stroke="#ffffff"
                  strokeWidth="0.9"
                  strokeDasharray="2 2"
                  opacity={isLast ? 0.85 : 0.35}
                />
                <circle
                  cx={hit.x}
                  cy={hit.y}
                  r={isLast ? 3.5 : 2.4}
                  fill={hit.eventType === "home_run" ? "#facc15" : "#ffffff"}
                  stroke="#0f2a1c"
                  strokeWidth="0.8"
                  opacity={isLast ? 1 : 0.55}
                >
                  <title>{hit.text}</title>
                </circle>
              </g>
            );
          })}

          {/* Home plate */}
          <path d="M121.8 198 L128.2 198 L128.2 200.6 L125 203.2 L121.8 200.6 Z" fill="#fff" stroke="#cbd5e1" strokeWidth="0.6" />

          {/* Bases (1st, 2nd, 3rd) */}
          {(["first", "second", "third"] as const).map((bKey) => {
            const [x, y] = BASE[bKey];
            const occupied = Boolean(field.runners[bKey]);
            return (
              <rect
                key={bKey}
                x="-3.6"
                y="-3.6"
                width="7.2"
                height="7.2"
                transform={`translate(${x} ${y}) rotate(45)`}
                fill={occupied ? "#facc15" : "#ffffff"}
                stroke={occupied ? "#78350f" : "#94a3b8"}
                strokeWidth="0.9"
              />
            );
          })}

          {/* Runners on base with names */}
          {(
            [
              ["first", "start"],
              ["second", "middle"],
              ["third", "end"],
            ] as const
          ).map(([key, anchor]) => {
            const runner = field.runners[key];
            if (!runner) return null;
            const [x, y] = BASE[key];
            const tx = key === "first" ? x + 8 : key === "third" ? x - 8 : x;
            const ty = key === "second" ? y - 10 : y + 13;
            return (
              <g key={`runner-${key}`}>
                <circle cx={x} cy={y} r="5.5" fill={bColor} stroke="#facc15" strokeWidth="1.6" />
                <text
                  x={tx}
                  y={ty}
                  textAnchor={anchor}
                  className="fill-amber-300 font-bold text-[6.5px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                >
                  {surname(runner.name)}
                </text>
              </g>
            );
          })}

          {/* 9 Defensive Fielders */}
          {field.defense.map((player) => {
            const [x, y] = FIELDERS[player.pos] || [125, 150];
            return (
              <g key={player.pos}>
                <circle cx={x} cy={y} r="7.2" fill={fColor} stroke="#ffffff" strokeWidth="1.1" />
                <text
                  x={x}
                  y={y + 2.2}
                  textAnchor="middle"
                  className="fill-white font-extrabold text-[5.8px]"
                >
                  {player.pos}
                </text>
                <text
                  x={x}
                  y={y + 14}
                  textAnchor="middle"
                  className="fill-white font-semibold text-[6.2px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                >
                  {surname(player.name)}
                </text>
              </g>
            );
          })}

          {/* Current Batter */}
          {field.batter && (
            <g>
              <circle cx={bx} cy="199.5" r="6" fill={bColor} stroke="#ffffff" strokeWidth="1.2" />
              <text x={bx} y="201.5" textAnchor="middle" className="fill-white font-extrabold text-[5.6px]">
                B
              </text>
              <text
                x={field.batSide === "L" ? 148 : 102}
                y="202.5"
                textAnchor={field.batSide === "L" ? "start" : "end"}
                className="fill-amber-200 font-bold text-[6.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
              >
                {surname(field.batter.name)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* On Deck & In the Hole footer */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-300 border border-slate-800">
        {field.onDeck && (
          <div>
            <span className="font-bold text-amber-400 uppercase tracking-wider mr-1.5">En cubierta:</span>
            <span className="font-medium text-white">{field.onDeck.name}</span>
          </div>
        )}
        {field.inHole && (
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider mr-1.5">Después:</span>
            <span className="font-medium text-slate-200">{field.inHole.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
