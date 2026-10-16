"use client";

import React, { useEffect, useState } from "react";
import { GamedayData, PlayByPlayItem } from "@/lib/types";
import { playerHeadshot, LVBP_TEAMS } from "@/lib/lvbp-teams";
import { LiveFieldSvg } from "./LiveFieldSvg";
import { StrikeZoneSvg } from "./StrikeZoneSvg";
import { SprayChartSvg } from "./SprayChartSvg";
import {
  Radio,
  Tv,
  Users,
  Play,
  Pause,
  SkipForward,
  ArrowLeft,
  Volume2,
  MessageSquare,
  Send,
  Flame,
  Trophy,
  ChevronDown,
} from "lucide-react";

const HIT_TYPES = new Set(["single", "double", "triple", "home_run"]);

function shortPlayerName(name = ""): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0].slice(0, 1)}. ${parts.slice(1).join(" ")}`;
}

function eventTone(eventType = ""): { badgeBg: string; border: string } {
  if (eventType === "home_run")
    return { badgeBg: "bg-amber-500 text-slate-950", border: "border-l-4 border-l-amber-400" };
  if (eventType === "double" || eventType === "triple")
    return { badgeBg: "bg-orange-500 text-white", border: "border-l-4 border-l-orange-500" };
  if (eventType === "single")
    return { badgeBg: "bg-emerald-600 text-white", border: "border-l-4 border-l-emerald-500" };
  if (["walk", "intent_walk", "hit_by_pitch"].includes(eventType))
    return { badgeBg: "bg-sky-600 text-white", border: "border-l-4 border-l-sky-500" };
  if (String(eventType).startsWith("strikeout"))
    return { badgeBg: "bg-red-600 text-white", border: "border-l-4 border-l-red-500" };
  return { badgeBg: "bg-slate-700 text-slate-200", border: "border-l-4 border-l-slate-700" };
}

function MiniBases({
  first,
  second,
  third,
}: {
  first?: boolean;
  second?: boolean;
  third?: boolean;
}) {
  return (
    <svg viewBox="0 0 60 50" className="w-12 h-10 mx-auto" aria-hidden="true">
      <rect
        x="-6"
        y="-6"
        width="12"
        height="12"
        transform="translate(30 12) rotate(45)"
        className={second ? "fill-amber-400 stroke-amber-200" : "fill-slate-800 stroke-slate-600"}
        strokeWidth="1.5"
      />
      <rect
        x="-6"
        y="-6"
        width="12"
        height="12"
        transform="translate(13 29) rotate(45)"
        className={third ? "fill-amber-400 stroke-amber-200" : "fill-slate-800 stroke-slate-600"}
        strokeWidth="1.5"
      />
      <rect
        x="-6"
        y="-6"
        width="12"
        height="12"
        transform="translate(47 29) rotate(45)"
        className={first ? "fill-amber-400 stroke-amber-200" : "fill-slate-800 stroke-slate-600"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CountDots({
  value,
  total,
  activeClass,
}: {
  value: number;
  total: number;
  activeClass: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, idx) => (
        <span
          key={idx}
          className={`w-2.5 h-2.5 rounded-full border ${
            idx < value ? `${activeClass} border-transparent` : "bg-slate-800 border-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

export function GamedayView({
  gameId,
  onBack,
  onSelectTeam,
}: {
  gameId: string;
  onBack: () => void;
  onSelectTeam?: (teamCode: string) => void;
}) {
  const [game, setGame] = useState<GamedayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"feed" | "box" | "field" | "spray" | "lineup" | "info">("feed");
  const [selectedPlayIdx, setSelectedPlayIdx] = useState<number>(-1);
  const [feedFilter, setFeedFilter] = useState<"all" | "scoring" | "hits" | "changes">("all");
  const [boxSide, setBoxSide] = useState<"away" | "home">("away");
  const [openInnings, setOpenInnings] = useState<Record<string, boolean>>({});

  // Quiniela & Interactive state (synced with Cloudflare KV via /api/lvbp/interactive)
  const [userVote, setUserVote] = useState<"away" | "home" | null>(null);
  const [votes, setVotes] = useState({ away: 0, home: 0 });
  const [liveViewers, setLiveViewers] = useState<number | null>(null);

  // Radio & Live Chat state
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioTeam, setRadioTeam] = useState<"away" | "home">("home");
  const [chatUser, setChatUser] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { id: string | number; author: string; team: string; time: string; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    let active = true;
    const loadGame = async () => {
      try {
        const res = await fetch(`/api/lvbp/game/${gameId}`, { cache: "no-store" });
        const data = await res.json();
        if (active && !data.error) {
          setGame(data);
        }
      } catch {
        // ignore transient error
      } finally {
        if (active) setLoading(false);
      }
    };

    loadGame();

    const timer = setInterval(() => {
      if (game?.status === "IN_PROGRESS") {
        loadGame();
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [gameId, game?.status]);

  // Sync Quiniela, Live Chat, and Viewer Presence from Cloudflare KV
  useEffect(() => {
    if (!game) return;
    let active = true;

    let sid = "anon";
    try {
      const savedSid = localStorage.getItem("enjuego_sid");
      if (savedSid) {
        sid = savedSid;
      } else {
        sid = `s-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("enjuego_sid", sid);
      }
      const savedVote = localStorage.getItem(`enjuego_vote_${gameId}`);
      if (savedVote === "away" || savedVote === "home") {
        setUserVote(savedVote);
      }
      const savedNick = localStorage.getItem("enjuego_nick");
      if (savedNick) setChatUser(savedNick);
    } catch {
      // ignore storage errors
    }

    const syncInteractive = async () => {
      try {
        const res = await fetch(
          `/api/lvbp/interactive?mode=game&gameId=${encodeURIComponent(gameId)}&away=${encodeURIComponent(
            game.awayTeam.code
          )}&home=${encodeURIComponent(game.homeTeam.code)}&sid=${encodeURIComponent(sid)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!active || data.error) return;
        if (data.votes) {
          setVotes({ away: data.votes.awayVotes, home: data.votes.homeVotes });
        }
        if (Array.isArray(data.chat)) {
          setChatMessages(
            data.chat.map((m: any) => ({
              id: m.id,
              author: m.user.startsWith("@") ? m.user : `@${m.user}`,
              team: m.team,
              time: m.time,
              text: m.text,
            }))
          );
        }
        if (typeof data.viewers === "number") {
          setLiveViewers(data.viewers);
        }
      } catch {
        // ignore network hiccup
      }
    };

    syncInteractive();
    const poll = setInterval(syncInteractive, 6000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [gameId, game?.awayTeam?.code, game?.homeTeam?.code]);

  // Live Spanish Radio Narrator when radioPlaying is enabled
  useEffect(() => {
    if (!radioPlaying || !game || typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const stationName =
      LVBP_TEAMS[radioTeam === "away" ? game.awayTeam.code : game.homeTeam.code]?.radioName ||
      "Circuito Radial LVBP";
    const lastPlayText =
      (game.feed || []).filter((p) => p.text).slice(-1)[0]?.text ||
      "Duelo cerrado desde el terreno de juego.";

    const narration = `Transmitiendo en vivo por ${stationName}. Pizarra en ${game.venue}: ${game.awayTeam.name} ${game.awayScore}, ${game.homeTeam.name} ${game.homeScore}. Última jugada: ${lastPlayText}`;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(narration);
    utter.lang = "es-VE";
    utter.rate = 1.04;
    window.speechSynthesis.speak(utter);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [radioPlaying, radioTeam, game?.awayScore, game?.homeScore, game?.feed?.length]);

  if (loading || !game) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Cargando Gameday LVBP en tiempo real…</p>
      </div>
    );
  }

  const isLive = game.status === "IN_PROGRESS";
  const isFinal = game.status === "FINISHED";
  const state = game.inningState || { inning: 9, top: false, balls: 0, strikes: 0, outs: 0 };

  // Group Play-by-Play by half-inning
  const groups: {
    key: string;
    inning: number;
    top: boolean;
    plays: PlayByPlayItem[];
    runs: number;
    endAway: number;
    endHome: number;
  }[] = [];

  let runAway = 0;
  let runHome = 0;
  for (const play of game.feed || []) {
    const key = `${play.inning}-${play.top ? "t" : "b"}`;
    let grp = groups[groups.length - 1];
    if (!grp || grp.key !== key) {
      grp = {
        key,
        inning: play.inning,
        top: play.top,
        plays: [],
        runs: 0,
        endAway: runAway,
        endHome: runHome,
      };
      groups.push(grp);
    }
    grp.plays.push(play);
    if (play.complete) {
      const diffA = Math.max(0, play.away - runAway);
      const diffH = Math.max(0, play.home - runHome);
      grp.runs += play.top ? diffA : diffH;
      runAway = play.away;
      runHome = play.home;
      grp.endAway = runAway;
      grp.endHome = runHome;
    }
  }

  // Top 3 Standouts (Figuras del Partido)
  const standouts: {
    row: any;
    team: typeof game.awayTeam;
    score: number;
    line: string;
  }[] = [];

  for (const side of ["away", "home"] as const) {
    const teamObj = side === "away" ? game.awayTeam : game.homeTeam;
    for (const r of game.boxscore?.[side]?.batting?.rows || []) {
      const sc = r.h + r.d * 0.6 + r.t * 1.2 + r.hr * 2 + r.rbi * 1.1 + r.r * 0.6 + r.bb * 0.3;
      if (sc > 0) {
        const parts = [`${r.h}-${r.ab}`];
        if (r.hr) parts.push(r.hr > 1 ? `${r.hr} HR` : "HR");
        if (r.t) parts.push(r.t > 1 ? `${r.t} 3B` : "3B");
        if (r.d) parts.push(r.d > 1 ? `${r.d} 2B` : "2B");
        if (r.rbi) parts.push(`${r.rbi} CI`);
        if (r.r) parts.push(`${r.r} C`);
        if (r.bb) parts.push(`${r.bb} BB`);
        standouts.push({ row: r, team: teamObj, score: sc, line: parts.join(" · ") });
      }
    }
  }
  standouts.sort((a, b) => b.score - a.score);
  const topStars = standouts.slice(0, 3);

  // Scoring plays
  const scoringPlays = (game.feed || []).filter((p) => p.complete && p.scoring && p.text);

  // Last completed play
  const completedPlays = (game.feed || []).filter((p) => p.complete && p.text);
  const lastCompletedPlay = completedPlays[completedPlays.length - 1];

  const handleVote = async (side: "away" | "home") => {
    if (userVote) return;
    setUserVote(side);
    setVotes((prev) => ({ ...prev, [side]: prev[side] + 1 }));
    try {
      localStorage.setItem(`enjuego_vote_${gameId}`, side);
      const res = await fetch("/api/lvbp/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", gameId, side }),
      });
      const data = await res.json();
      if (data?.votes) {
        setVotes({ away: data.votes.awayVotes, home: data.votes.homeVotes });
      }
    } catch {
      // optimistic update stays
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = chatInput.trim();
    if (!cleanText) return;
    setChatInput("");
    const authorHandle = chatUser.trim() || "@fanatico_lvbp";
    try {
      localStorage.setItem("enjuego_nick", authorHandle);
    } catch {
      // ignore
    }

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      author: authorHandle.startsWith("@") ? authorHandle : `@${authorHandle}`,
      team: game.homeTeam.shortName,
      time: "Ahora",
      text: cleanText,
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/lvbp/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          gameId,
          away: game.awayTeam.code,
          home: game.homeTeam.code,
          user: authorHandle,
          team: game.homeTeam.code,
          text: cleanText,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data?.chat)) {
        setChatMessages(
          data.chat.map((m: any) => ({
            id: m.id,
            author: m.user.startsWith("@") ? m.user : `@${m.user}`,
            team: m.team,
            time: m.time,
            text: m.text,
          }))
        );
      }
    } catch {
      // keep optimistic message
    }
  };

  const totalVotes = votes.away + votes.home;
  const awayVotePct = totalVotes > 0 ? Math.round((votes.away / totalVotes) * 100) : 50;
  const homeVotePct = totalVotes > 0 ? 100 - awayVotePct : 50;

  const playsWithPitches = (game.feed || []).filter((p) => p.pitches && p.pitches.length > 0);
  const currentTurnIdx =
    selectedPlayIdx >= 0 && selectedPlayIdx < playsWithPitches.length
      ? selectedPlayIdx
      : Math.max(0, playsWithPitches.length - 1);
  const selectedTurnPlay = playsWithPitches[currentTurnIdx] || lastCompletedPlay;

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la pizarra
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("field")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              tab === "field"
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
            }`}
          >
            ⚾ Ver Terreno 2D y Zona de Strike
          </button>
        </div>
      </div>

      {/* HERO SCOREBOARD + LINESCORE */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-6 shadow-xl">
        {/* Top Metadata + Broadcast Channels */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-slate-300">
              📍 {game.venue} · {game.venueCity}
            </span>
            <span className="capitalize">· {game.dateLabel}</span>
            {(game.tvChannels?.length ? game.tvChannels : game.tv ? [game.tv] : []).map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-bold text-slate-200"
              >
                <Tv className="w-3 h-3 text-amber-400" /> {ch}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-semibold">
            {game.info?.duration ? `⏱️ Duración: ${game.info.duration}` : `Juego Oficial #${game.id}`}
          </span>
        </div>

        {/* Teams & Main Score */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4">
          {/* Away Team */}
          <div
            onClick={() => onSelectTeam?.(game.awayTeam.code)}
            className="md:col-span-4 flex items-center justify-between bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5 cursor-pointer hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={game.awayTeam.logoUrl}
                alt={game.awayTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black text-white truncate">{game.awayTeam.nick}</div>
                <div className="text-xs text-slate-400 truncate">
                  {game.awayTeam.name} · ({game.awayTeam.wins}-{game.awayTeam.losses})
                </div>
              </div>
            </div>
            <span className="text-3xl sm:text-4xl font-black text-white tabular-nums ml-3">
              {game.awayScore}
            </span>
          </div>

          {/* Center Status / Diamond */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center py-1">
            {isLive ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-0.5 text-xs font-extrabold text-red-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> En vivo
                </span>
                <p className="mt-1 text-sm font-extrabold text-amber-400">
                  {state.top ? "Alta" : "Baja"} del {state.inning}°
                </p>
                <MiniBases
                  first={Boolean(game.field?.runners?.first)}
                  second={Boolean(game.field?.runners?.second)}
                  third={Boolean(game.field?.runners?.third)}
                />
                <div className="flex items-center gap-3 text-xs font-bold text-slate-300 mt-1">
                  <span>
                    Cuenta: <b className="text-white">{state.balls}-{state.strikes}</b>
                  </span>
                  <span className="flex items-center gap-1">
                    Outs: <CountDots value={state.outs} total={3} activeClass="bg-amber-400" />
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700 px-3.5 py-1 text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  {isFinal
                    ? `Final${game.box.innings.length > 9 ? ` / ${game.box.innings.length}` : ""}`
                    : game.time}
                </span>
                <p className="mt-1.5 text-xs text-slate-400">{game.venue}</p>
              </>
            )}
          </div>

          {/* Home Team */}
          <div
            onClick={() => onSelectTeam?.(game.homeTeam.code)}
            className="md:col-span-4 flex items-center justify-between bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5 cursor-pointer hover:border-slate-700 transition"
          >
            <span className="text-3xl sm:text-4xl font-black text-white tabular-nums mr-3 order-2 md:order-1">
              {game.homeScore}
            </span>
            <div className="flex items-center gap-3 min-w-0 order-1 md:order-2 md:text-right">
              <img
                src={game.homeTeam.logoUrl}
                alt={game.homeTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 md:order-2"
              />
              <div className="min-w-0 md:order-1">
                <div className="text-base sm:text-lg font-black text-white truncate">{game.homeTeam.nick}</div>
                <div className="text-xs text-slate-400 truncate">
                  {game.homeTeam.name} · ({game.homeTeam.wins}-{game.homeTeam.losses})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decisions line when Final */}
        {isFinal && game.decisions && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 bg-slate-900/60 py-2 px-3 rounded-lg border border-slate-800/80">
            {game.decisions.winner && (
              <span>
                <b className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 mr-1">G</b>
                {game.decisions.winner}
              </span>
            )}
            {game.decisions.loser && (
              <span>
                <b className="inline-block px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 mr-1">P</b>
                {game.decisions.loser}
              </span>
            )}
            {game.decisions.save && (
              <span>
                <b className="inline-block px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 mr-1">S</b>
                {game.decisions.save}
              </span>
            )}
          </div>
        )}

        {/* INNING BY INNING LINESCORE TABLE */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="py-2 px-3 text-left">EQUIPO</th>
                {game.box.innings.map((inn) => (
                  <th key={inn} className="py-2 px-2 min-w-[28px]">
                    {inn}
                  </th>
                ))}
                <th className="py-2 px-2.5 bg-slate-800/60 text-amber-400 font-black">C</th>
                <th className="py-2 px-2.5 bg-slate-800/40 text-slate-200 font-extrabold">H</th>
                <th className="py-2 px-2.5 bg-slate-800/40 text-slate-200 font-extrabold">E</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {(["away", "home"] as const).map((side) => {
                const team = side === "away" ? game.awayTeam : game.homeTeam;
                const runs = side === "away" ? game.awayScore : game.homeScore;
                const hits = side === "away" ? game.awayHits : game.homeHits;
                const errs = side === "away" ? game.awayErrors : game.homeErrors;
                return (
                  <tr key={side} className="hover:bg-slate-900/40">
                    <th className="py-2.5 px-3 text-left font-bold text-white flex items-center gap-2">
                      <img src={team.logoUrl} alt="" className="w-5 h-5" />
                      <span>{team.shortName}</span>
                    </th>
                    {game.box.innings.map((inn, idx) => {
                      const val = game.box[side][idx];
                      const isCurrentCell =
                        isLive && state.inning === inn && state.top === (side === "away");
                      return (
                        <td
                          key={inn}
                          className={`py-2.5 px-2 tabular-nums ${
                            isCurrentCell
                              ? "bg-amber-500/20 text-amber-300 font-black ring-1 ring-amber-400/50 rounded"
                              : val && val > 0
                                ? "text-white font-bold"
                                : "text-slate-400"
                          }`}
                        >
                          {val != null ? val : isFinal && side === "home" && idx === 8 && game.homeScore > game.awayScore ? "X" : ""}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2.5 bg-slate-800/60 font-black text-amber-400 text-sm tabular-nums">
                      {runs}
                    </td>
                    <td className="py-2.5 px-2.5 bg-slate-800/30 font-bold text-slate-200 tabular-nums">
                      {hits}
                    </td>
                    <td className="py-2.5 px-2.5 bg-slate-800/30 font-bold text-slate-300 tabular-nums">
                      {errs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MAIN TWO-COLUMN GAMEDAY LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Center Main Area (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. SITUACIÓN DEL JUEGO (SI ESTÁ EN VIVO) */}
          {isLive && game.matchup && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" /> Situación del juego
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-0.5 text-xs font-extrabold text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {state.top ? "Alta" : "Baja"} del {state.inning}°
                </span>
              </div>

              {lastCompletedPlay && (
                <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-200">
                  <span className="font-extrabold text-amber-400 uppercase mr-2">Última jugada:</span>
                  <span>{lastCompletedPlay.text}</span>
                </div>
              )}

              {/* Duel Pitcher vs Batter */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/90">
                {/* Pitcher */}
                <div className="md:col-span-5 flex items-center gap-3">
                  <img
                    src={playerHeadshot(game.matchup.pitcher.id)}
                    alt={game.matchup.pitcher.name}
                    className="w-14 h-14 rounded-full object-cover bg-slate-800 border-2 border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                      Lanzando · {game.matchup.pitcher.hand}
                    </span>
                    <div className="text-sm font-black text-white truncate">
                      {game.matchup.pitcher.name}
                    </div>
                    <p className="text-xs text-slate-300">
                      {game.matchup.pitcher.ip} IL · {game.matchup.pitcher.pitches} lanz. ·{" "}
                      {game.matchup.pitcher.k} K · {game.matchup.pitcher.bb} BB
                    </p>
                    <p className="text-[11px] text-slate-400">EFE {game.matchup.pitcher.era}</p>
                  </div>
                </div>

                {/* Count B-S-O Traffic Light */}
                <div className="md:col-span-1 flex md:flex-col items-center justify-center gap-3 md:gap-1.5 py-1 border-y md:border-y-0 md:border-x border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                    <span>B</span>
                    <CountDots value={game.matchup.balls} total={4} activeClass="bg-emerald-500" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                    <span>S</span>
                    <CountDots value={game.matchup.strikes} total={3} activeClass="bg-red-500" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                    <span>O</span>
                    <CountDots value={game.matchup.outs} total={3} activeClass="bg-amber-400" />
                  </div>
                </div>

                {/* Batter */}
                <div className="md:col-span-5 flex items-center justify-end gap-3 text-right">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      Al bate · {game.matchup.batter.order}° · {game.matchup.batter.pos}
                    </span>
                    <div className="text-sm font-black text-white truncate">
                      {game.matchup.batter.name}
                    </div>
                    <p className="text-xs text-slate-200 font-semibold">Hoy: {game.matchup.batter.today}</p>
                    <p className="text-[11px] text-slate-400">
                      AVE {game.matchup.batter.avg} · OPS {game.matchup.batter.ops}
                    </p>
                  </div>
                  <img
                    src={playerHeadshot(game.matchup.batter.id)}
                    alt={game.matchup.batter.name}
                    className="w-14 h-14 rounded-full object-cover bg-slate-800 border-2 border-amber-500/60 shrink-0"
                  />
                </div>
              </div>

              {/* 2D Field + Strike Zone Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
                <LiveFieldSvg game={game} />
                <StrikeZoneSvg pitches={game.matchup.pitches} />
              </div>
            </section>
          )}

          {/* 2. RESUMEN DEL PARTIDO (SI ES FINAL) */}
          {isFinal && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      game.homeScore > game.awayScore
                        ? game.homeTeam.logoUrl
                        : game.awayTeam.logoUrl
                    }
                    alt=""
                    className="w-10 h-10"
                  />
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                      Resumen Oficial LVBP
                    </span>
                    <h2 className="text-lg font-black text-white">
                      {game.homeScore > game.awayScore
                        ? `${game.homeTeam.nick} ${game.homeScore}, ${game.awayTeam.nick} ${game.awayScore}`
                        : `${game.awayTeam.nick} ${game.awayScore}, ${game.homeTeam.nick} ${game.homeScore}`}
                    </h2>
                  </div>
                </div>
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>

              {/* Figuras del partido (Top 3) */}
              {topStars.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                    Figuras del partido
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topStars.map(({ row, team, line }, index) => (
                      <article
                        key={row.id}
                        className={`rounded-xl p-3 border flex flex-col items-center text-center relative ${
                          index === 0
                            ? "bg-gradient-to-b from-amber-500/15 to-slate-950 border-amber-500/50"
                            : "bg-slate-950/70 border-slate-800"
                        }`}
                      >
                        {index === 0 && (
                          <span className="mb-1.5 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950">
                            ★ Jugador del juego
                          </span>
                        )}
                        <img
                          src={playerHeadshot(row.id)}
                          alt={row.name}
                          className="w-14 h-14 rounded-full object-cover bg-slate-800 border-2 border-slate-700 mb-2"
                        />
                        <strong className="text-sm font-bold text-white">{row.name}</strong>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <img src={team.logoUrl} alt="" className="w-3.5 h-3.5" />
                          {team.nick} · {row.pos}
                        </span>
                        <p className="mt-2 text-xs font-extrabold text-amber-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
                          {line}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Cara a Cara (Barras Comparativas) */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                  Cara a cara estadístico
                </h3>
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-white pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <img src={game.awayTeam.logoUrl} alt="" className="w-4 h-4" />
                      {game.awayTeam.nick}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {game.homeTeam.nick}
                      <img src={game.homeTeam.logoUrl} alt="" className="w-4 h-4" />
                    </span>
                  </div>
                  {(
                    [
                      ["Carreras", game.awayScore, game.homeScore],
                      ["Hits", game.awayHits, game.homeHits],
                      [
                        "Jonrones",
                        game.boxscore.away.batting.totals.hr,
                        game.boxscore.home.batting.totals.hr,
                      ],
                      [
                        "Boletos",
                        game.boxscore.away.batting.totals.bb,
                        game.boxscore.home.batting.totals.bb,
                      ],
                      [
                        "Ponchados",
                        game.boxscore.away.batting.totals.so,
                        game.boxscore.home.batting.totals.so,
                      ],
                      ["Errores", game.awayErrors, game.homeErrors],
                      ["Dejados en base", game.lob.away, game.lob.home],
                    ] as const
                  ).map(([label, a, h]) => {
                    const tot = a + h;
                    const leftPct = tot ? Math.round((a / tot) * 100) : 50;
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <b className={a > h ? "text-amber-400 font-black" : "text-slate-400"}>{a}</b>
                          <span className="text-slate-300 font-medium">{label}</span>
                          <b className={h > a ? "text-amber-400 font-black" : "text-slate-400"}>{h}</b>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                          <div
                            style={{ width: `${leftPct}%`, backgroundColor: game.awayTeam.color }}
                            className="h-full"
                          />
                          <div
                            style={{ width: `${100 - leftPct}%`, backgroundColor: game.homeTeam.color }}
                            className="h-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Anotaciones (Scoring Plays) */}
              {scoringPlays.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                    Anotaciones ({scoringPlays.length} jugadas de carrera)
                  </h3>
                  <ol className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {scoringPlays.map((play) => {
                      const team = play.top ? game.awayTeam : game.homeTeam;
                      return (
                        <li
                          key={play.i}
                          className="flex items-start justify-between gap-3 rounded-xl bg-slate-950/75 border border-slate-800 p-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <img src={team.logoUrl} alt="" className="w-5 h-5 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-400 mr-2">
                                {play.top ? "Alta" : "Baja"} {play.inning}°
                              </span>
                              <span className="text-slate-200">{play.text}</span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded bg-slate-800 px-2 py-1 font-bold text-white tabular-nums">
                            {game.awayTeam.shortName} {play.away} - {game.homeTeam.shortName} {play.home}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </section>
          )}

          {/* 3. LAS 5 PESTAÑAS DE DETALLE (JUGADA A JUGADA, BOX SCORE, MAPA DE BATEO, ALINEACIONES, DETALLES) */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950/60">
              {(
                [
                  ["feed", "Jugada a jugada"],
                  ["box", "Box score"],
                  ["field", "Terreno y Pitcheos"],
                  ["spray", "Mapa de bateo"],
                  ["lineup", "Alineaciones"],
                  ["info", "Detalles"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-xs sm:text-sm font-extrabold whitespace-nowrap border-b-2 transition cursor-pointer ${
                    tab === key
                      ? "border-amber-400 text-amber-400 bg-slate-900/80"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div key={tab} className="p-4 sm:p-5 animate-view-enter">
              {/* TAB 1: JUGADA A JUGADA */}
              {tab === "feed" && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "Todas"],
                        ["scoring", "Anotaciones"],
                        ["hits", "Hits"],
                        ["changes", "Cambios"],
                      ] as const
                    ).map(([fKey, fLabel]) => (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() => setFeedFilter(fKey)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          feedFilter === fKey
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {fLabel}
                      </button>
                    ))}
                  </div>

                  {/* Half-inning accordions (newest first) */}
                  <div className="space-y-3">
                    {[...groups].reverse().map((grp, grpIdx) => {
                      const plays = grp.plays.filter((p) => {
                        if (feedFilter === "scoring") return p.scoring;
                        if (feedFilter === "hits") return HIT_TYPES.has(p.eventType);
                        if (feedFilter === "changes") return p.actions.length > 0;
                        return true;
                      });
                      if (!plays.length) return null;

                      const team = grp.top ? game.awayTeam : game.homeTeam;
                      const isOpen =
                        feedFilter !== "all" ||
                        (openInnings[grp.key] !== undefined ? openInnings[grp.key] : grpIdx < 2);

                      return (
                        <div
                          key={grp.key}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenInnings((prev) => ({ ...prev, [grp.key]: !isOpen }))
                            }
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800/80 text-xs transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={team.logoUrl} alt="" className="w-5 h-5" />
                              <b className="text-white font-extrabold">
                                {grp.top ? "Alta" : "Baja"} del {grp.inning}°
                              </b>
                              <span className="text-slate-400">{team.nick} al bate</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {grp.runs > 0 && (
                                <span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 font-bold">
                                  {grp.runs} {grp.runs === 1 ? "carrera" : "carreras"}
                                </span>
                              )}
                              <strong className="text-slate-300 tabular-nums">
                                {game.awayTeam.shortName} {grp.endAway} · {game.homeTeam.shortName}{" "}
                                {grp.endHome}
                              </strong>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="divide-y divide-slate-800/70 p-3 space-y-2.5">
                              {[...plays].reverse().map((play) => {
                                const tone = eventTone(play.eventType);
                                return (
                                  <article
                                    key={play.i}
                                    className={`pt-2.5 first:pt-0 pl-3 rounded-r-lg ${tone.border}`}
                                  >
                                    {play.actions.map((act, i) => (
                                      <p
                                        key={i}
                                        className="mb-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20"
                                      >
                                        ⇄ {act}
                                      </p>
                                    ))}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2.5">
                                        <img
                                          src={playerHeadshot(play.batter.id)}
                                          alt={play.batter.name}
                                          className="w-9 h-9 rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0 mt-0.5"
                                        />
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${tone.badgeBg}`}
                                            >
                                              {play.complete ? play.event : "Al bate"}
                                            </span>
                                            <b className="text-xs font-extrabold text-white">
                                              {play.batter.name}
                                            </b>
                                            {play.rbi > 0 && (
                                              <span className="text-[11px] font-bold text-amber-400">
                                                +{play.rbi} CI
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-slate-200 leading-relaxed">
                                            {play.text ||
                                              `Cuenta ${play.balls}-${play.strikes} · ${play.outs} out(s)`}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                            <span className="text-[11px] text-slate-400">
                                              vs {play.pitcher.name}
                                            </span>
                                            {play.pitches.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                {play.pitches.map((pt) => (
                                                  <span
                                                    key={pt.n}
                                                    title={`#${pt.n} · ${pt.d}${pt.sp ? ` · ${Math.round(pt.sp)} mph` : ""}`}
                                                    className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-extrabold text-white ${
                                                      pt.k === "b"
                                                        ? "bg-emerald-600"
                                                        : pt.k === "s"
                                                          ? "bg-red-600"
                                                          : "bg-blue-600"
                                                    }`}
                                                  >
                                                    {pt.n}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {play.scoring && (
                                        <span className="shrink-0 rounded bg-amber-500/20 border border-amber-500/40 px-2 py-1 text-[11px] font-black text-amber-300 tabular-nums">
                                          {game.awayTeam.shortName} {play.away} -{" "}
                                          {game.homeTeam.shortName} {play.home}
                                        </span>
                                      )}
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: BOX SCORE */}
              {tab === "box" && (
                <div className="space-y-5">
                  <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    {(["away", "home"] as const).map((side) => {
                      const t = side === "away" ? game.awayTeam : game.homeTeam;
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setBoxSide(side)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition ${
                            boxSide === side
                              ? "bg-slate-800 text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <img src={t.logoUrl} alt="" className="w-4 h-4" />
                          {t.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Batting Table */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-2">
                      Bateo
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 text-left">Bateador</th>
                            <th className="py-2.5 px-2">VB</th>
                            <th className="py-2.5 px-2">C</th>
                            <th className="py-2.5 px-2">H</th>
                            <th className="py-2.5 px-2">CI</th>
                            <th className="py-2.5 px-2">BB</th>
                            <th className="py-2.5 px-2">K</th>
                            <th className="py-2.5 px-3">AVE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {game.boxscore[boxSide].batting.rows.map((r) => (
                            <tr
                              key={`${r.id}-${r.order}`}
                              className={r.starter ? "text-slate-200" : "text-slate-400 bg-slate-950/30"}
                            >
                              <td className="py-2 px-3 text-left font-semibold">
                                {!r.starter && <span className="text-slate-500 mr-1">↳</span>}
                                {r.starter ? `${Math.floor(r.order / 100)}° ` : ""}
                                <span className="text-white">{shortPlayerName(r.name)}</span>{" "}
                                <small className="text-slate-400 ml-1">{r.pos}</small>
                              </td>
                              <td className="py-2 px-2 tabular-nums">{r.ab}</td>
                              <td className="py-2 px-2 tabular-nums">{r.r}</td>
                              <td className="py-2 px-2 font-bold text-white tabular-nums">{r.h}</td>
                              <td className="py-2 px-2 tabular-nums">{r.rbi}</td>
                              <td className="py-2 px-2 tabular-nums">{r.bb}</td>
                              <td className="py-2 px-2 tabular-nums">{r.so}</td>
                              <td className="py-2 px-3 text-slate-300 tabular-nums">{r.avg}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-950 font-extrabold text-white border-t border-slate-800">
                            <td className="py-2.5 px-3 text-left">Totales</td>
                            <td className="py-2.5 px-2">{game.boxscore[boxSide].batting.totals.ab}</td>
                            <td className="py-2.5 px-2">{game.boxscore[boxSide].batting.totals.r}</td>
                            <td className="py-2.5 px-2">{game.boxscore[boxSide].batting.totals.h}</td>
                            <td className="py-2.5 px-2">{game.boxscore[boxSide].batting.totals.rbi}</td>
                            <td className="py-2.5 px-2">{game.boxscore[boxSide].batting.totals.bb}</td>
                            <td className="py-2.5 px-2">{game.boxscore[boxSide].batting.totals.so}</td>
                            <td className="py-2.5 px-3" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Pitching Table */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-400 mb-2">
                      Pitcheo
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                            <th className="py-2.5 px-3 text-left">Lanzador</th>
                            <th className="py-2.5 px-2">IL</th>
                            <th className="py-2.5 px-2">H</th>
                            <th className="py-2.5 px-2">C</th>
                            <th className="py-2.5 px-2">CL</th>
                            <th className="py-2.5 px-2">BB</th>
                            <th className="py-2.5 px-2">K</th>
                            <th className="py-2.5 px-2">NP</th>
                            <th className="py-2.5 px-3">EFE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {game.boxscore[boxSide].pitching.rows.map((p) => (
                            <tr key={p.id} className="text-slate-200">
                              <td className="py-2 px-3 text-left font-semibold text-white">
                                {shortPlayerName(p.name)}
                                {p.tag && (
                                  <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                                    {p.tag}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 font-bold tabular-nums">{p.ip}</td>
                              <td className="py-2 px-2 tabular-nums">{p.h}</td>
                              <td className="py-2 px-2 tabular-nums">{p.r}</td>
                              <td className="py-2 px-2 tabular-nums">{p.er}</td>
                              <td className="py-2 px-2 tabular-nums">{p.bb}</td>
                              <td className="py-2 px-2 font-bold text-white tabular-nums">{p.k}</td>
                              <td className="py-2 px-2 tabular-nums">{p.pitches}</td>
                              <td className="py-2 px-3 text-slate-300 tabular-nums">{p.era}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2.5: TERRENO 2D Y ZONA DE STRIKE POR TURNO */}
              {tab === "field" && (
                <div className="space-y-4">
                  {selectedTurnPlay ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/80 border border-slate-800 p-3">
                        <div className="text-xs">
                          <span className="font-extrabold text-amber-400 uppercase mr-2">
                            {selectedTurnPlay.top ? "Alta" : "Baja"} {selectedTurnPlay.inning}° ·{" "}
                            {selectedTurnPlay.event}
                          </span>
                          <span className="text-white font-bold">
                            {selectedTurnPlay.batter.name} vs {selectedTurnPlay.pitcher.name}
                          </span>
                          <p className="text-slate-300 mt-1">{selectedTurnPlay.text}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentTurnIdx <= 0}
                            onClick={() => setSelectedPlayIdx(Math.max(0, currentTurnIdx - 1))}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-white cursor-pointer"
                          >
                            ‹ Turno ant.
                          </button>
                          <span className="text-[11px] font-bold text-slate-400 px-2 tabular-nums">
                            {currentTurnIdx + 1} / {playsWithPitches.length}
                          </span>
                          <button
                            type="button"
                            disabled={currentTurnIdx >= playsWithPitches.length - 1}
                            onClick={() =>
                              setSelectedPlayIdx(
                                Math.min(playsWithPitches.length - 1, currentTurnIdx + 1)
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-white cursor-pointer"
                          >
                            Sig. turno ›
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <LiveFieldSvg game={game} />
                        <StrikeZoneSvg pitches={selectedTurnPlay.pitches} />
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <LiveFieldSvg game={game} />
                      <StrikeZoneSvg pitches={game.matchup?.pitches || []} />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MAPA DE BATEO (SPRAY CHART) */}
              {tab === "spray" && <SprayChartSvg game={game} />}

              {/* TAB 4: ALINEACIONES */}
              {tab === "lineup" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["away", "home"] as const).map((side) => {
                    const team = side === "away" ? game.awayTeam : game.homeTeam;
                    const rows = game.lineups[side] || [];
                    return (
                      <div
                        key={side}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2.5"
                      >
                        <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                          <img src={team.logoUrl} alt="" className="w-5 h-5" />
                          {team.name}
                        </h3>
                        <ol className="divide-y divide-slate-800/60 text-xs">
                          {rows.map((r) => (
                            <li
                              key={r.id}
                              className="py-2 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 text-slate-400 font-bold">{r.order}.</span>
                                <img
                                  src={playerHeadshot(r.id)}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover bg-slate-800"
                                />
                                <div>
                                  <div className="font-bold text-white">{r.name}</div>
                                  <div className="text-[11px] text-slate-400">Posición: {r.position}</div>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-slate-300 tabular-nums">
                                <div>AVE {r.avg}</div>
                                <div className="text-slate-400">OPS {r.ops}</div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 5: DETALLES */}
              {tab === "info" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ["Estadio", `${game.venue} · ${game.venueCity}`],
                      ["Dimensiones", game.venueLines || "LF 335' · CF 400' · RF 335'"],
                      [
                        "Capacidad",
                        game.info.capacity ? `${game.info.capacity.toLocaleString("es-VE")} espectadores` : "—",
                      ],
                      ["Superficie", game.info.surface || "Grama natural"],
                      [
                        "Clima",
                        `${game.info.weather?.condition || "Despejado"} · ${game.info.weather?.temp || "28 °C"}`,
                      ],
                      ["Viento", game.info.weather?.wind || "8 mph"],
                      ["Primer lanzamiento", `${game.time} (Hora de Venezuela)`],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 flex flex-col gap-1"
                      >
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{k}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>

                  {game.info.officials.length > 0 && (
                    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5">
                      <h4 className="font-extrabold text-amber-400 uppercase text-[11px] mb-2">
                        Cuerpo de Árbitros (Umpires)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {game.info.officials.map((u, idx) => (
                          <div key={idx} className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                            <span className="text-amber-300 font-black mr-1.5">{u.role}:</span>
                            <span className="text-slate-200">{u.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Sidebar (4 cols): Radio, Quiniela & Live Chat */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 1. CIRCUITO RADIAL EN VIVO */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Circuito Radial
                  </span>
                  <h3 className="text-sm font-black text-white">
                    {
                      LVBP_TEAMS[
                        radioTeam === "away" ? game.awayTeam.code : game.homeTeam.code
                      ]?.radioName
                    }
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRadioPlaying((p) => !p)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                  radioPlaying
                    ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25"
                    : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
                aria-label="Reproducir o pausar radio"
              >
                {radioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["away", "home"] as const).map((side) => {
                const t = side === "away" ? game.awayTeam : game.homeTeam;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setRadioTeam(side)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                      radioTeam === side
                        ? "bg-slate-800 border-amber-400/60 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <img src={t.logoUrl} alt="" className="w-4 h-4" />
                    {t.nick}
                  </button>
                );
              })}
            </div>

            {radioPlaying && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs text-amber-300 border border-slate-800">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Volume2 className="w-4 h-4 animate-bounce" /> Narración de jugadas activa…
                </span>
                <span className="text-[10px] uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">AUDIO</span>
              </div>
            )}
          </section>

          {/* 2. QUINIELA DEL JUEGO */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Quiniela LVBP</h3>
                <p className="text-xs text-slate-400">¿Quién se lleva la victoria?</p>
              </div>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                {totalVotes} {totalVotes === 1 ? "voto" : "votos"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(["away", "home"] as const).map((side) => {
                const team = side === "away" ? game.awayTeam : game.homeTeam;
                const pct = side === "away" ? awayVotePct : homeVotePct;
                const picked = userVote === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => handleVote(side)}
                    className={`rounded-xl p-3 border text-center transition cursor-pointer ${
                      picked
                        ? "bg-amber-500/15 border-amber-400 text-white"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200"
                    }`}
                  >
                    <img src={team.logoUrl} alt="" className="w-9 h-9 mx-auto mb-1.5" />
                    <div className="text-xs font-extrabold">{team.nick}</div>
                    <div className="text-lg font-black text-amber-400">{pct}%</div>
                    {picked && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400">
                        ✓ Tu voto
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${awayVotePct}%`, backgroundColor: game.awayTeam.color }}
                className="h-full transition-all"
              />
              <div
                style={{ width: `${homeVotePct}%`, backgroundColor: game.homeTeam.color }}
                className="h-full transition-all"
              />
            </div>
          </section>

          {/* 3. CHAT EN VIVO DE LA TRIBUNA */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col h-[410px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">Comentarios del Juego</h3>
              </div>
              <span className="text-[11px] text-slate-400">{chatMessages.length} mensajes</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 text-xs text-slate-400">
                  <MessageSquare className="w-6 h-6 text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">Aún no hay comentarios en este partido</p>
                  <p className="mt-1">Escribe el primer mensaje abajo para iniciar la conversación.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-xl bg-slate-950/80 border border-slate-800/90 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <strong className="text-amber-300">{msg.author}</strong>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-slate-200">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="mt-3 space-y-2">
              <input
                type="text"
                value={chatUser}
                onChange={(e) => setChatUser(e.target.value)}
                placeholder="Tu nombre o @usuario"
                maxLength={24}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe un comentario sobre el juego…"
                  maxLength={180}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 p-2 font-bold transition cursor-pointer"
                  aria-label="Enviar comentario"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
