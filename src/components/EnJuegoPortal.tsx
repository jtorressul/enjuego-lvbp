"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LeaderCategory, ScheduleGame, StandingRow } from "@/lib/types";
import { LVBP_OFFICIAL_LOGO, LVBP_TEAMS, resolveLvbpTeam } from "@/lib/lvbp-teams";
import { MLB_TEAMS, resolveMlbTeam, resolveAnyBaseballTeam } from "@/lib/mlb-teams";
import { GamedayView } from "@/components/gameday/GamedayView";
import { LeadersWidget } from "@/components/LeadersWidget";
import { TeamRosterView } from "@/components/TeamRosterView";
import { BroadcastChannelsRow } from "@/components/BroadcastChannelsRow";
import { AuthModal } from "@/components/AuthModal";
import { PwaInstallModal } from "@/components/pwa/PwaInstallModal";
import { PwaOnboardingModal } from "@/components/pwa/PwaOnboardingModal";
import { AdBanner } from "@/components/AdBanner";
import MlbPlayoffBracket from "@/components/MlbPlayoffBracket";
import { ShareGameBannerModal } from "@/components/ShareGameBannerModal";
import { ShareStandingsModal } from "@/components/ShareStandingsModal";
import { CalendarMonthPicker } from "@/components/CalendarMonthPicker";
import { UserProfile } from "@/lib/user-auth";
import { getFallbackSchedule } from "@/lib/lvbp-fallback-data";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tv,
  MapPin,
  Trophy,
  Calendar,
  Activity,
  Users,
  Newspaper,
  Home,
  Clock,
  Share2,
  Star,
  BarChart3,
  Check,
  Menu,
  X,
  User,
  Sparkles,
  Smartphone,
  Bell,
  LogIn,
  Send,
  MessageSquare,
} from "lucide-react";

export type NavSection =
  | "home"
  | "resultados"
  | "calendario"
  | "posiciones"
  | "lideres"
  | "equipos"
  | "juego";

export function getTodayCaracasIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function formatCompactDay(iso: string): {
  dayNum: string;
  monthShort: string;
  weekdayShort: string;
  fullLabel: string;
} {
  const safeIso = iso || getTodayCaracasIso();
  const [y, m, d] = safeIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 10) - 1, d || 16));
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

export function EnJuegoPortal({
  initialSection = "home",
  initialTeamSlug,
  initialGameId,
}: {
  initialSection?: NavSection;
  initialTeamSlug?: string;
  initialGameId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive active section from URL pathname if applicable
  const section: NavSection = useMemo(() => {
    if (pathname?.startsWith("/juego")) return "juego";
    if (pathname?.startsWith("/resultados")) return "resultados";
    if (pathname?.startsWith("/calendario")) return "calendario";
    if (pathname?.startsWith("/posiciones")) return "posiciones";
    if (pathname?.startsWith("/lideres")) return "lideres";
    if (pathname?.startsWith("/equipos") || pathname?.startsWith("/teams")) return "equipos";
    if (pathname?.startsWith("/inicio")) return "home";
    return initialSection;
  }, [pathname, initialSection]);

  const [schedule, setSchedule] = useState<ScheduleGame[]>([]);
  const [mlbJornadaGames, setMlbJornadaGames] = useState<ScheduleGame[]>([]);
  const [jornadaLeague, setJornadaLeague] = useState<"lvbp" | "mlb">("lvbp");
  const [mlbDateIndex, setMlbDateIndex] = useState(0);
  const [userSelectedMlbDate, setUserSelectedMlbDate] = useState(false);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [leaders, setLeaders] = useState<{ hitting: LeaderCategory[]; pitching: LeaderCategory[] }>({
    hitting: [],
    pitching: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [userSelectedDateManually, setUserSelectedDateManually] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>(
    initialGameId || searchParams?.get("id") || searchParams?.get("game") || "870098"
  );

  // Resolve initial team from URL slug (/equipos/magallanes) or query (?team=magallanes, ?equipo=magallanes, ?=magallanes, ?magallanes)
  const resolvedUrlTeam = useMemo(() => {
    const qLeague = (searchParams?.get("liga") || searchParams?.get("league") || "").toLowerCase();
    const prefLeague: "lvbp" | "mlb" = qLeague === "mlb" ? "mlb" : "lvbp";

    // 1. Standard query parameters: ?team=..., ?equipo=...
    let qTeam: string | null | undefined =
      searchParams?.get("team") || searchParams?.get("equipo");

    // 2. Query param with empty key: ?=magallanes (e.g. /teams?=magallanes)
    if (!qTeam && searchParams?.has("")) {
      qTeam = searchParams.get("") || undefined;
    }

    // 3. Query param as direct flag: ?magallanes
    if (!qTeam && searchParams) {
      for (const key of searchParams.keys()) {
        if (key && key !== "liga" && key !== "league" && !searchParams.get(key)) {
          const candidate = resolveAnyBaseballTeam(key, "", prefLeague);
          if (candidate) return candidate;
        }
      }
    }

    // 4. Initial team slug from route params
    if (!qTeam) qTeam = initialTeamSlug;
    if (!qTeam) return null;
    return resolveAnyBaseballTeam(qTeam, "", prefLeague);
  }, [searchParams, initialTeamSlug]);

  const [activeLeague, setActiveLeague] = useState<"lvbp" | "mlb">(() => {
    const qLeague = (searchParams?.get("liga") || searchParams?.get("league") || "").toLowerCase();
    if (qLeague === "mlb") return "mlb";
    if (qLeague === "lvbp") return "lvbp";
    if (resolvedUrlTeam && MLB_TEAMS[resolvedUrlTeam.code]) return "mlb";
    return "lvbp";
  });
  const [mlbStandingsFilter, setMlbStandingsFilter] = useState<"PLAYOFFS" | "ALL" | "AL" | "NL">("ALL");
  const [showHomeMlbBracket, setShowHomeMlbBracket] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
  const navMenuRef = useRef<HTMLElement>(null);

  const activeTeamsCatalog = useMemo(
    () => (activeLeague === "mlb" ? MLB_TEAMS : LVBP_TEAMS),
    [activeLeague]
  );

  const anyTeamsCatalog = useMemo(
    () => ({ ...LVBP_TEAMS, ...MLB_TEAMS }),
    []
  );

  const [selectedTeamCode, setSelectedTeamCode] = useState<string>(() => {
    if (resolvedUrlTeam?.code) return resolvedUrlTeam.code;
    const qLeague = (searchParams?.get("liga") || searchParams?.get("league") || "").toLowerCase();
    return qLeague === "mlb" ? "NYY" : "CAR";
  });
  const [teamFilter, setTeamFilter] = useState<string>(
    section === "calendario" && resolvedUrlTeam ? resolvedUrlTeam.code : ""
  );
  const [calendarStateFilter, setCalendarStateFilter] = useState<"ALL" | "UPCOMING" | "FINISHED">(
    "ALL"
  );
  const [calendarPickDate, setCalendarPickDate] = useState("");
  const [userPickedCalendarDate, setUserPickedCalendarDate] = useState(false);
  const [standingsPhase, setStandingsPhase] = useState<"REGULAR" | "ROUND_ROBIN" | "FINAL">(
    "REGULAR"
  );

  // Favorite Team state ("Mi Equipo Favorito") stored in localStorage
  const [favoriteTeamCode, setFavoriteTeamCode] = useState<string>("");
  const [copiedGameId, setCopiedGameId] = useState<string>("");
  const [shareModalGame, setShareModalGame] = useState<ScheduleGame | null>(null);
  const [shareStandingsOpen, setShareStandingsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);
  const teamsDropdownRef = useRef<HTMLDivElement>(null);

  // User Profile & Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"quick" | "login" | "register" | "profile">("quick");
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [pwaOnboardingOpen, setPwaOnboardingOpen] = useState(false);

  const switchLeague = (nextLeague: "lvbp" | "mlb") => {
    setActiveLeague((prev) => {
      if (prev !== nextLeague) {
        setLoading(true);
        setSchedule([]);
        setStandings([]);
        setLeaders({ hitting: [], pitching: [] });
      }
      return nextLeague;
    });
    setTeamFilter("");
    setUserSelectedDateManually(false);
    setSelectedTeamCode((prev) => {
      if (nextLeague === "mlb") return MLB_TEAMS[prev] ? prev : "NYY";
      return LVBP_TEAMS[prev] ? prev : "CAR";
    });
  };

  // Sync activeLeague immediately whenever URL ?liga=lvbp|mlb changes
  useEffect(() => {
    const qLeague = (searchParams?.get("liga") || searchParams?.get("league") || "").toLowerCase();
    if (pathname === "/inicio" || pathname === "/") {
      // On /inicio, the page itself always stays LVBP; only the Jornada switches
      switchLeague("lvbp");
      if (qLeague === "mlb" || qLeague === "lvbp") {
        setJornadaLeague(qLeague);
      }
    } else if (qLeague === "mlb" || qLeague === "lvbp") {
      switchLeague(qLeague);
    } else if (resolvedUrlTeam) {
      if (MLB_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("mlb");
      } else if (LVBP_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("lvbp");
      }
    }
    setMobileDrawerOpen(false);
    setTeamsDropdownOpen(false);
    setOpenNavDropdown(null);
  }, [pathname, searchParams, resolvedUrlTeam]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = teamsDropdownRef.current?.contains(target);
      const inNavMenu = navMenuRef.current?.contains(target);
      if (!inDesktop) {
        setTeamsDropdownOpen(false);
      }
      if (!inNavMenu) {
        setOpenNavDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTeamsDropdownOpen(false);
        setMobileDrawerOpen(false);
        setOpenNavDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    try {
      const fav = localStorage.getItem("enjuego_fav_team");
      if (fav && (LVBP_TEAMS[fav] || MLB_TEAMS[fav])) setFavoriteTeamCode(fav);

      const storedUser = localStorage.getItem("enjuego_user_session");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) {
          setCurrentUser(parsed);
          if (parsed.favoriteTeam && (LVBP_TEAMS[parsed.favoriteTeam] || MLB_TEAMS[parsed.favoriteTeam])) {
            setFavoriteTeamCode(parsed.favoriteTeam);
            setPostTeam(parsed.favoriteTeam);
          }
          if (parsed.name) {
            setPostAuthor(parsed.name);
          }
        }
      }

      // Check PWA launch mode (?source=pwa or standalone display mode)
      const urlParams = new URLSearchParams(window.location.search);
      const isPwa =
        urlParams.get("source") === "pwa" ||
        (window.navigator as any).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;

      const hasOnboarded = localStorage.getItem("enjuego_pwa_onboarded");
      if (isPwa && !hasOnboarded && !storedUser) {
        setPwaOnboardingOpen(true);
      } else if (!isPwa) {
        // When opening the web in browser: show the floating download & notifications modal ONLY ONCE
        const seen = localStorage.getItem("enjuego_pwa_install_prompt_seen");
        if (!seen) {
          setTimeout(() => {
            setPwaModalOpen(true);
          }, 800);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const qId = initialGameId || searchParams?.get("id") || searchParams?.get("game");
    if (qId) {
      setSelectedGameId(qId);
    }
  }, [initialGameId, searchParams]);

  useEffect(() => {
    if (resolvedUrlTeam) {
      setSelectedTeamCode(resolvedUrlTeam.code);
      if (MLB_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("mlb");
      } else if (LVBP_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("lvbp");
      }
      if (section === "calendario") {
        setTeamFilter(resolvedUrlTeam.code);
      }
    }
  }, [resolvedUrlTeam, section]);

  const toggleFavoriteTeam = (code: string) => {
    const next = favoriteTeamCode === code ? "" : code;
    setFavoriteTeamCode(next);
    try {
      if (next) {
        localStorage.setItem("enjuego_fav_team", next);
      } else {
        localStorage.removeItem("enjuego_fav_team");
      }
    } catch {
      // ignore
    }
  };

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

  const handleUserUpdate = (updated: UserProfile | null) => {
    setCurrentUser(updated);
    if (updated) {
      if (updated.favoriteTeam && (LVBP_TEAMS[updated.favoriteTeam] || MLB_TEAMS[updated.favoriteTeam])) {
        setFavoriteTeamCode(updated.favoriteTeam);
        setPostTeam(updated.favoriteTeam);
      }
      if (updated.name) {
        setPostAuthor(updated.name);
      }
    }
  };

  const handlePwaOnboardingComplete = (user: UserProfile, chosenLeague: "lvbp" | "mlb") => {
    handleUserUpdate(user);
    if (chosenLeague !== activeLeague) {
      switchLeague(chosenLeague);
    }
    if (user.favoriteTeam) {
      setSelectedTeamCode(user.favoriteTeam);
    }
    setPwaOnboardingOpen(false);
  };

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

  useEffect(() => {
    const controller = new AbortController();
    const targetLeague = activeLeague;
    const seasonParam = "2026";

    let timerId: NodeJS.Timeout | null = null;
    let lastLoadAt = 0;
    const isGameView =
      section === "juego" ||
      (typeof window !== "undefined" && window.location.pathname.startsWith("/juego"));

    const scheduleNextPoll = (hasLive: boolean) => {
      if (timerId) clearTimeout(timerId);
      if (controller.signal.aborted) return;

      if (isGameView) {
        // Stop repetitive background polling while viewing game detail (/juego/[id]).
        // Polling is handled strictly by GamedayView for that specific game.
        // Refresh global portal data at most every 5 minutes (300,000 ms).
        timerId = setTimeout(() => {
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "visible" &&
            !document.hidden &&
            !controller.signal.aborted
          ) {
            loadAllData(false);
          } else if (!controller.signal.aborted) {
            scheduleNextPoll(hasLive);
          }
        }, 300000);
        return;
      }

      // 25s if a game is live, 60s if all games are scheduled or finished
      const delay = hasLive ? 25000 : 60000;
      timerId = setTimeout(() => {
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "visible" &&
          !document.hidden &&
          !controller.signal.aborted
        ) {
          loadAllData(false);
        } else if (!controller.signal.aborted) {
          // Check again in 30s if still hidden
          scheduleNextPoll(hasLive);
        }
      }, delay);
    };

    const loadAllData = async (isInitial: boolean) => {
      lastLoadAt = Date.now();
      if (isInitial) setLoading(true);
      try {
        const [schRes, stdRes, mlbRes] = await Promise.all([
          fetch(`/api/lvbp/schedule?season=${seasonParam}&league=${targetLeague}`, {
            signal: controller.signal,
          }),
          fetch(`/api/lvbp/standings?season=${seasonParam}&league=${targetLeague}`, {
            signal: controller.signal,
          }),
          targetLeague === "lvbp"
            ? fetch(`/api/lvbp/schedule?season=2026&league=mlb`, {
                signal: controller.signal,
              }).catch(() => null)
            : Promise.resolve(null),
        ]);
        const schData = await schRes.json();
        const stdData = await stdRes.json();
        const mlbData = mlbRes ? await mlbRes.json().catch(() => ({})) : null;

        if (controller.signal.aborted) return;

        // Strictly filter games and standings by targetLeague so LVBP and MLB never mix
        const rawGames: ScheduleGame[] = schData.games || [];
        const loadedGames = rawGames.filter((g) =>
          targetLeague === "mlb"
            ? Boolean(MLB_TEAMS[g.homeTeam.code] || MLB_TEAMS[g.awayTeam.code])
            : Boolean(LVBP_TEAMS[g.homeTeam.code] || LVBP_TEAMS[g.awayTeam.code])
        );

        const rawStandings: StandingRow[] = stdData.standings || [];
        const cleanStandings = rawStandings.filter((r) =>
          targetLeague === "mlb"
            ? Boolean(MLB_TEAMS[r.team.code])
            : Boolean(LVBP_TEAMS[r.team.code])
        );

        setSchedule(loadedGames);
        setStandings(cleanStandings);
        setLeaders(stdData.leaders || { hitting: [], pitching: [] });

        if (targetLeague === "mlb") {
          setMlbJornadaGames(loadedGames);
        } else if (Array.isArray(mlbData?.games)) {
          const cleanMlbGames = (mlbData.games as ScheduleGame[]).filter((g) =>
            Boolean(MLB_TEAMS[g.homeTeam.code] || MLB_TEAMS[g.awayTeam.code])
          );
          setMlbJornadaGames(cleanMlbGames);
          const uniqueMlbDates = [...new Set(cleanMlbGames.map((g) => g.date))].sort();
          if (uniqueMlbDates.length > 0) {
            const todayIso = getTodayCaracasIso();
            const liveMlb = cleanMlbGames.find((g) => g.status === "IN_PROGRESS");
            const targetMlbIso = liveMlb ? liveMlb.date : todayIso;
            let mIdx = uniqueMlbDates.indexOf(targetMlbIso);
            if (mIdx === -1) mIdx = uniqueMlbDates.findIndex((d) => d >= targetMlbIso);
            if (mIdx === -1) mIdx = Math.max(0, uniqueMlbDates.length - 1);
            setMlbDateIndex((prev) => (userSelectedMlbDate ? prev : mIdx));
          }
        }

        const uniqueDates = [...new Set(loadedGames.map((g) => g.date))].sort();
        if (uniqueDates.length > 0) {
          const paramDate = searchParams?.get("fecha") || searchParams?.get("date");
          const todayIso = getTodayCaracasIso();
          const liveGame = loadedGames.find((g) => g.status === "IN_PROGRESS");
          const targetIso = paramDate || (liveGame ? liveGame.date : todayIso);

          let idx = uniqueDates.indexOf(targetIso);
          if (idx === -1) {
            idx = uniqueDates.findIndex((d) => d >= targetIso);
          }
          if (idx === -1) {
            idx = Math.max(0, uniqueDates.length - 1);
          }
          setSelectedDateIndex((prev) => (userSelectedDateManually ? prev : idx));
        }

        const hasLiveGame = loadedGames.some((g) => g.status === "IN_PROGRESS");
        scheduleNextPoll(hasLiveGame);
      } catch {
        scheduleNextPoll(false);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadAllData(true);

    const handleVisibilityOrFocus = () => {
      if (isGameView) return; // Do not reload global schedule/standings on focus when viewing a specific game
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        !controller.signal.aborted &&
        Date.now() - lastLoadAt > 45_000
      ) {
        loadAllData(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      controller.abort();
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [userSelectedDateManually, userSelectedMlbDate, activeLeague, section]);

  // Dedicated poll for community comments every 60s (only when in /inicio home view)
  useEffect(() => {
    if (section !== "home") return;
    let active = true;

    const loadCommunity = async () => {
      try {
        const res = await fetch("/api/lvbp/interactive?mode=community");
        const data = await res.json();
        if (active && Array.isArray(data?.posts)) {
          setCommunityPosts(mapServerPosts(data.posts));
        }
      } catch {
        // ignore
      }
    };

    loadCommunity();

    const interval = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        !document.hidden
      ) {
        loadCommunity();
      }
    }, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [section]);

  const dates = useMemo(
    () => [...new Set(schedule.map((g) => g.date))].sort(),
    [schedule]
  );

  const activeDate = dates[selectedDateIndex] || getTodayCaracasIso();

  // Independent Jornada state for /inicio so switching the Jornada to MLB does NOT change the rest of /inicio
  const currentJornadaLeague: "lvbp" | "mlb" =
    section === "home" ? jornadaLeague : activeLeague;

  const jornadaSchedule = useMemo(
    () =>
      section === "home" && jornadaLeague === "mlb" ? mlbJornadaGames : schedule,
    [section, jornadaLeague, mlbJornadaGames, schedule]
  );

  const jornadaDates = useMemo(
    () => [...new Set(jornadaSchedule.map((g) => g.date))].sort(),
    [jornadaSchedule]
  );

  const currentJornadaDateIdx =
    section === "home" && jornadaLeague === "mlb" ? mlbDateIndex : selectedDateIndex;

  const activeJornadaDate = jornadaDates[currentJornadaDateIdx] || getTodayCaracasIso();

  const stepJornadaDate = (delta: number) => {
    if (section === "home" && jornadaLeague === "mlb") {
      setUserSelectedMlbDate(true);
      setMlbDateIndex((i) =>
        Math.min(jornadaDates.length - 1, Math.max(0, i + delta))
      );
    } else {
      setUserSelectedDateManually(true);
      setSelectedDateIndex((i) =>
        Math.min(jornadaDates.length - 1, Math.max(0, i + delta))
      );
    }
  };

  const resetJornadaToToday = () => {
    const todayIdx = jornadaDates.indexOf(getTodayCaracasIso());
    if (todayIdx === -1) return;
    if (section === "home" && jornadaLeague === "mlb") {
      setMlbDateIndex(todayIdx);
      setUserSelectedMlbDate(false);
    } else {
      setSelectedDateIndex(todayIdx);
      setUserSelectedDateManually(false);
    }
  };

  // Sort gamesOfDay so Favorite Team game is always first!
  const gamesOfDay = useMemo(() => {
    const list = schedule.filter((g) => g.date === activeDate);
    if (!favoriteTeamCode) return list;
    return [...list].sort((a, b) => {
      const aFav =
        a.awayTeam.code === favoriteTeamCode || a.homeTeam.code === favoriteTeamCode ? 1 : 0;
      const bFav =
        b.awayTeam.code === favoriteTeamCode || b.homeTeam.code === favoriteTeamCode ? 1 : 0;
      return bFav - aFav;
    });
  }, [schedule, activeDate, favoriteTeamCode]);

  const jornadaGamesOfDay = useMemo(() => {
    const list = jornadaSchedule.filter((g) => g.date === activeJornadaDate);
    if (!favoriteTeamCode) return list;
    return [...list].sort((a, b) => {
      const aFav =
        a.awayTeam.code === favoriteTeamCode || a.homeTeam.code === favoriteTeamCode ? 1 : 0;
      const bFav =
        b.awayTeam.code === favoriteTeamCode || b.homeTeam.code === favoriteTeamCode ? 1 : 0;
      return bFav - aFav;
    });
  }, [jornadaSchedule, activeJornadaDate, favoriteTeamCode]);

  const liveGames = useMemo(
    () => schedule.filter((g) => g.status === "IN_PROGRESS"),
    [schedule]
  );

  const openGameGameday = (gameId: string) => {
    setSelectedGameId(gameId);
    router.push(`/juego/${gameId}`);
  };

  const openTeamPage = (code: string) => {
    const meta = anyTeamsCatalog[code] || activeTeamsCatalog[code] || LVBP_TEAMS.CAR;
    const teamLeague = MLB_TEAMS[meta.code] ? "mlb" : "lvbp";
    setSelectedTeamCode(meta.code);
    if (pathname?.startsWith("/equipos/")) {
      router.push(`/equipos/${meta.slug}?liga=${teamLeague}`);
    } else {
      router.push(`/teams?team=${meta.slug}&liga=${teamLeague}`);
    }
  };

  const handleShareGame = (e: React.MouseEvent, game: ScheduleGame) => {
    e.stopPropagation();
    const resolvedInning =
      game.status === "IN_PROGRESS"
        ? game.inning && !/^in\s*progress/i.test(game.inning)
          ? game.inning
          : "En Vivo"
        : game.inning;
    setShareModalGame({ ...game, inning: resolvedInning });
  };

  // Generate real game recaps / crónicas directly from LVBP games
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
          : `Juego disputado en ${g.venue}.`;
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
    if (!currentUser) {
      setAuthModalTab("quick");
      setAuthModalOpen(true);
      return;
    }
    const cleanText = newPostText.trim();
    if (!cleanText) return;
    setNewPostText("");

    const authorName = currentUser.name || "Aficionado LVBP";
    const authorTeam = currentUser.favoriteTeam || postTeam || "CAR";
    const authorHandle = currentUser.handle
      ? currentUser.handle.replace(/^@/, "")
      : authorName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "lvbp";

    const optimistic = {
      id: `opt-${Date.now()}`,
      author: authorName,
      username: authorHandle,
      team: authorTeam,
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
          team: authorTeam,
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
  const jornadaDayFormatted = formatCompactDay(activeJornadaDate);

  // Real-time visitor presence heartbeat for /admin monitor
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        if (params.get("admin") === "1") {
          localStorage.setItem("es_admin", "true");
        }
      }
      if (localStorage.getItem("es_admin") === "true") {
        return; // Exclude admin from visitor and heartbeat analytics
      }
    } catch {
      // ignore storage errors
    }

    let sessionId = window.sessionStorage.getItem("enjuego_live_sid");
    if (!sessionId) {
      sessionId = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem("enjuego_live_sid", sessionId);
    }

    const getSectionLabel = () => {
      if (section === "home") return "Inicio";
      if (section === "resultados") return "Resultados / Pizarra";
      if (section === "juego") return `Gameday #${selectedGameId || ""}`;
      if (section === "calendario") return "Calendario";
      if (section === "posiciones") return "Tabla de Posiciones";
      if (section === "lideres") return "Líderes";
      if (section === "equipos") return `Roster · ${selectedTeamCode}`;
      return "Inicio";
    };

    const sendHeartbeat = async () => {
      const { getHeartbeatClientPayload } = await import("@/lib/client-device-hints");
      const client = await getHeartbeatClientPayload();

      fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          sessionId,
          userId: currentUser?.id,
          userName: currentUser?.name || "Visitante",
          userHandle: currentUser?.handle,
          favoriteTeam: currentUser?.favoriteTeam || favoriteTeamCode || selectedTeamCode,
          isRegistered: Boolean(currentUser?.id),
          path: window.location.pathname + window.location.search,
          sectionLabel: getSectionLabel(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          client,
        }),
      }).catch(() => {});
    };

    void import("@/lib/client-device-hints").then((m) => m.warmExtendedDeviceHints());
    sendHeartbeat();
    const interval = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        !document.hidden
      ) {
        sendHeartbeat();
      }
    }, 150_000);
    return () => clearInterval(interval);
  }, [section, selectedGameId, selectedTeamCode, currentUser, favoriteTeamCode]);

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

  const calendarAvailableDates = useMemo(
    () => [...new Set(filteredCalendarGames.map((g) => g.date))].sort(),
    [filteredCalendarGames]
  );

  const calendarMonthKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const d of calendarAvailableDates) keys.add(d.slice(0, 7));
    return Array.from(keys).sort();
  }, [calendarAvailableDates]);

  const calendarMonthKey =
    (calendarPickDate ? calendarPickDate.slice(0, 7) : "") ||
    calendarMonthKeys[0] ||
    "";

  const calendarDayGames = useMemo(
    () => filteredCalendarGames.filter((g) => g.date === calendarPickDate),
    [filteredCalendarGames, calendarPickDate]
  );

  const calendarGamesPerDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of filteredCalendarGames) {
      map[g.date] = (map[g.date] || 0) + 1;
    }
    return map;
  }, [filteredCalendarGames]);

  const calendarPickIndex = calendarAvailableDates.indexOf(calendarPickDate);

  useEffect(() => {
    if (section !== "calendario") return;
    const available = calendarAvailableDates;
    if (!available.length) {
      setCalendarPickDate("");
      return;
    }
    const param = searchParams?.get("fecha") || searchParams?.get("date");
    if (param && available.includes(param)) {
      setCalendarPickDate(param);
      return;
    }
    if (userPickedCalendarDate && calendarPickDate && available.includes(calendarPickDate)) {
      return;
    }
    const today = getTodayCaracasIso();
    const live = filteredCalendarGames.find((g) => g.status === "IN_PROGRESS");
    const target = live?.date || today;
    let idx = available.indexOf(target);
    if (idx === -1) idx = available.findIndex((d) => d >= target);
    if (idx === -1) idx = available.length - 1;
    setCalendarPickDate(available[idx]);
  }, [
    section,
    calendarAvailableDates,
    filteredCalendarGames,
    searchParams,
    teamFilter,
    calendarStateFilter,
    activeLeague,
    userPickedCalendarDate,
    calendarPickDate,
  ]);

  const selectCalendarDate = (iso: string) => {
    setUserPickedCalendarDate(true);
    setCalendarPickDate(iso);
    const club = teamFilter ? anyTeamsCatalog[teamFilter] : null;
    const q = new URLSearchParams({ liga: activeLeague, fecha: iso });
    if (club?.slug) q.set("equipo", club.slug);
    router.replace(`/calendario?${q.toString()}`, { scroll: false });
  };

  const shiftCalendarDay = (delta: -1 | 1) => {
    const idx = calendarAvailableDates.indexOf(calendarPickDate);
    const next = calendarAvailableDates[idx + delta];
    if (next) selectCalendarDate(next);
  };

  const shiftCalendarMonth = (delta: -1 | 1) => {
    const mkIdx = calendarMonthKeys.indexOf(calendarMonthKey);
    const targetMonth = calendarMonthKeys[mkIdx + delta];
    if (!targetMonth) return;
    const firstInMonth = calendarAvailableDates.find((d) => d.startsWith(targetMonth));
    if (firstInMonth) selectCalendarDate(firstInMonth);
  };

  // Render a broadcast-quality Scoreboard Card for Pizarra del Día & Resultados
  const renderScoreboardCard = (game: ScheduleGame) => {
    const played = game.status === "IN_PROGRESS" || game.status === "FINISHED";
    const isLive = game.status === "IN_PROGRESS";
    const isFinal = game.status === "FINISHED";
    const awayWon = isFinal && game.awayScore > game.homeScore;
    const homeWon = isFinal && game.homeScore > game.awayScore;
    const tvChannels = getGameTvChannels(game);
    const isFavGame =
      favoriteTeamCode &&
      (game.awayTeam.code === favoriteTeamCode || game.homeTeam.code === favoriteTeamCode);

    return (
      <article
        key={game.id}
        onClick={() => openGameGameday(game.id)}
        className={`rounded-2xl border bg-white hover:border-amber-500/80 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md cursor-pointer group ${
          isFavGame ? "border-amber-400 ring-2 ring-amber-400/25" : "border-slate-200"
        }`}
      >
        {/* Top Accent Strip */}
        <div
          className={`h-1 w-full ${
            isLive
              ? "bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
              : isFavGame
                ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500"
                : isFinal
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-sky-500 to-indigo-500"
          }`}
        />

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Header: Status + Favorite Badge + C H E */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
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
                  {isLive ? (
                    game.inning && !/^in\s*progress/i.test(game.inning) && !/^en vivo/i.test(game.inning)
                      ? `EN VIVO · ${game.inning}`
                      : "EN VIVO"
                  ) : isFinal ? (
                    game.inning
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      {game.time}
                    </span>
                  )}
                </span>
                {isFavGame && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-black"
                    title="Partido de tu Equipo Favorito"
                  >
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Tu Club
                  </span>
                )}
              </div>

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

          {/* Broadcast Channels + Venue / Decisions + Share Button Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
            {/* TV Broadcast Channels Row with Official Launcher */}
            <BroadcastChannelsRow
              channels={tvChannels}
              gameTitle={`${game.awayTeam.nick} vs ${game.homeTeam.nick}`}
              youtubeVideoId={game.youtubeVideoId}
            />

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
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {game.venue} (
                {game.venueCity})
              </p>
            )}

            <div className="flex items-center gap-1.5">
              <div className="flex-1 rounded-xl bg-slate-100 group-hover:bg-amber-400 text-slate-800 group-hover:text-slate-950 py-2 px-3 text-xs font-extrabold text-center transition">
                {isLive
                  ? "Seguir Gameday ›"
                  : isFinal
                    ? "Box Score y Jugadas ›"
                    : "Previa y Alineación ›"}
              </div>
              <button
                type="button"
                onClick={(e) => handleShareGame(e, game)}
                title="Compartir partido por WhatsApp"
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer shrink-0"
              >
                {copiedGameId === game.id ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f3f6fb] text-slate-900"
      style={{ paddingBottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* CLEAN EDITORIAL TOPBAR WITH REAL NEXT.JS LINKS */}
      {/* TOPBAR WITH BRAND HORIZONTAL LOGO (AS REQUESTED) */}
      <header
        className="portal-header sticky top-0 z-40 border-b text-white shadow-md transition-all"
        style={{
          backgroundColor: "#060a12",
          borderColor: "#1e293b",
          color: "#ffffff",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-15 sm:h-17 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Horizontal Logo + .online Pill + League Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link
              href="/inicio"
              className="flex items-center gap-1.5 sm:gap-2 py-1 group cursor-pointer select-none"
              aria-label="En Juego Online - Inicio"
            >
              <img
                src="/logo.png"
                alt="En Juego · Béisbol Venezolano"
                className="h-8 sm:h-10 md:h-11 w-auto object-contain transition-transform group-hover:scale-102 shrink-0"
              />
              <span
                className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black italic tracking-tight shadow-sm transition-transform group-hover:scale-105 shrink-0 -ml-0.5"
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

          {/* Desktop Main Navigation with Dropdowns per Section (LVBP / MLB) */}
          <nav
            ref={navMenuRef}
            className="hidden lg:flex items-center gap-1 p-1.5 rounded-xl border border-slate-800"
            style={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
            aria-label="Navegación Principal"
          >
            {/* Inicio */}
            <Link
              href="/inicio"
              onClick={() => setOpenNavDropdown(null)}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                section === "home"
                  ? "bg-amber-400 text-slate-950 shadow-2xs"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Inicio
            </Link>

            {/* Dropdown Menu Items: Resultados, Calendario, Posiciones, Líderes, Equipos */}
            {(
              [
                {
                  key: "resultados",
                  label: "Resultados",
                  lvbpHref: "/resultados?liga=lvbp",
                  mlbHref: "/resultados?liga=mlb",
                  lvbpDesc: "Pizarra en vivo de Venezuela",
                  mlbDesc: "Pizarra de Grandes Ligas",
                },
                {
                  key: "calendario",
                  label: "Calendario",
                  lvbpHref: "/calendario?liga=lvbp",
                  mlbHref: "/calendario?liga=mlb",
                  lvbpDesc: "Juegos y canales TV LVBP",
                  mlbDesc: "Juegos y canales TV MLB",
                },
                {
                  key: "posiciones",
                  label: "Posiciones",
                  lvbpHref: "/posiciones?liga=lvbp",
                  mlbHref: "/posiciones?liga=mlb",
                  lvbpDesc: "Tabla Round Robin (8 clubes)",
                  mlbDesc: "6 Divisiones Liga Americana y Nacional",
                },
                {
                  key: "lideres",
                  label: "Líderes",
                  lvbpHref: "/lideres?liga=lvbp",
                  mlbHref: "/lideres?liga=mlb",
                  lvbpDesc: "Bateo y pitcheo LVBP",
                  mlbDesc: "Bateo y pitcheo MLB",
                },
                {
                  key: "equipos",
                  label: "Equipos",
                  lvbpHref: "/teams?team=leones&liga=lvbp",
                  mlbHref: "/teams?team=yankees&liga=mlb",
                  lvbpDesc: "8 franquicias y rosters LVBP",
                  mlbDesc: "30 franquicias y rosters MLB",
                },
              ] as const
            ).map((item) => {
              const isCurrentSection = section === item.key;
              const isOpen = openNavDropdown === item.key;

              return (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => setOpenNavDropdown(item.key)}
                  onMouseLeave={() =>
                    setOpenNavDropdown((prev) => (prev === item.key ? null : prev))
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenNavDropdown((prev) => (prev === item.key ? null : item.key))
                    }
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                      isCurrentSection
                        ? "bg-amber-400 text-slate-950 shadow-2xs"
                        : isOpen
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                    aria-expanded={isOpen}
                  >
                    <span>{item.label}</span>
                    {isCurrentSection && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          isCurrentSection
                            ? "bg-slate-950/15 text-slate-950"
                            : "bg-slate-700 text-slate-200"
                        }`}
                      >
                        {activeLeague.toUpperCase()}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full pt-2 w-64 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div
                        className="rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 space-y-1 text-slate-900"
                        style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                      >
                        <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {item.label} · Selecciona Liga
                        </div>

                        <Link
                          href={item.lvbpHref}
                          onClick={() => {
                            switchLeague("lvbp");
                            setOpenNavDropdown(null);
                          }}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                            isCurrentSection && activeLeague === "lvbp"
                              ? "bg-amber-50 border-amber-400 text-slate-950"
                              : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-base shrink-0">
                              🇻🇪
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-950 leading-tight">
                                {item.label} LVBP
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 truncate">
                                {item.lvbpDesc}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                        </Link>

                        <Link
                          href={item.mlbHref}
                          onClick={() => {
                            switchLeague("mlb");
                            setOpenNavDropdown(null);
                          }}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                            isCurrentSection && activeLeague === "mlb"
                              ? "bg-sky-50 border-sky-400 text-slate-950"
                              : "bg-white hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-base shrink-0">
                              ⚾
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-950 leading-tight">
                                {item.label} MLB
                              </div>
                              <div className="text-[10px] font-semibold text-slate-500 truncate">
                                {item.mlbDesc}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-sky-600 shrink-0" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Desktop Right Quick Bar: Equipos Dropdown + Quick Icon Strip */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0" ref={teamsDropdownRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTeamsDropdownOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                  teamsDropdownOpen
                    ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                    : "text-slate-200 hover:text-white"
                }`}
                style={
                  teamsDropdownOpen
                    ? undefined
                    : { backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc" }
                }
                aria-expanded={teamsDropdownOpen}
                aria-label="Desplegable de equipos"
              >
                <img
                  src={activeTeamsCatalog[selectedTeamCode]?.logoSvg || anyTeamsCatalog[selectedTeamCode]?.logoSvg || LVBP_OFFICIAL_LOGO}
                  alt=""
                  className="w-5 h-5 object-contain"
                />
                <span>{activeTeamsCatalog[selectedTeamCode]?.nick || "Equipos"}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    teamsDropdownOpen ? "rotate-180 text-slate-950" : "text-slate-400"
                  }`}
                />
              </button>

              {/* DESKTOP TEAMS DROPDOWN */}
              {teamsDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-88 max-h-[75vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-50 text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                >
                  <div className="flex items-center justify-between px-1 pb-2 mb-2 border-b border-slate-100">
                    <div>
                      <div
                        className="text-xs font-black flex items-center gap-1.5"
                        style={{ color: "#0f172a" }}
                      >
                        <Users className="w-3.5 h-3.5 text-amber-600" />{" "}
                        {activeLeague === "mlb" ? "Equipos MLB (2026)" : "Equipos LVBP (2026-27)"}
                      </div>
                      <p className="text-[10px]" style={{ color: "#64748b" }}>
                        {activeLeague === "mlb" ? "30 franquicias de Grandes Ligas" : "8 franquicias de la liga"}
                      </p>
                    </div>
                    <Link
                      href={`/teams?team=${activeLeague === "mlb" ? "yankees" : "leones"}&liga=${activeLeague}`}
                      onClick={() => setTeamsDropdownOpen(false)}
                      className="text-[11px] font-extrabold hover:underline"
                      style={{ color: "#d97706" }}
                    >
                      Directorio ›
                    </Link>
                  </div>

                  {/* Quick League Switcher inside Teams Dropdown */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 mb-2.5 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => switchLeague("lvbp")}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeLeague === "lvbp"
                          ? "bg-amber-400 text-slate-950 shadow-2xs"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      <span>🇻🇪</span>
                      <span>LVBP (8)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLeague("mlb")}
                      className={`py-1.5 px-2.5 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeLeague === "mlb"
                          ? "bg-sky-400 text-slate-950 shadow-2xs"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      <span>⚾</span>
                      <span>MLB (30)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(activeTeamsCatalog).map((team) => {
                      const isSelected = selectedTeamCode === team.code;
                      const isFav = favoriteTeamCode === team.code;
                      return (
                        <Link
                          key={team.code}
                          href={`/teams?team=${team.slug}&liga=${activeLeague}`}
                          onClick={() => {
                            setSelectedTeamCode(team.code);
                            setTeamsDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition cursor-pointer group ${
                            isSelected
                              ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400/40 font-black shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 font-bold"
                          }`}
                          style={{ color: "#0f172a" }}
                        >
                          <div
                            className="w-7 h-7 rounded-full p-1 bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition"
                            style={{ borderColor: isSelected ? team.color : undefined }}
                          >
                            <img
                              src={team.logoSvg}
                              alt={team.nick}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate leading-tight text-xs font-extrabold"
                              style={{ color: "#0f172a" }}
                            >
                              {team.nick}
                            </div>
                            <div
                              className="text-[10px] truncate font-medium"
                              style={{ color: "#64748b" }}
                            >
                              {team.city}
                            </div>
                          </div>
                          {isFav && (
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop User Profile / Login */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab("profile");
                  setAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white border text-xs font-bold transition cursor-pointer shadow-2xs hover:border-amber-400"
                style={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#ffffff" }}
                title="Ver tu perfil de fanático y equipo favorito"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{
                    backgroundColor:
                      anyTeamsCatalog[currentUser.favoriteTeam]?.color || "#d97706",
                  }}
                >
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[110px] truncate font-extrabold">{currentUser.name}</span>
                {currentUser.favoriteTeam && anyTeamsCatalog[currentUser.favoriteTeam] && (
                  <img
                    src={anyTeamsCatalog[currentUser.favoriteTeam].logoSvg}
                    alt=""
                    className="w-4 h-4 object-contain shrink-0"
                  />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab("login");
                  setAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>Iniciar Sesión</span>
                <span className="hidden xl:inline text-[10px] font-extrabold bg-slate-950/10 px-1.5 py-0.5 rounded-md">
                  Fan {activeLeague.toUpperCase()}
                </span>
              </button>
            )}
          </div>

          {/* Mobile & Tablet Right Controls (<1024px): Clean, Uncluttered Touch Controls */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab("profile");
                  setAuthModalOpen(true);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-black text-xs sm:text-sm shrink-0 shadow-2xs border border-slate-700 cursor-pointer active:scale-95"
                style={{
                  backgroundColor:
                    anyTeamsCatalog[currentUser.favoriteTeam]?.color || "#d97706",
                }}
                title={`Perfil de ${currentUser.name}`}
                aria-label="Ver perfil de usuario"
              >
                {currentUser.name.slice(0, 1).toUpperCase()}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setTeamsDropdownOpen(false);
                setMobileDrawerOpen(true);
              }}
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
        <div className="fixed inset-0 z-[100] flex justify-end lg:hidden animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel (Wider & Larger Touch Targets for Mobile) */}
          <div className="relative w-full max-w-[86vw] sm:max-w-sm bg-white h-dvh shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Drawer Header with Dark Theme Contrast for Logo - STICKY & PINNED */}
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
            {/* Fan Profile / Login Card in Drawer */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              {currentUser ? (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base shadow-inner shrink-0"
                      style={{
                        backgroundColor:
                          anyTeamsCatalog[currentUser.favoriteTeam]?.color || "#d97706",
                      }}
                    >
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{currentUser.handle}</div>
                      <div className="text-xs text-amber-600 font-extrabold flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {anyTeamsCatalog[currentUser.favoriteTeam]?.name || "Fanático"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setAuthModalTab("profile");
                        setAuthModalOpen(true);
                      }}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                    >
                      Cambiar Equipo / Perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("enjuego_user_session");
                        setCurrentUser(null);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-4 rounded-2xl shadow-xs"
                  style={{
                    background: "linear-gradient(135deg, #0b1324 0%, #162447 100%)",
                    border: "1px solid #1e293b",
                    color: "#ffffff",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0"
                      style={{ backgroundColor: "#f59e0b", color: "#0f172a" }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black" style={{ color: "#fbbf24" }}>
                        Perfil de Fanático
                      </div>
                      <p className="text-xs leading-snug mt-0.5" style={{ color: "#cbd5e1" }}>
                        Guarda tu equipo, participa en la quiniela y comenta en vivo.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setAuthModalTab("quick");
                        setAuthModalOpen(true);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs text-center transition cursor-pointer shadow-xs"
                      style={{ backgroundColor: "#f59e0b", color: "#0f172a" }}
                    >
                      Entrar como Fan ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        setAuthModalTab("login");
                        setAuthModalOpen(true);
                      }}
                      className="py-2.5 px-3.5 rounded-xl font-bold text-xs transition cursor-pointer"
                      style={{
                        backgroundColor: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                      }}
                    >
                      Login
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PWA Mobile Drawer Install Option */}
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setPwaModalOpen(true);
                }}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white flex items-center justify-between text-xs font-bold transition hover:border-amber-400 cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>📲 Instalar App en tu Celular</span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md font-extrabold">
                  Gratis
                </span>
              </button>
            </div>

            {/* Navigation Links with Collapsible Arrow Dropdowns */}
            <div className="p-4 space-y-1.5 border-b border-slate-100">
              <Link
                href="/inicio"
                onClick={() => {
                  setMobileExpandedSection(null);
                  setMobileDrawerOpen(false);
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-black transition ${
                  section === "home"
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4.5 h-4.5 text-amber-600" />
                  <span>Inicio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {(
                [
                  {
                    key: "resultados",
                    label: "Resultados en Vivo",
                    Icon: Activity,
                    lvbpHref: "/resultados?liga=lvbp",
                    mlbHref: "/resultados?liga=mlb",
                  },
                  {
                    key: "calendario",
                    label: "Calendario y Canales TV",
                    Icon: Calendar,
                    lvbpHref: "/calendario?liga=lvbp",
                    mlbHref: "/calendario?liga=mlb",
                  },
                  {
                    key: "posiciones",
                    label: "Tabla de Posiciones",
                    Icon: Trophy,
                    lvbpHref: "/posiciones?liga=lvbp",
                    mlbHref: "/posiciones?liga=mlb",
                  },
                  {
                    key: "lideres",
                    label: "Líderes y Estadísticas",
                    Icon: BarChart3,
                    lvbpHref: "/lideres?liga=lvbp",
                    mlbHref: "/lideres?liga=mlb",
                  },
                  {
                    key: "equipos",
                    label: "Equipos y Rosters",
                    Icon: Users,
                    lvbpHref: "/teams?team=leones&liga=lvbp",
                    mlbHref: "/teams?team=yankees&liga=mlb",
                  },
                ] as const
              ).map(({ key, label, Icon, lvbpHref, mlbHref }) => {
                const active = section === key || (section === "juego" && key === "resultados");
                const isExpanded = mobileExpandedSection === key;
                return (
                  <div key={key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileExpandedSection((prev) => (prev === key ? null : key))
                      }
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-black transition cursor-pointer ${
                        active
                          ? "bg-amber-50 text-slate-950 border border-amber-300 shadow-2xs"
                          : isExpanded
                            ? "bg-slate-100 text-slate-950"
                            : "text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                        <span>{label}</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                          isExpanded ? "rotate-90 text-amber-600" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="pl-7 pr-2 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <Link
                          href={lvbpHref}
                          onClick={() => {
                            switchLeague("lvbp");
                            setMobileExpandedSection(null);
                            setMobileDrawerOpen(false);
                          }}
                          className={`flex items-center justify-between py-2 px-3 rounded-xl text-xs font-black border transition ${
                            active && activeLeague === "lvbp"
                              ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                              : "bg-slate-50 text-slate-800 border-slate-200 hover:border-amber-400"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>🇻🇪</span>
                            <span>LVBP — Liga Venezolana</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </Link>
                        <Link
                          href={mlbHref}
                          onClick={() => {
                            switchLeague("mlb");
                            setMobileExpandedSection(null);
                            setMobileDrawerOpen(false);
                          }}
                          className={`flex items-center justify-between py-2 px-3 rounded-xl text-xs font-black border transition ${
                            active && activeLeague === "mlb"
                              ? "bg-sky-400 text-slate-950 border-sky-400 shadow-2xs"
                              : "bg-slate-50 text-slate-800 border-slate-200 hover:border-sky-400"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>⚾</span>
                            <span>MLB — Grandes Ligas</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Teams Directory in Mobile Drawer */}
            <div className="p-4 flex-1">
              <div className="flex items-center justify-between px-1 mb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {activeLeague === "mlb" ? "Equipos de la MLB" : "Equipos de la LVBP"}
                </span>
                <span className="text-xs font-bold text-amber-600">
                  {activeLeague === "mlb" ? "30 Clubes" : "8 Clubes"}
                </span>
              </div>
              <div className="space-y-2">
                {Object.values(activeTeamsCatalog).map((team) => {
                  const isFav = favoriteTeamCode === team.code;
                  return (
                    <div
                      key={team.code}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-amber-50/60 hover:border-amber-300 transition"
                    >
                      <Link
                        href={`/teams?team=${team.slug}&liga=${activeLeague}`}
                        onClick={() => {
                          openTeamPage(team.code);
                          setMobileDrawerOpen(false);
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <img src={team.logoSvg} alt={team.name} className="w-8 h-8 object-contain shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-black text-slate-900 block truncate">{team.name}</span>
                          <span className="text-xs text-slate-500 block truncate">{team.venueCity}</span>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleFavoriteTeam(team.code)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          isFav
                            ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                            : "bg-white text-slate-400 border-slate-200 hover:text-amber-500"
                        }`}
                        title={isFav ? "Equipo favorito" : "Marcar como favorito"}
                      >
                        <Star className={`w-4 h-4 ${isFav ? "fill-slate-950" : ""}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom info */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              <p className="font-extrabold text-slate-800">EN JUEGO · LVBP & MLB</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Marcadores y jugada a jugada en vivo</p>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* SCORE STRIP / TICKER BAR (SINGLE COMPACT HORIZONTAL ROW ON MOBILE & DESKTOP - HIDDEN IN GAMEDAY) */}
      {section !== "juego" && (
        <section className="border-b border-slate-200 bg-slate-50/90">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2">
          {/* Date Selector Box with League Selector right above the Jornada */}
          <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl px-1.5 sm:px-2.5 py-1 shrink-0 shadow-2xs">
            {/* Compact League Switcher right above Jornada (Only switches Jornada on /inicio) */}
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 mb-0.5 w-full justify-center">
              <button
                type="button"
                onClick={() => {
                  if (section === "home") {
                    setJornadaLeague("lvbp");
                  } else {
                    switchLeague("lvbp");
                    router.push(
                      section === "equipos"
                        ? "/teams?team=leones&liga=lvbp"
                        : `/${section}?liga=lvbp`
                    );
                  }
                }}
                className={`flex-1 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition cursor-pointer flex items-center justify-center gap-1 ${
                  currentJornadaLeague === "lvbp"
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Ver Jornada LVBP"
              >
                <span>🇻🇪</span>
                <span>LVBP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (section === "home") {
                    setJornadaLeague("mlb");
                  } else {
                    switchLeague("mlb");
                    router.push(
                      section === "equipos"
                        ? "/teams?team=yankees&liga=mlb"
                        : `/${section}?liga=mlb`
                    );
                  }
                }}
                className={`flex-1 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition cursor-pointer flex items-center justify-center gap-1 ${
                  currentJornadaLeague === "mlb"
                    ? "bg-amber-400 text-slate-950 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Ver Jornada MLB"
              >
                <span>⚾</span>
                <span>MLB</span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                disabled={currentJornadaDateIdx <= 0}
                onClick={() => stepJornadaDate(-1)}
                className="p-0.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="text-center min-w-[54px] sm:min-w-[68px]">
                <strong className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                  {jornadaDayFormatted.dayNum}{" "}
                  <small className="text-[10px] sm:text-xs text-slate-500">
                    {jornadaDayFormatted.monthShort}
                  </small>
                </strong>
              </div>
              <button
                type="button"
                disabled={currentJornadaDateIdx >= jornadaDates.length - 1}
                onClick={() => stepJornadaDate(1)}
                className="p-0.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-700 cursor-pointer"
                aria-label="Día siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {jornadaDates.length > 0 &&
                jornadaDates[currentJornadaDateIdx] !== getTodayCaracasIso() &&
                jornadaDates.includes(getTodayCaracasIso()) && (
                  <button
                    type="button"
                    onClick={resetJornadaToToday}
                    className="hidden sm:inline-flex ml-0.5 items-center gap-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-1.5 py-0.5 text-[9px] font-black uppercase transition cursor-pointer"
                    title="Ir a los juegos de hoy"
                  >
                    Hoy
                  </button>
                )}
            </div>
          </div>

          {/* Horizontal Livebugs Strip with Official Logos & Direct /juego/[id] Links */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {jornadaGamesOfDay.length > 0 ? (
              jornadaGamesOfDay.map((game) => {
                const isPlayed = game.status === "IN_PROGRESS" || game.status === "FINISHED";
                const isLive = game.status === "IN_PROGRESS";
                const tvList = getGameTvChannels(game);
                return (
                  <Link
                    key={game.id}
                    href={`/juego/${game.id}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-1.5 border text-left shrink-0 transition cursor-pointer shadow-2xs ${
                      selectedGameId === game.id && (section as string) === "juego"
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
                      <span className="text-[9px] font-bold text-slate-500 truncate max-w-[72px] inline-flex items-center gap-0.5">
                        <Tv className="w-2.5 h-2.5 text-amber-600 shrink-0" /> {tvList[0]}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 py-2">
                Cargando cartelera de juegos…
              </span>
            )}
          </div>
        </div>
      </section>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-28 md:pb-10">
        {/* TOP LEADERBOARD SPONSOR BANNER (PRO STYLE) */}
        <div className="mb-4 sm:mb-5">
          <AdBanner slot="top-leaderboard" />
        </div>
        {/* SECTION: GAMEDAY (/juego/[id]) */}
        {section === "juego" && (
          <GamedayView
            gameId={selectedGameId}
            onBack={() => router.push(`/resultados?liga=${activeLeague}`)}
            onSelectTeam={openTeamPage}
            currentUser={currentUser}
            onRequireAuth={() => {
              setAuthModalTab("quick");
              setAuthModalOpen(true);
            }}
            onShareGame={(g) => setShareModalGame(g)}
          />
        )}

        {/* SECTION: HOME (/ & /inicio) */}
        {section === "home" && (
          <div className="space-y-8">
            {/* Favorite Team Selector Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                <span className="font-extrabold text-slate-800">
                  {favoriteTeamCode && anyTeamsCatalog[favoriteTeamCode]
                    ? `Tu equipo favorito: ${anyTeamsCatalog[favoriteTeamCode].name} (fijado de 1° en pizarra)`
                    : "Elige tu equipo favorito para fijar sus juegos de primero:"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar max-w-full">
                {Object.values(activeTeamsCatalog).map((t) => {
                  const active = favoriteTeamCode === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => toggleFavoriteTeam(t.code)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold border transition cursor-pointer shrink-0 ${
                        active
                          ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-400"
                      }`}
                    >
                      <img src={t.logoSvg} alt="" className="w-4 h-4 object-contain" />
                      <span>{t.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1. Pizarra de Juegos de la Jornada con Selector Limpio Arriba de la Jornada (Solo cambia la Jornada) */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 block">
                    {jornadaLeague === "mlb"
                      ? "⚾ Pizarra de Juegos · Grandes Ligas (MLB) 2026"
                      : "🇻🇪 Pizarra de Juegos · Temporada LVBP 2026-2027"}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 capitalize">
                    {jornadaDayFormatted.fullLabel}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {jornadaLeague === "mlb" && (
                    <button
                      type="button"
                      onClick={() => setShowHomeMlbBracket((v) => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs ${
                        showHomeMlbBracket
                          ? "bg-amber-400 text-slate-950 border-amber-400"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      <span>{showHomeMlbBracket ? "Ocultar Postemporada" : "Cuadro Postemporada ›"}</span>
                    </button>
                  )}
                  <Link
                    href={`/posiciones?liga=${jornadaLeague}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Trophy className="w-3.5 h-3.5 text-slate-950" />
                    <span>Tabla de Posiciones ›</span>
                  </Link>
                  <Link
                    href={`/calendario?liga=${jornadaLeague}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 text-xs font-extrabold transition cursor-pointer shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />{" "}
                    {jornadaLeague === "mlb" ? "Calendario MLB ›" : "Calendario y TV ›"}
                  </Link>
                </div>
              </div>

              {loading && jornadaGamesOfDay.length === 0 ? (
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
                  {jornadaGamesOfDay.map((game) => renderScoreboardCard(game))}
                </div>
              )}

              {jornadaLeague === "mlb" && showHomeMlbBracket && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <span>Cuadro de Postemporada MLB 2026</span>
                    </h2>
                  </div>
                  <MlbPlayoffBracket season={2026} />
                </div>
              )}
            </section>

            {/* 2. LÍDERES Y POSICIONES */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Líderes y <em className="text-amber-600 not-italic">posiciones</em>
                </h2>
                <div className="flex items-center gap-4">
                  <Link
                    href={`/lideres?liga=${activeLeague}`}
                    className="text-xs font-extrabold text-slate-600 hover:text-amber-600 cursor-pointer"
                  >
                    Ver todos los líderes ›
                  </Link>
                  <Link
                    href={`/posiciones?liga=${activeLeague}`}
                    className="text-xs font-extrabold text-amber-600 hover:underline cursor-pointer"
                  >
                    Tabla completa ›
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-8">
                  <LeadersWidget hitting={leaders.hitting} pitching={leaders.pitching} />
                </div>

                {/* Mini Standings Table with Round Robin Zones */}
                <article className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <header className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h3 className="text-sm font-black text-slate-950">
                        Tabla de posiciones {activeLeague === "mlb" ? "(MLB)" : "(LVBP)"}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShareStandingsOpen(true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-700 transition cursor-pointer shadow-2xs hover:border-amber-400"
                          title="Compartir arte oficial de la tabla de posiciones"
                        >
                          <Share2 className="w-3 h-3 text-amber-600" />
                          <span>Compartir</span>
                        </button>
                        <Link
                          href={`/posiciones?liga=${activeLeague}`}
                          className="text-[11px] font-bold text-amber-600 hover:underline"
                        >
                          Ver completa ›
                        </Link>
                      </div>
                    </header>

                    <table className="w-full text-xs mt-2 border-collapse">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200 text-right">
                          <th className="py-2 text-left w-6">#</th>
                          <th className="py-2 text-left">Equipo</th>
                          <th className="py-2 px-1.5">JG</th>
                          <th className="py-2 px-1.5">JP</th>
                          <th className="py-2 px-1.5">PCT</th>
                          <th className="py-2 pl-1.5">DIF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {standings.slice(0, 8).map((row, idx) => {
                          const isFav = favoriteTeamCode === row.team.code;
                          const zoneDot =
                            activeLeague === "mlb"
                              ? "bg-sky-500"
                              : idx < 4
                                ? "bg-emerald-500"
                                : idx < 6
                                  ? "bg-amber-400"
                                  : "bg-slate-300";
                          return (
                            <tr
                              key={row.team.code}
                              onClick={() => openTeamPage(row.team.code)}
                              className={`hover:bg-slate-50 cursor-pointer transition text-right tabular-nums ${
                                isFav ? "bg-amber-50/70" : ""
                              }`}
                            >
                              <td className="py-2 text-left font-bold text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <i className={`w-1.5 h-1.5 rounded-full ${zoneDot}`} />
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 text-left font-bold text-slate-900 flex items-center gap-2">
                                <img
                                  src={row.team.logoUrl}
                                  alt=""
                                  className="w-6 h-6 object-contain"
                                />
                                <span>{row.team.nick}</span>
                                {isFav && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                              </td>
                              <td className="py-2 px-1.5 font-bold text-slate-900">{row.wins}</td>
                              <td className="py-2 px-1.5 text-slate-600">{row.losses}</td>
                              <td className="py-2 px-1.5 text-amber-600 font-bold">{row.pct}</td>
                              <td className="py-2 pl-1.5 text-slate-500">{row.gamesBehind}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
                    {activeLeague === "mlb" ? (
                      <Link
                        href="/posiciones?liga=mlb"
                        className="text-amber-600 hover:underline font-extrabold"
                      >
                        Ver las 6 divisiones oficiales AL / NL ›
                      </Link>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          <i className="w-2 h-2 rounded-full bg-emerald-500" /> 1°-4° Round Robin
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="w-2 h-2 rounded-full bg-amber-400" /> 5°-6° Comodín
                        </span>
                      </>
                    )}
                  </div>
                </article>
              </div>
            </section>

            {/* 3. CRÓNICAS Y RESÚMENES DE LA JORNADA */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Resúmenes de la <em className="text-amber-600 not-italic">jornada</em>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {realRecaps.map((item) => (
                  <Link
                    key={item.id}
                    href={`/juego/${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between hover:border-amber-400 transition cursor-pointer shadow-xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-block rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-[10px] font-black uppercase">
                          {item.category}
                        </span>
                        <img src={item.winnerLogo} alt="" className="w-7 h-7 object-contain" />
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
                  </Link>
                ))}
              </div>
            </section>

            {/* IN-FEED SPONSOR BANNER (PRO STYLE) */}
            <AdBanner slot="in-feed" />

            {/* 4. MUNDO JUGADAS / LA GRADA DE LA FANATICADA */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Form / Identity */}
                <div className="lg:col-span-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                        Comunidad Béisbol
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-950 flex items-center gap-2">
                        <span>Mundo</span> <em className="text-amber-600 not-italic">Jugadas</em>
                        <MessageSquare className="w-5 h-5 text-amber-500" />
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Comenta la jornada en tiempo real con fanáticos de la LVBP y la MLB.
                  </p>
                  {/* User Identity Banner or Inputs */}
                  {currentUser ? (
                    <form onSubmit={handleCreatePost} className="space-y-3 pt-1">
                      <div
                        className="flex items-center justify-between p-3 rounded-2xl border shadow-xs"
                        style={{
                          backgroundColor: "#0f172a",
                          borderColor: "#1e293b",
                          color: "#ffffff",
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-inner"
                            style={{
                              backgroundColor:
                                anyTeamsCatalog[currentUser.favoriteTeam]?.color || "#d97706",
                            }}
                          >
                            {currentUser.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black truncate" style={{ color: "#ffffff" }}>
                              {currentUser.name}
                            </div>
                            <div
                              className="text-[10px] font-bold truncate flex items-center gap-1"
                              style={{ color: "#fbbf24" }}
                            >
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              Fan de {anyTeamsCatalog[currentUser.favoriteTeam]?.nick || "LVBP"}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthModalTab("profile");
                            setAuthModalOpen(true);
                          }}
                          className="text-[11px] font-bold hover:underline shrink-0 cursor-pointer ml-2"
                          style={{ color: "#fbbf24" }}
                        >
                          Cambiar
                        </button>
                      </div>

                      <div>
                        <textarea
                          rows={3}
                          value={newPostText}
                          onChange={(e) => setNewPostText(e.target.value)}
                          placeholder="Escribe tu comentario sobre los juegos de hoy, pronósticos o jugadas..."
                          maxLength={220}
                          className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white resize-none"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {220 - newPostText.length} caracteres
                          </span>
                          <button
                            type="submit"
                            disabled={!newPostText.trim()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs py-2 px-4 transition cursor-pointer shadow-2xs hover:scale-102 active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publicar comentario</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/50 p-5 text-center space-y-3 pt-4">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-950">
                          Comenta con tu cuenta de fanático
                        </h3>
                        <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1 leading-relaxed">
                          Para publicar en La Grada en vivo y compartir tus opiniones sobre los juegos necesitas una cuenta activa.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthModalTab("quick");
                            setAuthModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Crear Cuenta Fan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthModalTab("login");
                            setAuthModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition cursor-pointer active:scale-95"
                        >
                          <span>Iniciar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Feed of Comments */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" /> La Grada en Vivo
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {communityPosts.length} comentarios
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {communityPosts.length > 0 ? (
                      communityPosts.map((post) => {
                        const club = anyTeamsCatalog[post.team] || LVBP_TEAMS.CAR;
                        return (
                          <article
                            key={post.id}
                            className="rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white p-3.5 sm:p-4 space-y-2.5 transition shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={club.logoSvg}
                                  alt={club.nick}
                                  className="w-8 h-8 object-contain shrink-0"
                                />
                                <div>
                                  <strong className="text-xs font-bold text-slate-950 block">
                                    {post.author}
                                  </strong>
                                  <span className="text-[10px] text-slate-500">
                                    @{post.username} · {post.time}
                                  </span>
                                </div>
                              </div>
                              <span
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg border text-white shadow-2xs"
                                style={{ backgroundColor: club.color, borderColor: club.color }}
                              >
                                {club.nick}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
                              {post.text}
                            </p>
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
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
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border transition cursor-pointer ${
                                    post.myReaction === rKey
                                      ? "bg-amber-50 border-amber-400 text-amber-800 shadow-2xs"
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
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 mx-auto flex items-center justify-center shadow-2xs">
                          <Users className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Aún no hay comentarios publicados en esta jornada
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Sé el primero en compartir tu pronóstico o jugada del día con los fanáticos.
                        </p>
                      </div>
                    )}
                  </div>
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
                  {activeLeague === "mlb"
                    ? "⚾ Grandes Ligas (MLB 2026) · Pizarras C · H · E"
                    : "🇻🇪 Béisbol Venezolano (LVBP 2026-27) · Pizarras C · H · E"}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Resultados de la {activeLeague === "mlb" ? "MLB (2026)" : "LVBP"}
                </h1>
              </div>

              {/* Date pills synced with URL */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar max-w-full">
                {dates
                  .slice(
                    Math.max(0, selectedDateIndex - 5),
                    Math.max(12, selectedDateIndex + 7)
                  )
                  .map((d) => {
                    const realIdx = dates.indexOf(d);
                    const f = formatCompactDay(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setUserSelectedDateManually(true);
                          setSelectedDateIndex(realIdx);
                          router.replace(`/resultados?liga=${activeLeague}&fecha=${d}`, {
                            scroll: false,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 ${
                          realIdx === selectedDateIndex
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

            {loading && gamesOfDay.length === 0 ? (
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

            {activeLeague === "mlb" && (
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 block">
                      ⚾ Postemporada MLB 2026 · Rumbo a la Serie Mundial
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-950">
                      Cuadro de Postemporada (MLB)
                    </h2>
                  </div>
                </div>
                <MlbPlayoffBracket season={2026} />
              </div>
            )}
          </div>
        )}

        {/* SECTION: CALENDARIO (/calendario) */}
        {section === "calendario" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  {activeLeague === "mlb"
                    ? "⚾ Grandes Ligas (MLB) · Señales de TV y Estadios"
                    : "🇻🇪 Temporada 2026-2027 (LVBP) · Señales de TV y Estadios"}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Calendario de Juegos ({activeLeague.toUpperCase()})
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
                    onClick={() => {
                      setUserPickedCalendarDate(false);
                      setCalendarStateFilter(stKey);
                    }}
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

            {/* Interactive Team Selector Strip with Official Logos + URL Query Update */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Filtrar calendario por equipo:
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setUserPickedCalendarDate(false);
                    setTeamFilter("");
                    router.replace(`/calendario?liga=${activeLeague}`, { scroll: false });
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold border transition shrink-0 cursor-pointer ${
                    teamFilter === ""
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white"
                  }`}
                >
                  <img src={LVBP_OFFICIAL_LOGO} alt="" className="w-5 h-5 object-contain" />
                  <span>Todos los equipos ({Object.keys(activeTeamsCatalog).length})</span>
                </button>

                {Object.values(activeTeamsCatalog).map((t) => {
                  const active = teamFilter === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => {
                        setUserPickedCalendarDate(false);
                        const next = active ? "" : t.code;
                        setTeamFilter(next);
                        router.replace(
                          next
                            ? `/calendario?liga=${activeLeague}&equipo=${t.slug}`
                            : `/calendario?liga=${activeLeague}`,
                          { scroll: false }
                        );
                      }}
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

            {calendarAvailableDates.length > 0 && (
              <div className="sticky top-[4.25rem] z-20">
                <CalendarMonthPicker
                  monthKey={calendarMonthKey}
                  monthKeys={calendarMonthKeys}
                  selectedDate={calendarPickDate}
                  gameDates={calendarAvailableDates}
                  gamesPerDay={calendarGamesPerDay}
                  todayIso={getTodayCaracasIso()}
                  gamesOnSelectedDay={calendarDayGames.length}
                  onSelectDate={selectCalendarDate}
                  onShiftMonth={shiftCalendarMonth}
                />
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => shiftCalendarDay(-1)}
                    disabled={calendarPickIndex <= 0}
                    className="text-xs font-bold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-amber-400 disabled:opacity-40 cursor-pointer"
                  >
                    ← Día anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftCalendarDay(1)}
                    disabled={calendarPickIndex >= calendarAvailableDates.length - 1}
                    className="text-xs font-bold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-amber-400 disabled:opacity-40 cursor-pointer"
                  >
                    Día siguiente →
                  </button>
                </div>
              </div>
            )}

            {calendarAvailableDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No hay juegos con los filtros actuales. Prueba otro equipo o estado (próximos /
                finalizados).
              </div>
            ) : null}

            {/* CASE A: SINGLE TEAM SELECTED — CLEAR TEAM-CENTRIC SCHEDULE */}
            {teamFilter && anyTeamsCatalog[teamFilter] ? (
              <div className="space-y-4">
                {(() => {
                  const club = anyTeamsCatalog[teamFilter];
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
                            Calendario Individual · /calendario?liga={activeLeague}&equipo={club.slug}
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
                          En Casa: {homeCount} juegos
                        </span>
                        <span className="rounded-xl bg-sky-50 border border-sky-200 text-sky-800 px-3 py-1.5 font-extrabold">
                          Visitante: {awayCount} juegos
                        </span>
                        <Link
                          href={`/teams?liga=${activeLeague}&team=${club.slug}`}
                          className="rounded-xl bg-amber-400 text-slate-950 px-3 py-1.5 font-extrabold hover:bg-amber-300 transition"
                        >
                          Ver Roster de {club.nick} ›
                        </Link>
                      </div>
                    </div>
                  );
                })()}

                {/* Team-Centric Game Rows */}
                <div className="space-y-2.5">
                  {calendarDayGames.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                      Sin juegos de {anyTeamsCatalog[teamFilter].nick} en esta fecha.
                    </div>
                  ) : null}
                  {calendarDayGames.map((game) => {
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
                      <Link
                        key={game.id}
                        href={`/juego/${game.id}`}
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
                            {isHome ? "EN CASA vs" : "VISITANTE @"}
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
                              <span className="text-[11px] text-slate-500 inline-flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {game.venue}
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
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${tvChannelBadgeStyle(
                                  ch
                                )}`}
                              >
                                <Tv className="w-2.5 h-2.5 text-amber-600 shrink-0" /> {ch}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            Gameday ›
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : calendarAvailableDates.length > 0 ? (
              /* CASE B: ALL TEAMS — ONE DAY AT A TIME */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-950 capitalize flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    {calendarPickDate
                      ? formatCompactDay(calendarPickDate).fullLabel
                      : "Jornada"}
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {calendarDayGames.length}{" "}
                    {calendarDayGames.length === 1 ? "juego" : "juegos"}
                  </span>
                </div>

                {calendarDayGames.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                    No hay partidos programados para este día.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {calendarDayGames.map((game) => {
                          const isFinished = game.status === "FINISHED";
                          const tvList = getGameTvChannels(game);
                          return (
                            <Link
                              key={game.id}
                              href={`/juego/${game.id}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-amber-400 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3"
                            >
                              <div className="flex items-center justify-between gap-2">
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

                                <BroadcastChannelsRow
                                  channels={tvList}
                                  gameTitle={`${game.awayTeam.nick} vs ${game.homeTeam.nick}`}
                                  youtubeVideoId={game.youtubeVideoId}
                                />
                              </div>
                            </Link>
                          );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION: POSICIONES (/posiciones) — COMPLETELY SEPARATED LVBP (8 TEAMS) vs MLB (6 OFFICIAL DIVISIONS) */}
        {section === "posiciones" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  {activeLeague === "mlb"
                    ? "⚾ Grandes Ligas (MLB) · 6 Divisiones Oficiales (AL y NL)"
                    : "🇻🇪 Tabla de Clasificación LVBP · Rumbo al Round Robin"}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Tabla de Posiciones ({activeLeague === "mlb" ? "MLB" : "LVBP"})
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareStandingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-3.5 py-2 text-xs font-black transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  title="Compartir o descargar arte oficial de la tabla de posiciones"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Compartir Tabla / Banner</span>
                </button>

                {activeLeague === "mlb" ? (
                  <div className="inline-flex flex-wrap rounded-xl bg-white p-1 border border-slate-200 shadow-2xs gap-0.5">
                  {(
                    [
                      ["PLAYOFFS", "🏆 Postemporada"],
                      ["ALL", "6 Divisiones (30)"],
                      ["AL", "Liga Americana (AL)"],
                      ["NL", "Liga Nacional (NL)"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMlbStandingsFilter(key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                        mlbStandingsFilter === key
                          ? "bg-amber-400 text-slate-950"
                          : "text-slate-600 hover:text-slate-950"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          </div>

            {loading && standings.length === 0 ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : activeLeague === "mlb" ? (
              /* MLB: POSTSEASON BRACKET + 6 SEPARATED DIVISIONAL TABLES */
              <div className="space-y-6">
                {(mlbStandingsFilter === "PLAYOFFS" || mlbStandingsFilter === "ALL") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600 block">
                          ⚾ Postemporada MLB 2026 · Comodines, Serie Divisional, Campeonato y Serie Mundial
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-slate-950">
                          Cuadro de Postemporada (MLB 2026)
                        </h2>
                      </div>
                    </div>
                    <MlbPlayoffBracket season={2026} />
                  </div>
                )}

                {mlbStandingsFilter !== "PLAYOFFS" && (
                  <div className="grid grid-cols-1 gap-6">
                    {(
                      [
                        {
                          divCode: "AL East",
                          league: "AL",
                          title: "Liga Americana · División Este",
                          badge: "AL ESTE",
                          accent: "bg-sky-50 border-sky-200 text-sky-800",
                        },
                        {
                          divCode: "AL Central",
                          league: "AL",
                          title: "Liga Americana · División Central",
                          badge: "AL CENTRAL",
                          accent: "bg-sky-50 border-sky-200 text-sky-800",
                        },
                        {
                          divCode: "AL West",
                          league: "AL",
                          title: "Liga Americana · División Oeste",
                          badge: "AL OESTE",
                          accent: "bg-sky-50 border-sky-200 text-sky-800",
                        },
                        {
                          divCode: "NL East",
                          league: "NL",
                          title: "Liga Nacional · División Este",
                          badge: "NL ESTE",
                          accent: "bg-indigo-50 border-indigo-200 text-indigo-800",
                        },
                        {
                          divCode: "NL Central",
                          league: "NL",
                          title: "Liga Nacional · División Central",
                          badge: "NL CENTRAL",
                          accent: "bg-indigo-50 border-indigo-200 text-indigo-800",
                        },
                        {
                          divCode: "NL West",
                          league: "NL",
                          title: "Liga Nacional · División Oeste",
                          badge: "NL OESTE",
                          accent: "bg-indigo-50 border-indigo-200 text-indigo-800",
                        },
                      ] as const
                    )
                      .filter((div) =>
                        mlbStandingsFilter === "ALL" ? true : div.league === mlbStandingsFilter
                      )
                      .map((div) => {
                        const divRows = standings
                          .filter((r) => (r.division || MLB_TEAMS[r.team.code]?.division) === div.divCode)
                          .sort((a, b) => Number(b.pct) - Number(a.pct) || b.wins - a.wins);

                      return (
                        <div
                          key={div.divCode}
                          className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs no-scrollbar"
                        >
                          <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-black text-amber-400">⚾</span>
                              <h2 className="text-sm sm:text-base font-black tracking-tight">
                                {div.title}
                              </h2>
                            </div>
                            <span
                              className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${div.accent}`}
                            >
                              {div.badge}
                            </span>
                          </div>

                          <table className="w-full min-w-[700px] text-xs text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold">
                                <th className="py-2.5 px-4 text-left w-24">POS</th>
                                <th className="py-2.5 px-4 text-left">Equipo</th>
                                <th className="py-2.5 px-3">JJ</th>
                                <th className="py-2.5 px-3">JG</th>
                                <th className="py-2.5 px-3">JP</th>
                                <th className="py-2.5 px-3 text-amber-600">PCT</th>
                                <th className="py-2.5 px-3">DIF</th>
                                <th className="py-2.5 px-3">CASA</th>
                                <th className="py-2.5 px-3">VIS</th>
                                <th className="py-2.5 px-3">CA</th>
                                <th className="py-2.5 px-3">CP</th>
                                <th className="py-2.5 px-3">DIF.C</th>
                                <th className="py-2.5 px-4">RACHA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 tabular-nums">
                              {divRows.map((row, idx) => {
                                const isFav = favoriteTeamCode === row.team.code;
                                const isDivLeader = idx === 0;
                                return (
                                  <tr
                                    key={row.team.code}
                                    onClick={() => openTeamPage(row.team.code)}
                                    className={`hover:bg-slate-50 transition cursor-pointer ${
                                      isFav ? "bg-amber-50/60" : ""
                                    }`}
                                  >
                                    <td className="py-3 px-4 text-left font-bold text-slate-600 whitespace-nowrap">
                                      <span className="inline-flex items-center gap-2">
                                        <b className="w-4 text-slate-900">{idx + 1}°</b>
                                        {isDivLeader && (
                                          <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 text-[9px] font-extrabold">
                                            Líder
                                          </span>
                                        )}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-left font-black text-slate-950 flex items-center gap-3">
                                      <img
                                        src={row.team.logoUrl}
                                        alt=""
                                        className="w-7 h-7 object-contain"
                                      />
                                      <span>{row.team.name}</span>
                                      {isFav && (
                                        <span title="Tu Equipo Favorito">
                                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600">{row.gamesPlayed}</td>
                                    <td className="py-3 px-3 font-extrabold text-slate-950">
                                      {row.wins}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600">{row.losses}</td>
                                    <td className="py-3 px-3 font-black text-amber-600">
                                      {row.pct}
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-700">
                                      {row.gamesBehind}
                                    </td>
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
                                    <td className="py-3 px-4 font-bold text-slate-900">
                                      {row.streak}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : standingsPhase !== "REGULAR" ? (
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
              /* LVBP: CLASSIC 8-TEAM TABLE WITH ROUND ROBIN & COMODÍN ZONES */
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs no-scrollbar">
                  <table className="w-full min-w-[720px] text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold">
                        <th className="py-3 px-4 text-left">POS / ZONA</th>
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
                      {standings
                        .filter((r) => Boolean(LVBP_TEAMS[r.team.code]))
                        .map((row, idx) => {
                          const isFav = favoriteTeamCode === row.team.code;
                          const zoneBadge =
                            idx < 4 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold">
                                Round Robin
                              </span>
                            ) : idx < 6 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-[10px] font-extrabold">
                                Comodín
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                                Fuera
                              </span>
                            );

                          return (
                            <tr
                              key={row.team.code}
                              onClick={() => openTeamPage(row.team.code)}
                              className={`hover:bg-slate-50 transition cursor-pointer ${
                                isFav ? "bg-amber-50/60" : ""
                              }`}
                            >
                              <td className="py-3 px-4 text-left font-bold text-slate-600 whitespace-nowrap">
                                <span className="inline-flex items-center gap-2">
                                  <b className="w-4 text-slate-900">{idx + 1}°</b>
                                  {zoneBadge}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-left font-black text-slate-950 flex items-center gap-3">
                                <img
                                  src={row.team.logoUrl}
                                  alt=""
                                  className="w-8 h-8 object-contain"
                                />
                                <span>{row.team.name}</span>
                                {isFav && (
                                  <span title="Tu Equipo Favorito">
                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                  </span>
                                )}
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
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Qualification Legend */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-2 font-bold text-emerald-800">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      1° al 4° lugar: Clasificación directa al Round Robin (Enero)
                    </span>
                    <span className="inline-flex items-center gap-2 font-bold text-amber-800">
                      <span className="w-3 h-3 rounded bg-amber-400" />
                      5° y 6° lugar: Serie del Comodín (Play-In por el 5° cupo)
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                      <span className="w-3 h-3 rounded bg-slate-300" />
                      7° y 8° lugar: Eliminados
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION: LÍDERES (/lideres) — NUEVA PÁGINA DEDICADA */}
        {section === "lideres" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                  Estadísticas de la {activeLeague === "mlb" ? "MLB" : "LVBP"}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Líderes Individuales de Bateo y Pitcheo ({activeLeague.toUpperCase()})
                </h1>
              </div>
              <Link
                href={`/posiciones?liga=${activeLeague}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:border-amber-400 transition shadow-2xs"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600" /> Ver Tabla de Posiciones ›
              </Link>
            </div>

            <LeadersWidget hitting={leaders.hitting} pitching={leaders.pitching} />
          </div>
        )}

        {/* SECTION: EQUIPOS Y ROSTER (/equipos & /equipos/[slug]) */}
        {section === "equipos" && (
          <TeamRosterView
            league={activeLeague}
            selectedTeamCode={selectedTeamCode}
            onSelectTeam={(code) => openTeamPage(code)}
            schedule={schedule}
            onOpenGame={(id) => openGameGameday(id)}
            favoriteTeamCode={favoriteTeamCode}
            onToggleFavoriteTeam={toggleFavoriteTeam}
          />
        )}

        {/* BOTTOM AD SLOT (Inicio · Abajo — like jugadaenvivo.com home_bottom) */}
        <div className="pt-2">
          <AdBanner slot="home-bottom" />
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]"
        style={{ paddingBottom: "max(0.45rem, env(safe-area-inset-bottom, 0.45rem))" }}
        aria-label="Navegación Móvil"
      >
        {/* 5 Main Mobile Navigation Tabs */}
        <div className="px-1.5 pt-1.5 flex items-center justify-around">
          {(
            [
              ["home", "/inicio", "Inicio", Home],
              ["resultados", `/resultados?liga=${activeLeague}`, "Pizarra", Activity],
              ["calendario", `/calendario?liga=${activeLeague}`, "Calendario", Calendar],
              ["posiciones", `/posiciones?liga=${activeLeague}`, "Posiciones", Trophy],
              [
                "equipos",
                `/teams?liga=${activeLeague}&team=${
                  activeTeamsCatalog[selectedTeamCode]?.slug ||
                  (activeLeague === "mlb" ? "yankees" : "leones")
                }`,
                "Equipos",
                Users,
              ],
            ] as const
          ).map(([key, href, label, Icon]) => {
            const active = section === key || (section === "juego" && key === "resultados");
            return (
              <Link
                key={key}
                href={href}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-xl text-[10px] font-black transition cursor-pointer ${
                  active
                    ? "text-amber-700 bg-amber-50 border border-amber-200/80 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 ${
                    active ? "text-amber-600 stroke-[2.5]" : "text-slate-400"
                  }`}
                />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-6 sm:mt-8 mb-0">
        <div className="max-w-7xl mx-auto px-4 space-y-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5 shadow-2xs shrink-0">
                <img src={LVBP_OFFICIAL_LOGO} alt="En Juego" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-slate-900">EN JUEGO</span>
              <span>— Marcadores en vivo, jugada a jugada, transmisiones de TV y estadísticas.</span>
            </div>
            <div className="flex flex-wrap gap-4 font-semibold">
              <Link href="/inicio" className="hover:text-slate-900">
                Inicio
              </Link>
              <Link href="/resultados" className="hover:text-slate-900">
                Resultados
              </Link>
              <Link href="/calendario" className="hover:text-slate-900">
                Calendario
              </Link>
              <Link href="/posiciones" className="hover:text-slate-900">
                Posiciones
              </Link>
              <Link href="/lideres" className="hover:text-slate-900">
                Líderes
              </Link>
              <Link href="/teams?team=leones" className="hover:text-slate-900">
                Equipos y Roster
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-600 font-bold">Aviso Legal y Descargo de Responsabilidad: </strong>
            EnJuego es un portal deportivo independiente desarrollado con fines informativos y periodísticos para los aficionados del béisbol venezolano. No está afiliado, respaldado, autorizado ni patrocinado de manera alguna por la Liga Venezolana de Béisbol Profesional (LVBP), Major League Baseball (MLB) ni por ninguno de sus equipos u organizaciones asociadas. Todos los nombres de equipos, logotipos, emblemas y marcas comerciales exhibidas pertenecen exclusivamente a sus respectivos titulares y se utilizan únicamente para la identificación informativa de los clubes y juegos bajo el principio de uso legítimo (fair use).
          </div>
        </div>
      </footer>

      {/* Auth & Fan Profile Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserUpdate={handleUserUpdate}
        initialTab={authModalTab}
        onLoginSuccess={() => {
          if (typeof window !== "undefined") {
            const isStandalone =
              (window.navigator as any).standalone === true ||
              window.matchMedia("(display-mode: standalone)").matches;
            if (!isStandalone) {
              setTimeout(() => {
                setPwaModalOpen(true);
              }, 400);
            }
          }
        }}
      />

      {/* PWA Floating Install Modal */}
      <PwaInstallModal
        isOpen={pwaModalOpen}
        onClose={() => {
          try {
            localStorage.setItem("enjuego_pwa_install_prompt_seen", "true");
          } catch {}
          setPwaModalOpen(false);
        }}
      />

      {/* PWA Onboarding Modal (Automatic on App Launch) */}
      <PwaOnboardingModal
        isOpen={pwaOnboardingOpen}
        onClose={() => setPwaOnboardingOpen(false)}
        onComplete={handlePwaOnboardingComplete}
      />

      {/* Share Game Official Banner Modal (Previa, En Vivo, Resultado Final) */}
      <ShareGameBannerModal
        game={shareModalGame}
        onClose={() => setShareModalGame(null)}
      />

      {/* Share Standings Official Banner Modal (Post 4:5, Story 9:16) */}
      <ShareStandingsModal
        isOpen={shareStandingsOpen}
        onClose={() => setShareStandingsOpen(false)}
        standings={standings}
        league={activeLeague}
      />
    </div>
  );
}
