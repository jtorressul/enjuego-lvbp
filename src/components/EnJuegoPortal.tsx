"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LeaderCategory, ScheduleGame, StandingRow } from "@/lib/types";
import type { PortalSeed } from "@/lib/portal-seed";
import { LVBP_OFFICIAL_LOGO, LVBP_TEAMS, resolveLvbpTeam } from "@/lib/lvbp-teams";
import { MLB_TEAMS, resolveMlbTeam, resolveAnyBaseballTeam } from "@/lib/mlb-teams";
import { LIDOM_TEAMS, LMP_TEAMS } from "@/lib/winter-teams";
import { LeagueId, LEAGUES, LEAGUES_LIST, LEAGUE_MENU_ITEMS, parseLeague } from "@/lib/leagues";
import { GamedayView } from "@/components/gameday/GamedayView";
import { LeadersWidget } from "@/components/LeadersWidget";
import { TeamRosterView } from "@/components/TeamRosterView";
import { BroadcastChannelsRow } from "@/components/BroadcastChannelsRow";
import { AuthModal } from "@/components/AuthModal";
import { PwaInstallModal } from "@/components/pwa/PwaInstallModal";
import { PwaOnboardingModal } from "@/components/pwa/PwaOnboardingModal";
import { AdBanner, AadsSkyscraperBanner } from "@/components/AdBanner";
import { HomeSoccerShowcase } from "@/components/HomeSoccerShowcase";
import MlbPlayoffBracket from "@/components/MlbPlayoffBracket";
import { ShareGameBannerModal } from "@/components/ShareGameBannerModal";
import { ShareStandingsModal } from "@/components/ShareStandingsModal";
import { CalendarMonthPicker } from "@/components/CalendarMonthPicker";
import { UserProfile } from "@/lib/user-auth";
import { getFallbackSchedule } from "@/lib/lvbp-fallback-data";
import { buildGameRecaps } from "@/lib/game-recaps";
import {
  Play,
  Video,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  | "noticias"
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

function getGameTvChannels(game?: ScheduleGame | null): string[] {
  if (!game) return ["IVC", "ByM Sport", "BeisbolPlay"];
  let list: string[] = [];
  if (Array.isArray(game.tvChannels) && game.tvChannels.length > 0) {
    list = [...game.tvChannels];
  } else if (game.tv) {
    list = game.tv
      .split(/[·,/]/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    list = ["IVC", "ByM Sport", "BeisbolPlay"];
  }

  const isCarVsLag =
    game.id === "870072" ||
    ((game.awayTeam?.code === "CAR" && game.homeTeam?.code === "LAG") ||
     (game.awayTeam?.code === "LAG" && game.homeTeam?.code === "CAR"));

  if (isCarVsLag && !list.some((c) => c && (c.toLowerCase().includes("tves") || c.toLowerCase().includes("teves")))) {
    return ["TVES", ...list];
  }

  return list;
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
  if (c.includes("ok.ru") || c.includes("ok ru")) return "bg-orange-50 text-orange-700 border-orange-300";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export function EnJuegoPortal({
  initialSection = "home",
  initialTeamSlug,
  initialGameId,
  initialSchedule = [],
  initialStandings = [],
  initialLeaders = { hitting: [], pitching: [] },
  initialDateIndex = 0,
}: {
  initialSection?: NavSection;
  initialTeamSlug?: string;
  initialGameId?: string;
  initialSchedule?: PortalSeed["schedule"];
  initialStandings?: PortalSeed["standings"];
  initialLeaders?: PortalSeed["leaders"];
  initialDateIndex?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive section from URL pathname, but keep in state for 0ms instant tab transitions
  const deriveSectionFromPath = (path: string | null | undefined): NavSection => {
    if (path?.startsWith("/juego")) return "juego";
    if (path?.startsWith("/resultados")) return "resultados";
    if (path?.startsWith("/calendario")) return "calendario";
    if (path?.startsWith("/posiciones")) return "posiciones";
    if (path?.startsWith("/lideres")) return "lideres";
    if (path?.startsWith("/equipos") || path?.startsWith("/teams")) return "equipos";
    if (path?.startsWith("/noticias")) return "noticias";
    if (path?.startsWith("/inicio") || path === "/") return "home";
    return initialSection;
  };

  const [section, setSection] = useState<NavSection>(() => deriveSectionFromPath(pathname));

  useEffect(() => {
    setSection(deriveSectionFromPath(pathname));
  }, [pathname]);

  useEffect(() => {
    const onPopState = () => {
      if (typeof window !== "undefined") {
        setSection(deriveSectionFromPath(window.location.pathname));
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleInstantSectionNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetKey: string,
    targetHref: string
  ) => {
    if (
      targetKey === "home" ||
      targetKey === "resultados" ||
      targetKey === "posiciones" ||
      targetKey === "calendario" ||
      targetKey === "lideres" ||
      targetKey === "equipos"
    ) {
      e.preventDefault();
      setMobileDrawerOpen(false);
      setSection(targetKey as NavSection);
      if (typeof window !== "undefined") {
        window.history.pushState(window.history.state, "", targetHref);
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      }
    }
  };

  const hasSeed =
    initialSchedule.length > 0 ||
    initialStandings.length > 0 ||
    initialLeaders.hitting.length > 0;
  const [schedule, setSchedule] = useState<ScheduleGame[]>(initialSchedule);
  const [mlbJornadaGames, setMlbJornadaGames] = useState<ScheduleGame[]>([]);
  const [jornadaLeague, setJornadaLeague] = useState<LeagueId>("lvbp");
  const [leagueMenuOpen, setLeagueMenuOpen] = useState(false);
  const leagueMenuRef = useRef<HTMLDivElement>(null);
  const [leagueGameCounts, setLeagueGameCounts] = useState<Record<LeagueId, number | null>>({
    lvbp: null,
    mlb: null,
    lidom: null,
    lmp: null,
  });
  const [mlbDateIndex, setMlbDateIndex] = useState(0);
  const manualMlbDateRef = useRef(false);
  const [standings, setStandings] = useState<StandingRow[]>(initialStandings);
  const [leaders, setLeaders] = useState<{ hitting: LeaderCategory[]; pitching: LeaderCategory[] }>(
    initialLeaders
  );
  const [loading, setLoading] = useState(!hasSeed);
  const [selectedDateIndex, setSelectedDateIndex] = useState(initialDateIndex);
  const manualDateRef = useRef(false);
  const [selectedGameId, setSelectedGameId] = useState<string>(
    initialGameId || searchParams?.get("id") || searchParams?.get("game") || "870098"
  );

  // Resolve initial team from URL slug (/equipos/magallanes) or query (?team=magallanes, ?equipo=magallanes, ?=magallanes, ?magallanes)
  const resolvedUrlTeam = useMemo(() => {
    const rawLeague = searchParams?.get("liga") || searchParams?.get("league");
    const prefLeague: LeagueId = parseLeague(rawLeague);

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

  const [activeLeague, setActiveLeague] = useState<LeagueId>(() => {
    const rawLeague = searchParams?.get("liga") || searchParams?.get("league");
    if (rawLeague) {
      return parseLeague(rawLeague);
    }
    if (resolvedUrlTeam) {
      if (LIDOM_TEAMS[resolvedUrlTeam.code]) return "lidom";
      if (LMP_TEAMS[resolvedUrlTeam.code]) return "lmp";
      if (MLB_TEAMS[resolvedUrlTeam.code]) return "mlb";
      return "lvbp";
    }
    return "lvbp";
  });
  const [mlbStandingsFilter, setMlbStandingsFilter] = useState<"PLAYOFFS" | "ALL" | "AL" | "NL">("ALL");
  const [showHomeMlbBracket, setShowHomeMlbBracket] = useState(false);
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
  const navMenuRef = useRef<HTMLElement>(null);

  const activeTeamsCatalog = useMemo(() => {
    switch (activeLeague) {
      case "lidom":
        return LIDOM_TEAMS;
      case "lmp":
        return LMP_TEAMS;
      case "mlb":
        return MLB_TEAMS;
      case "lvbp":
      default:
        return LVBP_TEAMS;
    }
  }, [activeLeague]);

  const currentLeague = useMemo(() => {
    return LEAGUES[activeLeague] || LEAGUES.lvbp;
  }, [activeLeague]);

  const anyTeamsCatalog = useMemo(
    () => ({ ...LVBP_TEAMS, ...LIDOM_TEAMS, ...LMP_TEAMS, ...MLB_TEAMS }),
    []
  );

  const [selectedTeamCode, setSelectedTeamCode] = useState<string>(() => {
    if (resolvedUrlTeam?.code) return resolvedUrlTeam.code;
    const rawLeague = searchParams?.get("liga") || searchParams?.get("league");
    const qLeague = parseLeague(rawLeague);
    return (LEAGUES[qLeague] || LEAGUES.lvbp).defaultTeamCode;
  });
  const [teamFilter, setTeamFilter] = useState<string>(
    section === "calendario" && resolvedUrlTeam ? resolvedUrlTeam.code : ""
  );
  const [calendarStateFilter, setCalendarStateFilter] = useState<"ALL" | "UPCOMING" | "FINISHED">(
    "ALL"
  );
  const [calendarPickDate, setCalendarPickDate] = useState(() => {
    const dates = [...new Set(initialSchedule.map((game) => game.date))].sort();
    if (!dates.length) return "";
    const today = getTodayCaracasIso();
    const live = initialSchedule.find((game) => game.status === "IN_PROGRESS");
    const target = live?.date || today;
    let index = dates.indexOf(target);
    if (index === -1) index = dates.findIndex((date) => date >= target);
    if (index === -1) index = dates.length - 1;
    return dates[index] || "";
  });
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
  const [headerLeagueMenuOpen, setHeaderLeagueMenuOpen] = useState(false);
  const headerLeagueRef = useRef<HTMLDivElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // User Profile & Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"quick" | "login" | "register" | "profile">("quick");
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [pwaOnboardingOpen, setPwaOnboardingOpen] = useState(false);

  const switchLeague = (nextLeague: LeagueId) => {
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
    manualDateRef.current = false;
    setSelectedTeamCode((prev) => {
      const targetCatalog =
        nextLeague === "lidom"
          ? LIDOM_TEAMS
          : nextLeague === "lmp"
          ? LMP_TEAMS
          : nextLeague === "mlb"
          ? MLB_TEAMS
          : LVBP_TEAMS;
      if (targetCatalog && targetCatalog[prev]) return prev;
      return (LEAGUES[nextLeague] || LEAGUES.lvbp).defaultTeamCode;
    });
  };

  // Sync activeLeague immediately whenever URL ?liga changes
  useEffect(() => {
    const rawLeague = searchParams?.get("liga") || searchParams?.get("league");
    if (pathname === "/inicio" || pathname === "/") {
      if (rawLeague) {
        const parsed = parseLeague(rawLeague);
        switchLeague(parsed);
        setJornadaLeague(parsed);
      } else {
        switchLeague("lvbp");
      }
    } else if (rawLeague) {
      switchLeague(parseLeague(rawLeague));
    } else if (resolvedUrlTeam) {
      if (LIDOM_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("lidom");
      } else if (LMP_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("lmp");
      } else if (MLB_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("mlb");
      } else if (LVBP_TEAMS[resolvedUrlTeam.code]) {
        switchLeague("lvbp");
      }
    }
    setMobileDrawerOpen(false);
    setHeaderLeagueMenuOpen(false);
  }, [pathname, searchParams, resolvedUrlTeam]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!target) return;
      const inLeagueMenu = leagueMenuRef.current?.contains(target);
      if (!inLeagueMenu) {
        setLeagueMenuOpen(false);
      }
      const inHeaderLeague = headerLeagueRef.current?.contains(target);
      if (!inHeaderLeague) {
        setHeaderLeagueMenuOpen(false);
      }
      const inMoreMenu = moreMenuRef.current?.contains(target);
      if (!inMoreMenu) {
        setMoreMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
        setLeagueMenuOpen(false);
        setHeaderLeagueMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fetch today game counts across all Caribbean & MLB leagues for the dropdown badge
  useEffect(() => {
    let isMounted = true;
    const todayIso = getTodayCaracasIso();

    async function fetchAllLeagueCounts() {
      try {
        const results = await Promise.allSettled([
          fetch("/api/lvbp/schedule?league=lvbp").then((r) => r.json()),
          fetch("/api/lvbp/schedule?league=mlb").then((r) => r.json()),
          fetch("/api/lvbp/schedule?league=lidom").then((r) => r.json()),
          fetch("/api/lvbp/schedule?league=lmp").then((r) => r.json()),
        ]);

        if (!isMounted) return;

        const getCount = (res: PromiseSettledResult<any>) => {
          if (res.status === "fulfilled" && Array.isArray(res.value?.games)) {
            return res.value.games.filter((g: any) => g.date === todayIso).length;
          }
          return 0;
        };

        setLeagueGameCounts({
          lvbp: getCount(results[0]),
          mlb: getCount(results[1]),
          lidom: getCount(results[2]),
          lmp: getCount(results[3]),
        });
      } catch {}
    }

    fetchAllLeagueCounts();
    return () => {
      isMounted = false;
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

  const handlePwaOnboardingComplete = (user: UserProfile, chosenLeague: LeagueId) => {
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

        // Strictly filter games and standings by targetLeague so leagues never mix
        const leagueTeamsMap =
          targetLeague === "mlb"
            ? MLB_TEAMS
            : targetLeague === "lidom"
            ? LIDOM_TEAMS
            : targetLeague === "lmp"
            ? LMP_TEAMS
            : LVBP_TEAMS;

        const rawGames: ScheduleGame[] = schData.games || [];
        const loadedGames = rawGames.filter((g) =>
          Boolean(leagueTeamsMap[g.homeTeam?.code] || leagueTeamsMap[g.awayTeam?.code])
        );

        const rawStandings: StandingRow[] = stdData.standings || [];
        const cleanStandings = rawStandings.filter((r) =>
          Boolean(leagueTeamsMap[r.team?.code])
        );

        setSchedule(loadedGames);
        setStandings(cleanStandings);
        setLeaders(stdData.leaders || { hitting: [], pitching: [] });

        if (targetLeague === "mlb") {
          setMlbJornadaGames(loadedGames);
        } else if (Array.isArray(mlbData?.games)) {
          const cleanMlbGames = (mlbData.games as ScheduleGame[]).filter((g) =>
            Boolean(MLB_TEAMS[g.homeTeam?.code] || MLB_TEAMS[g.awayTeam?.code])
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
            setMlbDateIndex((prev) => (manualMlbDateRef.current ? prev : mIdx));
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
          setSelectedDateIndex((prev) => (manualDateRef.current ? prev : idx));
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

    loadAllData(!hasSeed);

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
  }, [activeLeague]);

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
  const latestRecaps = useMemo(
    () => (activeLeague === "lvbp" ? buildGameRecaps(schedule, standings).slice(0, 3) : []),
    [activeLeague, schedule, standings]
  );

  const activeDate = dates[selectedDateIndex] || getTodayCaracasIso();

  // Independent Jornada state for /inicio
  const currentJornadaLeague: LeagueId =
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
      manualMlbDateRef.current = true;
      setMlbDateIndex((i) =>
        Math.min(jornadaDates.length - 1, Math.max(0, i + delta))
      );
    } else {
      manualDateRef.current = true;
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
      manualMlbDateRef.current = false;
    } else {
      setSelectedDateIndex(todayIdx);
      manualDateRef.current = false;
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
  const calendarIntentRef = useRef("");

  useEffect(() => {
    if (section !== "calendario") return;
    const available = calendarAvailableDates;
    if (!available.length) {
      setCalendarPickDate("");
      return;
    }
    if (calendarIntentRef.current && available.includes(calendarIntentRef.current)) {
      setCalendarPickDate(calendarIntentRef.current);
      return;
    }
    const param = searchParams?.get("fecha") || searchParams?.get("date");
    if (param && available.includes(param)) {
      calendarIntentRef.current = param;
      setCalendarPickDate(param);
      return;
    }
    const today = getTodayCaracasIso();
    const live = filteredCalendarGames.find((g) => g.status === "IN_PROGRESS");
    const target = live?.date || today;
    let idx = available.indexOf(target);
    if (idx === -1) idx = available.findIndex((d) => d >= target);
    if (idx === -1) idx = available.length - 1;
    calendarIntentRef.current = available[idx];
    setCalendarPickDate(available[idx]);
  }, [section, calendarAvailableDates, filteredCalendarGames, searchParams, teamFilter, calendarStateFilter, activeLeague]);

  const selectCalendarDate = (iso: string) => {
    calendarIntentRef.current = iso;
    setUserPickedCalendarDate(true);
    setCalendarPickDate(iso);
    const club = teamFilter ? anyTeamsCatalog[teamFilter] : null;
    const q = new URLSearchParams({ liga: activeLeague, fecha: iso });
    if (club?.slug) q.set("equipo", club.slug);
    const nextUrl = `/calendario?${q.toString()}`;
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
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

  // Render a clean, breathable Editorial Scoreboard Card (Zero Rainbow Clutter)
  const renderScoreboardCard = (game: ScheduleGame) => {
    const played = game.status === "IN_PROGRESS" || game.status === "FINISHED";
    const isLive = game.status === "IN_PROGRESS";
    const isFinal = game.status === "FINISHED";
    const awayWon = isFinal && game.awayScore > game.homeScore;
    const homeWon = isFinal && game.homeScore > game.awayScore;
    const rawTvChannels = getGameTvChannels(game);
    const primaryTv = rawTvChannels.slice(0, 2).join(" · ");

    return (
      <article
        key={game.id}
        onClick={() => openGameGameday(game.id)}
        className="rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white p-3.5 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between cursor-pointer group select-none"
      >
        <div>
          {/* Top Row: Status Badge (Left) & Venue / TV (Right) */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                isLive
                  ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 animate-pulse"
                  : isFinal
                  ? "bg-slate-200/70 text-slate-700 font-black"
                  : "bg-amber-500/15 text-amber-800 font-extrabold"
              }`}
            >
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              <span>
                {isLive
                  ? game.inning && !/^in\s*progress/i.test(game.inning) && !/^en vivo/i.test(game.inning)
                    ? game.inning
                    : "EN VIVO"
                  : isFinal
                  ? game.inning || "FINAL"
                  : game.time}
              </span>
            </span>

            <span className="font-semibold text-slate-400 text-[11px] truncate max-w-[165px]">
              {primaryTv || game.venueCity || game.venue || currentLeague.shortName}
            </span>
          </div>

          {/* Middle Rows: Away & Home Teams */}
          <div className="space-y-2 py-0.5">
            {/* Away Team */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={game.awayTeam.logoUrl}
                  alt={game.awayTeam.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                  loading="lazy"
                />
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span
                    className={`text-sm truncate ${
                      awayWon ? "font-black text-slate-950" : "font-bold text-slate-700"
                    }`}
                  >
                    {game.awayTeam.nick}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                    ({game.awayTeam.wins}-{game.awayTeam.losses})
                  </span>
                </div>
              </div>

              <span
                className={`text-sm font-black px-2 py-0.5 rounded-md min-w-[28px] text-center tabular-nums transition ${
                  played
                    ? awayWon
                      ? "dark-pill"
                      : "bg-slate-100 text-slate-800"
                    : "text-slate-400 font-medium text-xs"
                }`}
              >
                {played ? game.awayScore : "–"}
              </span>
            </div>

            {/* Home Team */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={game.homeTeam.logoUrl}
                  alt={game.homeTeam.name}
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                  loading="lazy"
                />
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span
                    className={`text-sm truncate ${
                      homeWon ? "font-black text-slate-950" : "font-bold text-slate-700"
                    }`}
                  >
                    {game.homeTeam.nick}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                    ({game.homeTeam.wins}-{game.homeTeam.losses})
                  </span>
                </div>
              </div>

              <span
                className={`text-sm font-black px-2 py-0.5 rounded-md min-w-[28px] text-center tabular-nums transition ${
                  played
                    ? homeWon
                      ? "dark-pill"
                      : "bg-slate-100 text-slate-800"
                    : "text-slate-400 font-medium text-xs"
                }`}
              >
                {played ? game.homeScore : "–"}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Single-Line Card Footer */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 gap-2">
          <span className="text-slate-400 font-medium truncate">
            {game.decisions?.winner
              ? `G: ${game.decisions.winner}${game.decisions.loser ? ` · P: ${game.decisions.loser}` : ""}`
              : game.venue || `${game.time} (VET)`}
          </span>
          <span className="font-extrabold text-slate-700 group-hover:text-amber-600 shrink-0 flex items-center gap-0.5">
            <span>{isLive ? "Gameday" : isFinal ? "Box score" : "Previa"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fb] text-slate-900">
      {/* BROADCAST EDITORIAL HEADER (#0A1120 Navy · 60-30-10 Color System · Zero Grey Boxes) */}
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
          {/* Left Column: Brand Horizontal Logo + .online Pill */}
          <div className="flex items-center justify-start gap-2 shrink-0">
            <Link
              href="/inicio"
              onClick={(e) => handleInstantSectionNav(e, "home", "/inicio")}
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
              { key: "resultados", label: "Resultados", href: `/resultados?liga=${activeLeague}` },
              { key: "posiciones", label: "Posiciones", href: `/posiciones?liga=${activeLeague}` },
              { key: "calendario", label: "Calendario", href: `/calendario?liga=${activeLeague}` },
              { key: "lideres", label: "Líderes", href: `/lideres?liga=${activeLeague}` },
              {
                key: "equipos",
                label: "Equipos",
                href: `/teams?team=${activeTeamsCatalog?.[selectedTeamCode]?.slug || currentLeague.defaultTeamCode}&liga=${activeLeague || "lvbp"}`,
              },
              { key: "futbol", label: "Fútbol", href: "/futbol" },
              { key: "noticias", label: "Noticias", href: "/noticias" },
            ].map((item) => {
              const isActive = section === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={(e) => handleInstantSectionNav(e, item.key, item.href)}
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

          {/* Right Column: Clean Editorial Auth Controls */}
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
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{
                    backgroundColor:
                      (currentUser.favoriteTeam && anyTeamsCatalog[currentUser.favoriteTeam]?.color) || "#d97706",
                  }}
                >
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

          {/* Mobile & Tablet Right Controls (<1024px) */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTeamsDropdownOpen(false);
                setMobileDrawerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition cursor-pointer shrink-0"
              aria-label="Abrir Menú Principal"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span>Menú</span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-OVER DRAWER (Redesigned Clean Editorial Menu · Zero Emojis · Zero Duplicate Banners) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end lg:hidden animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity z-[200]"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-[85vw] sm:max-w-sm bg-white h-dvh shadow-2xl flex flex-col z-[201] overflow-hidden border-l border-slate-200">
            {/* 1. Drawer Header (#0A1120 Navy · Unified Brand Badge) */}
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

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-200/80">
              {/* 2. Béisbol League Switcher (Clean White & Navy Pills) */}
              <div className="p-4 bg-slate-50/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Béisbol Profesional
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    Liga Activa: {currentLeague.shortName}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {LEAGUES_LIST.map((lg) => {
                    const isLgActive = activeLeague === lg.id;
                    return (
                      <button
                        key={lg.id}
                        type="button"
                        onClick={() => {
                          switchLeague(lg.id);
                          setJornadaLeague(lg.id);
                          const targetPath =
                            section === "equipos"
                              ? `/teams?team=${
                                  lg.id === "lidom"
                                    ? "licey"
                                    : lg.id === "lmp"
                                    ? "tomateros"
                                    : lg.id === "mlb"
                                    ? "yankees"
                                    : "leones"
                                }&liga=${lg.id}`
                              : section === "home"
                              ? `/inicio?liga=${lg.id}`
                              : `/${section}?liga=${lg.id}`;
                          if (typeof window !== "undefined") {
                            window.history.replaceState(window.history.state, "", targetPath);
                          }
                          setMobileDrawerOpen(false);
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer text-center border ${
                          isLgActive
                            ? "dark-pill border-slate-900 shadow-2xs"
                            : "bg-white text-slate-800 border-slate-200/90 hover:border-slate-300"
                        }`}
                      >
                        {lg.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Main Sections (Direct 1-Tap Instant Navigation) */}
              <div className="p-3 bg-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2.5 mb-1.5">
                  Navegación Principal
                </div>
                <div className="space-y-0.5">
                  {[
                    { key: "home", label: "Inicio", sub: "Portada general y marcadores", Icon: Home, href: "/inicio" },
                    {
                      key: "resultados",
                      label: "Resultados en Vivo",
                      sub: `Pizarra y boxscore ${currentLeague.shortName}`,
                      Icon: Activity,
                      href: `/resultados?liga=${activeLeague}`,
                    },
                    {
                      key: "posiciones",
                      label: "Tabla de Posiciones",
                      sub: `Clasificación ${currentLeague.shortName}`,
                      Icon: Trophy,
                      href: `/posiciones?liga=${activeLeague}`,
                    },
                    {
                      key: "calendario",
                      label: "Calendario y TV",
                      sub: "Próximos juegos y transmisión",
                      Icon: Calendar,
                      href: `/calendario?liga=${activeLeague}`,
                    },
                    {
                      key: "lideres",
                      label: "Líderes Estadísticos",
                      sub: "Bateo y pitcheo individual",
                      Icon: BarChart3,
                      href: `/lideres?liga=${activeLeague}`,
                    },
                    {
                      key: "equipos",
                      label: "Equipos y Rosters",
                      sub: `Plantillas de la ${currentLeague.shortName}`,
                      Icon: Users,
                      href: `/teams?team=${activeTeamsCatalog?.[selectedTeamCode]?.slug || currentLeague.defaultTeamCode}&liga=${activeLeague}`,
                    },
                    {
                      key: "futbol",
                      label: "Fútbol Europeo",
                      sub: "Champions League y las 5 Grandes Ligas",
                      Icon: Trophy,
                      href: "/futbol",
                    },
                    {
                      key: "noticias",
                      label: "Noticias y Videos",
                      sub: "Actualidad y resúmenes oficiales",
                      Icon: Play,
                      href: "/noticias",
                    },
                  ].map((item) => {
                    const isActive =
                      section === item.key || (section === "juego" && item.key === "resultados");
                    const ItemIcon = item.Icon;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={(e) => {
                          handleInstantSectionNav(e, item.key, item.href);
                          setMobileDrawerOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                          isActive
                            ? "bg-slate-100 text-slate-950 font-black"
                            : "text-slate-700 hover:bg-slate-50 font-bold"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              isActive
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
                            isActive ? "text-amber-600" : "text-slate-300"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* 4. Compact 2-Column Club Directory */}
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Clubes · {currentLeague.shortName}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {Object.keys(activeTeamsCatalog).length} equipos
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(activeTeamsCatalog).map((team) => (
                    <Link
                      key={team.code}
                      href={`/teams?team=${team.slug}&liga=${activeLeague}`}
                      onClick={() => {
                        openTeamPage(team.code);
                        setMobileDrawerOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 transition min-w-0"
                    >
                      <img
                        src={team.logoSvg}
                        alt={team.name}
                        className="w-6 h-6 object-contain shrink-0"
                      />
                      <span className="text-xs font-extrabold text-slate-800 truncate">
                        {team.shortName}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Pinned Drawer Footer (Account & PWA Install · Zero Emojis) */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
              {currentUser ? (
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg dark-pill flex items-center justify-center font-black text-xs shrink-0">
                      {(currentUser.name || "F").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {currentUser.name || "Fanático"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          setAuthModalTab("profile");
                          setAuthModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                      >
                        Editar perfil
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("enjuego_user_session");
                      setCurrentUser(null);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-red-600 px-2 py-1 cursor-pointer"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setAuthModalTab("login");
                      setAuthModalOpen(true);
                    }}
                    className="py-2 px-3 rounded-xl font-bold text-xs text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      setAuthModalTab("quick");
                      setAuthModalOpen(true);
                    }}
                    className="py-2 px-3 rounded-xl font-black text-xs dark-pill transition cursor-pointer"
                  >
                    Crear Cuenta
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setPwaModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-between text-xs font-bold transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Instalar Aplicación Móvil</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBHEADER COMPETITION & DATE BAR (Fits 100% on 360px Mobile & Desktop · Zero Overflow) */}
      {section !== "juego" && (
        <section className="border-b border-slate-200 bg-white relative z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Left: Direct 1-Click League Selector Pills */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 hidden md:inline">
                Ligas:
              </span>
              {LEAGUES_LIST.map((lg) => {
                const isSelected = currentJornadaLeague === lg.id;
                const count =
                  leagueGameCounts[lg.id] ??
                  (lg.id === currentJornadaLeague
                    ? jornadaSchedule.filter((g) => g.date === getTodayCaracasIso()).length
                    : null);

                return (
                  <button
                    key={lg.id}
                    type="button"
                    onClick={() => {
                      if (section === "home") {
                        setJornadaLeague(lg.id);
                        switchLeague(lg.id);
                      } else {
                        switchLeague(lg.id);
                        const nextUrl =
                          section === "equipos"
                            ? `/teams?team=${
                                lg.id === "lidom"
                                  ? "licey"
                                  : lg.id === "lmp"
                                  ? "tomateros"
                                  : lg.id === "mlb"
                                  ? "yankees"
                                  : "leones"
                              }&liga=${lg.id}`
                            : `/${section}?liga=${lg.id}`;
                        if (typeof window !== "undefined") {
                          window.history.replaceState(window.history.state, "", nextUrl);
                        }
                      }
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 select-none ${
                      isSelected
                        ? "dark-pill shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                    }`}
                  >
                    <span>{lg.shortName}</span>
                    {count !== null && count > 0 && (
                      <span
                        className={`hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block shrink-0" />

              <Link
                href="/futbol"
                className="hidden sm:flex px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 transition items-center gap-1.5 shrink-0"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Champions & Fútbol</span>
              </Link>
            </div>

            {/* Right: Compact Date Navigator (Stays on the exact same row on mobile) */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                type="button"
                disabled={currentJornadaDateIdx <= 0}
                onClick={() => stepJornadaDate(-1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition cursor-pointer"
                aria-label="Día anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-center min-w-[60px] sm:min-w-[76px]">
                <strong className="text-[11px] sm:text-xs font-black text-slate-900 tabular-nums">
                  {jornadaDayFormatted.dayNum}{" "}
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    {jornadaDayFormatted.monthShort}
                  </span>
                </strong>
              </div>
              <button
                type="button"
                disabled={currentJornadaDateIdx >= jornadaDates.length - 1}
                onClick={() => stepJornadaDate(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition cursor-pointer"
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
                    className="hidden sm:inline-block ml-0.5 px-2 py-1 rounded-lg dark-pill text-[10px] font-black uppercase transition cursor-pointer"
                  >
                    Hoy
                  </button>
                )}
            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTENT CONTAINER (Clean Padding · Zero Extra Empty Margin Before Footer) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 pt-3.5 sm:pt-5 pb-6 sm:pb-8">
        <AdBanner slot="top-leaderboard" />
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

        {/* SECTION: HOME (/ & /inicio) — Cohesive 12-Column Editorial Architecture (8 Main + 4 Sidebar) */}
        {section === "home" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* LEFT MAIN FEED (8 Columns on Desktop): Baseball Scoreboard + European Soccer + Game Recaps */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0">
              {/* 1. PIZARRA DE BÉISBOL */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-2xs space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl dark-pill flex items-center justify-center shrink-0 text-[10px] font-black tracking-tight">
                      {currentLeague.shortName}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block truncate">
                        {jornadaLeague === "mlb"
                          ? "Béisbol · Grandes Ligas"
                          : `Béisbol · Temporada ${currentLeague.shortName}`}
                      </span>
                      <h1 className="text-sm sm:text-lg font-black text-slate-950 capitalize leading-tight truncate">
                        {jornadaDayFormatted.fullLabel}
                      </h1>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {jornadaLeague === "mlb" && (
                      <button
                        type="button"
                        onClick={() => setShowHomeMlbBracket((v) => !v)}
                        className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                          showHomeMlbBracket
                            ? "dark-pill border-slate-900"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-600" />
                        <span>{showHomeMlbBracket ? "Ocultar Cuadro" : "Postemporada"}</span>
                      </button>
                    )}
                    <Link
                      href={`/posiciones?liga=${jornadaLeague}`}
                      onClick={(e) =>
                        handleInstantSectionNav(e, "posiciones", `/posiciones?liga=${jornadaLeague}`)
                      }
                      className="dark-pill inline-flex items-center gap-1 rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-black transition cursor-pointer shadow-2xs"
                    >
                      <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Tabla</span>
                    </Link>
                    <Link
                      href={`/calendario?liga=${jornadaLeague}`}
                      onClick={(e) =>
                        handleInstantSectionNav(e, "calendario", `/calendario?liga=${jornadaLeague}`)
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold transition cursor-pointer"
                    >
                      <span>Calendario ›</span>
                    </Link>
                  </div>
                </div>

                {loading && jornadaGamesOfDay.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-36 rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {jornadaGamesOfDay.map((game) => renderScoreboardCard(game))}
                  </div>
                )}

                {jornadaLeague === "mlb" && showHomeMlbBracket && (
                  <div className="pt-3 space-y-2 border-t border-slate-100">
                    <h2 className="text-sm font-black text-slate-950 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-600" />
                      <span>Cuadro de Postemporada MLB 2026</span>
                    </h2>
                    <MlbPlayoffBracket season={2026} />
                  </div>
                )}
              </section>

              {/* 2. FÚTBOL EUROPEO SHOWCASE */}
              <HomeSoccerShowcase />

              {/* 3. RESÚMENES Y CRÓNICAS DE LA JORNADA */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      Cobertura Editorial
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                      Resúmenes de la Jornada
                    </h2>
                  </div>
                  <Link
                    href="/noticias"
                    onClick={(e) => handleInstantSectionNav(e, "noticias", "/noticias")}
                    className="text-xs font-extrabold text-slate-600 hover:text-slate-950 transition"
                  >
                    Ver noticias ›
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {realRecaps.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={`/juego/${item.id}`}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white p-3.5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-block rounded-md bg-slate-200/70 text-slate-700 px-2 py-0.5 text-[10px] font-black uppercase">
                            {item.category}
                          </span>
                          <img src={item.winnerLogo} alt="" className="w-6 h-6 object-contain" />
                        </div>
                        <h3 className="text-sm font-black text-slate-950 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{item.dateLabel}</span>
                        <span className="text-slate-700 group-hover:text-amber-600 font-extrabold">
                          Box score ›
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            {/* RIGHT SIDEBAR (4 Columns on Desktop): Standings + Individual Leaders + Community */}
            <aside className="lg:col-span-4 space-y-5 lg:space-y-6 min-w-0">
              {/* 1. TABLA DE POSICIONES */}
              <article className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
                <header className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      Clasificación Oficial
                    </span>
                    <h2 className="text-base font-black text-slate-950 leading-tight">
                      Tabla {currentLeague.shortName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShareStandingsOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition cursor-pointer"
                      title="Compartir tabla de posiciones"
                    >
                      <Share2 className="w-3 h-3 text-slate-500" />
                      <span>Compartir</span>
                    </button>
                    <Link
                      href={`/posiciones?liga=${activeLeague}`}
                      onClick={(e) =>
                        handleInstantSectionNav(e, "posiciones", `/posiciones?liga=${activeLeague}`)
                      }
                      className="text-xs font-extrabold text-slate-700 hover:text-amber-600"
                    >
                      Completa ›
                    </Link>
                  </div>
                </header>

                <table className="w-full text-xs mt-2 border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 text-right text-[11px]">
                      <th className="py-2 text-left w-6">#</th>
                      <th className="py-2 text-left">Club</th>
                      <th className="py-2 px-1.5">JG</th>
                      <th className="py-2 px-1.5">JP</th>
                      <th className="py-2 px-1.5">PCT</th>
                      <th className="py-2 pl-1.5">DIF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {standings.slice(0, 8).map((row, idx) => {
                      const zoneDot =
                        activeLeague === "mlb"
                          ? "bg-sky-500"
                          : activeLeague === "lidom"
                          ? idx < 4
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                          : activeLeague === "lmp"
                          ? idx < 8
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                          : idx < 4
                            ? "bg-emerald-500"
                            : idx < 6
                              ? "bg-amber-400"
                              : "bg-slate-300";
                      return (
                        <tr
                          key={row.team.code}
                          onClick={() => openTeamPage(row.team.code)}
                          className="hover:bg-slate-50 cursor-pointer transition text-right tabular-nums"
                        >
                          <td className="py-2 text-left font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <i className={`w-1.5 h-1.5 rounded-full ${zoneDot}`} />
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2 text-left font-bold text-slate-900 flex items-center gap-2">
                            <img
                              src={row.team.logoUrl}
                              alt=""
                              className="w-5 h-5 object-contain shrink-0"
                            />
                            <span className="truncate">{row.team.nick}</span>
                          </td>
                          <td className="py-2 px-1.5 font-bold text-slate-900">{row.wins}</td>
                          <td className="py-2 px-1.5 text-slate-500">{row.losses}</td>
                          <td className="py-2 px-1.5 text-slate-900 font-black">{row.pct}</td>
                          <td className="py-2 pl-1.5 text-slate-400">{row.gamesBehind}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="pt-3 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500">
                  {activeLeague === "mlb" ? (
                    <Link
                      href="/posiciones?liga=mlb"
                      onClick={(e) => handleInstantSectionNav(e, "posiciones", "/posiciones?liga=mlb")}
                      className="text-slate-700 hover:text-amber-600 font-extrabold"
                    >
                      Ver las 6 divisiones AL / NL ›
                    </Link>
                  ) : activeLeague === "lidom" ? (
                    <>
                      <span className="flex items-center gap-1">
                        <i className="w-2 h-2 rounded-full bg-emerald-500" /> 1°-4° Round Robin
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="w-2 h-2 rounded-full bg-slate-300" /> 5°-6° Eliminados
                      </span>
                    </>
                  ) : activeLeague === "lmp" ? (
                    <>
                      <span className="flex items-center gap-1">
                        <i className="w-2 h-2 rounded-full bg-emerald-500" /> 1°-8° Playoffs
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="w-2 h-2 rounded-full bg-slate-300" /> 9°-10° Eliminados
                      </span>
                    </>
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

              {/* 2. LÍDERES INDIVIDUALES (Compact Tabbed Card) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Estadísticas ({currentLeague.shortName})
                  </span>
                  <Link
                    href={`/lideres?liga=${activeLeague}`}
                    onClick={(e) =>
                      handleInstantSectionNav(e, "lideres", `/lideres?liga=${activeLeague}`)
                    }
                    className="text-xs font-extrabold text-slate-700 hover:text-amber-600"
                  >
                    Todos los líderes ›
                  </Link>
                </div>
                <LeadersWidget hitting={leaders.hitting} pitching={leaders.pitching} compact />
              </div>

              {/* 3. LA GRADA EN VIVO (Compact Sidebar Community Card) */}
              <section className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      Comunidad
                    </span>
                    <h2 className="text-base font-black text-slate-950 leading-tight">
                      La Grada en Vivo
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold">
                    {communityPosts.length} comentarios
                  </span>
                </div>

                {currentUser ? (
                  <form onSubmit={handleCreatePost} className="space-y-2">
                    <textarea
                      rows={2}
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      placeholder="Comenta la jornada en vivo..."
                      maxLength={220}
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {currentUser.name || "Fanático"}
                      </span>
                      <button
                        type="submit"
                        disabled={!newPostText.trim()}
                        className="dark-pill rounded-xl disabled:opacity-40 font-black text-xs py-1.5 px-3 transition cursor-pointer"
                      >
                        Publicar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Participa en los comentarios en vivo
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalTab("quick");
                        setAuthModalOpen(true);
                      }}
                      className="dark-pill px-3 py-1.5 rounded-xl font-black text-xs shrink-0 cursor-pointer"
                    >
                      Entrar
                    </button>
                  </div>
                )}

                {communityPosts.length > 0 ? (
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {communityPosts.slice(0, 5).map((post) => {
                      const club = anyTeamsCatalog[post.team] || LVBP_TEAMS.CAR;
                      return (
                        <article
                          key={post.id}
                          className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={club.logoSvg}
                                alt={club.nick}
                                className="w-5 h-5 object-contain shrink-0"
                              />
                              <strong className="text-xs font-bold text-slate-900 truncate">
                                {post.author}
                              </strong>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">{post.time}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{post.text}</p>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Sé el primero en comentar la jornada de hoy.
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}

        {/* SECTION: RESULTADOS (/resultados) */}
        {section === "resultados" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                      {currentLeague.shortName}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Pizarras C · H · E y Box Score Oficial
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                    Resultados y Marcadores · {currentLeague.name}
                  </h1>
                </div>

                {/* Quick League Switcher (Mobile & PC) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                  {(["lvbp", "mlb", "lidom", "lmp"] as LeagueId[]).map((lid) => {
                    const active = activeLeague === lid;
                    return (
                      <button
                        key={lid}
                        type="button"
                        onClick={() => switchLeague(lid)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
                          active
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {LEAGUES[lid].shortName}
                      </button>
                    );
                  })}
                  <Link
                    href="/futbol"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition shrink-0"
                  >
                    Fútbol
                  </Link>
                </div>
              </div>

              {/* Date pills synced with URL */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar max-w-full">
                {dates
                  .slice(
                    Math.max(0, selectedDateIndex - 5),
                    Math.max(12, selectedDateIndex + 7)
                  )
                  .map((d) => {
                    const realIdx = dates.indexOf(d);
                    const f = formatCompactDay(d);
                    const isSelected = realIdx === selectedDateIndex;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          manualDateRef.current = true;
                          setSelectedDateIndex(realIdx);
                          const nextUrl = `/resultados?liga=${activeLeague}&fecha=${d}`;
                          window.history.replaceState(window.history.state, "", nextUrl);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer shrink-0 ${
                          isSelected
                            ? "dark-pill bg-slate-950 text-white border-slate-950 shadow-2xs"
                            : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {f.dayNum} {f.monthShort}
                      </button>
                    );
                  })}
              </div>
            </div>

            {loading && gamesOfDay.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-48 rounded-2xl border border-slate-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : gamesOfDay.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-2xs">
                No hay juegos registrados en esta fecha para {currentLeague.shortName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {gamesOfDay.map((game) => renderScoreboardCard(game))}
              </div>
            )}

            {activeLeague === "mlb" && (
              <div className="pt-4 space-y-3">
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">
                    Postemporada MLB 2026 · Rumbo a la Serie Mundial
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    Cuadro de Postemporada (MLB)
                  </h2>
                </div>
                <MlbPlayoffBracket season={2026} />
              </div>
            )}
          </div>
        )}

        {/* SECTION: CALENDARIO (/calendario) */}
        {section === "calendario" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                      {currentLeague.shortName}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Horarios Oficiales (VET), Señales de TV y Estadios
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                    Calendario de Juegos · {currentLeague.name}
                  </h1>
                </div>

                {/* Quick League Switcher + Game State Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {(["lvbp", "mlb", "lidom", "lmp"] as LeagueId[]).map((lid) => {
                      const active = activeLeague === lid;
                      return (
                        <button
                          key={lid}
                          type="button"
                          onClick={() => switchLeague(lid)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
                            active
                              ? "dark-pill bg-slate-950 text-white shadow-2xs"
                              : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                          }`}
                        >
                          {LEAGUES[lid].shortName}
                        </button>
                      );
                    })}
                    <Link
                      href="/futbol"
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition shrink-0"
                    >
                      Fútbol
                    </Link>
                  </div>

                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
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
                          calendarIntentRef.current = "";
                          setUserPickedCalendarDate(false);
                          setCalendarStateFilter(stKey);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          calendarStateFilter === stKey
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {stLabel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Team Selector Strip with Official Logos + URL Query Update */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Filtrar calendario por club:
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      calendarIntentRef.current = "";
                      setUserPickedCalendarDate(false);
                      setTeamFilter("");
                      router.replace(`/calendario?liga=${activeLeague}`, { scroll: false });
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold border transition shrink-0 cursor-pointer ${
                      teamFilter === ""
                        ? "dark-pill bg-slate-950 text-white border-slate-950 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Todos ({Object.keys(activeTeamsCatalog).length})</span>
                  </button>

                  {Object.values(activeTeamsCatalog).map((t) => {
                    const active = teamFilter === t.code;
                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => {
                          setUserPickedCalendarDate(false);
                          calendarIntentRef.current = "";
                          const next = active ? "" : t.code;
                          setTeamFilter(next);
                          router.replace(
                            next
                              ? `/calendario?liga=${activeLeague}&equipo=${t.slug}`
                              : `/calendario?liga=${activeLeague}`,
                            { scroll: false }
                          );
                        }}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition shrink-0 cursor-pointer ${
                          active
                            ? "dark-pill bg-slate-950 text-white border-slate-950 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img src={t.logoSvg} alt={t.nick} className="w-4.5 h-4.5 object-contain" />
                        <span>{t.nick}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {calendarAvailableDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No hay juegos con los filtros actuales. Prueba otro equipo o estado (próximos /
                finalizados).
              </div>
            ) : null}

            {calendarAvailableDates.length > 0 && (
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
                onShiftDay={shiftCalendarDay}
                canShiftDayPrev={calendarPickIndex > 0}
                canShiftDayNext={calendarPickIndex < calendarAvailableDates.length - 1}
              />
            )}

            {/* CASE A: SINGLE TEAM SELECTED — CLEAR TEAM-CENTRIC SCHEDULE */}
            {teamFilter && anyTeamsCatalog[teamFilter] ? (
              <div className="space-y-3">
                {(() => {
                  const club = anyTeamsCatalog[teamFilter];
                  const homeCount = filteredCalendarGames.filter(
                    (g) => g.homeTeam.code === teamFilter
                  ).length;
                  const awayCount = filteredCalendarGames.filter(
                    (g) => g.awayTeam.code === teamFilter
                  ).length;

                  return (
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={club.logoSvg}
                          alt={club.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                        />
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Calendario Individual · {currentLeague.shortName}
                          </span>
                          <h2 className="text-base sm:text-lg font-black text-slate-950">
                            {club.name}
                          </h2>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> Sede: {club.venue} (
                            {club.venueCity})
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 font-extrabold">
                          En Casa: {homeCount}
                        </span>
                        <span className="rounded-xl bg-sky-50 border border-sky-200 text-sky-800 px-3 py-1.5 font-extrabold">
                          Visitante: {awayCount}
                        </span>
                        <Link
                          href={`/teams?liga=${activeLeague}&team=${club.slug}`}
                          className="dark-pill rounded-xl bg-slate-950 text-white px-3 py-1.5 font-extrabold hover:bg-slate-800 transition"
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
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
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
                        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 hover:border-slate-300 transition cursor-pointer shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
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
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shrink-0 border ${
                              isHome
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-sky-50 text-sky-800 border-sky-200"
                            }`}
                          >
                            {isHome ? "CASA vs" : "VISITA @"}
                          </span>

                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={opponent.logoUrl}
                              alt={opponent.name}
                              className="w-8 h-8 object-contain shrink-0"
                            />
                            <div className="min-w-0">
                              <strong className="text-xs sm:text-sm font-black text-slate-950 block truncate">
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
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-black border ${
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
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-1 text-xs font-black">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              {myTeam.shortName} {myScore} - {oppScore} {opponent.shortName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 text-xs font-extrabold">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {game.time}
                            </span>
                          )}
                        </div>

                        {/* 4. TV Broadcast Channels + Action */}
                        <div className="lg:col-span-3 flex flex-wrap items-center justify-between lg:justify-end gap-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {tvList.slice(0, 2).map((ch) => (
                              <span
                                key={ch}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${tvChannelBadgeStyle(
                                  ch
                                )}`}
                              >
                                <Tv className="w-2.5 h-2.5 text-slate-500 shrink-0" /> {ch}
                              </span>
                            ))}
                          </div>
                          <span className="dark-pill text-[11px] font-extrabold text-white bg-slate-900 px-2.5 py-1 rounded-lg">
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
              <div className="space-y-3">
                {calendarDayGames.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                    No hay partidos programados para este día.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {calendarDayGames.map((game) => {
                      const isFinished = game.status === "FINISHED";
                      const isLive = game.status === "IN_PROGRESS";
                      const tvList = getGameTvChannels(game);
                      return (
                        <Link
                          key={game.id}
                          href={`/juego/${game.id}`}
                          className="rounded-2xl border border-slate-200/90 bg-white p-4 hover:border-slate-300 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                              <div className="flex items-center gap-2">
                                <img
                                  src={game.awayTeam.logoUrl}
                                  alt=""
                                  className="w-7 h-7 object-contain shrink-0"
                                />
                                <span className="text-xs sm:text-sm font-black text-slate-900">
                                  {game.awayTeam.nick}
                                </span>
                                {game.status !== "SCHEDULED" && (
                                  <b className="text-sm sm:text-base font-black text-slate-950 tabular-nums">
                                    {game.awayScore}
                                  </b>
                                )}
                              </div>

                              <span className="text-[10px] font-extrabold text-slate-400 uppercase px-0.5">
                                vs
                              </span>

                              <div className="flex items-center gap-2">
                                <img
                                  src={game.homeTeam.logoUrl}
                                  alt=""
                                  className="w-7 h-7 object-contain shrink-0"
                                />
                                <span className="text-xs sm:text-sm font-black text-slate-900">
                                  {game.homeTeam.nick}
                                </span>
                                {game.status !== "SCHEDULED" && (
                                  <b className="text-sm sm:text-base font-black text-slate-950 tabular-nums">
                                    {game.homeScore}
                                  </b>
                                )}
                              </div>
                            </div>

                            <span
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold shrink-0 border ${
                                isLive
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : isFinished
                                    ? "bg-slate-100 text-slate-800 border-slate-200"
                                    : "bg-slate-50 text-slate-800 border-slate-200/80"
                              }`}
                            >
                              {isLive ? "EN VIVO" : isFinished ? "Final" : game.time}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
                            <span className="text-slate-500 flex items-center gap-1 truncate max-w-[180px] sm:max-w-[240px]">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
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

        {/* SECTION: POSICIONES (/posiciones) — RESPONSIVE MOBILE & DESKTOP */}
        {section === "posiciones" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                      {currentLeague.shortName}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {activeLeague === "mlb"
                        ? "6 Divisiones Oficiales (AL y NL)"
                        : "Clasificación Oficial"}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                    Tabla de Posiciones · {currentLeague.name}
                  </h1>
                </div>

                {/* Quick League Switcher (Mobile & PC) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                  {(["lvbp", "mlb", "lidom", "lmp"] as LeagueId[]).map((lid) => {
                    const active = activeLeague === lid;
                    return (
                      <button
                        key={lid}
                        type="button"
                        onClick={() => switchLeague(lid)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer shrink-0 ${
                          active
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {LEAGUES[lid].shortName}
                      </button>
                    );
                  })}
                  <Link
                    href="/futbol"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 transition shrink-0"
                  >
                    Fútbol
                  </Link>
                </div>
              </div>

              {/* Phase / Division Filter Row + Share Button */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                {activeLeague === "mlb" ? (
                  <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200/80 gap-0.5">
                    {(
                      [
                        ["ALL", "6 Divisiones (30)"],
                        ["AL", "Liga Americana"],
                        ["NL", "Liga Nacional"],
                        ["PLAYOFFS", "Postemporada"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMlbStandingsFilter(key)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          mlbStandingsFilter === key
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
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
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                          standingsPhase === key
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link
                    href={`/lideres?liga=${activeLeague}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Líderes Individuales</span>
                    <span className="sm:hidden">Líderes</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShareStandingsOpen(true)}
                    className="dark-pill inline-flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-extrabold transition cursor-pointer shadow-2xs"
                    title="Compartir o descargar arte oficial de la tabla de posiciones"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir</span>
                  </button>
                </div>
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
              /* MLB: POSTSEASON BRACKET + 6 SEPARATED DIVISIONAL TABLES (MOBILE + DESKTOP ADAPTED) */
              <div className="space-y-5">
                {mlbStandingsFilter === "PLAYOFFS" && (
                  <div className="space-y-3">
                    <MlbPlayoffBracket season={2026} />
                  </div>
                )}

                {mlbStandingsFilter !== "PLAYOFFS" && (
                  <div className="grid grid-cols-1 gap-4">
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
                            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs"
                          >
                            <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-900" />
                                <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-950">
                                  {div.title}
                                </h2>
                              </div>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${div.accent}`}
                              >
                                {div.badge}
                              </span>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                              <table className="w-full md:min-w-[700px] text-xs text-right border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-200/80 font-extrabold text-[11px]">
                                    <th className="py-2.5 px-3 sm:px-4 text-left w-10">#</th>
                                    <th className="py-2.5 px-2 sm:px-4 text-left">Equipo</th>
                                    <th className="py-2.5 px-2 sm:px-3">JJ</th>
                                    <th className="py-2.5 px-2 sm:px-3">JG</th>
                                    <th className="py-2.5 px-2 sm:px-3">JP</th>
                                    <th className="py-2.5 px-2 sm:px-3 text-slate-950">PCT</th>
                                    <th className="py-2.5 px-2.5 sm:px-3">DIF</th>
                                    <th className="hidden md:table-cell py-2.5 px-3">CASA</th>
                                    <th className="hidden md:table-cell py-2.5 px-3">VIS</th>
                                    <th className="hidden md:table-cell py-2.5 px-3">CA</th>
                                    <th className="hidden md:table-cell py-2.5 px-3">CP</th>
                                    <th className="hidden md:table-cell py-2.5 px-3">DIF.C</th>
                                    <th className="hidden sm:table-cell py-2.5 px-3 sm:px-4">RACHA</th>
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
                                          isFav ? "bg-amber-50/50" : ""
                                        }`}
                                      >
                                        <td className="py-2.5 px-3 sm:px-4 text-left font-bold text-slate-500 whitespace-nowrap">
                                          <span className="inline-flex items-center gap-1.5">
                                            <b className="text-slate-900">{idx + 1}</b>
                                            {isDivLeader && (
                                              <span className="hidden sm:inline-flex items-center rounded bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 text-[9px] font-extrabold">
                                                LÍDER
                                              </span>
                                            )}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-2 sm:px-4 text-left font-extrabold text-slate-950">
                                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                            <img
                                              src={row.team.logoUrl}
                                              alt=""
                                              className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0"
                                            />
                                            <span className="truncate max-w-[115px] sm:max-w-none">
                                              <span className="sm:hidden">{row.team.shortName}</span>
                                              <span className="hidden sm:inline">{row.team.name}</span>
                                            </span>
                                            {isFav && (
                                              <span title="Tu Equipo Favorito">
                                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-2 sm:px-3 text-slate-600">{row.gamesPlayed}</td>
                                        <td className="py-2.5 px-2 sm:px-3 font-extrabold text-slate-950">
                                          {row.wins}
                                        </td>
                                        <td className="py-2.5 px-2 sm:px-3 text-slate-600">{row.losses}</td>
                                        <td className="py-2.5 px-2 sm:px-3 font-black text-slate-950">
                                          {row.pct}
                                        </td>
                                        <td className="py-2.5 px-2.5 sm:px-3 font-bold text-slate-600">
                                          {row.gamesBehind}
                                        </td>
                                        <td className="hidden md:table-cell py-2.5 px-3 text-slate-500">
                                          {row.homeRecord}
                                        </td>
                                        <td className="hidden md:table-cell py-2.5 px-3 text-slate-500">
                                          {row.awayRecord}
                                        </td>
                                        <td className="hidden md:table-cell py-2.5 px-3 text-slate-600">
                                          {row.runsScored}
                                        </td>
                                        <td className="hidden md:table-cell py-2.5 px-3 text-slate-600">
                                          {row.runsAllowed}
                                        </td>
                                        <td
                                          className={`hidden md:table-cell py-2.5 px-3 font-bold ${
                                            row.runDiff >= 0 ? "text-emerald-600" : "text-rose-600"
                                          }`}
                                        >
                                          {row.runDiff > 0 ? `+${row.runDiff}` : row.runDiff}
                                        </td>
                                        <td className="hidden sm:table-cell py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                                          {row.streak}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : standingsPhase !== "REGULAR" ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2 shadow-2xs">
                <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-black text-slate-950">
                  Esta fase aún no ha comenzado
                </h3>
                <p className="text-xs text-slate-500">
                  Actualmente se disputa la Temporada Regular de {currentLeague.name}.
                </p>
              </div>
            ) : (
              /* CLASSIC WINTER LEAGUE TABLE WITH ACCURATE QUALIFICATION ZONES (MOBILE + PC) */
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs no-scrollbar">
                  <table className="w-full md:min-w-[720px] text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold text-[11px]">
                        <th className="py-3 px-3 sm:px-4 text-left">POS</th>
                        <th className="py-3 px-2 sm:px-4 text-left">Equipo</th>
                        <th className="py-3 px-2 sm:px-3">JJ</th>
                        <th className="py-3 px-2 sm:px-3">JG</th>
                        <th className="py-3 px-2 sm:px-3">JP</th>
                        <th className="py-3 px-2 sm:px-3 text-slate-950">PCT</th>
                        <th className="py-3 px-2.5 sm:px-3">DIF</th>
                        <th className="hidden md:table-cell py-3 px-3">CASA</th>
                        <th className="hidden md:table-cell py-3 px-3">VIS</th>
                        <th className="hidden md:table-cell py-3 px-3">CA</th>
                        <th className="hidden md:table-cell py-3 px-3">CP</th>
                        <th className="hidden md:table-cell py-3 px-3">DIF.C</th>
                        <th className="hidden sm:table-cell py-3 px-3 sm:px-4">RACHA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums">
                      {standings
                        .filter((r) => Boolean(activeTeamsCatalog[r.team.code]))
                        .map((row, idx) => {
                          const isFav = favoriteTeamCode === row.team.code;
                          const zoneDotClass =
                            activeLeague === "lidom"
                              ? idx < 4
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                              : activeLeague === "lmp"
                                ? idx < 8
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                                : idx < 4
                                  ? "bg-emerald-500"
                                  : idx < 6
                                    ? "bg-amber-400"
                                    : "bg-slate-300";

                          const zoneBadge =
                            activeLeague === "lidom" ? (
                              idx < 4 ? (
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold">
                                  Round Robin
                                </span>
                              ) : (
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                                  Eliminado
                                </span>
                              )
                            ) : activeLeague === "lmp" ? (
                              idx < 8 ? (
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold">
                                  Playoffs
                                </span>
                              ) : (
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                                  Eliminado
                                </span>
                              )
                            ) : idx < 4 ? (
                              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold">
                                Round Robin
                              </span>
                            ) : idx < 6 ? (
                              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-[10px] font-extrabold">
                                Comodín
                              </span>
                            ) : (
                              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 text-[10px] font-bold">
                                Fuera
                              </span>
                            );

                          return (
                            <tr
                              key={row.team.code}
                              onClick={() => openTeamPage(row.team.code)}
                              className={`hover:bg-slate-50 transition cursor-pointer ${
                                isFav ? "bg-amber-50/50" : ""
                              }`}
                            >
                              <td className="py-3 px-3 sm:px-4 text-left font-bold text-slate-600 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 sm:gap-2">
                                  <span className={`w-1.5 h-4 rounded-full ${zoneDotClass}`} />
                                  <b className="w-4 text-slate-900">{idx + 1}°</b>
                                  {zoneBadge}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-left font-extrabold text-slate-950">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  <img
                                    src={row.team.logoUrl}
                                    alt=""
                                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0"
                                  />
                                  <span className="truncate max-w-[115px] sm:max-w-none">
                                    <span className="sm:hidden">{row.team.shortName}</span>
                                    <span className="hidden sm:inline">{row.team.name}</span>
                                  </span>
                                  {isFav && (
                                    <span title="Tu Equipo Favorito">
                                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-3 text-slate-600">{row.gamesPlayed}</td>
                              <td className="py-3 px-2 sm:px-3 font-extrabold text-slate-950">{row.wins}</td>
                              <td className="py-3 px-2 sm:px-3 text-slate-600">{row.losses}</td>
                              <td className="py-3 px-2 sm:px-3 font-black text-slate-950">{row.pct}</td>
                              <td className="py-3 px-2.5 sm:px-3 text-slate-600">{row.gamesBehind}</td>
                              <td className="hidden md:table-cell py-3 px-3 text-slate-500">{row.homeRecord}</td>
                              <td className="hidden md:table-cell py-3 px-3 text-slate-500">{row.awayRecord}</td>
                              <td className="hidden md:table-cell py-3 px-3 text-slate-600">{row.runsScored}</td>
                              <td className="hidden md:table-cell py-3 px-3 text-slate-600">{row.runsAllowed}</td>
                              <td
                                className={`hidden md:table-cell py-3 px-3 font-bold ${
                                  row.runDiff >= 0 ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {row.runDiff > 0 ? `+${row.runDiff}` : row.runDiff}
                              </td>
                              <td className="hidden sm:table-cell py-3 px-3 sm:px-4 font-bold text-slate-900">
                                {row.streak}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Qualification Legend */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-4">
                    {activeLeague === "lidom" ? (
                      <>
                        <span className="inline-flex items-center gap-2 font-bold text-emerald-800">
                          <span className="w-3 h-3 rounded bg-emerald-500" />
                          1° al 4° lugar: Clasificación al Round Robin Semifinal
                        </span>
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                          <span className="w-3 h-3 rounded bg-slate-300" />
                          5° y 6° lugar: Eliminados
                        </span>
                      </>
                    ) : activeLeague === "lmp" ? (
                      <>
                        <span className="inline-flex items-center gap-2 font-bold text-emerald-800">
                          <span className="w-3 h-3 rounded bg-emerald-500" />
                          1° al 8° lugar: Clasificación a Playoffs de Postemporada
                        </span>
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                          <span className="w-3 h-3 rounded bg-slate-300" />
                          9° y 10° lugar: Eliminados
                        </span>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION: LÍDERES (/lideres) */}
        {section === "lideres" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                    Estadísticas {currentLeague.shortName}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                  Líderes Individuales de Bateo y Pitcheo ({currentLeague.shortName})
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {(["lvbp", "mlb", "lidom", "lmp"] as LeagueId[]).map((lid) => {
                    const active = activeLeague === lid;
                    return (
                      <button
                        key={lid}
                        type="button"
                        onClick={() => switchLeague(lid)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                          active
                            ? "dark-pill bg-slate-950 text-white shadow-2xs"
                            : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                        }`}
                      >
                        {LEAGUES[lid].shortName}
                      </button>
                    );
                  })}
                </div>
                <Link
                  href={`/posiciones?liga=${activeLeague}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tabla de Posiciones</span>
                </Link>
              </div>
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

        <AdBanner slot="home-bottom" />
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (5 Equal Columns · Includes Fútbol · 0ms Instant Switching) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-[0_-6px_20px_rgba(15,23,42,0.08)]"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0.35rem))" }}
        aria-label="Navegación Móvil"
      >
        <div className="grid grid-cols-5 px-1.5 pt-1.5 gap-1">
          {(
            [
              ["home", "/inicio", "Inicio", Home],
              ["resultados", `/resultados?liga=${activeLeague}`, "Resultados", Activity],
              ["futbol", "/futbol", "Fútbol", Trophy],
              ["posiciones", `/posiciones?liga=${activeLeague}`, "Posiciones", BarChart3],
              ["calendario", `/calendario?liga=${activeLeague}`, "Calendario", Calendar],
            ] as const
          ).map(([key, href, label, Icon]) => {
            const active = section === key || (section === "juego" && key === "resultados");
            return (
              <Link
                key={key}
                href={href}
                onClick={(e) => handleInstantSectionNav(e, key, href)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-black transition cursor-pointer select-none ${
                  active
                    ? "text-slate-950 bg-slate-100"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active ? "text-amber-600 stroke-[2.5]" : "text-slate-400"
                  }`}
                />
                <span className="leading-none truncate max-w-full">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FOOTER (Flush to Bottom · Zero Empty Gap Above or Below on Mobile & Desktop) */}
      <footer className="mt-auto border-t border-slate-200 bg-white pt-6 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:pb-6">
        <div className="max-w-7xl mx-auto px-4 space-y-4 text-xs text-slate-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg dark-pill flex items-center justify-center p-1 shrink-0">
                <img src={LVBP_OFFICIAL_LOGO} alt="En Juego" className="w-full h-full object-contain" />
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
              <Link href="/lideres" className="hover:text-slate-950">
                Líderes
              </Link>
              <Link href="/noticias" className="hover:text-slate-950">
                Noticias
              </Link>
              <Link href="/teams?team=leones" className="hover:text-slate-950">
                Equipos
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
            EnJuego es un portal deportivo independiente desarrollado con fines informativos y periodísticos para los aficionados del béisbol y el fútbol. No está afiliado, respaldado, autorizado ni patrocinado de manera alguna por la LVBP, LIDOM, LMP, MLB, UEFA ni por ninguno de sus clubes u organizaciones asociadas. Todos los nombres de equipos, logotipos, emblemas y marcas comerciales exhibidas pertenecen exclusivamente a sus respectivos titulares y se utilizan únicamente para la identificación informativa bajo el principio de uso legítimo (fair use).
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
