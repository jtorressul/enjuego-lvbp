"use client";

import React, { useEffect, useState } from "react";
import { GamedayData, PlayByPlayItem, ScheduleGame } from "@/lib/types";
import { playerHeadshot, LVBP_TEAMS } from "@/lib/lvbp-teams";
import { BroadcastChannelsRow } from "@/components/BroadcastChannelsRow";
import {
  openOfficialBroadcast,
  isOpenTvChannel,
  filterOpenTvChannels,
  getChannelInfo,
} from "@/lib/official-broadcast-links";
import {
  Radio,
  Tv,
  Users,
  Play,
  Pause,
  SkipForward,
  ArrowLeft,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  Flame,
  Trophy,
  ChevronDown,
  MapPin,
  Clock,
  Check,
  ExternalLink,
  Info,
  Sparkles,
  Share2,
  Loader2,
} from "lucide-react";
import {
  resolveTeamRadio,
  openOfficialRadio,
  type RadioBroadcastInfo,
} from "@/lib/radio-circuits";
import { AdBanner } from "@/components/AdBanner";
import type { UserProfile } from "@/lib/user-auth";

const HIT_TYPES = new Set(["single", "double", "triple", "home_run"]);

function shortPlayerName(name = ""): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0].slice(0, 1)}. ${parts.slice(1).join(" ")}`;
}

function eventTone(eventType = ""): { badgeBg: string; border: string } {
  if (eventType === "home_run")
    return { badgeBg: "bg-amber-400 text-slate-950 font-black shadow-2xs", border: "border-l-4 border-l-amber-500" };
  if (eventType === "double" || eventType === "triple")
    return { badgeBg: "bg-orange-500 text-white font-black shadow-2xs", border: "border-l-4 border-l-orange-500" };
  if (eventType === "single")
    return { badgeBg: "bg-emerald-600 text-white font-black shadow-2xs", border: "border-l-4 border-l-emerald-600" };
  if (["walk", "intent_walk", "hit_by_pitch"].includes(eventType))
    return { badgeBg: "bg-sky-600 text-white font-black shadow-2xs", border: "border-l-4 border-l-sky-600" };
  if (String(eventType).startsWith("strikeout"))
    return { badgeBg: "bg-rose-600 text-white font-black shadow-2xs", border: "border-l-4 border-l-rose-500" };
  return { badgeBg: "bg-slate-100 text-slate-700 border border-slate-200 font-bold", border: "border-l-4 border-l-slate-300" };
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
    <div className="relative w-14 h-12 mx-auto my-1 flex items-center justify-center">
      <svg viewBox="0 0 60 52" className="w-14 h-12" aria-hidden="true">
        {/* Baseline diamond outline */}
        <path
          d="M30 43 L48 25 L30 7 L12 25 Z"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        {/* Second Base (Top) */}
        <rect
          x="-5.5"
          y="-5.5"
          width="11"
          height="11"
          transform="translate(30 7) rotate(45)"
          className={
            second
              ? "fill-amber-400 stroke-amber-500 drop-shadow-xs"
              : "fill-white stroke-slate-300"
          }
          strokeWidth="1.5"
        />
        {/* Third Base (Left) */}
        <rect
          x="-5.5"
          y="-5.5"
          width="11"
          height="11"
          transform="translate(12 25) rotate(45)"
          className={
            third
              ? "fill-amber-400 stroke-amber-500 drop-shadow-xs"
              : "fill-white stroke-slate-300"
          }
          strokeWidth="1.5"
        />
        {/* First Base (Right) */}
        <rect
          x="-5.5"
          y="-5.5"
          width="11"
          height="11"
          transform="translate(48 25) rotate(45)"
          className={
            first
              ? "fill-amber-400 stroke-amber-500 drop-shadow-xs"
              : "fill-white stroke-slate-300"
          }
          strokeWidth="1.5"
        />
        {/* Home Plate (Bottom Pentagon) */}
        <polygon
          points="27,42 33,42 34,45 30,48 26,45"
          fill="#cbd5e1"
          stroke="#94a3b8"
          strokeWidth="1"
        />
      </svg>
    </div>
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
          className={`w-2.5 h-2.5 rounded-full border transition-all ${
            idx < value
              ? `${activeClass} border-transparent shadow-xs scale-110`
              : "bg-slate-200 border-slate-300"
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
  currentUser,
  onRequireAuth,
  onShareGame,
}: {
  gameId: string;
  onBack: () => void;
  onSelectTeam?: (teamCode: string) => void;
  currentUser?: UserProfile | null;
  onRequireAuth?: () => void;
  onShareGame?: (game: ScheduleGame) => void;
}) {
  const [game, setGame] = useState<GamedayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"resumen" | "feed" | "box" | "lineup" | "medios" | "info">("resumen");
  const [feedFilter, setFeedFilter] = useState<"all" | "scoring" | "hits" | "changes">("all");
  const [boxSide, setBoxSide] = useState<"away" | "home">("away");
  const [openInnings, setOpenInnings] = useState<Record<string, boolean>>({});

  // Quiniela & Interactive state (synced with Cloudflare KV via /api/lvbp/interactive)
  const [userVote, setUserVote] = useState<"away" | "home" | null>(null);
  const [votes, setVotes] = useState({ away: 0, home: 0 });
  const [liveViewers, setLiveViewers] = useState<number | null>(null);

  // Radio state
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const currentPlayingUrlRef = React.useRef<string>("");
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioTeam, setRadioTeam] = useState<"away" | "home">("home");
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [showInlineEmbed, setShowInlineEmbed] = useState(false);
  const [audioBuffering, setAudioBuffering] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [radioVolume, setRadioVolume] = useState(1);
  const [chatUser, setChatUser] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { id: string | number; author: string; team: string; time: string; text: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");

  const activeRadio: RadioBroadcastInfo = React.useMemo(() => {
    if (!game) {
      return resolveTeamRadio("CAR", "home");
    }
    const sideRadio = radioTeam === "away" ? game.radio?.away : game.radio?.home;
    if (sideRadio) return sideRadio;
    return resolveTeamRadio(
      radioTeam === "away" ? game.awayTeam.code : game.homeTeam.code,
      radioTeam
    );
  }, [game, radioTeam]);

  const activeStation = React.useMemo(() => {
    if (activeRadio.stations && activeRadio.stations.length > 0) {
      return (
        activeRadio.stations.find((s) => s.id === selectedStationId) ||
        activeRadio.stations[0]
      );
    }
    return null;
  }, [activeRadio, selectedStationId]);

  const effectiveStreamUrl = activeStation?.streamUrl || activeRadio.streamUrl;
  const effectiveWebUrl = activeStation?.webPlayerUrl || activeRadio.webPlayerUrl;
  const effectiveEmbedUrl = activeStation?.embedUrl || activeRadio.embedUrl;
  const effectiveEmbedType = activeStation?.embedType || activeRadio.embedType;

  useEffect(() => {
    let active = true;
    let latestStatus: string | undefined;
    setLoading(true);
    setGame(null);

    const loadGame = async () => {
      try {
        const res = await fetch(`/api/lvbp/game/${gameId}?_t=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (active && !data.error) {
          latestStatus = data.status;
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
      if (!document.hidden && latestStatus !== "FINISHED") {
        loadGame();
      }
    }, 15000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && latestStatus !== "FINISHED") {
        loadGame();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [gameId]);

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
          )}&home=${encodeURIComponent(game.homeTeam.code)}&sid=${encodeURIComponent(sid)}`
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
    const poll = setInterval(() => {
      if (!document.hidden) {
        syncInteractive();
      }
    }, 18000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [gameId, game?.awayTeam?.code, game?.homeTeam?.code]);

  // Handle Real Radio Audio Stream Playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!radioPlaying) {
      if (!audio.paused) {
        audio.pause();
      }
      currentPlayingUrlRef.current = "";
      setAudioBuffering(false);
      return;
    }

    if (!effectiveStreamUrl) {
      if (!audio.paused) {
        audio.pause();
      }
      currentPlayingUrlRef.current = "";
      setAudioBuffering(false);
      setAudioError(false);
      return;
    }

    // Only assign audio.src and invoke audio.load() when the stream URL actually changes!
    // Never restart or reload an ongoing stream on background score/status polling re-renders.
    if (currentPlayingUrlRef.current !== effectiveStreamUrl) {
      currentPlayingUrlRef.current = effectiveStreamUrl;
      setAudioBuffering(true);
      setAudioError(false);
      audio.src = effectiveStreamUrl;
      audio.volume = isMuted ? 0 : radioVolume;
      audio.load();
      audio
        .play()
        .then(() => {
          setAudioBuffering(false);
        })
        .catch((err) => {
          console.warn("Direct stream playback blocked or failed:", err);
          setAudioBuffering(false);
          setAudioError(true);
        });
    } else if (audio.paused) {
      audio
        .play()
        .then(() => {
          setAudioBuffering(false);
        })
        .catch((err) => {
          console.warn("Direct stream playback resume failed:", err);
          setAudioBuffering(false);
          setAudioError(true);
        });
    }
  }, [radioPlaying, effectiveStreamUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : radioVolume;
    }
  }, [radioVolume, isMuted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      currentPlayingUrlRef.current = "";
    };
  }, [gameId]);

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
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    const cleanText = chatInput.trim();
    if (!cleanText) return;
    setChatInput("");
    const rawHandle = currentUser.handle
      ? currentUser.handle.replace(/^@/, "")
      : currentUser.name.toLowerCase().replace(/[^a-z0-9]/g, "_") || "fan";
    const authorHandle = `@${rawHandle}`;
    const authorTeam = currentUser.favoriteTeam || game.homeTeam.code;

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      author: authorHandle,
      team: authorTeam,
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
          user: rawHandle,
          team: authorTeam,
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

  const effectiveYtId =
    game.youtubeVideoId ||
    (game.id === "870075" ||
    (game.date === "2026-10-19" &&
      ((game.awayTeam.code === "MAG" && game.homeTeam.code === "LAR") ||
        (game.awayTeam.code === "LAR" && game.homeTeam.code === "MAG")))
      ? "JpQMLHvmpB4"
      : null);

  const totalVotes = votes.away + votes.home;
  const awayVotePct = totalVotes > 0 ? Math.round((votes.away / totalVotes) * 100) : 50;
  const homeVotePct = totalVotes > 0 ? 100 - awayVotePct : 50;

  const renderMediaAndSocial = () => (
    <>
{/* 1. SEÑAL DE TV EN VIVO (TV ABIERTA CON VENTANITA PIP / CABLE CON GUÍA) */}
          {(() => {
            const rawChannels = (game.tvChannels && game.tvChannels.length > 0)
              ? game.tvChannels
              : game.tv
              ? game.tv.split(" · ")
              : [];
            const openTvList = filterOpenTvChannels(rawChannels);
            const cableList = rawChannels.filter((c) => !isOpenTvChannel(c));
            const hasOpenTv = openTvList.length > 0;
            const hasCable = cableList.length > 0;

            if (!hasOpenTv && !hasCable) return null;

            const primaryOpenChannel = hasOpenTv ? openTvList[0] : null;
            const gameTitle = `${game.awayTeam.name} vs ${game.homeTeam.name}`;

            if (hasOpenTv && primaryOpenChannel) {
              const primaryInfo = getChannelInfo(primaryOpenChannel);
              const isYouTube =
                primaryOpenChannel.toLowerCase().includes("youtube") || Boolean(effectiveYtId);

              return (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${
                        isYouTube ? "bg-red-50 border border-red-200 text-red-600" : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                      }`}>
                        {isYouTube ? <Play className="w-4 h-4 fill-current" /> : <Tv className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isYouTube ? "text-red-600" : "text-emerald-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            isYouTube ? "bg-red-500" : "bg-emerald-500"
                          }`} /> {isYouTube ? "YouTube LVBP Oficial" : "TV Abierta Nacional"}
                        </span>
                        <h3 className="text-sm font-black text-slate-900">
                          {isYouTube ? "Transmisión en Vivo" : "Señal en Vivo Gratuita"}
                        </h3>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      isYouTube ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}>
                      {primaryOpenChannel}
                    </span>
                  </div>

                  {isYouTube ? (
                    /* Inline YouTube Player (Sin PiP, embebido directo en la web) */
                    <div className="space-y-2">
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${effectiveYtId || "JpQMLHvmpB4"}?autoplay=0&rel=0&modestbranding=1`}
                          title="Transmisión Oficial en Vivo"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                        <span className="flex items-center gap-1.5 font-bold text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                          Directo en la web (sin PiP)
                        </span>
                        <a
                          href={game.youtubeUrl || `https://www.youtube.com/watch?v=${effectiveYtId || "JpQMLHvmpB4"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-red-600 transition"
                        >
                          <span>Abrir en YouTube</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* TV Screen Preview Box (Desktop PiP launcher for other open channels) */
                    <div
                      className="keep-dark rounded-xl p-4 text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[140px] border"
                      style={{
                        background: "linear-gradient(135deg, #0b1324 0%, #13203c 100%)",
                        borderColor: "#1e293b",
                        color: "#ffffff",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase"
                          style={{ backgroundColor: "#e11d48", color: "#ffffff" }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> SEÑAL EN VIVO
                        </span>
                        <span className="text-[11px] font-bold" style={{ color: "#94a3b8" }}>
                          {game.awayTeam.shortName} vs {game.homeTeam.shortName}
                        </span>
                      </div>

                      <div className="my-2.5">
                        <div className="text-xs font-black flex items-center gap-1.5" style={{ color: "#ffffff" }}>
                          Canal: {openTvList.join(" · ")}
                        </div>
                        <p className="text-[11px] font-medium mt-0.5 leading-snug" style={{ color: "#cbd5e1" }}>
                          {primaryInfo.description} Sintoniza en una ventanita flotante para seguir las jugadas al instante sin salir de la web.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openOfficialBroadcast(primaryOpenChannel, gameTitle, "pip")}
                          className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-sm active:scale-98"
                        >
                          <Play className="w-3.5 h-3.5 fill-slate-950" />
                          <span>Ver {primaryOpenChannel} en PiP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openOfficialBroadcast(primaryOpenChannel, gameTitle, "popout")}
                          title="Abrir en ventana grande"
                          className="p-2 rounded-xl transition cursor-pointer"
                          style={{
                            backgroundColor: "#1e293b",
                            borderColor: "#334155",
                            border: "1px solid #334155",
                            color: "#e2e8f0",
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Other open TV channels */}
                  {openTvList.length > 1 && (
                    <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Otras señales abiertas:</span>
                      {openTvList.slice(1).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => openOfficialBroadcast(ch, gameTitle, "pip")}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 transition cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-emerald-800" />
                          <span>{ch} (PiP)</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Also on cable / subscription */}
                  {cableList.length > 0 && (
                    <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-slate-600">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Suscripción / Cable:</span>
                      {cableList.map((ch) => {
                        const cInfo = getChannelInfo(ch);
                        return (
                          <a
                            key={ch}
                            href={cInfo.officialUrl || "https://www.beisbolplay.com/lvbp-envivo"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition"
                          >
                            <span>{ch}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            }

            // Game is ONLY on Cable / Subscription (no open TV stream)
            return (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        Transmisión por Suscripción
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        Canales por Cable
                      </h3>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-700">
                    {cableList[0]}
                  </span>
                </div>

                <div
                  className="keep-dark rounded-xl p-4 text-white border space-y-3"
                  style={{
                    background: "linear-gradient(135deg, #0b1324 0%, #13203c 100%)",
                    borderColor: "#1e293b",
                    color: "#ffffff",
                  }}
                >
                  <div>
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ backgroundColor: "#1e293b", color: "#cbd5e1" }}
                    >
                      <Info className="w-3 h-3 text-amber-400" /> Transmisión Exclusiva de Pago
                    </div>
                    <p className="text-xs leading-relaxed font-medium" style={{ color: "#cbd5e1" }}>
                      Este juego no cuenta con señal de televisión abierta nacional gratuita. Transmisión disponible a través de operadoras de televisión paga y streaming autorizado.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {cableList.map((ch) => {
                      const info = getChannelInfo(ch);
                      return (
                        <div
                          key={ch}
                          className="p-2.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: "#060a12",
                            borderColor: "#1e293b",
                            color: "#ffffff",
                          }}
                        >
                          <div className="font-black flex items-center justify-between" style={{ color: "#fbbf24" }}>
                            <span>{ch}</span>
                            {info.officialUrl && (
                              <a
                                href={info.officialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] hover:underline flex items-center gap-1"
                                style={{ color: "#94a3b8" }}
                              >
                                <span>Sitio</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {info.dialInfo && (
                            <div className="text-[11px] mt-1 font-mono" style={{ color: "#cbd5e1" }}>
                              {info.dialInfo}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <a
                    href="https://www.beisbolplay.com/lvbp-envivo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-sm active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Ver en BeisbolPlay (Streaming Oficial)</span>
                  </a>
                </div>
              </section>
            );
          })()}

          {/* 2. CIRCUITO RADIAL EN VIVO */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <audio
              ref={audioRef}
              preload="none"
              onWaiting={() => setAudioBuffering(true)}
              onPlaying={() => {
                setAudioBuffering(false);
                setAudioError(false);
              }}
              onError={() => {
                if (!radioPlaying) return;
                setAudioBuffering(false);
                setAudioError(true);
              }}
            />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Circuito Radial en Vivo
                  </span>
                  <h3 className="text-sm font-black text-slate-900 truncate" title={activeRadio.circuitName}>
                    {activeRadio.circuitName}
                  </h3>
                </div>
              </div>

              {effectiveStreamUrl ? (
                <button
                  type="button"
                  onClick={() => setRadioPlaying((p) => !p)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 shadow-sm active:scale-95 ${
                    radioPlaying
                      ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25 ring-2 ring-amber-300"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                  aria-label="Reproducir o pausar circuito radial"
                >
                  {audioBuffering ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : radioPlaying ? (
                    <Pause className="w-4 h-4 fill-slate-950" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5 fill-slate-700" />
                  )}
                </button>
              ) : effectiveEmbedUrl ? (
                <button
                  type="button"
                  onClick={() => setShowInlineEmbed((s) => !s)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95"
                >
                  <Play className="w-3 h-3 fill-slate-950" />
                  <span>{showInlineEmbed ? "Ocultar" : "Escuchar"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openOfficialRadio(activeRadio)}
                  title="Sintonizar en ventana flotante"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95"
                >
                  <Play className="w-3 h-3 fill-slate-950" />
                  <span>Sintonizar</span>
                </button>
              )}
            </div>

            {/* Selector de Equipo: Visitante vs Home Club */}
            <div className="grid grid-cols-2 gap-2">
              {(["away", "home"] as const).map((side) => {
                const t = side === "away" ? game.awayTeam : game.homeTeam;
                const isSelected = radioTeam === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => {
                      if (radioTeam !== side) {
                        setRadioTeam(side);
                        setSelectedStationId("");
                        setAudioError(false);
                        setShowInlineEmbed(false);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-black border transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <img src={t.logoUrl} alt="" className="w-4 h-4 object-contain" />
                    <span>{t.nick}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-selector de Emisoras cuando el equipo tiene varias (ej: Tiburones Candela Pura + RQ910) */}
            {activeRadio.stations && activeRadio.stations.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] font-black uppercase text-slate-500 pl-1">Señal:</span>
                {activeRadio.stations.map((st) => {
                  const isCur = (activeStation?.id || activeRadio.stations![0].id) === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStationId(st.id);
                        setAudioError(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        isCur
                          ? "bg-amber-400 text-slate-950 shadow-2xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span>{st.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ficha Informativa del Circuito Radial */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    <span>{activeStation?.name || activeRadio.stationName}</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-700 mt-0.5">
                    {activeStation?.dial || activeRadio.dial}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                  {activeRadio.city}
                </span>
              </div>

              {activeRadio.narrators && (
                <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-200/60">
                  <span className="font-bold text-slate-700">Narración: </span>
                  {activeRadio.narrators}
                </div>
              )}

              {/* Reproductor embebido en la web (solo si es YouTube y el usuario lo activa expresamente) */}
              {showInlineEmbed && effectiveEmbedUrl && effectiveEmbedType === "youtube" && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-300 bg-black aspect-video relative shadow-inner">
                  <iframe
                    src={effectiveEmbedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={activeRadio.circuitName}
                  />
                </div>
              )}

              {/* Barra de Estado y Controles de Audio */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {audioBuffering ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <Loader2 className="w-3 h-3 animate-spin" /> Conectando señal en vivo…
                    </span>
                  ) : radioPlaying && !audioError ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                      <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-600" /> Transmisión en vivo
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500">
                      Audio directo dentro de la web
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {effectiveStreamUrl && radioPlaying && (
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 transition cursor-pointer"
                      title={isMuted ? "Activar audio" : "Silenciar audio"}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {effectiveEmbedUrl && effectiveEmbedType === "youtube" && (
                    <button
                      type="button"
                      onClick={() => setShowInlineEmbed((s) => !s)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-[10px] font-black text-red-800 transition cursor-pointer"
                    >
                      <span>{showInlineEmbed ? "Ocultar Video" : "Ver YouTube"}</span>
                    </button>
                  )}

                  {effectiveWebUrl && (
                    <button
                      type="button"
                      onClick={() => openOfficialRadio(activeRadio)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-[11px] font-black text-amber-950 transition cursor-pointer"
                      title="Abrir en ventana flotante"
                    >
                      <span>PiP</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {audioError && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                  La señal directa de esta emisora requiere su reproductor web oficial. Toca <strong>"PiP"</strong> para escucharla en una ventanita flotante sin cerrar el juego.
                </div>
              )}
            </div>
          </section>

          {/* 2. QUINIELA DEL JUEGO */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Quiniela LVBP</h3>
                <p className="text-xs text-slate-500">¿Quién se lleva la victoria?</p>
              </div>
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
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
                        ? "bg-amber-50 border-amber-400 text-slate-950 ring-1 ring-amber-400/40 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-800"
                    }`}
                  >
                    <img src={team.logoUrl} alt="" className="w-9 h-9 mx-auto mb-1.5 object-contain" />
                    <div className="text-xs font-black">{team.nick}</div>
                    <div className="text-lg font-black text-amber-700">{pct}%</div>
                    {picked && (
                      <span className="inline-flex items-center justify-center gap-1 mt-1 text-[10px] font-black text-emerald-600">
                        <Check className="w-3 h-3" /> Tu voto
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200/80 overflow-hidden flex">
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

          {/* SPONSOR BANNER IN GAMEDAY (PRO STYLE) */}
          <AdBanner slot="gameday-sidebar" />

          {/* 3. CHAT EN VIVO DE LA TRIBUNA */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col h-[410px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900">Comentarios del Juego</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">{chatMessages.length} mensajes</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 text-xs text-slate-400">
                  <MessageSquare className="w-6 h-6 text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">Aún no hay comentarios en este partido</p>
                  <p className="mt-1 text-slate-500">Escribe el primer mensaje abajo para iniciar la conversación.</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <strong className="text-amber-800 font-black">{msg.author}</strong>
                      <span className="text-[10px]">{msg.time}</span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {currentUser ? (
              <form onSubmit={handleSendChat} className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500 font-bold truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Comentando como </span>
                  <span className="text-slate-900 font-black">{currentUser.name}</span>
                  <span className="text-amber-600 font-bold">({currentUser.handle || "@fan"})</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe un comentario sobre el juego…"
                    maxLength={180}
                    className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 p-2 font-bold transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                    aria-label="Enviar comentario"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-100 text-center space-y-2">
                <p className="text-[11px] text-slate-500 leading-snug">
                  Para participar en los comentarios en vivo de este juego debes tener una cuenta activa.
                </p>
                <button
                  type="button"
                  onClick={() => onRequireAuth && onRequireAuth()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión / Cuenta Fan</span>
                </button>
              </div>
            )}
          </section>
    </>
  );

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-2xs">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-700 hover:text-amber-600 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-600" /> Volver a la pizarra
        </button>

        {onShareGame && game && (
          <button
            type="button"
            onClick={() => {
              const liveInning =
                game.inningState && game.inningState.inning
                  ? `${game.inningState.top ? "Alta" : "Baja"} ${game.inningState.inning}°`
                  : "En Vivo";
              onShareGame({
                ...game,
                inning:
                  game.status === "IN_PROGRESS"
                    ? liveInning
                    : game.status === "FINISHED"
                      ? "Final"
                      : game.time,
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartir Banner</span>
          </button>
        )}
      </div>

      {/* HERO SCOREBOARD + LINESCORE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        {/* Top Metadata + Broadcast Channels */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {game.venue} · {game.venueCity}
            </span>
            <span className="capitalize text-slate-500">· {game.dateLabel}</span>
            <BroadcastChannelsRow
              channels={game.tvChannels?.length ? game.tvChannels : game.tv ? [game.tv] : []}
              gameTitle={`${game.awayTeam.name} vs ${game.homeTeam.name}`}
              youtubeVideoId={effectiveYtId || undefined}
              badgeSize="md"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 text-slate-500 font-bold">
            {game.info?.duration ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Duración: {game.info.duration}
              </>
            ) : (
              <>Juego #{game.id}</>
            )}
          </span>
        </div>

        {/* Teams & Main Score Duel */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-3 sm:gap-4">
          {/* Away Team Card */}
          <div
            onClick={() => onSelectTeam?.(game.awayTeam.code)}
            className="md:col-span-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200 rounded-2xl p-4 cursor-pointer transition relative overflow-hidden group shadow-2xs"
          >
            <div
              className="w-1.5 absolute inset-y-0 left-0 transition-all group-hover:w-2"
              style={{ backgroundColor: game.awayTeam.color }}
            />
            <div className="flex items-center gap-3.5 min-w-0 pl-1">
              <img
                src={game.awayTeam.logoUrl}
                alt={game.awayTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-xs"
              />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black text-slate-950 truncate group-hover:text-amber-600 transition">
                  {game.awayTeam.nick}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {game.awayTeam.name} · ({game.awayTeam.wins}-{game.awayTeam.losses})
                </div>
              </div>
            </div>
            <span className="text-3xl sm:text-5xl font-black text-slate-950 tabular-nums ml-3">
              {game.awayScore}
            </span>
          </div>

          {/* Center Status / Diamond */}
          <div className="md:col-span-3 flex flex-col items-center justify-center text-center py-2">
            {isLive ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-0.5 text-xs font-black text-red-700 uppercase tracking-wider shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> En vivo
                </span>
                <p className="mt-1 text-sm font-black text-amber-600">
                  {state.top ? "Alta" : "Baja"} del {state.inning}°
                </p>
                <MiniBases
                  first={Boolean(game.field?.runners?.first)}
                  second={Boolean(game.field?.runners?.second)}
                  third={Boolean(game.field?.runners?.third)}
                />
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 mt-1">
                  <span>
                    Cuenta: <b className="text-slate-950 font-black">{state.balls}-{state.strikes}</b>
                  </span>
                  <span className="flex items-center gap-1">
                    Outs: <CountDots value={state.outs} total={3} activeClass="bg-amber-400" />
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3.5 py-1 text-xs font-black text-slate-800 uppercase tracking-wider">
                  {isFinal
                    ? `Final${game.box.innings.length > 9 ? ` / ${game.box.innings.length}` : ""}`
                    : game.time}
                </span>
                <p className="mt-1.5 text-xs font-bold text-slate-500">{game.venue}</p>
              </>
            )}
          </div>

          {/* Home Team Card */}
          <div
            onClick={() => onSelectTeam?.(game.homeTeam.code)}
            className="md:col-span-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200 rounded-2xl p-4 cursor-pointer transition relative overflow-hidden group shadow-2xs"
          >
            <div
              className="w-1.5 absolute inset-y-0 right-0 transition-all group-hover:w-2"
              style={{ backgroundColor: game.homeTeam.color }}
            />
            <span className="text-3xl sm:text-5xl font-black text-slate-950 tabular-nums ml-3 md:ml-0 md:mr-3 order-2 md:order-1">
              {game.homeScore}
            </span>
            <div className="flex items-center gap-3.5 min-w-0 order-1 md:order-2 md:text-right pr-1">
              <img
                src={game.homeTeam.logoUrl}
                alt={game.homeTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 md:order-2 drop-shadow-xs"
              />
              <div className="min-w-0 md:order-1">
                <div className="text-base sm:text-lg font-black text-slate-950 truncate group-hover:text-amber-600 transition">
                  {game.homeTeam.nick}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {game.homeTeam.name} · ({game.homeTeam.wins}-{game.homeTeam.losses})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decisions line when Final */}
        {isFinal && game.decisions && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-700 bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-200">
            {game.decisions.winner && (
              <span>
                <b className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black mr-1">G</b>
                <span className="font-bold text-slate-900">{game.decisions.winner}</span>
              </span>
            )}
            {game.decisions.loser && (
              <span>
                <b className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-black mr-1">P</b>
                <span className="font-bold text-slate-900">{game.decisions.loser}</span>
              </span>
            )}
            {game.decisions.save && (
              <span>
                <b className="inline-block px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-black mr-1">S</b>
                <span className="font-bold text-slate-900">{game.decisions.save}</span>
              </span>
            )}
          </div>
        )}

        {/* INNING BY INNING LINESCORE TABLE */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white no-scrollbar">
          <table className="w-full min-w-[500px] text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-extrabold">
                <th className="py-2.5 px-3 text-left">EQUIPO</th>
                {game.box.innings.map((inn) => (
                  <th key={inn} className="py-2.5 px-2 min-w-[28px]">
                    {inn}
                  </th>
                ))}
                <th className="py-2.5 px-3 bg-amber-50 text-amber-900 font-black border-l border-slate-200">C</th>
                <th className="py-2.5 px-3 bg-slate-100 text-slate-800 font-black">H</th>
                <th className="py-2.5 px-3 bg-slate-100 text-slate-800 font-black">E</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {(["away", "home"] as const).map((side) => {
                const team = side === "away" ? game.awayTeam : game.homeTeam;
                const runs = side === "away" ? game.awayScore : game.homeScore;
                const hits = side === "away" ? game.awayHits : game.homeHits;
                const errs = side === "away" ? game.awayErrors : game.homeErrors;
                return (
                  <tr key={side} className="hover:bg-slate-50/80 transition">
                    <th className="py-2.5 px-3 text-left font-black text-slate-900 flex items-center gap-2">
                      <img src={team.logoUrl} alt="" className="w-5 h-5 object-contain" />
                      <span>{team.shortName}</span>
                    </th>
                    {game.box.innings.map((inn, idx) => {
                      const val = game.box[side][idx];
                      const isCurrentCell =
                        isLive && state.inning === inn && state.top === (side === "away");
                      return (
                        <td
                          key={inn}
                          className={`py-2.5 px-2 tabular-nums font-bold ${
                            isCurrentCell
                              ? "bg-amber-100/90 text-amber-950 font-black ring-1 ring-amber-400 rounded"
                              : val && val > 0
                                ? "text-slate-950 font-black"
                                : "text-slate-400"
                          }`}
                        >
                          {val != null ? val : isFinal && side === "home" && idx === 8 && game.homeScore > game.awayScore ? "X" : ""}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 bg-amber-50/80 font-black text-amber-600 text-sm tabular-nums border-l border-slate-200">
                      {runs}
                    </td>
                    <td className="py-2.5 px-3 bg-slate-100/70 font-black text-slate-900 tabular-nums">
                      {hits}
                    </td>
                    <td className="py-2.5 px-3 bg-slate-100/70 font-black text-slate-600 tabular-nums">
                      {errs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

            {/* GAMEDAY TAB BAR (CLEAN, TOUCH-FRIENDLY & RESPONSIVE) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white border border-slate-200 overflow-x-auto no-scrollbar shadow-2xs">
        {[
          { key: "resumen" as const, label: isLive ? "En vivo" : "Resumen", icon: Sparkles },
          { key: "feed" as const, label: "Jugada a jugada", icon: Flame },
          { key: "box" as const, label: "Box score", icon: Trophy },
          { key: "lineup" as const, label: "Alineaciones", icon: Users },
          { key: "medios" as const, label: "TV / Radio / Chat", icon: Radio, mobileOnly: true },
          { key: "info" as const, label: "Detalles", icon: Info },
        ].map(({ key, label, icon: Icon, mobileOnly }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 select-none ${
              mobileOnly ? "xl:hidden " : ""
            }${
              tab === key
                ? "bg-amber-400 text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* MAIN TWO-COLUMN GAMEDAY LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left/Center Main Area (8 cols on large screens, full width below) */}
        <div className="xl:col-span-8 space-y-5">
          {tab === "resumen" && (
            <div className="space-y-5 animate-view-enter">
              {/* 0. TRANSMISIÓN EN VIVO EMBEBIDA DIRECTA EN LA WEB (SIN PIP) */}
              {effectiveYtId && (
                <section className="rounded-2xl border border-red-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
                            Transmisión Oficial LVBP
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                          {game.awayTeam.name} vs {game.homeTeam.name} en YouTube
                        </h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-[10px] font-black text-red-700 shrink-0">
                      En directo sin PiP
                    </span>
                  </div>

                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${effectiveYtId}?autoplay=0&rel=0&modestbranding=1`}
                      title={`Transmisión Oficial en Vivo: ${game.awayTeam.name} vs ${game.homeTeam.name}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="text-slate-600 font-medium">
                      Disfruta la transmisión completa con audio y video directo en la web.
                    </span>
                    <a
                      href={game.youtubeUrl || `https://www.youtube.com/watch?v=${effectiveYtId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-red-600 transition shrink-0 ml-2"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </section>
              )}

              {/* 1. SITUACIÓN DEL JUEGO (SI ESTÁ EN VIVO) */}
          {isLive && game.matchup && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" /> Situación del juego
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-0.5 text-xs font-black text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  {state.top ? "Alta" : "Baja"} del {state.inning}°
                </span>
              </div>

              {lastCompletedPlay && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700">
                  <span className="font-black text-amber-700 uppercase mr-2">Última jugada:</span>
                  <span>{lastCompletedPlay.text}</span>
                </div>
              )}

              {/* Duel Pitcher vs Batter */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-slate-50/70 rounded-xl p-3.5 border border-slate-200">
                {/* Pitcher */}
                <div className="md:col-span-5 flex items-center gap-3">
                  <img
                    src={playerHeadshot(game.matchup.pitcher.id)}
                    alt={game.matchup.pitcher.name}
                    className="w-14 h-14 rounded-full object-cover bg-slate-100 border-2 border-slate-200 shrink-0 shadow-2xs"
                  />
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-700">
                      Lanzando · {game.matchup.pitcher.hand}
                    </span>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {game.matchup.pitcher.name}
                    </div>
                    <p className="text-xs text-slate-600">
                      {game.matchup.pitcher.ip} IL · {game.matchup.pitcher.pitches} lanz. ·{" "}
                      {game.matchup.pitcher.k} K · {game.matchup.pitcher.bb} BB
                    </p>
                    <p className="text-[11px] text-slate-500">EFE {game.matchup.pitcher.era}</p>
                  </div>
                </div>

                {/* Count B-S-O Traffic Light */}
                <div className="md:col-span-1 flex md:flex-col items-center justify-center gap-3 md:gap-1.5 py-1 border-y md:border-y-0 md:border-x border-slate-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600">
                    <span>B</span>
                    <CountDots value={game.matchup.balls} total={4} activeClass="bg-emerald-500" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600">
                    <span>S</span>
                    <CountDots value={game.matchup.strikes} total={3} activeClass="bg-rose-500" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600">
                    <span>O</span>
                    <CountDots value={game.matchup.outs} total={3} activeClass="bg-amber-500" />
                  </div>
                </div>

                {/* Batter */}
                <div className="md:col-span-5 flex items-center justify-end gap-3 text-right">
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                      Al bate · {game.matchup.batter.order}° · {game.matchup.batter.pos}
                    </span>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {game.matchup.batter.name}
                    </div>
                    <p className="text-xs text-slate-700 font-semibold">Hoy: {game.matchup.batter.today}</p>
                    <p className="text-[11px] text-slate-500">
                      AVE {game.matchup.batter.avg} · OPS {game.matchup.batter.ops}
                    </p>
                  </div>
                  <img
                    src={playerHeadshot(game.matchup.batter.id)}
                    alt={game.matchup.batter.name}
                    className="w-14 h-14 rounded-full object-cover bg-amber-50/50 border-2 border-amber-400 shrink-0 shadow-2xs"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 2. RESUMEN DEL PARTIDO (SI ES FINAL) */}
          {isFinal && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      game.homeScore > game.awayScore
                        ? game.homeTeam.logoUrl
                        : game.awayTeam.logoUrl
                    }
                    alt=""
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                      Resumen del Partido
                    </span>
                    <h2 className="text-lg font-black text-slate-950">
                      {game.homeScore > game.awayScore
                        ? `${game.homeTeam.nick} ${game.homeScore}, ${game.awayTeam.nick} ${game.awayScore}`
                        : `${game.awayTeam.nick} ${game.awayScore}, ${game.homeTeam.nick} ${game.homeScore}`}
                    </h2>
                  </div>
                </div>
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>

              {/* Figuras del partido (Top 3) */}
              {topStars.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                    Figuras del partido
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topStars.map(({ row, team, line }, index) => (
                      <article
                        key={row.id}
                        className={`rounded-2xl p-4 border flex flex-col items-center text-center relative transition ${
                          index === 0
                            ? "bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-white border-amber-300 shadow-xs ring-1 ring-amber-400/30"
                            : "bg-white border-slate-200 shadow-2xs"
                        }`}
                      >
                        {index === 0 && (
                          <span className="mb-2 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase text-slate-950 shadow-2xs">
                            Jugador del juego
                          </span>
                        )}
                        <img
                          src={playerHeadshot(row.id)}
                          alt={row.name}
                          className={`w-14 h-14 rounded-full object-cover mb-2 ${
                            index === 0
                              ? "bg-amber-100/60 border-2 border-amber-400 shadow-xs"
                              : "bg-slate-100 border border-slate-200"
                          }`}
                        />
                        <strong className="text-sm font-black text-slate-900">{row.name}</strong>
                        <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5 mt-0.5">
                          <img src={team.logoUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                          {team.nick} · {row.pos}
                        </span>
                        <p
                          className={`mt-2.5 text-xs font-extrabold px-3 py-1 rounded-xl border ${
                            index === 0
                              ? "text-amber-800 bg-amber-100/70 border-amber-300/70"
                              : "text-slate-700 bg-slate-50 border-slate-200"
                          }`}
                        >
                          {line}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Cara a Cara (Barras Comparativas) */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  Cara a cara estadístico
                </h3>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 pb-1.5 border-b border-slate-200">
                    <span className="flex items-center gap-1.5">
                      <img src={game.awayTeam.logoUrl} alt="" className="w-4 h-4 object-contain" />
                      {game.awayTeam.nick}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {game.homeTeam.nick}
                      <img src={game.homeTeam.logoUrl} alt="" className="w-4 h-4 object-contain" />
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
                          <b className={a > h ? "text-amber-600 font-black" : "text-slate-600"}>{a}</b>
                          <span className="text-slate-600 font-semibold">{label}</span>
                          <b className={h > a ? "text-amber-600 font-black" : "text-slate-600"}>{h}</b>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
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
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                    Anotaciones ({scoringPlays.length} jugadas de carrera)
                  </h3>
                  <ol className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {scoringPlays.map((play) => {
                      const team = play.top ? game.awayTeam : game.homeTeam;
                      return (
                        <li
                          key={play.i}
                          className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <img src={team.logoUrl} alt="" className="w-5 h-5 mt-0.5 shrink-0 object-contain" />
                            <div>
                              <span className="font-black text-amber-700 mr-2">
                                {play.top ? "Alta" : "Baja"} {play.inning}°
                              </span>
                              <span className="text-slate-700 font-medium">{play.text}</span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded bg-slate-200/80 px-2 py-1 font-bold text-slate-900 tabular-nums">
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

              {!isLive && !isFinal && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 block">
                        Previa del Partido
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-950">
                        {game.awayTeam.name} vs {game.homeTeam.name}
                      </h2>
                    </div>
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Hora de inicio</span>
                      <strong className="text-sm text-slate-900 font-extrabold">{game.time || "Por definir"}</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">Hora oficial de Venezuela</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Sede / Estadio</span>
                      <strong className="text-sm text-slate-900 font-extrabold">{game.venue}</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5">{game.venueCity}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTab("lineup")}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-xs text-center"
                    >
                      Ver Alineaciones Confirmadas ›
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("medios")}
                      className="xl:hidden py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold transition cursor-pointer"
                    >
                      Canales y Radio ›
                    </button>
                  </div>
                </section>
              )}

              {isLive && (
                <div className="xl:hidden flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs shadow-2xs">
                  <span className="font-extrabold text-amber-950 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-600" />
                    <span>Transmisión en vivo y Radio</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setTab("medios")}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-xs transition"
                  >
                    Sintonizar ›
                  </button>
                </div>
              )}
            </div>
          )}

          {tab !== "resumen" && tab !== "medios" && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-xs p-4 sm:p-5 animate-view-enter">
              {/* TAB 1: JUGADA A JUGADA */}
              {tab === "feed" && (
                <div className="space-y-4">
                  {/* Top Bar: Feed Filters + Expand/Collapse All Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            feedFilter === fKey
                              ? "bg-amber-500 text-slate-950 font-black shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60"
                          }`}
                        >
                          {fLabel}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const allOpen: Record<string, boolean> = {};
                          for (const g of groups) allOpen[g.key] = true;
                          setOpenInnings(allOpen);
                        }}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                        title="Abrir todas las entradas"
                      >
                        Abrir todas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allClosed: Record<string, boolean> = {};
                          for (const g of groups) allClosed[g.key] = false;
                          setOpenInnings(allClosed);
                        }}
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                        title="Cerrar todas las entradas"
                      >
                        Cerrar todas
                      </button>
                    </div>
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
                      const isExplicit = openInnings[grp.key] !== undefined;
                      const isOpen = isExplicit ? openInnings[grp.key] : grpIdx < 2;

                      return (
                        <div
                          key={grp.key}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-shadow"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenInnings((prev) => {
                                const current = prev[grp.key] !== undefined ? prev[grp.key] : grpIdx < 2;
                                return { ...prev, [grp.key]: !current };
                              });
                            }}
                            aria-expanded={isOpen}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs transition cursor-pointer select-none ${
                              isOpen ? "border-b border-slate-200" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={team.logoUrl} alt="" className="w-5 h-5 object-contain" />
                              <b className="text-slate-900 font-black">
                                {grp.top ? "Alta" : "Baja"} del {grp.inning}°
                              </b>
                              <span className="text-slate-500 font-medium">{team.nick} al bate</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {grp.runs > 0 && (
                                <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[11px] font-black">
                                  {grp.runs} {grp.runs === 1 ? "carrera" : "carreras"}
                                </span>
                              )}
                              <strong className="text-slate-700 font-bold tabular-nums">
                                {game.awayTeam.shortName} {grp.endAway} · {game.homeTeam.shortName}{" "}
                                {grp.endHome}
                              </strong>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isOpen ? "rotate-180 text-amber-600" : "text-slate-400"
                                }`}
                              />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="divide-y divide-slate-100 p-3 space-y-2.5 bg-white">
                              {[...plays].reverse().map((play) => {
                                const tone = eventTone(play.eventType);
                                const isDelayOrStatus =
                                  play.text.toLowerCase().includes("demora") ||
                                  play.text.toLowerCase().includes("status change") ||
                                  play.actions.some(
                                    (a) => a.trim().toLowerCase() === play.text.trim().toLowerCase()
                                  );
                                const displayText = isDelayOrStatus
                                  ? play.complete
                                    ? play.text
                                    : `En turno al bate · Cuenta ${play.balls}-${play.strikes} · ${play.outs} out(s)`
                                  : play.text ||
                                    `Cuenta ${play.balls}-${play.strikes} · ${play.outs} out(s)`;

                                return (
                                  <article
                                    key={play.i}
                                    className={`pt-2.5 first:pt-0 pl-3 rounded-r-lg ${tone.border}`}
                                  >
                                    {play.actions.map((act, i) => {
                                      const isDelay =
                                        act.toLowerCase().includes("demora") ||
                                        act.toLowerCase().includes("falla eléctrica") ||
                                        act.toLowerCase().includes("lluvia") ||
                                        act.toLowerCase().includes("delayed");
                                      return (
                                        <p
                                          key={i}
                                          className={`mb-1.5 text-[11px] font-bold px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                                            isDelay
                                              ? "bg-amber-100 text-amber-950 border-amber-300 shadow-2xs"
                                              : "bg-amber-50 text-amber-800 border-amber-200"
                                          }`}
                                        >
                                          <span>⇄</span>
                                          <span>{act}</span>
                                        </p>
                                      );
                                    })}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2.5">
                                        <img
                                          src={playerHeadshot(play.batter.id)}
                                          alt={play.batter.name}
                                          className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0 mt-0.5 shadow-2xs"
                                        />
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${tone.badgeBg}`}
                                            >
                                              {play.complete ? play.event : "Al bate"}
                                            </span>
                                            <b className="text-xs font-black text-slate-900">
                                              {play.batter.name}
                                            </b>
                                            {play.rbi > 0 && (
                                              <span className="text-[11px] font-black text-amber-700">
                                                +{play.rbi} CI
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                            {displayText}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                            <span className="text-[11px] text-slate-500 font-medium">
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
                                                          ? "bg-rose-600"
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
                                        <span className="shrink-0 rounded bg-amber-50 border border-amber-300 px-2 py-1 text-[11px] font-black text-amber-800 tabular-nums">
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
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    {(["away", "home"] as const).map((side) => {
                      const t = side === "away" ? game.awayTeam : game.homeTeam;
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setBoxSide(side)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                            boxSide === side
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <img src={t.logoUrl} alt="" className="w-4 h-4 object-contain" />
                          {t.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Batting Table */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 mb-2">
                      Bateo
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 no-scrollbar">
                      <table className="w-full min-w-[460px] text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black">
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
                        <tbody className="divide-y divide-slate-100">
                          {game.boxscore[boxSide].batting.rows.map((r) => (
                            <tr
                              key={`${r.id}-${r.order}`}
                              className={r.starter ? "text-slate-900 hover:bg-slate-50/60" : "text-slate-600 bg-slate-50/40 hover:bg-slate-50"}
                            >
                              <td className="py-2 px-3 text-left font-semibold">
                                {!r.starter && <span className="text-slate-400 mr-1">↳</span>}
                                {r.starter ? `${Math.floor(r.order / 100)}° ` : ""}
                                <span className="text-slate-900 font-bold">{shortPlayerName(r.name)}</span>{" "}
                                <small className="text-slate-500 ml-1 font-normal">{r.pos}</small>
                              </td>
                              <td className="py-2 px-2 tabular-nums">{r.ab}</td>
                              <td className="py-2 px-2 tabular-nums">{r.r}</td>
                              <td className="py-2 px-2 font-black text-slate-950 tabular-nums">{r.h}</td>
                              <td className="py-2 px-2 tabular-nums">{r.rbi}</td>
                              <td className="py-2 px-2 tabular-nums">{r.bb}</td>
                              <td className="py-2 px-2 tabular-nums">{r.so}</td>
                              <td className="py-2 px-3 text-slate-600 tabular-nums font-semibold">{r.avg}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
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
                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-700 mb-2">
                      Pitcheo
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 no-scrollbar">
                      <table className="w-full min-w-[460px] text-xs text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-black">
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
                        <tbody className="divide-y divide-slate-100">
                          {game.boxscore[boxSide].pitching.rows.map((p) => (
                            <tr key={p.id} className="text-slate-800 hover:bg-slate-50/60">
                              <td className="py-2 px-3 text-left font-bold text-slate-900">
                                {shortPlayerName(p.name)}
                                {p.tag && (
                                  <span className="ml-1.5 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                                    {p.tag}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 font-black tabular-nums">{p.ip}</td>
                              <td className="py-2 px-2 tabular-nums">{p.h}</td>
                              <td className="py-2 px-2 tabular-nums">{p.r}</td>
                              <td className="py-2 px-2 tabular-nums">{p.er}</td>
                              <td className="py-2 px-2 tabular-nums">{p.bb}</td>
                              <td className="py-2 px-2 font-black text-slate-950 tabular-nums">{p.k}</td>
                              <td className="py-2 px-2 tabular-nums">{p.pitches}</td>
                              <td className="py-2 px-3 text-slate-600 tabular-nums font-semibold">{p.era}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ALINEACIONES */}
              {tab === "lineup" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["away", "home"] as const).map((side) => {
                    const team = side === "away" ? game.awayTeam : game.homeTeam;
                    const rows = game.lineups[side] || [];
                    return (
                      <div
                        key={side}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5"
                      >
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                          <img src={team.logoUrl} alt="" className="w-5 h-5 object-contain" />
                          {team.name}
                        </h3>
                        <ol className="divide-y divide-slate-200/70 text-xs">
                          {rows.map((r) => (
                            <li
                              key={r.id}
                              className="py-2 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 text-slate-400 font-black">{r.order}.</span>
                                <img
                                  src={playerHeadshot(r.id)}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover bg-slate-100 border border-slate-200 shadow-2xs"
                                />
                                <div>
                                  <div className="font-bold text-slate-900">{r.name}</div>
                                  <div className="text-[11px] text-slate-500 font-medium">Posición: {r.position}</div>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-slate-600 tabular-nums">
                                <div className="font-semibold">AVE {r.avg}</div>
                                <div className="text-slate-500">OPS {r.ops}</div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: DETALLES */}
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
                        className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex flex-col gap-1"
                      >
                        <span className="text-slate-500 font-black uppercase text-[10px]">{k}</span>
                        <span className="text-slate-900 font-bold">{v}</span>
                      </div>
                    ))}
                  </div>

                  {game.info.officials.length > 0 && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                      <h4 className="font-black text-amber-800 uppercase text-[11px] mb-2">
                        Cuerpo de Árbitros (Umpires)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {game.info.officials.map((u, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
                            <span className="text-amber-700 font-black mr-1.5">{u.role}:</span>
                            <span className="text-slate-800 font-medium">{u.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {tab === "medios" && (
            <div className="xl:hidden space-y-5 animate-view-enter">
              {renderMediaAndSocial()}
            </div>
          )}
        </div>

        {/* Right Sidebar (4 cols on xl): TV Streaming, Radio, Quiniela & Live Chat */}
        <aside className="hidden xl:block xl:col-span-4 space-y-5">
          {renderMediaAndSocial()}
        </aside>
      </div>
    </div>
  );
}
