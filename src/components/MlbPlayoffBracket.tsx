"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostseasonBracketNode } from "@/app/api/mlb/postseason/route";

interface MlbPlayoffBracketProps {
  season?: number;
}

const CARD_HEIGHT = 138;
const ROW_GAP = 22;
const ROW_STEP = CARD_HEIGHT + ROW_GAP; // 160px per row
const TOTAL_HEIGHT = ROW_STEP * 4 - ROW_GAP; // 618px total height for 4 rows

// Exact vertical top positions (in px) so connector lines align to the pixel
const ROW_TOP = [
  0, // Row 0 (F_3, D_4) -> center = 69
  ROW_STEP, // Row 1 (F_4, D_3) -> top = 160, center = 229
  ROW_STEP * 2, // Row 2 (F_1, D_2) -> top = 320, center = 389
  ROW_STEP * 3, // Row 3 (F_2, D_1) -> top = 480, center = 549
];

const CS_TOP = [
  (ROW_TOP[0] + ROW_TOP[1]) / 2, // L_2 (NLCS) -> top = 80, center = 149
  (ROW_TOP[2] + ROW_TOP[3]) / 2, // L_1 (ALCS) -> top = 400, center = 469
];

const WS_TOP = (CS_TOP[0] + CS_TOP[1]) / 2; // W_1 (World Series) -> top = 240, center = 309

function SeriesCard({
  node,
  topPx,
}: {
  node: PostseasonBracketNode | undefined;
  topPx: number;
}) {
  // Allow user to cycle games in the series if they click the "Partido N" pill
  const [selectedGameIdx, setSelectedGameIdx] = useState<number | null>(null);

  if (!node) {
    return (
      <div
        style={{ top: `${topPx}px`, height: `${CARD_HEIGHT}px` }}
        className="w-[228px] rounded-2xl bg-[#f1f3f4] p-3.5 animate-pulse absolute left-0"
      />
    );
  }

  const playedOrLiveGames = node.games.filter(
    (g) => g.status === "FINISHED" || g.status === "IN_PROGRESS"
  );
  const activeGame =
    selectedGameIdx !== null && node.games[selectedGameIdx]
      ? node.games[selectedGameIdx]
      : null;

  // Scores for either the default latest game or the user-selected game in the series
  const topScore = activeGame
    ? activeGame.awayTeamId === node.topTeam.id
      ? activeGame.awayScore
      : activeGame.homeScore
    : node.topTeam.score;

  const bottomScore = activeGame
    ? activeGame.awayTeamId === node.bottomTeam.id
      ? activeGame.awayScore
      : activeGame.homeScore
    : node.bottomTeam.score;

  const gameLabel = activeGame ? `Partido ${activeGame.gameNumber}` : node.gameLabel;
  const gamePkToOpen = activeGame ? activeGame.gamePk : node.activeGamePk;
  const isLive = (activeGame ? activeGame.status : node.status) === "IN_PROGRESS";

  const hasScores = typeof topScore === "number" && typeof bottomScore === "number";
  const topWonGame = hasScores && (topScore as number) > (bottomScore as number);
  const bottomWonGame = hasScores && (bottomScore as number) > (topScore as number);

  // Determine which team is highlighted dark vs muted gray
  const topHighlighted = !hasScores || topWonGame;
  const bottomHighlighted = !hasScores || bottomWonGame;

  const handleCycleGame = (e: React.MouseEvent) => {
    if (playedOrLiveGames.length <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    const currentNum = activeGame
      ? activeGame.gameNumber
      : Number(node.gameLabel.replace(/\D+/g, "")) || playedOrLiveGames.length;
    const currentIdxInPlayed = playedOrLiveGames.findIndex((g) => g.gameNumber === currentNum);
    const nextPlayed =
      playedOrLiveGames[(currentIdxInPlayed + 1) % playedOrLiveGames.length];
    const fullIdx = node.games.findIndex((g) => g.gamePk === nextPlayed.gamePk);
    setSelectedGameIdx(fullIdx >= 0 ? fullIdx : null);
  };

  const cardInner = (
    <div
      style={{ top: `${topPx}px`, height: `${CARD_HEIGHT}px` }}
      className="w-[228px] rounded-2xl bg-[#f1f3f4] hover:bg-[#e8eaed] transition-colors px-3.5 py-3 flex flex-col justify-between absolute left-0 select-none group border border-transparent hover:border-slate-300"
    >
      {/* Top row: Date on left, Partido N pill on right */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-normal text-[#1f1f1f] leading-none flex items-center gap-1.5">
          {isLive && (
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
          )}
          {node.dateLabel}
        </span>

        <button
          type="button"
          onClick={handleCycleGame}
          title={
            playedOrLiveGames.length > 1
              ? "Clic para alternar entre los partidos de la serie"
              : undefined
          }
          className={`rounded-full bg-[#e2e5e9] text-[#1f1f1f] px-2.5 py-0.5 text-[11px] font-medium leading-tight transition ${
            playedOrLiveGames.length > 1
              ? "hover:bg-amber-300 cursor-pointer"
              : "cursor-default"
          }`}
        >
          {gameLabel}
        </button>
      </div>

      {/* Middle 2 team rows */}
      <div className="space-y-1.5 my-0.5">
        {/* Top Team */}
        <div className="flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-full bg-[#1f1f1f] flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <img
                src={node.topTeam.logoUrl}
                alt={node.topTeam.nick}
                className="w-4 h-4 object-contain"
              />
            </span>
            <span
              className={`text-[14px] truncate leading-tight ${
                topHighlighted
                  ? "text-[#1f1f1f] font-medium"
                  : "text-[#5f6368] font-normal"
              }`}
            >
              {node.topTeam.nick}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {topScore !== null && (
              <span
                className={`text-[14px] tabular-nums ${
                  topHighlighted
                    ? "text-[#1f1f1f] font-medium"
                    : "text-[#5f6368] font-normal"
                }`}
              >
                {topScore}
              </span>
            )}
            {topWonGame && (
              <svg
                viewBox="0 0 6 10"
                className="w-1.5 h-2.5 fill-[#1f1f1f] -mr-3.5 ml-1 shrink-0"
              >
                <polygon points="0,5 6,0 6,10" />
              </svg>
            )}
          </div>
        </div>

        {/* Bottom Team */}
        <div className="flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center p-1 shrink-0 overflow-hidden ${
                node.bottomTeam.isPlaceholder ? "bg-slate-400" : "bg-[#1f1f1f]"
              }`}
            >
              <img
                src={node.bottomTeam.logoUrl}
                alt={node.bottomTeam.nick}
                className="w-4 h-4 object-contain"
              />
            </span>
            <span
              className={`text-[14px] truncate leading-tight ${
                bottomHighlighted
                  ? "text-[#1f1f1f] font-medium"
                  : "text-[#5f6368] font-normal"
              }`}
            >
              {node.bottomTeam.nick}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {bottomScore !== null && (
              <span
                className={`text-[14px] tabular-nums ${
                  bottomHighlighted
                    ? "text-[#1f1f1f] font-medium"
                    : "text-[#5f6368] font-normal"
                }`}
              >
                {bottomScore}
              </span>
            )}
            {bottomWonGame && (
              <svg
                viewBox="0 0 6 10"
                className="w-1.5 h-2.5 fill-[#1f1f1f] -mr-3.5 ml-1 shrink-0"
              >
                <polygon points="0,5 6,0 6,10" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Bottom series summary text */}
      <div className="text-[11.5px] text-[#5f6368] leading-snug truncate">
        {node.summaryText}
      </div>
    </div>
  );

  if (gamePkToOpen) {
    return (
      <Link href={`/juego/${gamePkToOpen}`} className="contents">
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

export default function MlbPlayoffBracket({ season = 2026 }: MlbPlayoffBracketProps) {
  const [seriesById, setSeriesById] = useState<Record<string, PostseasonBracketNode>>({});
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    async function loadBracket() {
      try {
        const res = await fetch(`/api/mlb/postseason?season=${season}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.seriesById) {
          setSeriesById(data.seriesById);
        }
      } catch {
        // silent fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBracket();
    const timer = setInterval(loadBracket, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [season]);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 12);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 12);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [seriesById]);

  const scrollHorizontal = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "right" ? 320 : -320,
      behavior: "smooth",
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden relative">
      {/* Floating Left/Right navigation buttons matching screenshot */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollHorizontal("left")}
          aria-label="Desplazar cuadro a la izquierda"
          className="absolute left-3 top-3 z-20 w-9 h-9 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollHorizontal("right")}
          aria-label="Desplazar cuadro a la derecha"
          className="absolute right-3 top-3 z-20 w-9 h-9 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className="overflow-x-auto no-scrollbar px-5 pt-4 pb-6"
      >
        <div className="min-w-[996px]">
          {/* Column Headers */}
          <div className="grid grid-cols-[228px_28px_228px_28px_228px_28px_228px] items-center mb-4 text-[14px] font-normal text-[#1f1f1f] text-center">
            <div>Comodines</div>
            <div />
            <div>Serie Divisional</div>
            <div />
            <div>Finales de Conferencia</div>
            <div />
            <div>Serie Mundial</div>
          </div>

          {/* Bracket Canvas */}
          <div
            style={{ height: `${TOTAL_HEIGHT}px` }}
            className="grid grid-cols-[228px_28px_228px_28px_228px_28px_228px] relative"
          >
            {/* COLUMN 1: COMODINES (F_3, F_4, F_1, F_2) */}
            <div className="relative">
              <SeriesCard node={seriesById["F_3"]} topPx={ROW_TOP[0]} />
              <SeriesCard node={seriesById["F_4"]} topPx={ROW_TOP[1]} />
              <SeriesCard node={seriesById["F_1"]} topPx={ROW_TOP[2]} />
              <SeriesCard node={seriesById["F_2"]} topPx={ROW_TOP[3]} />
            </div>

            {/* CONNECTOR 1 -> 2: 4 Straight Horizontal Lines */}
            <svg
              width="28"
              height={TOTAL_HEIGHT}
              className="overflow-visible pointer-events-none"
            >
              {ROW_TOP.map((top, i) => {
                const cy = top + CARD_HEIGHT / 2;
                return (
                  <line
                    key={i}
                    x1={0}
                    y1={cy}
                    x2={28}
                    y2={cy}
                    stroke="#70757a"
                    strokeWidth="1.25"
                  />
                );
              })}
            </svg>

            {/* COLUMN 2: SERIE DIVISIONAL (D_4, D_3, D_2, D_1) */}
            <div className="relative">
              <SeriesCard node={seriesById["D_4"]} topPx={ROW_TOP[0]} />
              <SeriesCard node={seriesById["D_3"]} topPx={ROW_TOP[1]} />
              <SeriesCard node={seriesById["D_2"]} topPx={ROW_TOP[2]} />
              <SeriesCard node={seriesById["D_1"]} topPx={ROW_TOP[3]} />
            </div>

            {/* CONNECTOR 2 -> 3: Two Bracket Forks (D_4+D_3 -> L_2, D_2+D_1 -> L_1) */}
            <svg
              width="28"
              height={TOTAL_HEIGHT}
              className="overflow-visible pointer-events-none"
            >
              {[
                [ROW_TOP[0], ROW_TOP[1], CS_TOP[0]],
                [ROW_TOP[2], ROW_TOP[3], CS_TOP[1]],
              ].map(([topA, topB, targetTop], i) => {
                const y1 = topA + CARD_HEIGHT / 2;
                const y2 = topB + CARD_HEIGHT / 2;
                const ym = targetTop + CARD_HEIGHT / 2;
                return (
                  <g key={i} stroke="#70757a" strokeWidth="1.25" fill="none">
                    <path d={`M 0 ${y1} H 14 V ${y2} H 0`} />
                    <line x1={14} y1={ym} x2={28} y2={ym} />
                  </g>
                );
              })}
            </svg>

            {/* COLUMN 3: FINALES DE CONFERENCIA (L_2, L_1) */}
            <div className="relative">
              <SeriesCard node={seriesById["L_2"]} topPx={CS_TOP[0]} />
              <SeriesCard node={seriesById["L_1"]} topPx={CS_TOP[1]} />
            </div>

            {/* CONNECTOR 3 -> 4: Single Bracket Fork (L_2+L_1 -> W_1) */}
            <svg
              width="28"
              height={TOTAL_HEIGHT}
              className="overflow-visible pointer-events-none"
            >
              {(() => {
                const y1 = CS_TOP[0] + CARD_HEIGHT / 2;
                const y2 = CS_TOP[1] + CARD_HEIGHT / 2;
                const ym = WS_TOP + CARD_HEIGHT / 2;
                return (
                  <g stroke="#70757a" strokeWidth="1.25" fill="none">
                    <path d={`M 0 ${y1} H 14 V ${y2} H 0`} />
                    <line x1={14} y1={ym} x2={28} y2={ym} />
                  </g>
                );
              })()}
            </svg>

            {/* COLUMN 4: SERIE MUNDIAL (W_1) */}
            <div className="relative">
              <SeriesCard node={seriesById["W_1"]} topPx={WS_TOP} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer note matching exact screenshot */}
      <div className="border-t border-slate-200 px-5 py-3 bg-white flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] italic text-[#1f1f1f]">
          Todos los horarios corresponden a la hora de Venezuela
        </p>
        {!loading && (
          <span className="text-[11px] text-slate-500 font-medium">
            Haz clic en cualquier serie para abrir el Gameday en vivo o en &ldquo;Partido N&rdquo; para ver otro juego
          </span>
        )}
      </div>
    </div>
  );
}
