"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SOCCER_LEAGUES,
  SOCCER_LEAGUES_LIST,
  parseSoccerLeague,
  type SoccerLeagueId,
} from "@/lib/soccer-leagues";
import type { SoccerMatch, SoccerStandingRow } from "@/lib/soccer-service";
import { UserProfile } from "@/lib/user-auth";

const AuthModal = dynamic(
  () => import("@/components/AuthModal").then((m) => m.AuthModal),
  { ssr: false }
);
const SoccerGamedayView = dynamic(
  () => import("@/components/soccer/SoccerGamedayView").then((m) => m.SoccerGamedayView),
  { ssr: false }
);
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
  BarChart3,
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
  const [viewTab, setViewTab] = useState<"resumen" | "calendario" | "posiciones">("resumen");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedClubId, setSelectedClubId] = useState<string>("ALL");

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

  const formatSoccerShortDate = (isoDate: string): string => {
    try {
      const [yyyy, mm, dd] = isoDate.split("-").map(Number);
      const d = new Date(Date.UTC(yyyy, (mm || 1) - 1, dd || 1, 12, 0, 0));
      return new Intl.DateTimeFormat("es-VE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
        .format(d)
        .replace(/\./g, "");
    } catch {
      return isoDate;
    }
  };

  const formatSoccerFullDate = (isoDate: string): string => {
    try {
      const [yyyy, mm, dd] = isoDate.split("-").map(Number);
      const d = new Date(Date.UTC(yyyy, (mm || 1) - 1, dd || 1, 12, 0, 0));
      const str = new Intl.DateTimeFormat("es-VE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(d);
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch {
      return isoDate;
    }
  };

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

  const switchLeague = async (nextLeague: SoccerLeagueId, silent = false) => {
    setActiveLeague(nextLeague);
    if (!silent) {
      setSelectedDate("ALL");
      setSelectedClubId("ALL");
      setLoading(true);
    }

    try {
      const [resMatches, resStandings] = await Promise.all([
        fetch(`/api/soccer/scoreboard?league=${nextLeague}&_t=${Date.now()}`).then((r) => r.json()),
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
      if (!silent) setLoading(false);
    }
  };

  // Automatic real-time scoreboard polling (12s when matches are live, 25s otherwise)
  useEffect(() => {
    if (activeMatchId) return; // Gameday view handles its own live polling
    const hasLive = matches.some((m) => m.status === "IN_PROGRESS");
    const intervalMs = hasLive ? 12_000 : 25_000;

    const refreshScoreboardSilently = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/soccer/scoreboard?league=${activeLeague}&_t=${Date.now()}`);
        const data = await res.json();
        if (Array.isArray(data?.matches)) {
          setMatches(data.matches);
        }
      } catch {
        // ignore
      }
    };

    const timer = setInterval(refreshScoreboardSilently, intervalMs);
    const onFocus = () => refreshScoreboardSilently();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [activeLeague, activeMatchId, matches]);

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

  const uniqueDates = Array.from(new Set(matches.map((m) => m.dateCaracas))).sort();

  const filteredMatches = matches.filter((m) => {
    if (matchesFilter === "LIVE" && m.status !== "IN_PROGRESS") return false;
    if (matchesFilter === "UPCOMING" && m.status !== "SCHEDULED") return false;
    if (matchesFilter === "FINISHED" && m.status !== "FINISHED") return false;
    if (selectedDate !== "ALL" && m.dateCaracas !== selectedDate) return false;
    if (
      selectedClubId !== "ALL" &&
      m.homeTeam.id !== selectedClubId &&
      m.awayTeam.id !== selectedClubId
    ) {
      return false;
    }
    return true;
  });

  const matchesByDate = React.useMemo(() => {
    const map = new Map<string, SoccerMatch[]>();
    const list = matches
      .filter((m) => {
        if (matchesFilter === "LIVE" && m.status !== "IN_PROGRESS") return false;
        if (matchesFilter === "UPCOMING" && m.status !== "SCHEDULED") return false;
        if (matchesFilter === "FINISHED" && m.status !== "FINISHED") return false;
        if (
          selectedClubId !== "ALL" &&
          m.homeTeam.id !== selectedClubId &&
          m.awayTeam.id !== selectedClubId
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const m of list) {
      const arr = map.get(m.dateCaracas) || [];
      arr.push(m);
      map.set(m.dateCaracas, arr);
    }
    return Array.from(map.entries());
  }, [matches, matchesFilter, selectedClubId]);

  const liveCount = matches.filter((m) => m.status === "IN_PROGRESS").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fb] text-slate-900">
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
                width={120}
                height={40}
                decoding="async"
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
                <img
                  src="/logo.png"
                  alt="En Juego"
                  width={96}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
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

      {/* 3. MAIN CONTENT CONTAINER (Editorial 12-Col Layout Adapted for Mobile & PC) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3.5 sm:pt-5 pb-6 sm:pb-8 space-y-5">
        {activeMatchId ? (
          <SoccerGamedayView
            matchId={activeMatchId}
            leagueId={activeLeague}
            onBack={handleCloseMatch}
            onViewStandings={() => {
              handleCloseMatch();
              setViewTab("posiciones");
            }}
          />
        ) : (
          <>
            {/* EDITORIAL LEAGUE CONTROL HEADER CARD */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 border border-slate-200/80 p-2 shadow-2xs flex items-center justify-center shrink-0">
                    <img
                      src={currentLeague.logo}
                      alt={currentLeague.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                        {currentLeague.country}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        Temporada 2026-27
                      </span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                      {currentLeague.name}
                    </h1>
                  </div>
                </div>

                {/* View Mode Tabs: Partidos | Calendario | Posiciones */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto">
                  {(
                    [
                      { id: "resumen", label: "Partidos y Tabla" },
                      { id: "calendario", label: "Calendario" },
                      { id: "posiciones", label: "Posiciones" },
                    ] as const
                  ).map((t) => {
                    const active = viewTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setViewTab(t.id)}
                        className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer select-none ${
                          active
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Row: Status Pills + Date Strip (when in Partidos or Calendario) */}
              {viewTab !== "posiciones" && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  {/* Date Filter Strip */}
                  {uniqueDates.length > 0 && viewTab === "resumen" && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDate("ALL")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition cursor-pointer shrink-0 ${
                          selectedDate === "ALL"
                            ? "dark-pill bg-slate-950 text-white border-slate-950 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                        }`}
                      >
                        Todas las fechas ({matches.length})
                      </button>
                      {uniqueDates.map((d) => {
                        const isSel = selectedDate === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDate(isSel ? "ALL" : d)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 capitalize ${
                              isSel
                                ? "dark-pill bg-slate-950 text-white border-slate-950 shadow-2xs"
                                : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50"
                            }`}
                          >
                            {formatSoccerShortDate(d)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Club Filter Strip when in Calendario */}
                  {viewTab === "calendario" && standings.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedClubId("ALL")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition cursor-pointer shrink-0 ${
                          selectedClubId === "ALL"
                            ? "dark-pill bg-slate-950 text-white border-slate-950"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        Todos los clubes
                      </button>
                      {standings.map((row) => {
                        const active = selectedClubId === row.team.id;
                        return (
                          <button
                            key={row.team.id}
                            type="button"
                            onClick={() => setSelectedClubId(active ? "ALL" : row.team.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                              active
                                ? "dark-pill bg-slate-950 text-white border-slate-950"
                                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <img src={row.team.logo} alt="" className="w-3.5 h-3.5 object-contain" />
                            <span>{row.team.shortName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Match State Filter */}
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 overflow-x-auto no-scrollbar">
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
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer select-none whitespace-nowrap ${
                          matchesFilter === f.key
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* VIEW 1: RESUMEN (12-Column Editorial Split on PC: 8 Cols Matches + 4 Cols Standings) */}
            {viewTab === "resumen" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column (8 Cols): Match Cards Grid */}
                <div className="lg:col-span-8 space-y-3.5">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                      Pizarra de Partidos ({filteredMatches.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setViewTab("calendario")}
                      className="text-xs font-extrabold text-slate-600 hover:text-slate-950 cursor-pointer"
                    >
                      Ver Calendario por Fecha ›
                    </button>
                  </div>

                  {filteredMatches.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-2xs">
                      <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-800">
                        No hay partidos con los filtros seleccionados.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMatchesFilter("ALL");
                          setSelectedDate("ALL");
                          setSelectedClubId("ALL");
                        }}
                        className="dark-pill mt-3 inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-extrabold cursor-pointer"
                      >
                        Mostrar todos los partidos
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between cursor-pointer group select-none"
                          >
                            {/* Card Header: Date + Status Pill */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                              <span className="font-bold text-slate-500 text-[11px] capitalize flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{formatSoccerShortDate(m.dateCaracas)}</span>
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                  isLive
                                    ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                                    : isFinished
                                      ? "bg-slate-100 text-slate-700"
                                      : "bg-slate-900 text-white dark-pill"
                                }`}
                              >
                                {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-600" />}
                                <span>{isLive ? m.statusText : isFinished ? "FINAL" : `${m.timeCaracas} VET`}</span>
                              </span>
                            </div>

                            {/* Teams & Scores (Local vs Visitante) */}
                            <div className="space-y-2.5 py-0.5">
                              {/* Home Team */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={m.homeTeam.logo}
                                    alt={m.homeTeam.name}
                                    className="w-7 h-7 object-contain shrink-0"
                                    loading="lazy"
                                  />
                                  <div className="min-w-0">
                                    <span
                                      className={`text-sm block truncate ${
                                        homeWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                                      }`}
                                    >
                                      {m.homeTeam.shortName}
                                    </span>
                                    {m.homeTeam.record && (
                                      <span className="text-[10px] font-semibold text-slate-400 block">
                                        {m.homeTeam.record}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[34px] text-center tabular-nums ${
                                    isFinished || isLive
                                      ? homeWon
                                        ? "dark-pill bg-slate-950 text-white shadow-2xs"
                                        : "bg-slate-100 text-slate-800"
                                      : "text-slate-300 font-bold text-xs"
                                  }`}
                                >
                                  {isFinished || isLive ? (m.homeTeam.score ?? 0) : "vs"}
                                </span>
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={m.awayTeam.logo}
                                    alt={m.awayTeam.name}
                                    className="w-7 h-7 object-contain shrink-0"
                                    loading="lazy"
                                  />
                                  <div className="min-w-0">
                                    <span
                                      className={`text-sm block truncate ${
                                        awayWon ? "font-black text-slate-950" : "font-bold text-slate-800"
                                      }`}
                                    >
                                      {m.awayTeam.shortName}
                                    </span>
                                    {m.awayTeam.record && (
                                      <span className="text-[10px] font-semibold text-slate-400 block">
                                        {m.awayTeam.record}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[34px] text-center tabular-nums ${
                                    isFinished || isLive
                                      ? awayWon
                                        ? "dark-pill bg-slate-950 text-white shadow-2xs"
                                        : "bg-slate-100 text-slate-800"
                                      : "text-slate-300 font-bold text-xs"
                                  }`}
                                >
                                  {isFinished || isLive ? (m.awayTeam.score ?? 0) : `${m.timeCaracas}`}
                                </span>
                              </div>
                            </div>

                            {/* Card Footer: Venue + Gameday CTA */}
                            <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 truncate max-w-[180px] font-medium">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{m.venue || currentLeague.shortName}</span>
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-slate-900 font-extrabold group-hover:text-blue-600 shrink-0">
                                <span>Centro de Partido</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column (4 Cols): Compact Standings Sidebar Card */}
                <aside className="lg:col-span-4 space-y-3.5">
                  <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                    <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950">
                          Posiciones · {currentLeague.shortName}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewTab("posiciones")}
                        className="text-[11px] font-extrabold text-blue-600 hover:underline cursor-pointer"
                      >
                        Tabla completa ›
                      </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/80 bg-slate-50/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <th className="py-2.5 pl-3.5 pr-1.5 w-8">#</th>
                            <th className="py-2.5 px-1.5">Club</th>
                            <th className="py-2.5 px-1.5 text-center">PJ</th>
                            <th className="py-2.5 px-1.5 text-center">DG</th>
                            <th className="py-2.5 pl-1.5 pr-3.5 text-right text-slate-900">PTS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {standings.slice(0, 12).map((row) => {
                            const dotColor =
                              row.zone === "champions"
                                ? "bg-emerald-500"
                                : row.zone === "champions_playoff"
                                  ? "bg-amber-400"
                                  : row.zone === "europa"
                                    ? "bg-blue-500"
                                    : row.zone === "relegation"
                                      ? "bg-rose-500"
                                      : "bg-slate-300";

                            return (
                              <tr key={row.team.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-2 pl-3.5 pr-1.5 font-bold text-slate-600">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className={`w-1.5 h-3.5 rounded-full ${dotColor}`} />
                                    <span className="text-slate-900 font-black">{row.rank}</span>
                                  </span>
                                </td>
                                <td className="py-2 px-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={row.team.logo}
                                      alt=""
                                      className="w-5 h-5 object-contain shrink-0"
                                      loading="lazy"
                                    />
                                    <span className="font-bold text-slate-900 truncate max-w-[125px]">
                                      {row.team.shortName}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 text-center text-slate-500">
                                  {row.gamesPlayed}
                                </td>
                                <td
                                  className={`py-2 px-1.5 text-center font-bold ${
                                    row.goalDiff > 0
                                      ? "text-emerald-600"
                                      : row.goalDiff < 0
                                        ? "text-rose-600"
                                        : "text-slate-500"
                                  }`}
                                >
                                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                                </td>
                                <td className="py-2 pl-1.5 pr-3.5 text-right font-black text-slate-950">
                                  {row.points}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={() => setViewTab("posiciones")}
                        className="w-full py-2 rounded-xl bg-white border border-slate-200/90 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                      >
                        Ver los {standings.length} clubes y estadísticas completas
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* VIEW 2: CALENDARIO POR FECHA (Chronological Matchday Schedule) */}
            {viewTab === "calendario" && (
              <div className="space-y-4">
                {matchesByDate.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-2xs">
                    <p className="text-sm font-bold text-slate-800">
                      No hay partidos programados con los filtros actuales.
                    </p>
                  </div>
                ) : (
                  matchesByDate.map(([dateStr, dayMatches]) => (
                    <div
                      key={dateStr}
                      className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs"
                    >
                      <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-700" />
                          <h3 className="text-xs sm:text-sm font-black text-slate-950">
                            {formatSoccerFullDate(dateStr)}
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                          {dayMatches.length} {dayMatches.length === 1 ? "partido" : "partidos"}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {dayMatches.map((m) => {
                          const isLive = m.status === "IN_PROGRESS";
                          const isFinished = m.status === "FINISHED";
                          const hasScore = isLive || isFinished;

                          return (
                            <div
                              key={m.id}
                              onClick={() => handleOpenMatch(m.id)}
                              className="p-3.5 sm:p-4 hover:bg-slate-50/90 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                            >
                              {/* Teams & Center Score */}
                              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial sm:w-48 justify-end text-right">
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {m.homeTeam.shortName}
                                  </span>
                                  <img
                                    src={m.homeTeam.logo}
                                    alt={m.homeTeam.name}
                                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                                  />
                                </div>

                                {hasScore ? (
                                  <div className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-black text-slate-950 tabular-nums shrink-0">
                                    {m.homeTeam.score ?? 0} - {m.awayTeam.score ?? 0}
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-extrabold text-slate-700 tabular-nums shrink-0">
                                    {m.timeCaracas}
                                  </span>
                                )}

                                <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial sm:w-48">
                                  <img
                                    src={m.awayTeam.logo}
                                    alt={m.awayTeam.name}
                                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                                  />
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {m.awayTeam.shortName}
                                  </span>
                                </div>
                              </div>

                              {/* Venue & Status Action */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[180px] sm:max-w-[220px]">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{m.venue || currentLeague.shortName}</span>
                                </span>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isLive && (
                                    <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600 text-[10px] font-black uppercase">
                                      {m.statusText}
                                    </span>
                                  )}
                                  <span className="dark-pill px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-extrabold">
                                    {isFinished ? "Resumen" : "Ficha"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* VIEW 3: FULL STANDINGS TABLE (Adapted for Mobile & PC) */}
            {viewTab === "posiciones" && (
              <section className="space-y-3.5" id="tabla-clasificacion">
                <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                  <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950">
                        Clasificación Oficial · {currentLeague.name}
                      </h2>
                    </div>

                    {/* Zone Legend */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>
                          {activeLeague === "uefa.champions" ? "Octavos Directo (1°-8°)" : "Champions League"}
                        </span>
                      </span>
                      {activeLeague === "uefa.champions" ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                          <span>Playoffs (9°-24°)</span>
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

                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <th className="py-3 pl-3.5 sm:pl-4 pr-2 w-10">#</th>
                          <th className="py-3 px-2">Club</th>
                          <th className="py-3 px-2 sm:px-2.5 text-center" title="Partidos Jugados">PJ</th>
                          <th className="py-3 px-2 sm:px-2.5 text-center" title="Ganados">G</th>
                          <th className="py-3 px-2 sm:px-2.5 text-center" title="Empatados">E</th>
                          <th className="py-3 px-2 sm:px-2.5 text-center" title="Perdidos">P</th>
                          <th className="py-3 px-2.5 text-center hidden sm:table-cell" title="Goles a Favor">GF</th>
                          <th className="py-3 px-2.5 text-center hidden sm:table-cell" title="Goles en Contra">GC</th>
                          <th className="py-3 px-2 sm:px-2.5 text-center" title="Diferencia de Goles">DG</th>
                          <th className="py-3 pl-2 sm:pl-2.5 pr-3.5 sm:pr-4 text-center font-black text-slate-950">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 tabular-nums">
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
                            <tr key={row.team.id} className="hover:bg-slate-50/90 transition">
                              <td className="py-2.5 pl-3.5 sm:pl-4 pr-2">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black tabular-nums ${zoneColor}`}
                                >
                                  {row.rank}
                                </span>
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                  <img
                                    src={row.team.logo}
                                    alt={row.team.name}
                                    className="w-6 h-6 object-contain shrink-0"
                                    loading="lazy"
                                  />
                                  <span className="font-bold text-slate-900 truncate max-w-[125px] sm:max-w-none">
                                    <span className="sm:hidden">{row.team.shortName}</span>
                                    <span className="hidden sm:inline">{row.team.name}</span>
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-2 sm:px-2.5 text-center font-semibold text-slate-600">
                                {row.gamesPlayed}
                              </td>
                              <td className="py-2.5 px-2 sm:px-2.5 text-center font-bold text-slate-800">
                                {row.wins}
                              </td>
                              <td className="py-2.5 px-2 sm:px-2.5 text-center text-slate-600">
                                {row.ties}
                              </td>
                              <td className="py-2.5 px-2 sm:px-2.5 text-center text-slate-600">
                                {row.losses}
                              </td>
                              <td className="py-2.5 px-2.5 text-center text-slate-500 hidden sm:table-cell">
                                {row.goalsFor}
                              </td>
                              <td className="py-2.5 px-2.5 text-center text-slate-500 hidden sm:table-cell">
                                {row.goalsAgainst}
                              </td>
                              <td
                                className={`py-2.5 px-2 sm:px-2.5 text-center font-bold ${
                                  row.goalDiff > 0
                                    ? "text-emerald-700"
                                    : row.goalDiff < 0
                                      ? "text-rose-600"
                                      : "text-slate-500"
                                }`}
                              >
                                {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                              </td>
                              <td className="py-2.5 pl-2 sm:pl-2.5 pr-3.5 sm:pr-4 text-center font-black text-slate-950 bg-slate-50 text-sm">
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
            )}
          </>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Unified 5-Column Bar Matching Béisbol) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-[0_-6px_20px_rgba(15,23,42,0.08)]"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0.35rem))" }}
        aria-label="Navegación Móvil"
      >
        <div className="grid grid-cols-5 px-1.5 pt-1.5 gap-1">
          {(
            [
              ["home", "/inicio", "Inicio", Home, false],
              ["resultados", "/resultados?liga=lvbp", "Resultados", Activity, false],
              ["futbol", "/futbol", "Fútbol", Trophy, true],
              ["posiciones", "/posiciones?liga=lvbp", "Posiciones", BarChart3, false],
              ["calendario", "/calendario?liga=lvbp", "Calendario", Calendar, false],
            ] as const
          ).map(([key, href, label, Icon, active]) => (
            <Link
              key={key}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer select-none ${
                active ? "text-slate-950 bg-slate-100" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  active ? "text-amber-600 stroke-[2.5]" : "text-slate-400"
                }`}
              />
              <span className="leading-none truncate max-w-full">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* FOOTER (Flush to Bottom · Zero Empty Gap Above or Below on Mobile & Desktop) */}
      <footer className="mt-auto border-t border-slate-200 bg-white pt-6 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        <div className="max-w-7xl mx-auto px-4 space-y-4 text-xs text-slate-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg dark-pill flex items-center justify-center p-1 shrink-0 text-[9px] font-black">
                EJ
              </div>
              <div className="min-w-0">
                <span className="font-black text-slate-900">EN JUEGO ONLINE</span>
                <span className="text-slate-500">
                  {" "}— Marcadores en vivo, jugada a jugada, transmisiones de TV y estadísticas.
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-bold text-slate-600">
              <Link href="/inicio" className="hover:text-slate-950">
                Inicio
              </Link>
              <Link href="/resultados" className="hover:text-slate-950">
                Resultados
              </Link>
              <Link href="/futbol" className="hover:text-slate-950">
                Fútbol Europeo
              </Link>
              <Link href="/calendario" className="hover:text-slate-950">
                Calendario
              </Link>
              <Link href="/posiciones" className="hover:text-slate-950">
                Posiciones
              </Link>
              <Link href="/noticias" className="hover:text-slate-950">
                Noticias
              </Link>
              <Link href="/quienes-somos" className="hover:text-slate-950">
                Quiénes somos
              </Link>
              <Link href="/contacto" className="hover:text-slate-950">
                Contacto
              </Link>
              <Link href="/privacidad" className="hover:text-slate-950">
                Privacidad
              </Link>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-600 font-bold">Aviso Legal y Descargo de Responsabilidad: </strong>
            EnJuego es un portal deportivo independiente desarrollado con fines informativos y periodísticos para los aficionados del béisbol y el fútbol. No está afiliado, respaldado, autorizado ni patrocinado de manera alguna por la LVBP, LIDOM, LMP, MLB, UEFA ni por ninguno de sus clubes u organizaciones asociadas.
          </div>
        </div>
      </footer>

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
