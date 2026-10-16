"use client";

import React from "react";
import { PitchPoint } from "@/lib/types";

const PITCH_COLOR: Record<"b" | "s" | "x", string> = {
  b: "#22c55e", // Bola (Verde)
  s: "#ef4444", // Strike (Rojo)
  x: "#3b82f6", // En juego (Azul)
};

// Calibración de coordenadas LVBP/MLB sobre el plato
const ZX = 108;
const ZSX = 29;
const ZSY = 47;
const ZY0 = 244.5;
const ZS = 88;

export function StrikeZoneSvg({ pitches }: { pitches: PitchPoint[] }) {
  const located = (pitches || []).filter((p) => p.x != null && p.y != null);
  const ref = located.find((p) => p.zt && p.zb) || { zt: 3.2, zb: 1.55 };
  const mid = ((ref.zt || 3.2) + (ref.zb || 1.55)) / 2;
  const zoneW = 1.417 * ZS;
  const zoneH = ((ref.zt || 3.2) - (ref.zb || 1.55)) * ZS;
  const cx = 130;
  const cy = 128;

  const gx = (x: number) => Math.max(24, Math.min(236, cx + ((x - ZX) / ZSX) * ZS));
  const gy = (y: number) => Math.max(24, Math.min(228, cy - ((ZY0 - y) / ZSY - mid) * ZS));

  const left = cx - zoneW / 2;
  const top = cy - zoneH / 2;
  const latest = pitches?.[pitches.length - 1];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">
          Turno actual <span className="text-xs font-normal text-slate-400 ml-1">vista del receptor</span>
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1">
            <i className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Bola
          </span>
          <span className="flex items-center gap-1">
            <i className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Strike
          </span>
          <span className="flex items-center gap-1">
            <i className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> En juego
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <svg
          viewBox="0 0 260 262"
          className="w-full max-w-[230px] mx-auto h-auto rounded-xl border border-slate-800 bg-slate-900/90 shadow-inner"
          role="img"
          aria-label="Ubicación de los lanzamientos"
        >
          <rect x="0" y="0" width="260" height="262" rx="14" fill="#0f172a" />
          {/* Shadow zone */}
          <rect
            x={(left - 11).toFixed(1)}
            y={(top - 11).toFixed(1)}
            width={(zoneW + 22).toFixed(1)}
            height={(zoneH + 22).toFixed(1)}
            rx="6"
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* 9-grid Strike Zone */}
          <rect
            x={left.toFixed(1)}
            y={top.toFixed(1)}
            width={zoneW.toFixed(1)}
            height={zoneH.toFixed(1)}
            fill="#1e293b"
            fillOpacity="0.65"
            stroke="#94a3b8"
            strokeWidth="1.6"
          />
          <path
            d={`M${(left + zoneW / 3).toFixed(1)} ${top.toFixed(1)}v${zoneH.toFixed(1)}M${(
              left +
              (2 * zoneW) / 3
            ).toFixed(1)} ${top.toFixed(1)}v${zoneH.toFixed(1)}M${left.toFixed(1)} ${(
              top +
              zoneH / 3
            ).toFixed(1)}h${zoneW.toFixed(1)}M${left.toFixed(1)} ${(
              top +
              (2 * zoneH) / 3
            ).toFixed(1)}h${zoneW.toFixed(1)}`}
            stroke="#334155"
            strokeWidth="1"
          />
          {/* Home plate perspective */}
          <path
            d={`M${cx - 24} 244 L${cx + 24} 244 L${cx + 24} 250 L${cx} 256 L${cx - 24} 250 Z`}
            fill="#f8fafc"
            stroke="#64748b"
            strokeWidth="1.2"
          />

          {/* Pitch markers */}
          {located.length > 0 ? (
            located.map((pitch) => {
              const px = gx(pitch.x!).toFixed(1);
              const py = gy(pitch.y!).toFixed(1);
              return (
                <g key={pitch.n}>
                  <circle
                    cx={px}
                    cy={py}
                    r="10"
                    fill={PITCH_COLOR[pitch.k]}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  >
                    <title>{`#${pitch.n} · ${pitch.d}${pitch.ty ? ` (${pitch.ty})` : ""}${pitch.sp ? ` · ${Math.round(pitch.sp)} mph` : ""}`}</title>
                  </circle>
                  <text
                    x={px}
                    y={(Number(py) + 3.5).toFixed(1)}
                    textAnchor="middle"
                    className="fill-white font-extrabold text-[10px]"
                  >
                    {pitch.n}
                  </text>
                </g>
              );
            })
          ) : (
            <text x="130" y="132" textAnchor="middle" className="fill-slate-500 text-[11px] font-medium">
              Esperando 1er envío...
            </text>
          )}
        </svg>

        {/* Pitch sequence list */}
        <div className="flex flex-col gap-2">
          {latest && (
            <div className="rounded-lg bg-slate-800/90 border border-slate-700 px-3 py-2 text-xs">
              <span className="font-extrabold text-amber-400 mr-1.5">#{latest.n}</span>
              <span className="font-semibold text-white">{latest.d}</span>
              {latest.ty && <span className="text-slate-300"> · {latest.ty}</span>}
              {latest.sp && <span className="ml-1 font-bold text-sky-400">{Math.round(latest.sp)} mph</span>}
            </div>
          )}

          {pitches?.length ? (
            <ol className="space-y-1.5 max-h-[210px] overflow-y-auto pr-1">
              {pitches.map((p) => (
                <li
                  key={p.n}
                  className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2.5 py-1.5 text-xs border border-slate-800/80"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 ${
                        p.k === "b"
                          ? "bg-emerald-600"
                          : p.k === "s"
                            ? "bg-red-600"
                            : "bg-blue-600"
                      }`}
                    >
                      {p.n}
                    </span>
                    <span className="text-slate-200 truncate">{p.d}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.ty && <span className="text-[11px] text-slate-400 italic">{p.ty}</span>}
                    {p.sp && (
                      <span className="font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                        {Math.round(p.sp)} mph
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-500 italic py-4">Aún no hay lanzamientos en este turno.</p>
          )}
        </div>
      </div>
    </div>
  );
}
