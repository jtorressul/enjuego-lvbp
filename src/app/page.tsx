"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LeaderCategory, ScheduleGame, StandingRow } from "@/lib/types";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { GamedayView } from "@/components/gameday/GamedayView";
import { LeadersWidget } from "@/components/LeadersWidget";
import { TeamRosterView } from "@/components/TeamRosterView";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Tv,
  Radio,
  MapPin,
  Trophy,
  Calendar,
  Activity,
  Users,
  Newspaper,
  Play,
  RefreshCw,
} from "lucide-react";

type NavSection = "home" | "resultados" | "calendario" | "posiciones" | "equipos" | "juego";

function formatCompactDay(iso: string): { dayNum: string; monthShort: string; fullLabel: string } {
  if (!iso) return { dayNum: "15", monthShort: "OCT", fullLabel: "15 de octubre" };
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const monthShort = new Intl.DateTimeFormat("es-VE", { month: "short", timeZone: "UTC" })
    .format(dt)
    .replace(".", "")
    .toUpperCase();
  const fullLabel = new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
  return { dayNum: String(d), monthShort, fullLabel };
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
  const [standingsPhase, setStandingsPhase] = useState<"REGULAR" | "ROUND_ROBIN" | "FINAL">("REGULAR");

  // Mundo Jugadas (Comunidad) state synced with Cloudflare KV (no fake posts)
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

      // Pick default date closest to today (2026-10-15) or last played date
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
        };
      }

      return {
        id: g.id,
        category: `Previa · ${g.time}`,
        title: `${g.awayTeam.name} visita a ${g.homeTeam.name} en el ${g.venue}`,
        summary: `Duelo programado en ${g.venueCity} a las ${g.time} (Hora de Venezuela). Transmisión radial y cobertura jugada a jugada disponible en Gameday.`,
        dateLabel: g.date,
        venue: g.venue,
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

  return (
    <div className="min-h-screen flex flex-col bg-[#060a12]">
      {/* TOPBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#080d18]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSection("home")}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-amber-500/20">
                ⚾
              </div>
              <div>
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition">
                  EN JUEGO
                </span>
                <span className="block text-[10px] font-extrabold uppercase tracking-widest text-amber-400 -mt-1">
                  LVBP Oficial
                </span>
              </div>
            </button>

            {liveGames.length > 0 ? (
              <button
                type="button"
                onClick={() => openGameGameday(liveGames[0].id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-3 py-1 text-xs font-extrabold text-red-400 transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>
                  EN VIVO: {liveGames[0].awayTeam.shortName} {liveGames[0].awayScore}-
                  {liveGames[0].homeScore} {liveGames[0].homeTeam.shortName}
                </span>
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Temporada 2026-27
              </span>
            )}
          </div>

          {/* Main Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación Principal">
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
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  section === key
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllData}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Actualizar pizarra"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSection("resultados")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-md shadow-amber-400/15"
            >
              <Activity className="w-3.5 h-3.5" /> Pizarra del Día
            </button>
          </div>
        </div>

        {/* Mobile Bottom/Sub Navigation */}
        <div className="flex md:hidden overflow-x-auto border-t border-slate-800/80 px-3 py-1.5 gap-1 bg-slate-950/90">
          {(
            [
              ["home", "Inicio"],
              ["resultados", "Resultados"],
              ["calendario", "Calendario"],
              ["posiciones", "Posiciones"],
              ["equipos", "Equipos / Roster"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap ${
                section === key ? "bg-amber-400 text-slate-950" : "text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* SCORE STRIP / TICKER BAR */}
      <section className="border-b border-slate-800/90 bg-[#0b1220]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Date Selector Box */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shrink-0">
            <button
              type="button"
              disabled={selectedDateIndex <= 0}
              onClick={() => setSelectedDateIndex((i) => Math.max(0, i - 1))}
              className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-300 cursor-pointer"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[72px]">
              <span className="block text-[9px] font-extrabold uppercase tracking-wider text-amber-400">
                Juegos
              </span>
              <strong className="text-sm font-black text-white">
                {dayFormatted.dayNum}{" "}
                <small className="text-xs text-slate-400">{dayFormatted.monthShort}</small>
              </strong>
            </div>
            <button
              type="button"
              disabled={selectedDateIndex >= dates.length - 1}
              onClick={() => setSelectedDateIndex((i) => Math.min(dates.length - 1, i + 1))}
              className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-300 cursor-pointer"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Horizontal Livebugs Strip */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0">
            {gamesOfDay.length > 0 ? (
              gamesOfDay.map((game) => {
                const isPlayed = game.status === "IN_PROGRESS" || game.status === "FINISHED";
                const isLive = game.status === "IN_PROGRESS";
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => openGameGameday(game.id)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 border text-left shrink-0 transition cursor-pointer ${
                      selectedGameId === game.id && section === "juego"
                        ? "bg-slate-800 border-amber-400"
                        : isLive
                          ? "bg-slate-900/95 border-red-500/50 hover:border-red-400"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1 min-w-[92px]">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-white">
                          <img src={game.awayTeam.logoUrl} alt="" className="w-4 h-4" />
                          {game.awayTeam.shortName}
                        </span>
                        <b className="text-white font-black tabular-nums">
                          {isPlayed ? game.awayScore : "–"}
                        </b>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-white">
                          <img src={game.homeTeam.logoUrl} alt="" className="w-4 h-4" />
                          {game.homeTeam.shortName}
                        </span>
                        <b className="text-white font-black tabular-nums">
                          {isPlayed ? game.homeScore : "–"}
                        </b>
                      </div>
                    </div>

                    <div className="border-l border-slate-800 pl-2.5 text-right">
                      <span
                        className={`block text-[10px] font-black uppercase ${
                          isLive
                            ? "text-red-400"
                            : game.status === "FINISHED"
                              ? "text-amber-400"
                              : "text-slate-400"
                        }`}
                      >
                        {isLive ? "EN VIVO" : game.status === "FINISHED" ? "FINAL" : game.time}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {game.status === "FINISHED" ? "Box Score ›" : "Gameday ›"}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 py-2">
                Cargando cartelera oficial de la LVBP…
              </span>
            )}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
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
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Pizarra Oficial LVBP · Temporada 2026-2027
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-white capitalize">
                    {dayFormatted.fullLabel}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("calendario")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 px-3.5 py-2 text-xs font-extrabold transition cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" /> Ver calendario completo ›
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-44 rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {gamesOfDay.map((game) => {
                    const played = game.status === "IN_PROGRESS" || game.status === "FINISHED";
                    return (
                      <article
                        key={game.id}
                        onClick={() => openGameGameday(game.id)}
                        className="rounded-2xl border border-slate-800 bg-slate-900/90 hover:border-amber-400/60 transition flex flex-col justify-between p-4 shadow-lg cursor-pointer group"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs pb-2.5 mb-2.5 border-b border-slate-800">
                            <span
                              className={`font-extrabold uppercase ${
                                game.status === "IN_PROGRESS"
                                  ? "text-red-400 flex items-center gap-1.5"
                                  : game.status === "FINISHED"
                                    ? "text-amber-400"
                                    : "text-slate-300"
                              }`}
                            >
                              {game.status === "IN_PROGRESS" && (
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              )}
                              {game.inning}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">C · H · E</span>
                          </div>

                          {/* Away Row */}
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={game.awayTeam.logoUrl} alt="" className="w-7 h-7 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-black text-white truncate">
                                  {game.awayTeam.nick}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {game.awayTeam.wins}-{game.awayTeam.losses}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm tabular-nums">
                              <b className="w-5 text-center font-black text-amber-400">
                                {played ? game.awayScore : "–"}
                              </b>
                              <span className="w-5 text-center text-slate-300 font-semibold">
                                {played ? game.awayHits : "–"}
                              </span>
                              <span className="w-4 text-center text-slate-400">
                                {played ? game.awayErrors : "–"}
                              </span>
                            </div>
                          </div>

                          {/* Home Row */}
                          <div className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={game.homeTeam.logoUrl} alt="" className="w-7 h-7 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-black text-white truncate">
                                  {game.homeTeam.nick}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {game.homeTeam.wins}-{game.homeTeam.losses}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm tabular-nums">
                              <b className="w-5 text-center font-black text-amber-400">
                                {played ? game.homeScore : "–"}
                              </b>
                              <span className="w-5 text-center text-slate-300 font-semibold">
                                {played ? game.homeHits : "–"}
                              </span>
                              <span className="w-4 text-center text-slate-400">
                                {played ? game.homeErrors : "–"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                          {game.decisions?.winner ? (
                            <p className="text-[11px] text-slate-300 truncate">
                              <b className="text-emerald-400">G:</b> {game.decisions.winner}
                              {game.decisions.loser ? (
                                <>
                                  {" "}
                                  · <b className="text-red-400">P:</b> {game.decisions.loser}
                                </>
                              ) : null}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {game.venue}
                            </p>
                          )}

                          <div className="w-full rounded-lg bg-slate-800/90 group-hover:bg-amber-400 group-hover:text-slate-950 text-white py-1.5 px-3 text-xs font-extrabold text-center transition">
                            {game.status === "IN_PROGRESS"
                              ? "Seguir Gameday en Vivo ›"
                              : game.status === "FINISHED"
                                ? "Ver Resumen, Box Score y Jugadas ›"
                                : "Ver Previa y Alineaciones ›"}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 2. LÍDERES Y POSICIONES */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Líderes y <em className="text-amber-400 not-italic">posiciones</em>
                </h2>
                <button
                  type="button"
                  onClick={() => setSection("posiciones")}
                  className="text-xs font-extrabold text-amber-400 hover:underline cursor-pointer"
                >
                  Tabla completa ›
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-8">
                  <LeadersWidget hitting={leaders.hitting} pitching={leaders.pitching} />
                </div>

                {/* Mini Standings Table */}
                <article className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between">
                  <div>
                    <header className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-sm font-black text-white">Tabla de posiciones</h3>
                      <span className="text-[11px] font-bold text-amber-400">Temporada regular</span>
                    </header>

                    <table className="w-full text-xs mt-2 border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 text-right">
                          <th className="py-2 text-left w-5">#</th>
                          <th className="py-2 text-left">Equipo</th>
                          <th className="py-2 px-1.5">JG</th>
                          <th className="py-2 px-1.5">JP</th>
                          <th className="py-2 px-1.5">PCT</th>
                          <th className="py-2 pl-1.5">DIF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {standings.map((row, idx) => (
                          <tr
                            key={row.team.code}
                            onClick={() => openTeamPage(row.team.code)}
                            className="hover:bg-slate-800/50 cursor-pointer transition text-right tabular-nums"
                          >
                            <td className="py-2 text-left font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2 text-left font-bold text-white flex items-center gap-2">
                              <img src={row.team.logoUrl} alt="" className="w-5 h-5" />
                              <span>{row.team.nick}</span>
                            </td>
                            <td className="py-2 px-1.5 font-bold text-white">{row.wins}</td>
                            <td className="py-2 px-1.5 text-slate-300">{row.losses}</td>
                            <td className="py-2 px-1.5 text-amber-400 font-bold">{row.pct}</td>
                            <td className="py-2 pl-1.5 text-slate-400">{row.gamesBehind}</td>
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
                <Newspaper className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Resúmenes de la <em className="text-amber-400 not-italic">jornada</em>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {realRecaps.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => openGameGameday(item.id)}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between hover:border-amber-400/50 transition cursor-pointer"
                  >
                    <div className="space-y-2">
                      <span className="inline-block rounded bg-amber-400/15 text-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-black text-white leading-snug">{item.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.summary}</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{item.dateLabel}</span>
                      <span className="text-amber-400 font-bold">Ver Box Score ›</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 4. MUNDO JUGADAS / LA GRADA DE LA FANATICADA */}
            <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Comunidad LVBP
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Mundo <em className="text-amber-400 not-italic">Jugadas</em>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    La grada abierta de En Juego. Comparte tu análisis de la jornada, elige tu equipo y debate con otros aficionados.
                  </p>
                  <form onSubmit={handleCreatePost} className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={postAuthor}
                        onChange={(e) => setPostAuthor(e.target.value)}
                        placeholder="Tu nombre o apodo"
                        maxLength={28}
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <select
                        value={postTeam}
                        onChange={(e) => setPostTeam(e.target.value)}
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        {Object.values(LVBP_TEAMS).map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.nick} ({t.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder="Escribe tu comentario sobre la jornada de la LVBP…"
                      rows={3}
                      maxLength={280}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 text-xs font-black transition cursor-pointer"
                    >
                      Publicar comentario
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  {communityPosts.length === 0 ? (
                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-8 text-center space-y-2">
                      <p className="text-sm font-bold text-slate-200">
                        Aún no hay comentarios publicados en esta jornada
                      </p>
                      <p className="text-xs text-slate-400">
                        Sé el primero en compartir tu opinión o pronóstico en La Grada de la LVBP.
                      </p>
                    </div>
                  ) : (
                    communityPosts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-black text-amber-300 text-xs">
                              {post.author.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-xs font-bold text-white block">
                                {post.author}
                              </strong>
                              <span className="text-[11px] text-slate-400">
                                @{post.username} · {post.time}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            {post.team}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200">{post.text}</p>
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
                                  ? "bg-amber-500/20 border-amber-400 text-amber-300"
                                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <span>{emoji}</span>
                              <b>{post.reactions[rKey]}</b>
                            </button>
                          ))}
                        </div>
                      </article>
                    ))
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
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Pizarras Oficiales C · H · E
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Resultados de la LVBP
                </h1>
              </div>

              {/* Date pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {dates.slice(0, 10).map((d, idx) => {
                  const f = formatCompactDay(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDateIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        idx === selectedDateIndex
                          ? "bg-amber-400 text-slate-950 border-amber-400"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {f.dayNum} {f.monthShort}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gamesOfDay.map((game) => (
                <article
                  key={game.id}
                  onClick={() => openGameGameday(game.id)}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 hover:border-amber-400/60 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-slate-800 pb-2">
                    <span>{game.inning}</span>
                    <span className="text-slate-400">C · H · E</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      [game.awayTeam, game.awayScore, game.awayHits, game.awayErrors],
                      [game.homeTeam, game.homeScore, game.homeHits, game.homeErrors],
                    ].map(([t, r, h, e]: any) => (
                      <div key={t.code} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-bold text-white">
                          <img src={t.logoUrl} alt="" className="w-6 h-6" />
                          {t.name}
                        </span>
                        <div className="flex items-center gap-3 tabular-nums">
                          <b className="w-5 text-center text-amber-400 font-black">{r}</b>
                          <span className="w-5 text-center text-slate-200">{h}</span>
                          <span className="w-4 text-center text-slate-400">{e}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {game.decisions && (
                    <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-300 flex flex-wrap gap-2">
                      {game.decisions.winner && <span>G: {game.decisions.winner}</span>}
                      {game.decisions.loser && <span>· P: {game.decisions.loser}</span>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: CALENDARIO (/calendario) */}
        {section === "calendario" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Temporada 2026-2027
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Calendario de Juegos
                </h1>
              </div>

              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">Todos los equipos (8 clubes)</option>
                {Object.values(LVBP_TEAMS).map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5">
              {schedule
                .filter(
                  (g) =>
                    !teamFilter ||
                    g.awayTeam.code === teamFilter ||
                    g.homeTeam.code === teamFilter
                )
                .slice(0, 25)
                .map((game) => (
                  <div
                    key={game.id}
                    onClick={() => openGameGameday(game.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 hover:border-amber-400/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-[85px] text-xs">
                        <span className="block font-extrabold text-amber-400">{game.date}</span>
                        <span className="text-slate-400">{game.inning}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-white">
                        <span className="flex items-center gap-2">
                          <img src={game.awayTeam.logoUrl} alt="" className="w-6 h-6" />
                          {game.awayTeam.nick}
                          {game.status !== "SCHEDULED" && (
                            <b className="text-amber-300 ml-1">{game.awayScore}</b>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">en</span>
                        <span className="flex items-center gap-2">
                          <img src={game.homeTeam.logoUrl} alt="" className="w-6 h-6" />
                          {game.homeTeam.nick}
                          {game.status !== "SCHEDULED" && (
                            <b className="text-amber-300 ml-1">{game.homeScore}</b>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" /> {game.venue}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        <Radio className="w-3.5 h-3.5 text-emerald-400" /> Radio en vivo
                      </span>
                      <span className="font-bold text-white bg-slate-800 px-3 py-1 rounded-lg">
                        Gameday ›
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SECTION: POSICIONES (/posiciones) */}
        {section === "posiciones" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Clasificación Oficial LVBP
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Tabla de Posiciones
                </h1>
              </div>

              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
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
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {standingsPhase !== "REGULAR" ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-10 text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <h3 className="text-base font-black text-white">
                  Esta fase aún no ha comenzado
                </h3>
                <p className="text-xs text-slate-400">
                  Actualmente se disputa la Temporada Regular 2026-2027 de la LVBP.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-extrabold">
                      <th className="py-3 px-4 text-left">#</th>
                      <th className="py-3 px-4 text-left">Equipo</th>
                      <th className="py-3 px-3">JJ</th>
                      <th className="py-3 px-3">JG</th>
                      <th className="py-3 px-3">JP</th>
                      <th className="py-3 px-3 text-amber-400">PCT</th>
                      <th className="py-3 px-3">DIF</th>
                      <th className="py-3 px-3">CASA</th>
                      <th className="py-3 px-3">VIS</th>
                      <th className="py-3 px-3">CA</th>
                      <th className="py-3 px-3">CP</th>
                      <th className="py-3 px-3">DIF.C</th>
                      <th className="py-3 px-4">RACHA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 tabular-nums">
                    {standings.map((row, idx) => (
                      <tr
                        key={row.team.code}
                        onClick={() => openTeamPage(row.team.code)}
                        className="hover:bg-slate-800/50 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 text-left font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 text-left font-black text-white flex items-center gap-2.5">
                          <img src={row.team.logoUrl} alt="" className="w-6 h-6" />
                          <span>{row.team.name}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{row.gamesPlayed}</td>
                        <td className="py-3 px-3 font-extrabold text-white">{row.wins}</td>
                        <td className="py-3 px-3 text-slate-300">{row.losses}</td>
                        <td className="py-3 px-3 font-black text-amber-400">{row.pct}</td>
                        <td className="py-3 px-3 text-slate-300">{row.gamesBehind}</td>
                        <td className="py-3 px-3 text-slate-400">{row.homeRecord}</td>
                        <td className="py-3 px-3 text-slate-400">{row.awayRecord}</td>
                        <td className="py-3 px-3 text-slate-300">{row.runsScored}</td>
                        <td className="py-3 px-3 text-slate-300">{row.runsAllowed}</td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            row.runDiff >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {row.runDiff > 0 ? `+${row.runDiff}` : row.runDiff}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{row.streak}</td>
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

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#05080f] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-black text-white">EN JUEGO · LVBP</span>
            <span>— Resultados en vivo, Gameday 2D, Zona de Strike y Estadísticas.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <button type="button" onClick={() => setSection("home")} className="hover:text-white">
              Inicio
            </button>
            <button type="button" onClick={() => setSection("resultados")} className="hover:text-white">
              Resultados
            </button>
            <button type="button" onClick={() => setSection("calendario")} className="hover:text-white">
              Calendario
            </button>
            <button type="button" onClick={() => setSection("posiciones")} className="hover:text-white">
              Posiciones
            </button>
            <button type="button" onClick={() => setSection("equipos")} className="hover:text-white">
              Equipos y Roster
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
