"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LeaderCategory, ScheduleGame, StandingRow } from "@/lib/types";
import { LVBP_OFFICIAL_LOGO, LVBP_TEAMS } from "@/lib/lvbp-teams";
import { GamedayView } from "@/components/gameday/GamedayView";
import { LeadersWidget } from "@/components/LeadersWidget";
import { TeamRosterView } from "@/components/TeamRosterView";
import {
  ChevronLeft,
  ChevronRight,
  Tv,
  Radio,
  MapPin,
  Trophy,
  Calendar,
  Activity,
  Users,
  Newspaper,
  Home,
  Clock,
} from "lucide-react";

type NavSection = "home" | "resultados" | "calendario" | "posiciones" | "equipos" | "juego";

function formatCompactDay(iso: string): {
  dayNum: string;
  monthShort: string;
  weekdayShort: string;
  fullLabel: string;
} {
  if (!iso)
    return {
      dayNum: "15",
      monthShort: "OCT",
      weekdayShort: "Jue",
      fullLabel: "jueves, 15 de octubre",
    };
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
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
    dayNum: String(d),
    monthShort,
    weekdayShort: weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1),
    fullLabel,
  };
}

function getGameTvChannels(game: ScheduleGame): string[] {
  if (Array.isArray(game.tvChannels) && game.tvChannels.length > 0) {
    return game.tvChannels;
  }
  if (game.tv) {
    return game.tv
      .split(/[·,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ["IVC", "ByM Sport", "BeisbolPlay"];
}

function tvChannelBadgeStyle(channel: string): string {
  const c = channel.toLowerCase();
  if (c.includes("ivc")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (c.includes("bym")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (c.includes("televen")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (c.includes("venevis")) return "bg-amber-50 text-amber-800 border-amber-200";
  if (c.includes("1baseball")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c.includes("meridiano")) return "bg-purple-50 text-purple-700 border-purple-200";
  if (c.includes("beisbolplay")) return "bg-slate-100 text-slate-700 border-slate-300";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export default function EnJuegoApp() {
  const [section, setSection] = useState<NavSection>("home");
  const [schedule, setSchedule] = useState<ScheduleGame[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [leaders, setLeaders] = useState<{ hitting: LeaderCategory[]; pitching: LeaderCategory[] }>({
    hitting: [],
    pitching: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedGameId, setSelectedGameId] = useState<string>("870098");
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>("CAR");
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [calendarStateFilter, setCalendarStateFilter] = useState<"ALL" | "UPCOMING" | "FINISHED">(
    "ALL"
  );
  const [standingsPhase, setStandingsPhase] = useState<"REGULAR" | "ROUND_ROBIN" | "FINAL">(
    "REGULAR"
  );

  // Enforce clean Light Mode permanently
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    try {
      localStorage.removeItem("enjuego_theme");
    } catch {
      // ignore
    }
  }, []);

  // Mundo Jugadas (Comunidad) state synced with Cloudflare KV
  const [communityPosts, setCommunityPosts] = useState<
    {
      id: string | number;
      author: string;
      username: string;
      team: string;
      time: string;
      text: string;
      reactions: { fuego: number; aplauso: number; corazon: number; sorpresa: number };
      myReaction: string;
    }[]
  >([]);
  const [newPostText, setNewPostText] = useState("");
  const [postAuthor, setPostAuthor] = useState("");
  const [postTeam, setPostTeam] = useState("CAR");

  const mapServerPosts = (posts: any[]) =>
    posts.map((p: any) => ({
      id: p.id,
      author: p.user || "Aficionado LVBP",
      username: String(p.handle || "@lvbp").replace(/^@/, ""),
      team: p.team || "CAR",
      time: p.time || "reciente",
      text: p.text || "",
      reactions: {
        fuego: Number(p.fires ?? 0),
        aplauso: Number(p.claps ?? 0),
        corazon: Number(p.likes ?? 0),
        sorpresa: 0,
      },
      myReaction: "",
    }));

  const loadAllData = async () => {
    try {
      const [schRes, stdRes, commRes] = await Promise.all([
        fetch("/api/lvbp/schedule?season=2026"),
        fetch("/api/lvbp/standings?season=2026"),
        fetch("/api/lvbp/interactive?mode=community", { cache: "no-store" }),
      ]);
      const schData = await schRes.json();
      const stdData = await stdRes.json();
      const commData = await commRes.json().catch(() => ({}));

      const loadedGames: ScheduleGame[] = schData.games || [];
      setSchedule(loadedGames);
      setStandings(stdData.standings || []);
      setLeaders(stdData.leaders || { hitting: [], pitching: [] });
      if (Array.isArray(commData?.posts) && commData.posts.length > 0) {
        setCommunityPosts(mapServerPosts(commData.posts));
      }

      const uniqueDates = [...new Set(loadedGames.map((g) => g.date))].sort();
      if (uniqueDates.length > 0) {
        const todayIso = "2026-10-15";
        const idx = uniqueDates.findIndex((d) => d >= todayIso);
        setSelectedDateIndex((prev) =>
          prev === 0 ? (idx >= 0 ? idx : Math.max(0, uniqueDates.length - 1)) : prev
        );
      }
    } catch {
      // ignore error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 20000);
    return () => clearInterval(interval);
  }, []);

  const dates = useMemo(
    () => [...new Set(schedule.map((g) => g.date))].sort(),
    [schedule]
  );

  const activeDate = dates[selectedDateIndex] || "2026-10-15";
  const gamesOfDay = useMemo(
    () => schedule.filter((g) => g.date === activeDate),
    [schedule, activeDate]
  );

  const liveGames = useMemo(
    () => schedule.filter((g) => g.status === "IN_PROGRESS"),
    [schedule]
  );

  const openGameGameday = (gameId: string) => {
    setSelectedGameId(gameId);
    setSection("juego");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openTeamPage = (code: string) => {
    setSelectedTeamCode(code);
    setSection("equipos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate real game recaps / crónicas directly from official LVBP games
  const realRecaps = useMemo(() => {
    const finished = schedule.filter((g) => g.status === "FINISHED");
    const source = finished.length > 0 ? finished.slice(-4).reverse() : schedule.slice(0, 4);
    return source.map((g) => {
      const awayWon = g.awayScore > g.homeScore;
      const winner = awayWon ? g.awayTeam : g.homeTeam;
      const loser = awayWon ? g.homeTeam : g.awayTeam;
      const winScore = awayWon ? g.awayScore : g.homeScore;
      const loseScore = awayWon ? g.homeScore : g.awayScore;
      const winHits = awayWon ? g.awayHits : g.homeHits;
      const loseHits = awayWon ? g.homeHits : g.awayHits;

      if (g.status === "FINISHED") {
        const decisionText = g.decisions?.winner
          ? `Victoria para ${g.decisions.winner}${g.decisions.loser ? ` y revés para ${g.decisions.loser}` : ""}${g.decisions.save ? `, con salvado de ${g.decisions.save}` : ""}.`
          : `Pizarra oficial registrada en ${g.venue}.`;
        return {
          id: g.id,
          category: `${winner.nick} · Final`,
          title: `${winner.name} se impuso ${winScore}-${loseScore} ante ${loser.name} en ${g.venueCity}`,
          summary: `La ofensiva de ${winner.nick} conectó ${winHits} imparables frente a ${loseHits} de ${loser.nick} en el ${g.venue}. ${decisionText}`,
          dateLabel: g.date,
          venue: g.venue,
          winnerLogo: winner.logoUrl,
        };
      }

      return {
        id: g.id,
        category: `Previa · ${g.time}`,
        title: `${g.awayTeam.name} visita a ${g.homeTeam.name} en el ${g.venue}`,
        summary: `Duelo programado en ${g.venueCity} a las ${g.time} (Hora de Venezuela). Señal de TV: ${getGameTvChannels(g).join(", ")}.`,
        dateLabel: g.date,
        venue: g.venue,
        winnerLogo: g.homeTeam.logoUrl,
      };
    });
  }, [schedule]);

  const handleReactPost = async (
    postId: string | number,
    key: "fuego" | "aplauso" | "corazon" | "sorpresa"
  ) => {
    setCommunityPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const already = post.myReaction === key;
        return {
          ...post,
          myReaction: already ? "" : key,
          reactions: {
            ...post.reactions,
            [key]: post.reactions[key] + (already ? -1 : 1),
          },
        };
      })
    );

    const kindMap: Record<string, "fires" | "claps" | "likes"> = {
      fuego: "fires",
      aplauso: "claps",
      corazon: "likes",
      sorpresa: "likes",
    };

    try {
      await fetch("/api/lvbp/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react",
          postId: String(postId),
          kind: kindMap[key] || "likes",
        }),
      });
    } catch {
      // keep optimistic reaction
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = newPostText.trim();
    if (!cleanText) return;
    setNewPostText("");

    const authorName = postAuthor.trim() || "Aficionado LVBP";
    const optimistic = {
      id: `opt-${Date.now()}`,
      author: authorName,
      username: authorName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "lvbp",
      team: postTeam,
      time: "ahora",
      text: cleanText,
      reactions: { fuego: 0, aplauso: 0, corazon: 0, sorpresa: 0 },
      myReaction: "",
    };
    setCommunityPosts((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch("/api/lvbp/interactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post",
          user: authorName,
          team: postTeam,
          text: cleanText,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data?.posts)) {
        setCommunityPosts(mapServerPosts(data.posts));
      }
    } catch {
      // keep optimistic post
    }
  };

  const dayFormatted = formatCompactDay(activeDate);

  // Filtered calendar games
  const filteredCalendarGames = useMemo(() => {
    return schedule.filter((g) => {
      if (teamFilter && g.awayTeam.code !== teamFilter && g.homeTeam.code !== teamFilter) {
        return false;
      }
      if (calendarStateFilter === "UPCOMING" && g.status === "FINISHED") return false;
      if (calendarStateFilter === "FINISHED" && g.status !== "FINISHED") return false;
      return true;
    });
  }, [schedule, teamFilter, calendarStateFilter]);

  // Group calendar games by date when viewing all teams
  const calendarGamesByDate = useMemo(() => {
    const map = new Map<string, ScheduleGame[]>();
    for (const g of filteredCalendarGames) {
      const list = map.get(g.date) || [];
      list.push(g);
      map.set(g.date, list);
    }
    return Array.from(map.entries());
  }, [filteredCalendarGames]);

  // Render a broadcast-quality Scoreboard Card for Pizarra del Día & Resultados
  const renderScoreboardCard = (game: ScheduleGame) => {
    const played = game.status === "IN_PROGRESS" || game.status === "FINISHED";
    const isLive = game.status === "IN_PROGRESS";
    const isFinal = game.status === "FINISHED";
    const awayWon = isFinal && game.awayScore > game.homeScore;
    const homeWon = isFinal && game.homeScore > game.awayScore;
    const tvChannels = getGameTvChannels(game);

    return (
      <article
        key={game.id}
        onClick={() => openGameGameday(game.id)}
        className="rounded-2xl border border-slate-200 bg-white hover:border-amber-500/80 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md cursor-pointer group"
      >
        {/* Top Accent Strip */}
        <div
          className={`h-1 w-full ${
            isLive
              ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
              : isFinal
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-sky-500 to-indigo-500"
          }`}
        />

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Header: Status + TV Channels */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                  isLive
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : isFinal
                      ? "bg-slate-100 text-slate-800 border border-slate-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                {isLive ? `EN VIVO · ${game.inning}` : isFinal ? game.inning : `🕒 ${game.time}`}
              </span>

              <div className="flex items-center gap-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <span className="w-6 text-center text-slate-700">C</span>
                <span className="w-5 text-center">H</span>
                <span className="w-4 text-center">E</span>
              </div>
            </div>

            {/* Away Team Row */}
            <div
              className={`flex items-center justify-between py-2 px-1.5 rounded-xl transition ${
                awayWon ? "bg-amber-50/50" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={game.awayTeam.logoUrl}
                  alt={game.awayTeam.name}
                  className="w-10 h-10 object-contain shrink-0 drop-shadow-sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm truncate ${
                        awayWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                      }`}
                    >
                      {game.awayTeam.nick}
                    </span>
                    {awayWon && (
                      <span className="text-[10px] font-black text-amber-600" title="Ganador">
                        ◀
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {game.awayTeam.shortName} · ({game.awayTeam.wins}-{game.awayTeam.losses})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm tabular-nums shrink-0">
                <b
                  className={`w-6 text-center text-base ${
                    awayWon
                      ? "font-black text-slate-950"
                      : played
                        ? "font-bold text-slate-700"
                        : "font-semibold text-slate-400"
                  }`}
                >
                  {played ? game.awayScore : "–"}
                </b>
                <span className="w-5 text-center text-xs font-semibold text-slate-500">
                  {played ? game.awayHits : "–"}
                </span>
                <span className="w-4 text-center text-xs text-slate-400">
                  {played ? game.awayErrors : "–"}
                </span>
              </div>
            </div>

            {/* Home Team Row */}
            <div
              className={`flex items-center justify-between py-2 px-1.5 rounded-xl mt-1 transition ${
                homeWon ? "bg-amber-50/50" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={game.homeTeam.logoUrl}
                  alt={game.homeTeam.name}
                  className="w-10 h-10 object-contain shrink-0 drop-shadow-sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm truncate ${
                        homeWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                      }`}
                    >
                      {game.homeTeam.nick}
                    </span>
                    {homeWon && (
                      <span className="text-[10px] font-black text-amber-600" title="Ganador">
                        ◀
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {game.homeTeam.shortName} · ({game.homeTeam.wins}-{game.homeTeam.losses})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm tabular-nums shrink-0">
                <b
                  className={`w-6 text-center text-base ${
                    homeWon
                      ? "font-black text-slate-950"
                      : played
                        ? "font-bold text-slate-700"
                        : "font-semibold text-slate-400"
                  }`}
                >
                  {played ? game.homeScore : "–"}
                </b>
                <span className="w-5 text-center text-xs font-semibold text-slate-500">
                  {played ? game.homeHits : "–"}
                </span>
                <span className="w-4 text-center text-xs text-slate-400">
                  {played ? game.homeErrors : "–"}
                </span>
              </div>
            </div>
          </div>

          {/* Broadcast Channels + Venue / Decisions Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
            {/* TV Broadcast Channels Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-400 mr-0.5">
                <Tv className="w-3 h-3 text-amber-600" /> TV:
              </span>
              {tvChannels.map((ch) => (
                <span
                  key={ch}
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${tvChannelBadgeStyle(
                    ch
                  )}`}
                >
                  {ch}
                </span>
              ))}
            </div>

            {game.decisions?.winner ? (
              <p className="text-[11px] text-slate-600 truncate">
                <b className="text-emerald-700">G:</b> {game.decisions.winner}
                {game.decisions.loser ? (
                  <>
                    {" "}
                    · <b className="text-rose-700">P:</b> {game.decisions.loser}
                  </>
                ) : null}
                {game.decisions.save ? (
                  <>
                    {" "}
                    · <b className="text-sky-700">S:</b> {game.decisions.save}
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {game.venue} ({game.venueCity})
              </p>
            )}

            <div className="w-full rounded-xl bg-slate-100 group-hover:bg-amber-400 text-slate-800 group-hover:text-slate-950 py-2 px-3 text-xs font-extrabold text-center transition">
              {isLive
                ? "Seguir Gameday en Vivo ›"
                : isFinal
                  ? "Ver Box Score y Jugadas ›"
                  : "Ver Previa y Alineaciones ›"}
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fb] text-slate-900 pb-20 md:pb-0">
      {/* CLEAN EDITORIAL TOPBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand + Official LVBP Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSection("home")}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shadow-2xs group-hover:border-amber-400 transition">
                <img
                  src={LVBP_OFFICIAL_LOGO}
                  alt="LVBP"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-950 group-hover:text-amber-600 transition block leading-none">
                  EN JUEGO
                </span>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-amber-600 mt-0.5">
                  LVBP Oficial
                </span>
              </div>
            </button>

            {liveGames.length > 0 ? (
              <button
                type="button"
                onClick={() => openGameGameday(liveGames[0].id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 text-[11px] font-extrabold text-red-600 transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>
                  EN VIVO: {liveGames[0].awayTeam.shortName} {liveGames[0].awayScore}-
                  {liveGames[0].homeScore} {liveGames[0].homeTeam.shortName}
                </span>
              </button>
            ) : (
              <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Temporada 2026-27
              </span>
            )}
          </div>

          {/* Desktop Main Navigation */}
          <nav
            className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80"
            aria-label="Navegación Principal"
          >
            {(
              [
                ["home", "Inicio"],
                ["resultados", "Resultados"],
                ["calendario", "Calendario"],
                ["posiciones", "Posiciones"],
                ["equipos", "Equipos y Roster"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  section === key
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right Quick Bar: The 8 Official LVBP Team Logos */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 max-w-[210px] sm:max-w-none">
            {Object.values(LVBP_TEAMS).map((team) => {
              const isSelected = section === "equipos" && selectedTeamCode === team.code;
              return (
                <button
                  key={team.code}
                  type="button"
                  onClick={() => openTeamPage(team.code)}
                  title={`${team.name} — Ver Roster y Calendario`}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full p-1 flex items-center justify-center border transition shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 scale-105"
                      : "bg-white border-slate-200 hover:border-amber-400 hover:scale-105"
                  }`}
                >
                  <img
                    src={team.logoSvg}
                    alt={team.shortName}
                    className="w-full h-full object-contain"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* SCORE STRIP / TICKER BAR */}
      <section className="border-b border-slate-200 bg-slate-50/90">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Date Selector Box */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0 shadow-2xs">
            <button
              type="button"
              disabled={selectedDateIndex <= 0}
              onClick={() => setSelectedDateIndex((i) => Math.max(0, i - 1))}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[76px]">
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-amber-600">
                Jornada
              </span>
              <strong className="text-sm font-black text-slate-900">
                {dayFormatted.dayNum}{" "}
                <small className="text-xs text-slate-500">{dayFormatted.monthShort}</small>
              </strong>
            </div>
            <button
              type="button"
              disabled={selectedDateIndex >= dates.length - 1}
              onClick={() => setSelectedDateIndex((i) => Math.min(dates.length - 1, i + 1))}
              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Horizontal Livebugs Strip with Official Logos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {gamesOfDay.length > 0 ? (
              gamesOfDay.map((game) => {
                const isPlayed = game.status === "IN_PROGRESS" || game.status === "FINISHED";
                const isLive = game.status === "IN_PROGRESS";
                const tvList = getGameTvChannels(game);
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => openGameGameday(game.id)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-1.5 border text-left shrink-0 transition cursor-pointer shadow-2xs ${
                      selectedGameId === game.id && section === "juego"
                        ? "bg-amber-50 border-amber-400"
                        : isLive
                          ? "bg-white border-red-300 hover:border-red-400"
                          : "bg-white border-slate-200 hover:border-amber-400"
                    }`}
                  >
                    <div className="space-y-1 min-w-[100px]">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-slate-900">
                          <img
                            src={game.awayTeam.logoUrl}
                            alt=""
                            className="w-5 h-5 object-contain"
                          />
                          {game.awayTeam.shortName}
                        </span>
                        <b className="text-slate-950 font-black tabular-nums">
                          {isPlayed ? game.awayScore : "–"}
                        </b>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-slate-900">
                          <img
                            src={game.homeTeam.logoUrl}
                            alt=""
                            className="w-5 h-5 object-contain"
                          />
                          {game.homeTeam.shortName}
                        </span>
                        <b className="text-slate-950 font-black tabular-nums">
                          {isPlayed ? game.homeScore : "–"}
                        </b>
                      </div>
                    </div>

                    <div className="border-l border-slate-200 pl-2.5 text-right">
                      <span
                        className={`block text-[10px] font-black uppercase ${
                          isLive
                            ? "text-red-600"
                            : game.status === "FINISHED"
                              ? "text-amber-700"
                              : "text-slate-600"
                        }`}
                      >
                        {isLive ? "EN VIVO" : game.status === "FINISHED" ? "FINAL" : game.time}
                      </span>
                      <span className="block text-[9px] font-bold text-slate-500 truncate max-w-[72px]">
                        📺 {tvList[0]}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 py-2">
                Cargando cartelera oficial de la LVBP…
              </span>
            )}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <main
        key={`${section}-${activeDate}-${selectedGameId}-${selectedTeamCode}`}
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-6 animate-view-enter"
      >
        {/* SECTION: GAMEDAY (/juego) */}
        {section === "juego" && (
          <GamedayView
            gameId={selectedGameId}
            onBack={() => setSection("home")}
            onSelectTeam={openTeamPage}
          />
        )}

        {/* SECTION: HOME (/) */}
        {section === "home" && (
          <div className="space-y-8">
            {/* 1. Pizarra Destacada del Día */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                    Pizarra Oficial LVBP · Temporada 2026-2027
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 capitalize">
                    {dayFormatted.fullLabel}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("calendario")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> Ver calendario y TV ›
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-52 rounded-2xl border border-slate-200 bg-white animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {gamesOfDay.map((game) => renderScoreboardCard(game))}
                </div>
              )}
            </section>

            {/* 2. LÍDERES Y POSICIONES */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Líderes y <em className="text-amber-600 not-italic">posiciones</em>
                </h2>
                <button
                  type="button"
                  onClick={() => setSection("posiciones")}
                  className="text-xs font-extrabold text-amber-600 hover:underline cursor-pointer"
                >
                  Tabla completa ›
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-8">
                  <LeadersWidget hitting={leaders.hitting} pitching={leaders.pitching} />
                </div>

                {/* Mini Standings Table */}
                <article className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <header className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h3 className="text-sm font-black text-slate-950">Tabla de posiciones</h3>
                      <span className="text-[11px] font-bold text-amber-600">Temporada regular</span>
                    </header>

                    <table className="w-full text-xs mt-2 border-collapse">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200 text-right">
                          <th className="py-2 text-left w-5">#</th>
                          <th className="py-2 text-left">Equipo</th>
                          <th className="py-2 px-1.5">JG</th>
                          <th className="py-2 px-1.5">JP</th>
                          <th className="py-2 px-1.5">PCT</th>
                          <th className="py-2 pl-1.5">DIF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {standings.map((row, idx) => (
                          <tr
                            key={row.team.code}
                            onClick={() => openTeamPage(row.team.code)}
                            className="hover:bg-slate-50 cursor-pointer transition text-right tabular-nums"
                          >
                            <td className="py-2 text-left font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2 text-left font-bold text-slate-900 flex items-center gap-2">
                              <img
                                src={row.team.logoUrl}
                                alt=""
                                className="w-6 h-6 object-contain"
                              />
                              <span>{row.team.nick}</span>
                            </td>
                            <td className="py-2 px-1.5 font-bold text-slate-900">{row.wins}</td>
                            <td className="py-2 px-1.5 text-slate-600">{row.losses}</td>
                            <td className="py-2 px-1.5 text-amber-600 font-bold">{row.pct}</td>
                            <td className="py-2 pl-1.5 text-slate-500">{row.gamesBehind}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            </section>

            {/* 3. CRÓNICAS Y RESÚMENES OFICIALES DE LA JORNADA */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Resúmenes de la <em className="text-amber-600 not-italic">jornada</em>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {realRecaps.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => openGameGameday(item.id)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between hover:border-amber-400 transition cursor-pointer shadow-xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-block rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-[10px] font-black uppercase">
                          {item.category}
                        </span>
                        <img
                          src={item.winnerLogo}
                          alt=""
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      <h3 className="text-sm font-black text-slate-950 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{item.dateLabel}</span>
                      <span className="text-amber-600 font-bold">Ver Box Score ›</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 4. MUNDO JUGADAS / LA GRADA DE LA FANATICADA */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                    Comunidad LVBP
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                    Mundo <em className="text-amber-600 not-italic">Jugadas</em>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Comenta la jornada en tiempo real con fanáticos de los 8 equipos de la LVBP.
                  </p>

                  <form onSubmit={handleCreatePost} className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={postAuthor}
                        onChange={(e) => setPostAuthor(e.target.value)}
                        placeholder="Tu nombre o apodo..."
                        maxLength={30}
                        className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      <select
                        value={postTeam}
                        onChange={(e) => setPostTeam(e.target.value)}
                        className="rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                      >
                        {Object.values(LVBP_TEAMS).map((t) => (
                          <option key={t.code} value={t.code}>
                            Fan de {t.nick}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder="Escribe tu comentario sobre la jornada de la LVBP..."
                      maxLength={220}
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2.5 px-4 transition cursor-pointer"
                    >
                      Publicar comentario
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  {communityPosts.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                      <p className="text-sm font-bold text-slate-800">
                        Aún no hay comentarios publicados en esta jornada
                      </p>
                      <p className="text-xs text-slate-500">
                        Sé el primero en compartir tu opinión o pronóstico en La Grada de la LVBP.
                      </p>
                    </div>
                  ) : (
                    communityPosts.map((post) => {
                      const club = LVBP_TEAMS[post.team] || LVBP_TEAMS.CAR;
                      return (
                        <article
                          key={post.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={club.logoSvg}
                                alt={club.nick}
                                className="w-9 h-9 object-contain"
                              />
                              <div>
                                <strong className="text-xs font-bold text-slate-950 block">
                                  {post.author}
                                </strong>
                                <span className="text-[11px] text-slate-500">
                                  @{post.username} · {post.time}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                              {club.nick}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800">{post.text}</p>
                          <div className="flex items-center gap-2 pt-1">
                            {(
                              [
                                ["fuego", "🔥"],
                                ["aplauso", "👏"],
                                ["corazon", "❤️"],
                                ["sorpresa", "😮"],
                              ] as const
                            ).map(([rKey, emoji]) => (
                              <button
                                key={rKey}
                                type="button"
                                onClick={() => handleReactPost(post.id, rKey)}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border transition cursor-pointer ${
                                  post.myReaction === rKey
                                    ? "bg-amber-50 border-amber-400 text-amber-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                <span>{emoji}</span>
                                <b>{post.reactions[rKey]}</b>
                              </button>
                            ))}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* SECTION: RESULTADOS (/resultados) */}
        {section === "resultados" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  Pizarras Oficiales C · H · E y Transmisiones TV
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Resultados de la LVBP
                </h1>
              </div>

              {/* Date pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {dates.slice(0, 12).map((d, idx) => {
                  const f = formatCompactDay(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDateIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 ${
                        idx === selectedDateIndex
                          ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                      }`}
                    >
                      {f.dayNum} {f.monthShort}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {gamesOfDay.map((game) => renderScoreboardCard(game))}
            </div>
          </div>
        )}

        {/* SECTION: CALENDARIO (/calendario) — REDISEÑADO Y CLARO POR EQUIPO */}
        {section === "calendario" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  Temporada 2026-2027 · Señales de TV y Estadios
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Calendario Oficial de Juegos
                </h1>
              </div>

              {/* Filter by Game State */}
              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs self-start">
                {(
                  [
                    ["ALL", "Todos"],
                    ["UPCOMING", "Próximos"],
                    ["FINISHED", "Finalizados"],
                  ] as const
                ).map(([stKey, stLabel]) => (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setCalendarStateFilter(stKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      calendarStateFilter === stKey
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {stLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Team Selector Strip with Official Logos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Filtrar calendario por equipo:
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setTeamFilter("")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold border transition shrink-0 cursor-pointer ${
                    teamFilter === ""
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
                  }`}
                >
                  <img src={LVBP_OFFICIAL_LOGO} alt="" className="w-5 h-5 object-contain" />
                  <span>Todos los equipos (8)</span>
                </button>

                {Object.values(LVBP_TEAMS).map((t) => {
                  const active = teamFilter === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setTeamFilter(active ? "" : t.code)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-extrabold border transition shrink-0 cursor-pointer ${
                        active
                          ? "bg-amber-50 text-slate-950 border-amber-400 ring-2 ring-amber-400/30"
                          : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"
                      }`}
                    >
                      <img src={t.logoSvg} alt={t.nick} className="w-6 h-6 object-contain" />
                      <span>{t.nick}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CASE A: SINGLE TEAM SELECTED — CLEAR TEAM-CENTRIC SCHEDULE */}
            {teamFilter && LVBP_TEAMS[teamFilter] ? (
              <div className="space-y-4">
                {(() => {
                  const club = LVBP_TEAMS[teamFilter];
                  const homeCount = filteredCalendarGames.filter(
                    (g) => g.homeTeam.code === teamFilter
                  ).length;
                  const awayCount = filteredCalendarGames.filter(
                    (g) => g.awayTeam.code === teamFilter
                  ).length;

                  return (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={club.logoSvg}
                          alt={club.name}
                          className="w-14 h-14 object-contain drop-shadow-xs"
                        />
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">
                            Calendario Individual del Club
                          </span>
                          <h2 className="text-lg sm:text-xl font-black text-slate-950">
                            {club.name}
                          </h2>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" /> Sede: {club.venue} (
                            {club.venueCity})
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 font-extrabold">
                          🏠 En Casa: {homeCount} juegos
                        </span>
                        <span className="rounded-xl bg-sky-50 border border-sky-200 text-sky-800 px-3 py-1.5 font-extrabold">
                          ✈️ Visitante: {awayCount} juegos
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Team-Centric Game Rows */}
                <div className="space-y-2.5">
                  {filteredCalendarGames.map((game) => {
                    const isHome = game.homeTeam.code === teamFilter;
                    const myTeam = isHome ? game.homeTeam : game.awayTeam;
                    const opponent = isHome ? game.awayTeam : game.homeTeam;
                    const myScore = isHome ? game.homeScore : game.awayScore;
                    const oppScore = isHome ? game.awayScore : game.homeScore;
                    const isFinished = game.status === "FINISHED";
                    const isLive = game.status === "IN_PROGRESS";
                    const won = isFinished && myScore > oppScore;
                    const dInfo = formatCompactDay(game.date);
                    const tvList = getGameTvChannels(game);

                    return (
                      <div
                        key={game.id}
                        onClick={() => openGameGameday(game.id)}
                        className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 hover:border-amber-400 transition cursor-pointer shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                      >
                        {/* 1. Formatted Date */}
                        <div className="lg:col-span-2 flex lg:flex-col items-center lg:items-start justify-between border-b lg:border-b-0 pb-2 lg:pb-0 border-slate-100">
                          <span className="text-xs font-black text-slate-900">
                            {dInfo.weekdayShort}, {dInfo.dayNum} {dInfo.monthShort}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {isFinished ? "Finalizado" : isLive ? "En Vivo" : game.time}
                          </span>
                        </div>

                        {/* 2. Home / Away Badge + Opponent with Official Logo */}
                        <div className="lg:col-span-5 flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide shrink-0 border ${
                              isHome
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-sky-50 text-sky-800 border-sky-200"
                            }`}
                          >
                            {isHome ? "🏠 EN CASA vs" : "✈️ VISITANTE @"}
                          </span>

                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={opponent.logoUrl}
                              alt={opponent.name}
                              className="w-9 h-9 object-contain shrink-0"
                            />
                            <div className="min-w-0">
                              <strong className="text-sm font-black text-slate-950 block truncate">
                                {opponent.name}
                              </strong>
                              <span className="text-[11px] text-slate-500 block truncate">
                                📍 {game.venue}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Result Pill (from Selected Team perspective) or Start Time */}
                        <div className="lg:col-span-2 flex items-center lg:justify-center">
                          {isFinished ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black border ${
                                won
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-rose-50 text-rose-800 border-rose-300"
                              }`}
                            >
                              <span>{won ? "GANÓ" : "PERDIÓ"}</span>
                              <b className="tabular-nums text-sm">
                                {myScore} - {oppScore}
                              </b>
                            </span>
                          ) : isLive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 text-xs font-black">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              {myTeam.shortName} {myScore} - {oppScore} {opponent.shortName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 text-xs font-extrabold">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {game.time}
                            </span>
                          )}
                        </div>

                        {/* 4. TV Broadcast Channels + Action */}
                        <div className="lg:col-span-3 flex flex-wrap items-center justify-between lg:justify-end gap-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {tvList.map((ch) => (
                              <span
                                key={ch}
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${tvChannelBadgeStyle(
                                  ch
                                )}`}
                              >
                                📺 {ch}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            Gameday ›
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* CASE B: ALL TEAMS SELECTED — GROUPED BY DAY IN SPANISH */
              <div className="space-y-6">
                {calendarGamesByDate.slice(0, 10).map(([dateIso, dayGames]) => {
                  const dInfo = formatCompactDay(dateIso);
                  return (
                    <div key={dateIso} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-sm sm:text-base font-black text-slate-950 capitalize flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          {dInfo.fullLabel}
                        </h3>
                        <span className="text-xs font-bold text-slate-500">
                          {dayGames.length} {dayGames.length === 1 ? "juego" : "juegos"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dayGames.map((game) => {
                          const isFinished = game.status === "FINISHED";
                          const tvList = getGameTvChannels(game);
                          return (
                            <div
                              key={game.id}
                              onClick={() => openGameGameday(game.id)}
                              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-amber-400 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                {/* Matchup with Official Logos */}
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={game.awayTeam.logoUrl}
                                      alt=""
                                      className="w-8 h-8 object-contain"
                                    />
                                    <span className="text-sm font-black text-slate-900">
                                      {game.awayTeam.nick}
                                    </span>
                                    {game.status !== "SCHEDULED" && (
                                      <b className="text-base font-black text-slate-950 tabular-nums">
                                        {game.awayScore}
                                      </b>
                                    )}
                                  </div>

                                  <span className="text-[11px] font-extrabold text-slate-400 uppercase px-1">
                                    vs
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <img
                                      src={game.homeTeam.logoUrl}
                                      alt=""
                                      className="w-8 h-8 object-contain"
                                    />
                                    <span className="text-sm font-black text-slate-900">
                                      {game.homeTeam.nick}
                                    </span>
                                    {game.status !== "SCHEDULED" && (
                                      <b className="text-base font-black text-slate-950 tabular-nums">
                                        {game.homeScore}
                                      </b>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold shrink-0 border ${
                                    isFinished
                                      ? "bg-slate-100 text-slate-800 border-slate-200"
                                      : "bg-amber-50 text-amber-900 border-amber-200"
                                  }`}
                                >
                                  {isFinished ? "Final" : game.time}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                                <span className="text-slate-500 flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />{" "}
                                  {game.venue}
                                </span>

                                <div className="flex flex-wrap items-center gap-1">
                                  {tvList.map((ch) => (
                                    <span
                                      key={ch}
                                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${tvChannelBadgeStyle(
                                        ch
                                      )}`}
                                    >
                                      📺 {ch}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION: POSICIONES (/posiciones) */}
        {section === "posiciones" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  Clasificación Oficial LVBP
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Tabla de Posiciones
                </h1>
              </div>

              <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                {(
                  [
                    ["REGULAR", "Temporada Regular"],
                    ["ROUND_ROBIN", "Round Robin"],
                    ["FINAL", "Serie Final"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStandingsPhase(key)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      standingsPhase === key
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {standingsPhase !== "REGULAR" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2 shadow-xs">
                <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-black text-slate-950">
                  Esta fase aún no ha comenzado
                </h3>
                <p className="text-xs text-slate-500">
                  Actualmente se disputa la Temporada Regular 2026-2027 de la LVBP.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold">
                      <th className="py-3 px-4 text-left">#</th>
                      <th className="py-3 px-4 text-left">Equipo</th>
                      <th className="py-3 px-3">JJ</th>
                      <th className="py-3 px-3">JG</th>
                      <th className="py-3 px-3">JP</th>
                      <th className="py-3 px-3 text-amber-600">PCT</th>
                      <th className="py-3 px-3">DIF</th>
                      <th className="py-3 px-3">CASA</th>
                      <th className="py-3 px-3">VIS</th>
                      <th className="py-3 px-3">CA</th>
                      <th className="py-3 px-3">CP</th>
                      <th className="py-3 px-3">DIF.C</th>
                      <th className="py-3 px-4">RACHA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {standings.map((row, idx) => (
                      <tr
                        key={row.team.code}
                        onClick={() => openTeamPage(row.team.code)}
                        className="hover:bg-slate-50 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 text-left font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 text-left font-black text-slate-950 flex items-center gap-3">
                          <img
                            src={row.team.logoUrl}
                            alt=""
                            className="w-8 h-8 object-contain"
                          />
                          <span>{row.team.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{row.gamesPlayed}</td>
                        <td className="py-3 px-3 font-extrabold text-slate-950">{row.wins}</td>
                        <td className="py-3 px-3 text-slate-600">{row.losses}</td>
                        <td className="py-3 px-3 font-black text-amber-600">{row.pct}</td>
                        <td className="py-3 px-3 text-slate-600">{row.gamesBehind}</td>
                        <td className="py-3 px-3 text-slate-500">{row.homeRecord}</td>
                        <td className="py-3 px-3 text-slate-500">{row.awayRecord}</td>
                        <td className="py-3 px-3 text-slate-600">{row.runsScored}</td>
                        <td className="py-3 px-3 text-slate-600">{row.runsAllowed}</td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            row.runDiff >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {row.runDiff > 0 ? `+${row.runDiff}` : row.runDiff}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.streak}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION: EQUIPOS Y ROSTER (/equipos) */}
        {section === "equipos" && (
          <TeamRosterView
            selectedTeamCode={selectedTeamCode}
            onSelectTeam={setSelectedTeamCode}
            schedule={schedule}
            onOpenGame={(id) => openGameGameday(id)}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (NATIVE APP STYLE FOR PHONES) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg"
        aria-label="Navegación Móvil"
      >
        {(
          [
            ["home", "Inicio", Home],
            ["resultados", "Pizarra", Activity],
            ["calendario", "Calendario", Calendar],
            ["posiciones", "Posiciones", Trophy],
            ["equipos", "Equipos", Users],
          ] as const
        ).map(([key, label, Icon]) => {
          const active = section === key || (section === "juego" && key === "resultados");
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                active ? "text-amber-600 bg-amber-50" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-amber-600" : "text-slate-500"}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img src={LVBP_OFFICIAL_LOGO} alt="LVBP" className="w-6 h-6 object-contain" />
            <span className="font-black text-slate-900">EN JUEGO · LVBP</span>
            <span>— Resultados en vivo, Gameday 2D, Transmisiones TV y Estadísticas.</span>
          </div>
          <div className="flex flex-wrap gap-4 font-semibold">
            <button type="button" onClick={() => setSection("home")} className="hover:text-slate-900">
              Inicio
            </button>
            <button
              type="button"
              onClick={() => setSection("resultados")}
              className="hover:text-slate-900"
            >
              Resultados
            </button>
            <button
              type="button"
              onClick={() => setSection("calendario")}
              className="hover:text-slate-900"
            >
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setSection("posiciones")}
              className="hover:text-slate-900"
            >
              Posiciones
            </button>
            <button
              type="button"
              onClick={() => setSection("equipos")}
              className="hover:text-slate-900"
            >
              Equipos y Roster
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
