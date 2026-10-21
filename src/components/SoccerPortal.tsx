"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SOCCER_LEAGUES,
  SOCCER_LEAGUES_LIST,
  parseSoccerLeague,
  type SoccerLeagueId,
} from "@/lib/soccer-leagues";
import type { SoccerMatch, SoccerStandingRow } from "@/lib/soccer-service";
import { AuthModal } from "@/components/AuthModal";
import { SoccerGamedayView } from "@/components/soccer/SoccerGamedayView";
import { UserProfile } from "@/lib/user-auth";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  ChevronRight,
  Activity,
  Menu,
  X,
  Play,
  Home,
} from "lucide-react";

interface SoccerPortalProps {
  initialLeague: SoccerLeagueId;
  initialMatches: SoccerMatch[];
  initialStandings: SoccerStandingRow[];
  initialMatchId?: string | null;
}

export function SoccerPortal({
  initialLeague,
  initialMatches,
  initialStandings,
  initialMatchId = null,
}: SoccerPortalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [activeLeague, setActiveLeague] = useState<SoccerLeagueId>(initialLeague);
  const [matches, setMatches] = useState<SoccerMatch[]>(initialMatches);
  const [standings, setStandings] = useState<SoccerStandingRow[]>(initialStandings);
  const [loading, setLoading] = useState(false);
  const [matchesFilter, setMatchesFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "FINISHED">("ALL");

  // Navigation & Drawer states
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    () => initialMatchId || searchParams.get("partido") || searchParams.get("match") || null
  );

  // Auth modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"quick" | "login" | "register" | "profile">("login");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const currentLeague = SOCCER_LEAGUES[activeLeague] || SOCCER_LEAGUES["uefa.champions"];

  // Load user session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("enjuego_user_session");
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Sync league and match if searchParams change
  useEffect(() => {
    const raw = searchParams.get("liga") || searchParams.get("league");
    if (raw) {
      const parsed = parseSoccerLeague(raw);
      if (parsed !== activeLeague) {
        switchLeague(parsed);
      }
    }
    const partido = searchParams.get("partido") || searchParams.get("match");
    if (partido) {
      setActiveMatchId(partido);
    }
  }, [searchParams]);

  const switchLeague = async (nextLeague: SoccerLeagueId) => {
    setActiveLeague(nextLeague);
    setLoading(true);

    try {
      const [resMatches, resStandings] = await Promise.all([
        fetch(`/api/soccer/scoreboard?league=${nextLeague}`).then((r) => r.json()),
        fetch(`/api/soccer/standings?league=${nextLeague}`).then((r) => r.json()),
      ]);

      if (Array.isArray(resMatches?.matches)) {
        setMatches(resMatches.matches);
      }
      if (Array.isArray(resStandings?.standings)) {
        setStandings(resStandings.standings);
      }
    } catch (err) {
      console.error("[SoccerPortal] Error loading league data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLeague = (id: SoccerLeagueId) => {
    setActiveMatchId(null);
    switchLeague(id);
    startTransition(() => {
      router.push(`/futbol?liga=${id}`);
    });
  };

  const handleOpenMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    startTransition(() => {
      router.push(`/futbol?liga=${activeLeague}&partido=${matchId}`, { scroll: false });
    });
  };

  const handleCloseMatch = () => {
    setActiveMatchId(null);
    startTransition(() => {
      router.push(`/futbol?liga=${activeLeague}`, { scroll: false });
    });
  };

  const filteredMatches = matches.filter((m) => {
    if (matchesFilter === "LIVE") return m.status === "IN_PROGRESS";
    if (matchesFilter === "UPCOMING") return m.status === "SCHEDULED";
    if (matchesFilter === "FINISHED") return m.status === "FINISHED";
    return true;
  });

  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fb] text-slate-900 pb-16">
      {/* 1. UNIFIED GLOBAL HEADER BAR (#0A1120 Navy · 60-30-10 Color System · Zero Grey Boxes) */}
      <header
        className="portal-header keep-dark sticky top-0 z-40 border-b text-white shadow-sm transition-all"
        style={{
          backgroundColor: "#0a1120",
          borderColor: "#1e293b",
          color: "#ffffff",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 sm:h-16 flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] gap-4">
          {/* Left Column: Brand Horizontal Logo */}
          <div className="flex items-center justify-start gap-2 shrink-0">
            <Link
              href="/inicio"
              className="flex items-center gap-1.5 sm:gap-2 py-1 group cursor-pointer select-none"
              aria-label="En Juego Online - Inicio"
            >
              <img
                src="/logo.png"
                alt="En Juego · Deportes en Vivo"
                className="h-8 sm:h-9 md:h-9.5 w-auto object-contain transition-transform group-hover:scale-102 shrink-0"
              />
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black tracking-tight shrink-0"
                style={{
                  backgroundColor: "#1e293b",
                  color: "#fbbf24",
                  border: "1px solid rgba(251, 191, 36, 0.35)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>.online</span>
              </span>
            </Link>
          </div>

          {/* Center Column: Desktop Main Navigation (True Center, Clean Editorial Links, 3px Gold Active Bar) */}
          <nav
            className="hidden lg:flex items-center justify-center h-15 sm:h-16 gap-6 xl:gap-7"
            aria-label="Navegación Principal"
          >
            {[
              { key: "home", label: "Inicio", href: "/inicio" },
              { key: "resultados", label: "Resultados", href: "/resultados?liga=lvbp" },
              { key: "posiciones", label: "Posiciones", href: "/posiciones?liga=lvbp" },
              { key: "calendario", label: "Calendario", href: "/calendario?liga=lvbp" },
              { key: "lideres", label: "Líderes", href: "/lideres?liga=lvbp" },
              { key: "equipos", label: "Equipos", href: "/teams?team=leones&liga=lvbp" },
              { key: "futbol", label: "Fútbol", href: "/futbol" },
              { key: "noticias", label: "Noticias", href: "/noticias" },
            ].map((item) => {
              const isActive = item.key === "futbol";
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`h-full flex items-center relative text-[13px] font-bold tracking-wide transition-colors select-none px-0.5 cursor-pointer ${
                    isActive
                      ? "text-white font-black"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                      style={{ backgroundColor: "#f59e0b" }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Column: Auth Buttons / Fan Profile */}
          <div className="hidden lg:flex items-center justify-end gap-2.5 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab("profile");
                  setAuthModalOpen(true);
                }}
                className="rounded-xl border border-slate-700 bg-slate-900 hover:border-amber-400 text-white pl-2 pr-3.5 py-1.5 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                  {(currentUser.name || "Fan").slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-black text-white truncate max-w-[110px]">
                  {currentUser.name || "Fanático"}
                </span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab("login");
                    setAuthModalOpen(true);
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer select-none"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab("quick");
                    setAuthModalOpen(true);
                  }}
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-1.5 text-xs font-black transition cursor-pointer select-none shadow-2xs"
                >
                  Crear Cuenta
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls (<1024px) */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
              aria-label="Abrir Menú Principal"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span>Menú</span>
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Horizontal Section Tabs (<1024px) — Clean Editorial Underline Bar */}
        <div
          className="lg:hidden border-t overflow-x-auto no-scrollbar"
          style={{ backgroundColor: "#0a1120", borderColor: "#1e293b" }}
        >
          <div className="flex items-center px-3 min-w-max gap-5">
            {[
              { key: "home", label: "Inicio", href: "/inicio" },
              { key: "resultados", label: "Resultados", href: "/resultados?liga=lvbp" },
              { key: "posiciones", label: "Posiciones", href: "/posiciones?liga=lvbp" },
              { key: "calendario", label: "Calendario", href: "/calendario?liga=lvbp" },
              { key: "futbol", label: "Fútbol", href: "/futbol" },
              { key: "lideres", label: "Líderes", href: "/lideres?liga=lvbp" },
              { key: "equipos", label: "Equipos", href: "/teams?team=leones&liga=lvbp" },
              { key: "noticias", label: "Noticias", href: "/noticias" },
            ].map((item) => {
              const isActive = item.key === "futbol";
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`relative py-2.5 text-xs font-bold tracking-wide transition shrink-0 select-none ${
                    isActive ? "text-white font-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"
                      style={{ backgroundColor: "#f59e0b" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* 2. SUBHEADER COMPETITION STRIP (Official League Crests, Zero Emojis, Matching Baseball Ticker Bar) */}
      {!activeMatchId && (
        <section className="border-b border-slate-200 bg-white relative z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {SOCCER_LEAGUES_LIST.map((lg) => {
                const isSel = activeLeague === lg.id;
                return (
                  <button
                    key={lg.id}
                    type="button"
                    onClick={() => handleSelectLeague(lg.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 select-none ${
                      isSel
                        ? "dark-pill shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-xs bg-white p-0.5 flex items-center justify-center shrink-0">
                      <img src={lg.logo} alt="" className="w-full h-full object-contain" />
                    </span>
                    <span>{lg.shortName}</span>
                  </button>
                );
              })}
            </div>

            {loading && (
              <span className="hidden sm:flex items-center gap-1.5 text-amber-600 text-xs font-bold shrink-0">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Actualizando...</span>
              </span>
            )}
          </div>
        </section>
      )}

      {/* MOBILE SLIDE-OVER DRAWER (Redesigned Clean Editorial Menu) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end lg:hidden animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity z-[200]"
            onClick={() => setMobileDrawerOpen(false)}
          />

          <div className="relative w-full max-w-[85vw] sm:max-w-sm bg-white h-dvh shadow-2xl flex flex-col z-[201] overflow-hidden border-l border-slate-200">
            <div
              className="drawer-header keep-dark px-4 py-3.5 border-b flex items-center justify-between text-white shrink-0 sticky top-0 z-20"
              style={{
                backgroundColor: "#0a1120",
                borderColor: "#1e293b",
                paddingTop: "max(0.85rem, env(safe-area-inset-top, 0.85rem))",
              }}
            >
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="En Juego" className="h-8 w-auto object-contain" />
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black tracking-tight select-none"
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#fbbf24",
                    border: "1px solid rgba(251, 191, 36, 0.35)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span>.online</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white transition cursor-pointer active:scale-95"
                style={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                aria-label="Cerrar Menú"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-200/80">
              {/* Quick Soccer Leagues Selector in Drawer (Official Logos, Zero Emojis) */}
              <div className="p-4 bg-slate-50/80">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2.5 flex items-center justify-between">
                  <span>Competiciones Europeas</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    2026-27
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {SOCCER_LEAGUES_LIST.map((lg) => {
                    const isLgActive = activeLeague === lg.id;
                    return (
                      <button
                        key={lg.id}
                        type="button"
                        onClick={() => {
                          handleSelectLeague(lg.id);
                          setMobileDrawerOpen(false);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-black transition cursor-pointer border ${
                          isLgActive
                            ? "dark-pill border-slate-900 shadow-2xs"
                            : "bg-white text-slate-800 border-slate-200/90 hover:border-slate-300"
                        }`}
                      >
                        <span className="w-5 h-5 rounded-xs bg-white p-0.5 flex items-center justify-center mb-1">
                          <img src={lg.logo} alt="" className="w-full h-full object-contain" />
                        </span>
                        <span className="leading-tight truncate max-w-full">{lg.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Links in Drawer */}
              <div className="p-3 bg-white space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2.5 mb-1.5">
                  Navegación Principal
                </div>
                {[
                  { key: "home", label: "Inicio", sub: "Portada general y marcadores", Icon: Home, href: "/inicio", active: false },
                  { key: "futbol", label: "Fútbol Europeo", sub: "Champions League y las 5 Grandes Ligas", Icon: Trophy, href: "/futbol", active: true },
                  { key: "resultados", label: "Resultados Béisbol", sub: "LVBP · LIDOM · LMP · MLB", Icon: Activity, href: "/resultados?liga=lvbp", active: false },
                  { key: "posiciones", label: "Tabla de Posiciones", sub: "Clasificación de Béisbol", Icon: Trophy, href: "/posiciones?liga=lvbp", active: false },
                  { key: "calendario", label: "Calendario y TV", sub: "Próximos juegos y transmisión", Icon: Calendar, href: "/calendario?liga=lvbp", active: false },
                  { key: "noticias", label: "Noticias y Videos", sub: "Actualidad y resúmenes oficiales", Icon: Play, href: "/noticias", active: false },
                ].map((item) => {
                  const ItemIcon = item.Icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                        item.active
                          ? "bg-slate-100 text-slate-950 font-black"
                          : "text-slate-700 hover:bg-slate-50 font-bold"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            item.active
                              ? "dark-pill border-slate-900"
                              : "bg-slate-50 border-slate-200/80 text-slate-600"
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] text-slate-900 leading-tight truncate">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">
                            {item.sub}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 shrink-0 ${
                          item.active ? "text-amber-600" : "text-slate-300"
                        }`}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 shrink-0">
              <p className="font-extrabold text-slate-800">EN JUEGO · DEPORTES EN VIVO</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cobertura oficial de Béisbol y Fútbol Europeo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER (Exact 7xl Grid Matching Baseball) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 pt-4 sm:pt-5 pb-16 space-y-6">
        {activeMatchId ? (
          <SoccerGamedayView
            matchId={activeMatchId}
            leagueId={activeLeague}
            onBack={handleCloseMatch}
            onViewStandings={() => {
              handleCloseMatch();
              setTimeout(() => {
                const el = document.getElementById("tabla-clasificacion");
                el?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
          />
        ) : (
          <>
            {/* SECTION 1: MATCHES / SCOREBOARD (Consistent Editorial Header + 4-Col Grid) */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 p-2 shadow-2xs flex items-center justify-center shrink-0">
                    <img
                      src={currentLeague.logo}
                      alt={currentLeague.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 block">
                      Fútbol Europeo · {currentLeague.country} · Temporada 2026-2027
                    </span>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                      {currentLeague.name}
                    </h1>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs self-start sm:self-auto">
                  {[
                    { key: "ALL", label: "Todos" },
                    { key: "LIVE", label: `En Vivo (${liveCount})` },
                    { key: "UPCOMING", label: "Próximos" },
                    { key: "FINISHED", label: "Finalizados" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setMatchesFilter(f.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer select-none ${
                        matchesFilter === f.key
                          ? "dark-pill shadow-2xs"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredMatches.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-xs">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold">No hay partidos en esta categoría para la jornada.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Selecciona &ldquo;Todos&rdquo; para revisar el calendario completo de la fecha.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredMatches.map((m) => {
                    const isLive = m.status === "IN_PROGRESS";
                    const isFinished = m.status === "FINISHED";
                    const awayWon =
                      (isFinished || isLive) &&
                      m.awayTeam.score !== undefined &&
                      m.homeTeam.score !== undefined &&
                      Number(m.awayTeam.score) > Number(m.homeTeam.score);
                    const homeWon =
                      (isFinished || isLive) &&
                      m.awayTeam.score !== undefined &&
                      m.homeTeam.score !== undefined &&
                      Number(m.homeTeam.score) > Number(m.awayTeam.score);

                    return (
                      <article
                        key={m.id}
                        onClick={() => handleOpenMatch(m.id)}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between cursor-pointer group select-none"
                      >
                        {/* Card Header: Venue & Status */}
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                          <span className="font-extrabold text-slate-500 text-[11px] truncate max-w-[165px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate">{m.venue || currentLeague.shortName}</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                              isLive
                                ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 animate-pulse"
                                : isFinished
                                ? "bg-slate-100 text-slate-700 font-black"
                                : "bg-amber-500/15 text-amber-800 font-extrabold"
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            <span>{m.statusText}</span>
                          </span>
                        </div>

                        {/* Teams & Scores */}
                        <div className="space-y-3 py-1">
                          {/* Away Team */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={m.awayTeam.logo}
                                alt={m.awayTeam.name}
                                className="w-7 h-7 object-contain shrink-0"
                                loading="lazy"
                              />
                              <span
                                className={`text-sm truncate ${
                                  awayWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                                }`}
                              >
                                {m.awayTeam.shortName}
                              </span>
                            </div>
                            <span
                              className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[34px] text-center tabular-nums ${
                                isFinished || isLive
                                  ? awayWon
                                    ? "dark-pill shadow-xs"
                                    : "bg-slate-100 text-slate-800"
                                  : "text-slate-400 font-medium text-xs"
                              }`}
                            >
                              {isFinished || isLive ? (m.awayTeam.score ?? 0) : "–"}
                            </span>
                          </div>

                          {/* Home Team */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={m.homeTeam.logo}
                                alt={m.homeTeam.name}
                                className="w-7 h-7 object-contain shrink-0"
                                loading="lazy"
                              />
                              <span
                                className={`text-sm truncate ${
                                  homeWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                                }`}
                              >
                                {m.homeTeam.shortName}
                              </span>
                            </div>
                            <span
                              className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[34px] text-center tabular-nums ${
                                isFinished || isLive
                                  ? homeWon
                                    ? "dark-pill shadow-xs"
                                    : "bg-slate-100 text-slate-800"
                                  : "text-slate-400 font-medium text-xs"
                              }`}
                            >
                              {isFinished || isLive ? (m.homeTeam.score ?? 0) : "–"}
                            </span>
                          </div>
                        </div>

                        {/* Card Footer: Date Caracas + Action Button */}
                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{m.timeCaracas} (Caracas)</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-black group-hover:text-amber-700">
                            <span>Gameday</span>
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 2: STANDINGS TABLE */}
            <section className="space-y-3 pt-4" id="tabla-clasificacion">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                    Clasificación Oficial
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>Tabla de Posiciones · {currentLeague.name}</span>
                  </h2>
                </div>

                {/* Zone Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>
                      {activeLeague === "uefa.champions" ? "Octavos Directo (Top 8)" : "Champions League"}
                    </span>
                  </span>
                  {activeLeague === "uefa.champions" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Playoffs (9° al 24°)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>Europa League</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>
                      {activeLeague === "uefa.champions" ? "Eliminado" : "Descenso"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <th className="py-3 pl-4 pr-2 w-10">#</th>
                        <th className="py-3 px-2">Club</th>
                        <th className="py-3 px-2.5 text-center" title="Partidos Jugados">PJ</th>
                        <th className="py-3 px-2.5 text-center" title="Ganados">G</th>
                        <th className="py-3 px-2.5 text-center" title="Empatados">E</th>
                        <th className="py-3 px-2.5 text-center" title="Perdidos">P</th>
                        <th className="py-3 px-2.5 text-center hidden sm:table-cell" title="Goles a Favor">GF</th>
                        <th className="py-3 px-2.5 text-center hidden sm:table-cell" title="Goles en Contra">GC</th>
                        <th className="py-3 px-2.5 text-center" title="Diferencia de Goles">DG</th>
                        <th className="py-3 pl-2.5 pr-4 text-center font-black text-slate-900">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {standings.map((row) => {
                        const zoneColor =
                          row.zone === "champions"
                            ? "bg-emerald-500 text-white"
                            : row.zone === "champions_playoff"
                            ? "bg-amber-400 text-slate-950"
                            : row.zone === "europa"
                            ? "bg-blue-500 text-white"
                            : row.zone === "conference"
                            ? "bg-sky-500 text-white"
                            : row.zone === "relegation"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-100 text-slate-700";

                        return (
                          <tr
                            key={row.team.id}
                            className="hover:bg-slate-50/90 transition"
                          >
                            <td className="py-2.5 pl-4 pr-2">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black tabular-nums ${zoneColor}`}
                              >
                                {row.rank}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-2.5 min-w-[140px]">
                                <img
                                  src={row.team.logo}
                                  alt={row.team.name}
                                  className="w-6 h-6 object-contain shrink-0"
                                  loading="lazy"
                                />
                                <span className="font-bold text-slate-900 truncate">
                                  {row.team.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-semibold text-slate-600 tabular-nums">
                              {row.gamesPlayed}
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-bold text-slate-800 tabular-nums">
                              {row.wins}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-600 tabular-nums">
                              {row.ties}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-600 tabular-nums">
                              {row.losses}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-500 hidden sm:table-cell tabular-nums">
                              {row.goalsFor}
                            </td>
                            <td className="py-2.5 px-2.5 text-center text-slate-500 hidden sm:table-cell tabular-nums">
                              {row.goalsAgainst}
                            </td>
                            <td
                              className={`py-2.5 px-2.5 text-center font-bold tabular-nums ${
                                row.goalDiff > 0
                                  ? "text-emerald-700"
                                  : row.goalDiff < 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                            </td>
                            <td className="py-2.5 pl-2.5 pr-4 text-center font-black text-slate-950 bg-amber-50/70 text-sm tabular-nums">
                              {row.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Auth Modal Integration */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserUpdate={(u) => setCurrentUser(u)}
        initialTab={authModalTab}
      />
    </div>
  );
}
