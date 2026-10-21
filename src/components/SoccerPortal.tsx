"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
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
import { SoccerMatchModal } from "@/components/SoccerMatchModal";
import { UserProfile } from "@/lib/user-auth";
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Shield,
  Activity,
  ArrowLeft,
  Share2,
  Menu,
  X,
  Play,
  Home,
  Users,
  Smartphone,
  Check,
  Sparkles,
} from "lucide-react";

interface SoccerPortalProps {
  initialLeague: SoccerLeagueId;
  initialMatches: SoccerMatch[];
  initialStandings: SoccerStandingRow[];
}

export function SoccerPortal({
  initialLeague,
  initialMatches,
  initialStandings,
}: SoccerPortalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeLeague, setActiveLeague] = useState<SoccerLeagueId>(initialLeague);
  const [matches, setMatches] = useState<SoccerMatch[]>(initialMatches);
  const [standings, setStandings] = useState<SoccerStandingRow[]>(initialStandings);
  const [loading, setLoading] = useState(false);
  const [matchesFilter, setMatchesFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "FINISHED">("ALL");

  // Navigation & Drawer states
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [headerLeagueMenuOpen, setHeaderLeagueMenuOpen] = useState(false);
  const headerLeagueRef = useRef<HTMLDivElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [selectedMatch, setSelectedMatch] = useState<SoccerMatch | null>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerLeagueRef.current && !headerLeagueRef.current.contains(e.target as Node)) {
        setHeaderLeagueMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync league if searchParams change
  useEffect(() => {
    const raw = searchParams.get("liga") || searchParams.get("league");
    if (raw) {
      const parsed = parseSoccerLeague(raw);
      if (parsed !== activeLeague) {
        switchLeague(parsed);
      }
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
    switchLeague(id);
    startTransition(() => {
      router.push(`/futbol?liga=${id}`);
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
      {/* UNIFIED GLOBAL HEADER BAR (Identical to EnJuegoPortal) */}
      <header
        className="portal-header sticky top-0 z-40 border-b text-white shadow-md transition-all"
        style={{
          backgroundColor: "#060a12",
          borderColor: "#1e293b",
          color: "#ffffff",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-4">
          {/* Brand Horizontal Logo + .online Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/inicio"
              className="flex items-center gap-1.5 sm:gap-2 py-1 group cursor-pointer select-none"
              aria-label="En Juego Online - Inicio"
            >
              <img
                src="/logo.png"
                alt="En Juego · Béisbol y Fútbol"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-102 shrink-0"
              />
              <span
                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black italic tracking-tight shadow-sm transition-transform group-hover:scale-105 shrink-0 -ml-0.5"
                style={{
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#ffffff",
                  border: "1px solid rgba(251, 113, 133, 0.45)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                <span style={{ color: "#ffffff" }}>.online</span>
              </span>
            </Link>
          </div>

          {/* Desktop Main Navigation - Centered, Flat & Clean with Fútbol Active */}
          <nav
            className="hidden lg:flex items-center justify-center flex-1 h-15 sm:h-16 gap-5 xl:gap-7"
            aria-label="Navegación Principal"
          >
            {[
              { key: "home", label: "Inicio", href: "/inicio" },
              { key: "resultados", label: "Resultados", href: "/resultados?liga=lvbp" },
              { key: "posiciones", label: "Posiciones", href: "/posiciones?liga=lvbp" },
              { key: "calendario", label: "Calendario", href: "/calendario?liga=lvbp" },
              { key: "futbol", label: "Fútbol", href: "/futbol" },
              { key: "noticias", label: "Noticias", href: "/noticias" },
            ].map((item) => {
              const isActive = item.key === "futbol";
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`h-full flex items-center relative text-xs font-black tracking-wider uppercase transition-colors select-none px-1.5 cursor-pointer ${
                    isActive ? "text-white" : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-rose-600 rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Dropdown "Más" for Líderes & Equipos to keep menu clean and uncluttered */}
            <div className="relative h-full flex items-center" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((v) => !v)}
                className="h-full flex items-center gap-1 text-xs font-black tracking-wider uppercase transition-colors select-none px-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <span>Más</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    moreMenuOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {moreMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-44 rounded-2xl bg-[#0c1322] border border-slate-800 shadow-2xl p-1.5 z-50 text-white animate-in fade-in duration-100"
                  style={{ backgroundColor: "#0c1322", color: "#ffffff" }}
                >
                  <Link
                    href="/lideres?liga=lvbp"
                    onClick={() => setMoreMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                  >
                    <span>Líderes</span>
                  </Link>
                  <Link
                    href="/teams?team=leones&liga=lvbp"
                    onClick={() => setMoreMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                  >
                    <span>Equipos</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Right Action Pills */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Soccer League Capsule Pill */}
            <div className="relative" ref={headerLeagueRef}>
              <button
                type="button"
                onClick={() => setHeaderLeagueMenuOpen((prev) => !prev)}
                className="rounded-full border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                aria-expanded={headerLeagueMenuOpen}
                aria-label="Seleccionar competición de fútbol"
              >
                <span>{currentLeague.flag}</span>
                <span>{currentLeague.shortName}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                    headerLeagueMenuOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </button>

              {headerLeagueMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0c1322] border border-slate-800 shadow-2xl p-2 z-50 text-white animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{ backgroundColor: "#0c1322", color: "#ffffff" }}
                >
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                    <span>Competición Europea</span>
                    <span className="text-rose-400">UEFA & Big 5</span>
                  </div>
                  {SOCCER_LEAGUES_LIST.map((lg) => {
                    const isSel = activeLeague === lg.id;
                    return (
                      <button
                        key={lg.id}
                        type="button"
                        onClick={() => {
                          handleSelectLeague(lg.id);
                          setHeaderLeagueMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isSel
                            ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{lg.flag}</span>
                          <span>{lg.name}</span>
                        </span>
                        {isSel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}

                  <div className="pt-1.5 mt-1.5 border-t border-slate-800">
                    <Link
                      href="/inicio"
                      onClick={() => setHeaderLeagueMenuOpen(false)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black text-amber-300 hover:text-white hover:bg-amber-950/40 border border-amber-500/30 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">⚾</span>
                        <span>Volver a Béisbol (LVBP · MLB)</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Auth Buttons / Fan Profile */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab("profile");
                  setAuthModalOpen(true);
                }}
                className="rounded-full border border-slate-700 bg-slate-900/90 hover:border-amber-400 text-white pl-1.5 pr-3.5 py-1 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs border border-white/10">
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
                  className="rounded-full border border-slate-700 bg-slate-900/70 hover:bg-slate-800 hover:border-slate-500 text-slate-100 hover:text-white px-4 py-1.5 text-xs font-black tracking-wide transition cursor-pointer select-none active:scale-95"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalTab("quick");
                    setAuthModalOpen(true);
                  }}
                  className="rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-4 py-1.5 text-xs font-black tracking-wide transition shadow-sm hover:shadow-rose-600/30 active:scale-95 cursor-pointer select-none"
                >
                  Suscríbete
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls (<1024px) */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <Link
              href="/noticias"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-black transition cursor-pointer active:scale-95 shrink-0"
              title="Ver Noticias y Highlights en video"
            >
              <Play className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              <span className="hidden sm:inline">Highlights</span>
              <span className="sm:hidden">Videos</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black transition cursor-pointer shadow-xs active:scale-95 shrink-0"
              aria-label="Abrir Menú Principal"
            >
              <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 stroke-[2.5]" />
              <span>Menú</span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end lg:hidden animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity z-[200]"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-[86vw] sm:max-w-sm bg-white h-dvh shadow-2xl flex flex-col z-[201] overflow-hidden">
            {/* Drawer Header */}
            <div
              className="drawer-header px-4 py-3.5 border-b flex items-center justify-between text-white shrink-0 sticky top-0 z-20 shadow-xs"
              style={{
                backgroundColor: "#060a12",
                borderColor: "#1e293b",
                paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))",
              }}
            >
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="En Juego" className="h-9 w-auto object-contain" />
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black italic tracking-tight shadow-xs select-none -ml-0.5"
                  style={{
                    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                    color: "#ffffff",
                    border: "1px solid rgba(251, 113, 133, 0.45)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                  <span style={{ color: "#ffffff" }}>.online</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2.5 rounded-xl text-slate-300 hover:text-white transition cursor-pointer active:scale-95"
                style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }}
                aria-label="Cerrar Menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-10">
              {/* Quick Soccer Leagues Selector in Drawer */}
              <div className="p-3 bg-slate-900 border-b border-slate-800">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center justify-between">
                  <span>Competiciones de Fútbol</span>
                  <span className="text-amber-400 font-bold">2026-27</span>
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
                        className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-black transition cursor-pointer ${
                          isLgActive
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                        }`}
                      >
                        <span className="text-base">{lg.flag}</span>
                        <span className="leading-tight mt-0.5 truncate max-w-full">{lg.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Links in Drawer */}
              <div className="p-4 space-y-1.5 border-b border-slate-100">
                <Link
                  href="/futbol"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-black bg-rose-50 text-rose-950 border border-rose-300 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-4.5 h-4.5 text-rose-600" />
                    <span>Fútbol Europeo</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    Activo
                  </span>
                </Link>

                <Link
                  href="/inicio"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-4.5 h-4.5 text-amber-600" />
                    <span>Inicio (Béisbol)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  href="/resultados?liga=lvbp"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4.5 h-4.5 text-emerald-600" />
                    <span>Resultados LVBP</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  href="/calendario?liga=lvbp"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4.5 h-4.5 text-sky-600" />
                    <span>Calendario y Canales TV</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  href="/posiciones?liga=lvbp"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-4.5 h-4.5 text-amber-500" />
                    <span>Posiciones Béisbol</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  href="/noticias"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Play className="w-4.5 h-4.5 text-rose-600 fill-rose-600" />
                    <span>Noticias y Resúmenes</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                    Video
                  </span>
                </Link>
              </div>

              {/* Drawer Bottom info */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                <p className="font-extrabold text-slate-800">EN JUEGO · FÚTBOL & BÉISBOL</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Champions League, Premier League, LaLiga y LVBP en vivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-6">
        {/* League Selector Horizontal Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>Competición Europea</span>
            {loading && (
              <span className="flex items-center gap-1 text-amber-600 font-bold normal-case">
                <RefreshCw className="w-3 h-3 animate-spin" /> Actualizando...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
            {SOCCER_LEAGUES_LIST.map((lg) => {
              const isSel = activeLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  type="button"
                  onClick={() => handleSelectLeague(lg.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 select-none ${
                    isSel
                      ? "bg-slate-950 text-white shadow-sm ring-2 ring-slate-950/20"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                  }`}
                >
                  <span className="text-base">{lg.flag}</span>
                  <span>{lg.shortName}</span>
                  {isSel && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* HERO LEAGUE BANNER (Fixed Contrast with White Logo Container and Vibrant Glow) */}
        <section className="rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xl border border-slate-800 text-white bg-gradient-to-r from-slate-950 via-[#0a1329] to-blue-950">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Pure White Container for Crest ensures 100% visibility for dark logos like UEFA UCL */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2.5 shadow-md border border-white/20 flex items-center justify-center shrink-0">
                <img
                  src={currentLeague.logo}
                  alt={currentLeague.name}
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                    {currentLeague.country}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10 text-[11px] font-bold">
                    Temporada 2026-27
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mt-1.5 drop-shadow-sm">
                  {currentLeague.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium max-w-xl">
                  Pizarra de marcadores en directo, partidos de hoy y tabla de clasificación oficial.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black animate-pulse shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{liveCount} en juego</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-slate-200 border border-white/15 text-xs font-bold">
                  <span>Oficial ESPN</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 1: MATCHES / SCOREBOARD */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                Pizarra de Juegos
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-950">
                Jornada y Resultados ({currentLeague.shortName})
              </h2>
            </div>

            {/* Filter buttons */}
            <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs self-start">
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
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer select-none ${
                    matchesFilter === f.key
                      ? "bg-slate-950 text-white shadow-2xs"
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
                Selecciona "Todos" para revisar el calendario completo de la fecha.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMatches.map((m) => {
                const isLive = m.status === "IN_PROGRESS";
                const isFinished = m.status === "FINISHED";

                return (
                  <article
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-amber-400 transition flex flex-col justify-between cursor-pointer group select-none active:scale-[0.99]"
                  >
                    {/* Card Header: Venue & Status */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 text-xs">
                      <span className="font-extrabold text-slate-500 text-[11px] truncate max-w-[170px]">
                        {m.venue || currentLeague.shortName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                            className="w-6 h-6 object-contain shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {m.awayTeam.shortName}
                          </span>
                        </div>
                        <span
                          className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[32px] text-center tabular-nums ${
                            isFinished || isLive
                              ? m.awayTeam.score !== undefined &&
                                m.homeTeam.score !== undefined &&
                                m.awayTeam.score > m.homeTeam.score
                                ? "bg-slate-900 text-white shadow-xs"
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
                            className="w-6 h-6 object-contain shrink-0"
                            loading="lazy"
                          />
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {m.homeTeam.shortName}
                          </span>
                        </div>
                        <span
                          className={`text-base font-black px-2.5 py-0.5 rounded-lg min-w-[32px] text-center tabular-nums ${
                            isFinished || isLive
                              ? m.awayTeam.score !== undefined &&
                                m.homeTeam.score !== undefined &&
                                m.homeTeam.score > m.awayTeam.score
                                ? "bg-slate-900 text-white shadow-xs"
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
                        <span>Hora Caracas: {m.timeCaracas}</span>
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-amber-600 font-black group-hover:text-amber-700">
                        <span>Ver Detalle</span>
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
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                Clasificación Oficial
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-950">
                Tabla de Posiciones ({currentLeague.name})
              </h2>
            </div>

            {/* Zones Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-extrabold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                <span>Champions League</span>
              </span>
              {activeLeague !== "uefa.champions" && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                    <span>Europa League</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-600" />
                    <span>Descenso</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs no-scrollbar">
            <table className="w-full min-w-[700px] text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold">
                  <th className="py-3 px-3 text-left w-14">POS</th>
                  <th className="py-3 px-3 text-left">CLUB</th>
                  <th className="py-3 px-2.5">PJ</th>
                  <th className="py-3 px-2.5 text-emerald-600">G</th>
                  <th className="py-3 px-2.5 text-slate-600">E</th>
                  <th className="py-3 px-2.5 text-rose-600">P</th>
                  <th className="py-3 px-2.5">GF</th>
                  <th className="py-3 px-2.5">GC</th>
                  <th className="py-3 px-2.5 font-bold">DG</th>
                  <th className="py-3 px-3 font-black text-slate-950 bg-amber-50/70 text-right">
                    PTS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {standings.map((row) => {
                  let zoneBorder = "border-l-4 border-transparent";
                  if (row.zone === "champions") zoneBorder = "border-l-4 border-blue-600";
                  else if (row.zone === "champions_playoff") zoneBorder = "border-l-4 border-cyan-500";
                  else if (row.zone === "europa") zoneBorder = "border-l-4 border-amber-500";
                  else if (row.zone === "conference") zoneBorder = "border-l-4 border-emerald-500";
                  else if (row.zone === "relegation") zoneBorder = "border-l-4 border-rose-600";

                  return (
                    <tr
                      key={row.team.id}
                      className={`hover:bg-amber-50/40 transition-colors ${zoneBorder}`}
                    >
                      <td className="py-2.5 px-3 text-left font-black text-slate-700">
                        {row.rank}
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={row.team.logo}
                            alt={row.team.name}
                            className="w-5 h-5 object-contain shrink-0"
                            loading="lazy"
                          />
                          <span className="font-extrabold text-slate-900 truncate">
                            {row.team.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700">{row.gamesPlayed}</td>
                      <td className="py-2.5 px-2.5 font-bold text-emerald-700">{row.wins}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{row.ties}</td>
                      <td className="py-2.5 px-2.5 text-rose-600">{row.losses}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{row.goalsFor}</td>
                      <td className="py-2.5 px-2.5 text-slate-600">{row.goalsAgainst}</td>
                      <td
                        className={`py-2.5 px-2.5 font-bold ${
                          row.goalDiff > 0
                            ? "text-emerald-700"
                            : row.goalDiff < 0
                            ? "text-rose-600"
                            : "text-slate-600"
                        }`}
                      >
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </td>
                      <td className="py-2.5 px-3 font-black text-slate-950 bg-amber-50/70 text-right text-sm">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Soccer Match Detail Modal */}
      <SoccerMatchModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onViewStandings={() => {
          const el = document.getElementById("tabla-clasificacion");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

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
