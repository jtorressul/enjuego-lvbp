"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function formatMonthYear(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 10) - 1, 1));
  return new Intl.DateTimeFormat("es-VE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function isoFromParts(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarMonthPicker({
  monthKey,
  monthKeys,
  selectedDate,
  gameDates,
  gamesPerDay,
  todayIso,
  gamesOnSelectedDay,
  onSelectDate,
  onShiftMonth,
}: {
  monthKey: string;
  monthKeys: string[];
  selectedDate: string;
  gameDates: string[];
  gamesPerDay: Record<string, number>;
  todayIso: string;
  gamesOnSelectedDay: number;
  onSelectDate: (iso: string) => void;
  onShiftMonth: (delta: -1 | 1) => void;
}) {
  const gameDateSet = useMemo(() => new Set(gameDates), [gameDates]);

  const grid = useMemo(() => {
    if (!monthKey) return { cells: [] as { iso: string; day: number; inMonth: boolean }[] };
    const [y, m] = monthKey.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    // Monday-first: JS getUTCDay() Sun=0 -> Mon=0 padding
    const pad = (first.getUTCDay() + 6) % 7;
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < pad; i++) {
      cells.push({ iso: "", day: 0, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: isoFromParts(y, m, d), day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ iso: "", day: 0, inMonth: false });
    }
    return { cells };
  }, [monthKey]);

  const monthIdx = monthKeys.indexOf(monthKey);

  return (
    <div className="rounded-2xl border-2 border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white p-3 sm:p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onShiftMonth(-1)}
          disabled={monthIdx <= 0}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-amber-400 disabled:opacity-30 cursor-pointer"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
            Elegir fecha
          </p>
          <p className="text-sm sm:text-base font-black text-slate-950 capitalize truncate">
            {monthKey ? formatMonthYear(monthKey) : "Calendario"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onShiftMonth(1)}
          disabled={monthIdx >= monthKeys.length - 1}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-amber-400 disabled:opacity-30 cursor-pointer"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {monthKeys.map((mk) => {
          const short = formatMonthYear(mk).split(" ")[0]?.slice(0, 3) || mk;
          return (
            <button
              key={mk}
              type="button"
              onClick={() => {
                const first = gameDates.find((d) => d.startsWith(mk));
                if (first) onSelectDate(first);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shrink-0 cursor-pointer ${
                mk === monthKey
                  ? "bg-slate-950 text-amber-300 border-slate-950"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-[9px] font-extrabold text-slate-400 py-0.5">
            {w}
          </div>
        ))}
        {grid.cells.map((cell, idx) => {
          if (!cell.inMonth) {
            return <div key={`pad-${idx}`} className="aspect-square" />;
          }
          const hasGames = gameDateSet.has(cell.iso);
          const selected = cell.iso === selectedDate;
          const isToday = cell.iso === todayIso;
          const count = gamesPerDay[cell.iso] || 0;
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={!hasGames}
              onClick={() => hasGames && onSelectDate(cell.iso)}
              className={`aspect-square rounded-xl border text-[11px] font-black flex flex-col items-center justify-center gap-0.5 transition cursor-pointer disabled:cursor-default disabled:opacity-35 ${
                selected
                  ? "bg-amber-400 text-slate-950 border-amber-500 shadow-md scale-[1.02]"
                  : hasGames
                    ? "bg-white text-slate-900 border-slate-200 hover:border-amber-400 hover:bg-amber-50"
                    : "bg-slate-50 text-slate-300 border-transparent"
              } ${isToday && !selected ? "ring-2 ring-sky-300 ring-offset-1" : ""}`}
            >
              <span>{cell.day}</span>
              {hasGames ? (
                <span className="text-[8px] font-bold opacity-80">{count}j</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <p className="text-xs text-slate-600 font-medium text-center border-t border-amber-100 pt-2">
          <span className="font-black text-slate-900">{gamesOnSelectedDay}</span>{" "}
          {gamesOnSelectedDay === 1 ? "partido" : "partidos"} este día
        </p>
      ) : null}
    </div>
  );
}
