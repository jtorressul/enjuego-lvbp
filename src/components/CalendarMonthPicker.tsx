"use client";

import React, { useEffect, useMemo, useRef } from "react";
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
  fullLabel: string;
} {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 10) - 1, d || 1));
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const daysInMonth = useMemo(
    () => gameDates.filter((d) => d.startsWith(monthKey)),
    [gameDates, monthKey]
  );
  const monthIdx = monthKeys.indexOf(monthKey);
  const selectedLabel = selectedDate ? formatDayChip(selectedDate).fullLabel : "";

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !selectedDate) return;
    const chip = root.querySelector<HTMLElement>(`[data-cal-date="${selectedDate}"]`);
    if (!chip) return;
    const left = chip.offsetLeft - root.clientWidth / 2 + chip.clientWidth / 2;
    root.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [selectedDate, monthKey]);

  const nudgeStrip = (dir: -1 | 1) => {
    if ((dir < 0 && canShiftDayPrev) || (dir > 0 && canShiftDayNext)) {
      onShiftDay(dir);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onShiftMonth(-1)}
          disabled={monthIdx <= 0}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-amber-400 disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Mes
        </button>
        <p className="text-sm font-black text-slate-950 capitalize text-center">
          {monthKey ? formatMonthYear(monthKey) : "Calendario"}
        </p>
        <button
          type="button"
          onClick={() => onShiftMonth(1)}
          disabled={monthIdx >= monthKeys.length - 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:border-amber-400 disabled:opacity-30 cursor-pointer"
        >
          Mes
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {monthKeys.map((mk) => {
          const label = formatMonthYear(mk).split(" ")[0] || mk;
          return (
            <button
              key={mk}
              type="button"
              onClick={() => {
                const first = gameDates.find((d) => d.startsWith(mk));
                if (first) onSelectDate(first);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold border shrink-0 cursor-pointer capitalize ${
                mk === monthKey
                  ? "bg-slate-950 text-amber-300 border-slate-950"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => nudgeStrip(-1)}
          disabled={!canShiftDayPrev}
          className="shrink-0 w-9 h-9 rounded-full border border-slate-200 bg-slate-50 text-slate-800 hover:bg-amber-50 hover:border-amber-400 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
          aria-label="Día anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollerRef}
          className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 touch-pan-x"
        >
          {daysInMonth.map((d) => {
            const f = formatDayChip(d);
            const count = gamesPerDay[d] || 0;
            const active = d === selectedDate;
            const isToday = d === todayIso;
            return (
              <button
                key={d}
                type="button"
                data-cal-date={d}
                onClick={() => onSelectDate(d)}
                className={`snap-center min-w-[4.25rem] px-2 py-2 rounded-2xl border text-center shrink-0 cursor-pointer transition-transform duration-200 active:scale-95 ${
                  active
                    ? "bg-amber-400 text-slate-950 border-amber-500 shadow-sm scale-105"
                    : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
                }`}
              >
                <div className="text-[9px] font-bold uppercase opacity-80">{f.weekdayShort}</div>
                <div className="text-lg font-black leading-none">{f.dayNum}</div>
                <div className="text-[9px] font-extrabold mt-0.5 opacity-75">
                  {count}j{isToday ? " · hoy" : ""}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => nudgeStrip(1)}
          disabled={!canShiftDayNext}
          className="shrink-0 w-9 h-9 rounded-full border border-slate-200 bg-slate-50 text-slate-800 hover:bg-amber-50 hover:border-amber-400 disabled:opacity-30 cursor-pointer inline-flex items-center justify-center"
          aria-label="Día siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {selectedDate ? (
        <p className="text-xs text-slate-500 font-medium capitalize">
          {selectedLabel} ·{" "}
          <span className="font-black text-slate-800">{gamesOnSelectedDay}</span>{" "}
          {gamesOnSelectedDay === 1 ? "partido" : "partidos"}
        </p>
      ) : null}
    </div>
  );
}
