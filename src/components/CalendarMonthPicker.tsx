"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function formatMonthYear(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 10) - 1, 1));
  return new Intl.DateTimeFormat("es-VE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function formatDayChip(iso: string): {
  weekdayShort: string;
  dayNum: string;
  monthShort: string;
  fullLabel: string;
} {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 10) - 1, d || 1));
  const monthShort = new Intl.DateTimeFormat("es-VE", { month: "short", timeZone: "UTC" })
    .format(dt)
    .replace(".", "")
    .toUpperCase();
  const weekdayShort = new Intl.DateTimeFormat("es-VE", { weekday: "short", timeZone: "UTC" })
    .format(dt)
    .replace(".", "");
  const fullLabel = new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
  return {
    weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1),
    dayNum: String(d),
    monthShort,
    fullLabel,
  };
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
  onShiftDay,
  canShiftDayPrev,
  canShiftDayNext,
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
  onShiftDay: (delta: -1 | 1) => void;
  canShiftDayPrev: boolean;
  canShiftDayNext: boolean;
}) {
  const daysInMonth = useMemo(
    () => gameDates.filter((d) => d.startsWith(monthKey)),
    [gameDates, monthKey]
  );

  const monthIdx = monthKeys.indexOf(monthKey);
  const selectedLabel = selectedDate ? formatDayChip(selectedDate).fullLabel : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onShiftMonth(-1)}
            disabled={monthIdx <= 0}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-400 disabled:opacity-30 cursor-pointer"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onShiftMonth(1)}
            disabled={monthIdx >= monthKeys.length - 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-amber-400 disabled:opacity-30 cursor-pointer"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm font-black text-slate-950 capitalize">{formatMonthYear(monthKey)}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onShiftDay(-1)}
            disabled={!canShiftDayPrev}
            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-30 cursor-pointer"
          >
            Ant.
          </button>
          <button
            type="button"
            onClick={() => onShiftDay(1)}
            disabled={!canShiftDayNext}
            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-30 cursor-pointer"
          >
            Sig.
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {monthKeys.map((mk) => {
          const label = formatMonthYear(mk).split(" ")[0]?.slice(0, 3) || mk;
          return (
            <button
              key={mk}
              type="button"
              onClick={() => {
                const first = gameDates.find((d) => d.startsWith(mk));
                if (first) onSelectDate(first);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shrink-0 cursor-pointer capitalize ${
                mk === monthKey
                  ? "bg-amber-400 text-slate-950 border-amber-400"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
        {daysInMonth.map((d) => {
          const f = formatDayChip(d);
          const count = gamesPerDay[d] || 0;
          const active = d === selectedDate;
          const isToday = d === todayIso;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDate(d)}
              className={`min-w-[3.5rem] px-2 py-2 rounded-xl border text-center shrink-0 cursor-pointer transition ${
                active
                  ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                  : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
              }`}
            >
              <div className="text-[9px] font-bold uppercase opacity-80">{f.weekdayShort}</div>
              <div className="text-base font-black leading-none">{f.dayNum}</div>
              <div className="text-[9px] font-extrabold mt-0.5 opacity-75">
                {count}j{isToday ? " · hoy" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <p className="text-xs text-slate-500 font-medium capitalize border-t border-slate-100 pt-2">
          {selectedLabel} ·{" "}
          <span className="font-black text-slate-800">{gamesOnSelectedDay}</span>{" "}
          {gamesOnSelectedDay === 1 ? "partido" : "partidos"}
        </p>
      ) : null}
    </div>
  );
}
