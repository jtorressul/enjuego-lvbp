"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  MapPin,
  Megaphone,
  Monitor,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import {
  AD_SLOTS_CATALOG,
  type AdCampaign,
  type AdClickLogEntry,
  type AdSlotInfo,
  type CanonicalSlotKey,
  LIVE_WINDOW_SECONDS,
  type LiveSession,
  type TrafficDaySummary,
  type MonthlyTrafficSummary,
} from "@/lib/admin-types";

function formatSessionDeviceLabel(s: LiveSession): string {
  const hardware =
    s.deviceModel?.trim() ||
    (s.device === "mobile" ? "Móvil" : "Escritorio");
  const browser = s.browser
    ? `${s.browser}${s.browserVersion ? ` ${s.browserVersion}` : ""}`
    : "";
  const os = s.os
    ? `${s.os}${s.platformVersion ? ` ${s.platformVersion}` : ""}`
    : "";
  return [hardware, browser, os].filter(Boolean).join(" · ");
}
import type { UserProfile } from "@/lib/user-auth";
import dynamic from "next/dynamic";

const SocialCardGenerator = dynamic(
  () =>
    import("@/components/admin/SocialCardGenerator").then(
      (m) => m.SocialCardGenerator
    ),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-bold">Cargando Generador de Artes…</p>
      </div>
    ),
  }
);

const PushNotificationSender = dynamic(
  () =>
    import("@/components/admin/PushNotificationSender").then(
      (m) => m.PushNotificationSender
    ),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs font-bold">Cargando Centro de Notificaciones…</p>
      </div>
    ),
  }
);

type EnrichedCampaign = AdCampaign & {
  live?: boolean;
  todayImpressions?: number;
  todayClicks?: number;
};

// Processes uploaded banner images: keeps animated GIFs intact, and optimizes PNG/JPG/WebP to 970x90 friendly size
async function processBannerImageFile(file: File): Promise<string> {
  // If it's a GIF, preserve it as data URL so animated GIFs keep their animation (like Mi Odontologo on jugadaenvivo.com)
  if (file.type === "image/gif") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(String(e.target?.result || ""));
      reader.onerror = () => reject(new Error("Error al leer el archivo GIF"));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 1640;
        const maxH = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/webp", 0.9);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = String(e.target?.result || "");
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function AdminDashboardPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [activeTab, setActiveTab] = useState<
    "ads" | "generator" | "push" | "users" | "system"
  >("ads");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dashboard Data
  const [slots, setSlots] = useState<AdSlotInfo[]>(AD_SLOTS_CATALOG);
  const [campaigns, setCampaigns] = useState<EnrichedCampaign[]>([]);
  const [clickLog, setClickLog] = useState<AdClickLogEntry[]>([]);
  const [presence, setPresence] = useState<{
    sessions: LiveSession[];
    onlineCount: number;
    mobileCount: number;
    desktopCount: number;
    registeredOnlineCount: number;
    todayUniqueVisitors: number;
    todayMobileVisitors?: number;
    todayDesktopVisitors?: number;
    todayPageViews?: number;
    todayPeakOnline: number;
    sectionHits?: Record<string, number>;
    osHits?: Record<string, number>;
    todayCountryHits?: Record<string, number>;
    todayRegionHits?: Record<string, number>;
    liveCountryHits?: Record<string, number>;
    liveRegionHits?: Record<string, number>;
    trafficHistory?: TrafficDaySummary[];
    currentMonthKey?: string;
    currentMonthLabel?: string;
    currentMonthVisitors?: number;
    currentMonthPageViews?: number;
    currentMonthMobileVisitors?: number;
    currentMonthDesktopVisitors?: number;
    currentMonthPeakOnline?: number;
    currentMonthDaysCounted?: number;
    currentMonthAvgDaily?: number;
    monthlyHistory?: MonthlyTrafficSummary[];
  }>({
    sessions: [],
    onlineCount: 0,
    mobileCount: 0,
    desktopCount: 0,
    registeredOnlineCount: 0,
    todayUniqueVisitors: 0,
    todayMobileVisitors: 0,
    todayDesktopVisitors: 0,
    todayPageViews: 0,
    todayPeakOnline: 0,
    sectionHits: {},
    osHits: {},
    todayCountryHits: {},
    todayRegionHits: {},
    liveCountryHits: {},
    liveRegionHits: {},
    trafficHistory: [],
    currentMonthKey: "",
    currentMonthLabel: "",
    currentMonthVisitors: 0,
    currentMonthPageViews: 0,
    currentMonthMobileVisitors: 0,
    currentMonthDesktopVisitors: 0,
    currentMonthPeakOnline: 0,
    currentMonthDaysCounted: 0,
    currentMonthAvgDaily: 0,
    monthlyHistory: [],
  });
  const [geoTab, setGeoTab] = useState<"live" | "today">("today");
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [systemHealth, setSystemHealth] = useState<{
    kvConnected: boolean;
    mlbApiStatus: "online" | "degraded";
    mlbLatencyMs: number;
    kvLatencyMs: number;
    serverTimeCaracas: string;
  } | null>(null);

  // "Nuevo anuncio" Form State (Exact jugadaenvivo.com/panel fields)
  const [newSlot, setNewSlot] = useState<CanonicalSlotKey>("general");
  const [newName, setNewName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newStartsOn, setNewStartsOn] = useState("");
  const [newEndsOn, setNewEndsOn] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [publishingNew, setPublishingNew] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [passChangeMsg, setPassChangeMsg] = useState("");

  const fetchAdminData = useCallback(
    async (pwdToUse: string, silent = false) => {
      if (!pwdToUse) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/admin", {
          headers: {
            "x-admin-password": pwdToUse,
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          setAuthenticated(false);
          setAuthError("Contraseña incorrecta.");
          window.localStorage.removeItem("enjuego_admin_pwd");
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || "Error al conectar con el servidor");
          return;
        }

        setAuthenticated(true);
        setAuthError("");
        window.localStorage.setItem("enjuego_admin_pwd", pwdToUse);

        if (Array.isArray(data.slots)) setSlots(data.slots);
        if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
        if (Array.isArray(data.clickLog)) setClickLog(data.clickLog);
        if (data.presence) setPresence(data.presence);
        if (Array.isArray(data.registeredUsers)) setRegisteredUsers(data.registeredUsers);
        if (data.systemHealth) setSystemHealth(data.systemHealth);
      } catch {
        if (!silent) setAuthError("Error de red al consultar /api/admin");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("enjuego_admin_pwd");
    if (saved) {
      setPassword(saved);
      fetchAdminData(saved, false);
    }
  }, [fetchAdminData]);

  useEffect(() => {
    if (!authenticated || !autoRefresh || !password) return;
    const timer = setInterval(() => {
      fetchAdminData(password, true);
    }, 10_000);
    return () => clearInterval(timer);
  }, [authenticated, autoRefresh, password, fetchAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    await fetchAdminData(password, false);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("enjuego_admin_pwd");
    setAuthenticated(false);
    setPassword("");
  };

  const selectedSlotInfo = useMemo(
    () => slots.find((s) => s.key === newSlot) || slots[0],
    [slots, newSlot]
  );

  const handleNewFileSelect = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await processBannerImageFile(file);
      setNewImageUrl(dataUrl);
      setNewFileName(file.name);
    } catch (err: any) {
      alert(err?.message || "No se pudo leer la imagen");
    }
  };

  // Publish new ad (exact #ad-form in jugadaenvivo.com)
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Escribe el nombre del anunciante o campaña.");
      return;
    }
    if (!newImageUrl) {
      alert("Elige una imagen (PNG, JPG, WebP o GIF) para publicar el anuncio.");
      return;
    }
    setPublishingNew(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "create_ad",
          slot: newSlot,
          name: newName.trim(),
          companyName: newName.trim(),
          linkUrl: newLinkUrl.trim(),
          startsOn: newStartsOn,
          endsOn: newEndsOn,
          imageUrl: newImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo publicar el anuncio");
      setCampaigns(data.campaigns);
      setNewName("");
      setNewLinkUrl("");
      setNewStartsOn("");
      setNewEndsOn("");
      setNewImageUrl("");
      setNewFileName("");
      setStatusMessage("¡Anuncio publicado!");
      setTimeout(() => setStatusMessage(""), 4500);
    } catch (err: any) {
      alert(err?.message || "Error al publicar anuncio");
    } finally {
      setPublishingNew(false);
    }
  };

  // Update a field on an existing ad immediately (like jugadaenvivo.com)
  const handleUpdateAd = async (
    id: string,
    updates: Partial<AdCampaign>
  ) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "update_ad",
          id,
          ...updates,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
        setStatusMessage("Cambios guardados en el anuncio.");
        setTimeout(() => setStatusMessage(""), 3000);
      }
    } catch {
      // ignore
    }
  };

  const handleReplaceAdImage = async (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await processBannerImageFile(file);
      await handleUpdateAd(id, { imageUrl: dataUrl });
    } catch (err: any) {
      alert(err?.message || "Error al subir imagen");
    }
  };

  const handleDeleteAd = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar el anuncio "${name}" y sus estadísticas?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "delete_ad",
          id,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
      }
    } catch {
      // ignore
    }
  };

  const handleResetMetrics = async (campaignId?: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "reset_metrics",
          campaignId,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
      }
    } catch {
      // ignore
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeMsg("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "change_password",
          newPassword: newAdminPass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar clave");
      setPassword(newAdminPass);
      window.localStorage.setItem("enjuego_admin_pwd", newAdminPass);
      setNewAdminPass("");
      setPassChangeMsg("¡Contraseña actualizada correctamente!");
    } catch (err: any) {
      setPassChangeMsg(err?.message || "Error al cambiar contraseña");
    }
  };

  const handleClearClickLog = async () => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "clear_click_log",
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.clickLog)) {
        setClickLog(data.clickLog);
        setStatusMessage("Registro de clics limpiado.");
        setTimeout(() => setStatusMessage(""), 3000);
      }
    } catch {
      // ignore
    }
  };

  const handleCopySponsorReport = async (ad: EnrichedCampaign) => {
    const totalImp = ad.impressions || 0;
    const totalClk = ad.clicks || 0;
    const ctr = totalImp > 0 ? ((totalClk / totalImp) * 100).toFixed(2) : "0.00";
    const mobImp = ad.mobileImpressions || 0;
    const dskImp = ad.desktopImpressions || 0;
    const trackedDevImp = mobImp + dskImp;
    const mobPct =
      trackedDevImp > 0 ? Math.round((mobImp / trackedDevImp) * 100) : 78;
    const dskPct = 100 - mobPct;

    const dateLabel = new Date().toLocaleDateString("es-VE", {
      timeZone: "America/Caracas",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const reportText = [
      `📊 *REPORTE PUBLICITARIO · ENJUEGO.ONLINE*`,
      `🏢 *Anunciante:* ${ad.companyName}`,
      `📅 *Fecha de corte:* ${dateLabel}`,
      `────────────────────`,
      `👁️ *Impresiones Totales:* ${totalImp.toLocaleString("es-VE")} (Hoy: ${(ad.todayImpressions || 0).toLocaleString("es-VE")})`,
      `👆 *Clics al Enlace:* ${totalClk.toLocaleString("es-VE")} (Hoy: ${(ad.todayClicks || 0).toLocaleString("es-VE")})`,
      `📈 *CTR de Conversión:* ${ctr}%`,
      `📱 *Audiencia:* ${mobPct}% Móvil · ${dskPct}% PC`,
      ad.linkUrl ? `🔗 *Destino:* ${ad.linkUrl}` : null,
      `────────────────────`,
      `⚾ *EnJuego.online · LVBP & MLB en Vivo*`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(reportText);
      setStatusMessage(
        `¡Reporte de "${ad.companyName}" copiado al portapapeles para WhatsApp!`
      );
      setTimeout(() => setStatusMessage(""), 4000);
    } catch {
      alert(reportText);
    }
  };

  const handleExportUsersCsv = () => {
    if (registeredUsers.length === 0) {
      alert("No hay usuarios registrados para exportar.");
      return;
    }
    const headers = ["ID", "Nombre", "Usuario", "Correo", "Equipo Favorito", "Fecha Registro"];
    const rows = registeredUsers.map((u) => [
      u.id,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      u.handle,
      u.email || "Acceso Rapido",
      u.favoriteTeam || "LVBP",
      new Date(u.createdAt).toISOString().slice(0, 10),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `usuarios-enjuego-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalImpressions = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0),
    [campaigns]
  );
  const totalClicks = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0),
    [campaigns]
  );
  const todayTotalImpressions = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.todayImpressions || 0), 0),
    [campaigns]
  );
  const todayTotalClicks = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.todayClicks || 0), 0),
    [campaigns]
  );
  const liveAdsCount = useMemo(
    () => campaigns.filter((c) => c.live !== false && c.active).length,
    [campaigns]
  );

  const favoriteTeamsRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of registeredUsers) {
      const key = (u.favoriteTeam || "LVBP").toUpperCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    const total = Math.max(1, registeredUsers.length);
    return Object.entries(counts)
      .map(([team, count]) => ({
        team,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [registeredUsers]);

  const topCountriesList = useMemo(() => {
    const hits =
      geoTab === "live"
        ? presence.liveCountryHits || {}
        : presence.todayCountryHits || {};
    const total = Math.max(
      1,
      Object.values(hits).reduce((acc, v) => acc + v, 0)
    );
    return Object.entries(hits)
      .map(([country, count]) => ({
        country,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [presence, geoTab]);

  const topRegionsList = useMemo(() => {
    const hits =
      geoTab === "live"
        ? presence.liveRegionHits || {}
        : presence.todayRegionHits || {};
    const total = Math.max(
      1,
      Object.values(hits).reduce((acc, v) => acc + v, 0)
    );
    return Object.entries(hits)
      .map(([region, count]) => ({
        region,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [presence, geoTab]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return registeredUsers;
    return registeredUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.favoriteTeam.toLowerCase().includes(q)
    );
  }, [registeredUsers, userSearch]);

  // ============================================================================
  // LOGIN VIEW
  // ============================================================================
  if (!authenticated) {
    return (
      <div className="min-h-dvh bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
          <div
            className="keep-dark p-6 text-center border-b border-slate-800"
            style={{ backgroundColor: "#060a12", color: "#ffffff" }}
          >
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <img
                src="/logo.png"
                alt="EnJuego"
                className="h-10 w-auto object-contain"
              />
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black italic tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#ffffff",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>.online</span>
              </span>
            </div>
            <h1 className="text-lg font-black text-white">
              Panel de Administración
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Publicidad por espacios, usuarios en línea y estado del portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave (ej. enjuego2026)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Clave inicial predeterminada:{" "}
                <code className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  enjuego2026
                </code>{" "}
                (puedes cambiarla adentro).
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black text-sm text-white shadow-md transition cursor-pointer active:scale-98"
              style={{
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                color: "#ffffff",
              }}
            >
              {loading ? "Verificando..." : "Entrar al Panel Admin →"}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/inicio"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Volver a enjuego.online
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN ADMIN DASHBOARD VIEW (JUGADAENVIVO.COM /PANEL WORKFLOW)
  // ============================================================================
  return (
    <div className="min-h-dvh bg-slate-50/75 text-slate-900 pb-20">
      {/* EXECUTIVE TOP BAR */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/inicio"
              className="flex items-center gap-2 group transition opacity-95 hover:opacity-100"
              title="Ir a la web pública"
            >
              <img
                src="/logo.png"
                alt="EnJuego"
                className="h-7 w-auto object-contain shrink-0"
              />
              <span className="text-xs font-semibold tracking-tight text-slate-300 hidden sm:inline">
                Workspace
              </span>
            </Link>
            <span className="text-slate-600 font-light hidden sm:inline">/</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-slate-100">
                Dashboard
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
              title="Activar o pausar actualización automática cada 10 segundos"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              <span className="hidden sm:inline">
                {autoRefresh ? "Sincronizado (10s)" : "Pausado"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => fetchAdminData(password, false)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
              title="Refrescar datos ahora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <Link
              href="/inicio"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Ver Portal</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-transparent hover:border-rose-900/40 text-xs font-medium transition cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Usuarios en Línea
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {presence.onlineCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                activos ahora
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                {presence.mobileCount} móvil
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
                {presence.desktopCount} PC
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Visitantes de Hoy
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {presence.todayUniqueVisitors}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                únicos acumulados
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-700">{presence.todayPageViews || 0}</span> vistas
              <span className="text-slate-300">·</span>
              <span>Pico: <strong className="font-medium text-slate-700">{presence.todayPeakOnline}</strong></span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-indigo-200/80 p-4 sm:p-5 shadow-xs bg-gradient-to-b from-indigo-50/20 to-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                Visitas del Mes
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                <Calendar className="w-3 h-3 text-indigo-500" />
                {presence.currentMonthLabel || "Este mes"}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-600 tabular-nums">
                {(presence.currentMonthVisitors || presence.todayUniqueVisitors || 0).toLocaleString("es-VE")}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                acumuladas
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-medium text-slate-700">
                {(presence.currentMonthPageViews || presence.todayPageViews || 0).toLocaleString("es-VE")}
              </span>{" "}
              vistas
              <span className="text-slate-300">·</span>
              <span>
                Prom:{" "}
                <strong className="font-medium text-slate-700">
                  {(presence.currentMonthAvgDaily || presence.todayUniqueVisitors || 0).toLocaleString("es-VE")}
                </strong>
                /d
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Anuncios en Rotación
              </span>
              <Megaphone className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {liveAdsCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                de {campaigns.length} activos
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-slate-600 font-medium">Rotativo global · Todo el sitio</span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Clicks Totales
              </span>
              <MousePointerClick className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {totalClicks}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({todayTotalClicks} hoy)
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">CTR Global:</span>
              <span className="font-semibold text-emerald-600 tabular-nums">
                {totalImpressions > 0
                  ? ((totalClicks / totalImpressions) * 100).toFixed(2)
                  : "0.00"}%
              </span>
            </div>
          </div>
        </div>

        {/* MODERN SEGMENTED CONTROL TABS */}
        <div className="border-b border-slate-200/80 pb-3">
          <div className="bg-slate-200/70 p-1 rounded-xl border border-slate-200/80 inline-flex flex-wrap gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("ads")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "ads"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-slate-500" />
              <span>Publicidad ({campaigns.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("generator")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "generator"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              <span>Generador de Artes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("push")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "push"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-slate-500" />
              <span>Notificaciones Push</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "users"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Audiencia & Geografía ({presence.onlineCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("system")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "system"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Sistema & Seguridad</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5 flex items-center gap-2.5 text-xs font-semibold text-emerald-900 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ===================================================================
            TAB: GENERADOR DE ARTES DEPORTIVOS (RESULTADO FINAL / JUEGOS DE HOY)
           =================================================================== */}
        {activeTab === "generator" && (
          <SocialCardGenerator campaigns={campaigns} />
        )}

        {/* ===================================================================
            TAB: NOTIFICACIONES PUSH & ANUNCIOS COMERCIALES
           =================================================================== */}
        {activeTab === "push" && (
          <PushNotificationSender adminPassword={password} />
        )}

        {/* ===================================================================
            TAB 1: PUBLICIDAD (ROTATIVO GLOBAL EN TODO EL SITIO + ANALÍTICAS)
           =================================================================== */}
        {activeTab === "ads" && (
          <div className="space-y-6">
            {/* Section 1: Nuevo anuncio */}
            <section className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Nuevo Anuncio · Rotativo Global
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Los anuncios activos rotan automáticamente en toda la web sin repetirse en la misma página.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {liveAdsCount} en emisión · 970×90 px
                </span>
              </div>

              <form onSubmit={handleCreateAd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Anunciante o campaña
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej. TuZapp / San Ignacio / Fly251"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Enlace de destino (opcional)
                    </label>
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://wa.me/... o https://..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Fecha de inicio (opcional)
                    </label>
                    <input
                      type="date"
                      value={newStartsOn}
                      onChange={(e) => setNewStartsOn(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Fecha de vencimiento (opcional)
                    </label>
                    <input
                      type="date"
                      value={newEndsOn}
                      onChange={(e) => setNewEndsOn(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {/* Image Upload Dropzone */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="block text-xs font-semibold text-slate-800">
                        Imagen del Banner (PNG, JPG, WebP o GIF animado)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Medida ideal: 1536×178 px (se muestra a 1102×128 px en PC y 100% en móvil).
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium shadow-2xs cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Elegir archivo</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) =>
                            handleNewFileSelect(e.target.files?.[0])
                          }
                        />
                      </label>
                      {newImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewImageUrl("");
                            setNewFileName("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-medium cursor-pointer transition"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  {newFileName && (
                    <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Archivo listo: {newFileName}</span>
                    </p>
                  )}

                  {newImageUrl && (
                    <div className="pt-1">
                      <img
                        src={newImageUrl}
                        alt="Vista previa"
                        className="max-h-[90px] w-auto rounded-lg border border-slate-200 bg-white object-contain shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={publishingNew}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {publishingNew
                        ? "Publicando…"
                        : "Publicar Anuncio"}
                    </span>
                  </button>
                </div>
              </form>
            </section>

            {/* Section 2: Anuncios publicados + Rendimiento por Campaña */}
            <section className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Campañas y Rendimiento Detallado ({campaigns.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Métricas por dispositivo (Móvil vs PC), ubicaciones y reporte listo para enviar por WhatsApp.
                  </p>
                </div>
                {campaigns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetMetrics()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reiniciar estadísticas</span>
                  </button>
                )}
              </div>

              {campaigns.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-6 text-center text-xs text-slate-500">
                  Aún no hay anuncios configurados. Sube el primero en el formulario superior.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {campaigns.map((ad) => {
                    const isLive = ad.live !== false && ad.active;
                    const stateLabel = !ad.active
                      ? "Pausado"
                      : isLive
                        ? "En emisión"
                        : "Fuera de fechas";
                    const ctr =
                      ad.impressions > 0
                        ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
                        : "0.00";
                    const mobImp = ad.mobileImpressions || 0;
                    const dskImp = ad.desktopImpressions || 0;
                    const trackedImp = mobImp + dskImp;
                    const mobPct =
                      trackedImp > 0
                        ? Math.round((mobImp / trackedImp) * 100)
                        : 0;
                    const dskPct = trackedImp > 0 ? 100 - mobPct : 0;
                    const slotEntries = Object.entries(ad.bySlot || {});

                    return (
                      <article
                        key={ad.id}
                        className={`rounded-xl border p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-start transition shadow-2xs ${
                          isLive
                            ? "border-slate-200/90 bg-white"
                            : "border-slate-200/60 bg-slate-50/70 opacity-85"
                        }`}
                      >
                        {/* Left Preview Thumbnail (3 cols) */}
                        <div className="md:col-span-3 flex flex-col gap-2.5">
                          <div className="rounded-lg overflow-hidden bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center min-h-[85px]">
                            <img
                              src={ad.imageUrl}
                              alt={ad.companyName}
                              className="w-full h-[85px] object-contain"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer text-center shadow-2xs transition">
                              <Upload className="w-3 h-3 text-slate-400" />
                              <span>Cambiar imagen</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) =>
                                  handleReplaceAdImage(ad.id, e.target.files?.[0])
                                }
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => handleCopySponsorReport(ad)}
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 cursor-pointer transition shadow-2xs"
                              title="Copiar reporte ejecutivo listo para pegar en WhatsApp al patrocinador"
                            >
                              <Copy className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiar Reporte Cliente</span>
                            </button>
                          </div>
                        </div>

                        {/* Center Details & Analytics (7 cols) */}
                        <div className="md:col-span-7 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={ad.companyName}
                              onChange={(e) =>
                                setCampaigns((prev) =>
                                  prev.map((item) =>
                                    item.id === ad.id
                                      ? { ...item, companyName: e.target.value }
                                      : item
                                  )
                                )
                              }
                              onBlur={(e) =>
                                handleUpdateAd(ad.id, {
                                  companyName: e.target.value,
                                })
                              }
                              className="text-sm sm:text-base font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none px-1 py-0.5 -ml-1"
                            />
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                !ad.active
                                  ? "bg-slate-100 text-slate-600 border-slate-200"
                                  : isLive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                    : "bg-amber-50 text-amber-800 border-amber-200/80"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  !ad.active
                                    ? "bg-slate-400"
                                    : isLive
                                      ? "bg-emerald-500 animate-pulse"
                                      : "bg-amber-500"
                                }`}
                              />
                              {stateLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 text-[11px] font-medium text-slate-600">
                              Rotativo Global
                            </span>

                            <input
                              type="url"
                              value={ad.linkUrl}
                              onChange={(e) =>
                                setCampaigns((prev) =>
                                  prev.map((item) =>
                                    item.id === ad.id
                                      ? { ...item, linkUrl: e.target.value }
                                      : item
                                  )
                                )
                              }
                              onBlur={(e) =>
                                handleUpdateAd(ad.id, {
                                  linkUrl: e.target.value,
                                })
                              }
                              placeholder="https://enlace-del-cliente..."
                              className="flex-1 min-w-[180px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-700 focus:outline-none focus:border-slate-900 shadow-2xs"
                            />

                            {ad.linkUrl && (
                              <a
                                href={ad.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-xs transition"
                              >
                                <span>Abrir</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Rich Metrics Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs">
                            <div>
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Impresiones
                              </span>
                              <span className="font-semibold text-slate-900 text-sm tabular-nums">
                                {ad.impressions.toLocaleString("es-VE")}
                              </span>
                              <span className="block text-[11px] font-medium text-slate-500 tabular-nums">
                                Hoy: {ad.todayImpressions || 0}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Clics al enlace
                              </span>
                              <span className="font-semibold text-slate-900 text-sm tabular-nums">
                                {ad.clicks.toLocaleString("es-VE")}
                              </span>
                              <span className="block text-[11px] font-medium text-slate-500 tabular-nums">
                                Hoy: {ad.todayClicks || 0}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                CTR
                              </span>
                              <span className="font-semibold text-emerald-600 text-sm tabular-nums">
                                {ctr}%
                              </span>
                              <span className="block text-[11px] text-slate-500 font-normal">
                                Conversión
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Dispositivos
                              </span>
                              {trackedImp > 0 ? (
                                <>
                                  <span className="font-medium text-slate-800 text-xs tabular-nums">
                                    {mobPct}% Móvil · {dskPct}% PC
                                  </span>
                                  <span className="block text-[11px] text-slate-500 tabular-nums">
                                    {ad.mobileClicks || 0} móv · {ad.desktopClicks || 0} PC
                                  </span>
                                </>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  Sin datos aún
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Per-slot breakdown pills */}
                          {slotEntries.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mr-1">
                                Por slot:
                              </span>
                              {slotEntries.map(([slotKey, stat]) => (
                                <span
                                  key={slotKey}
                                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-medium text-slate-600 shadow-2xs tabular-nums"
                                >
                                  {slotKey}: <strong className="text-slate-900 font-semibold">{stat.impressions}</strong> imp · <strong className="text-emerald-700 font-semibold">{stat.clicks}</strong> clics
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Date range inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 max-w-sm">
                            <label className="block text-[11px] font-medium text-slate-600">
                              Desde
                              <input
                                type="date"
                                value={ad.startsOn || ""}
                                onChange={(e) =>
                                  handleUpdateAd(ad.id, {
                                    startsOn: e.target.value,
                                  })
                                }
                                className="mt-1 block w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                              />
                            </label>
                            <label className="block text-[11px] font-medium text-slate-600">
                              Hasta
                              <input
                                type="date"
                                value={ad.endsOn || ""}
                                onChange={(e) =>
                                  handleUpdateAd(ad.id, {
                                    endsOn: e.target.value,
                                  })
                                }
                                className="mt-1 block w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Right Actions (2 cols: Pausar/Activar & Eliminar) */}
                        <div className="md:col-span-2 flex md:flex-col items-end justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateAd(ad.id, { active: !ad.active })
                            }
                            className={`inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer shadow-2xs ${
                              ad.active
                                ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600"
                            }`}
                          >
                            {ad.active ? (
                              <>
                                <Pause className="w-3.5 h-3.5 text-slate-500" />
                                <span>Pausar</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Activar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAd(ad.id, ad.companyName)
                            }
                            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Registro de Clics Publicitarios en Tiempo Real */}
            <section className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-slate-500" />
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                      Auditoría de Clics en Tiempo Real ({clickLog.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Últimos clics registrados en banners con hora de Caracas, dispositivo, sistema y página de origen.
                    </p>
                  </div>
                </div>

                {clickLog.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearClickLog}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpiar historial</span>
                  </button>
                )}
              </div>

              {clickLog.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-6 text-center text-xs text-slate-500">
                  Aún no se han registrado clics en esta sesión. Cada interacción aparecerá aquí en tiempo real.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-2.5 px-3">Hora (VET)</th>
                        <th className="py-2.5 px-3">Anunciante</th>
                        <th className="py-2.5 px-3">Dispositivo / SO</th>
                        <th className="py-2.5 px-3">Slot</th>
                        <th className="py-2.5 px-3">Página Origen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clickLog.slice(0, 35).map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-700 tabular-nums">
                            {entry.timeCaracas ||
                              new Date(entry.timestamp).toLocaleTimeString(
                                "es-VE",
                                {
                                  timeZone: "America/Caracas",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }
                              )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {entry.campaignName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="font-medium">
                              {entry.device === "mobile" ? "Móvil" : "Desktop"}
                            </span>
                            <span className="text-slate-400"> · {entry.os}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 font-mono text-[10px] font-medium text-slate-600">
                              {entry.slot}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {entry.pagePath}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================================================================
            TAB 2: USUARIOS EN LÍNEA, TRÁFICO Y AUDIENCIA
           =================================================================== */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Banner Destacado: Conteo Mensual de Visitas */}
            <div className="rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-900/40 p-5 text-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">
                      Contador de Visitas Mensuales
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      {presence.currentMonthLabel || "Mes en curso"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Tráfico y Rendimiento Acumulado del Mes
                  </h3>
                </div>
                <div className="text-xs text-slate-400">
                  <span>Días con actividad: <strong className="text-white font-semibold">{presence.currentMonthDaysCounted || 1}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Visitas Únicas del Mes
                  </span>
                  <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tabular-nums">
                    {(presence.currentMonthVisitors || presence.todayUniqueVisitors || 0).toLocaleString("es-VE")}
                  </p>
                  <p className="text-[11px] text-indigo-300 mt-1">
                    {(presence.currentMonthMobileVisitors || presence.todayMobileVisitors || 0).toLocaleString("es-VE")} móvil · {(presence.currentMonthDesktopVisitors || presence.todayDesktopVisitors || 0).toLocaleString("es-VE")} PC
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Páginas Vistas del Mes
                  </span>
                  <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tabular-nums">
                    {(presence.currentMonthPageViews || presence.todayPageViews || 0).toLocaleString("es-VE")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Navegación e impresiones total
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Promedio Diario
                  </span>
                  <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tabular-nums">
                    {(presence.currentMonthAvgDaily || presence.todayUniqueVisitors || 0).toLocaleString("es-VE")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    visitas únicas por día
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Pico Máximo del Mes
                  </span>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1 tabular-nums">
                    {(presence.currentMonthPeakOnline || presence.todayPeakOnline || 0).toLocaleString("es-VE")}
                  </p>
                  <p className="text-[11px] text-emerald-300/80 mt-1">
                    concurrentes simultáneos
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-KPIs de Audiencia Hoy */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Visitantes Únicos Hoy
                </span>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                  {presence.todayUniqueVisitors}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                  {presence.todayMobileVisitors || 0} Móvil · {presence.todayDesktopVisitors || 0} Desktop
                </p>
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Páginas Vistas Hoy
                </span>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                  {(presence.todayPageViews || 0).toLocaleString("es-VE")}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                  Navegación acumulada del día
                </p>
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Pico Simultáneo Hoy
                </span>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 mt-1 tabular-nums">
                  {presence.todayPeakOnline}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                  Máximo de usuarios concurrentes
                </p>
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Comunidad Registrada
                </span>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                  {registeredUsers.length}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100">
                  {presence.registeredOnlineCount} conectados ahora
                </p>
              </div>
            </div>

            {/* Usuarios en línea ahora mismo */}
            <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Usuarios en Línea Ahora Mismo ({presence.onlineCount})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visitantes activos en los últimos {LIVE_WINDOW_SECONDS} segundos en{" "}
                  <strong>enjuego.online</strong>.
                </p>
              </div>

              {presence.sessions.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-6 text-center text-xs text-slate-500">
                  No hay sesiones activas en los últimos {LIVE_WINDOW_SECONDS} segundos.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-2.5 px-3">Usuario / Visitante</th>
                        <th className="py-2.5 px-3">Ubicación</th>
                        <th className="py-2.5 px-3">Equipo</th>
                        <th className="py-2.5 px-3">Viendo Ahora</th>
                        <th className="py-2.5 px-3">Dispositivo / navegador</th>
                        <th className="py-2.5 px-3">Actividad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {presence.sessions.map((s) => {
                        const secAgo = Math.max(
                          1,
                          Math.round((Date.now() - s.lastSeen) / 1000)
                        );
                        return (
                          <tr key={s.sessionId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    s.isRegistered
                                      ? "bg-emerald-500"
                                      : "bg-slate-400"
                                  }`}
                                />
                                <span>{s.userName}</span>
                                {s.userHandle && (
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    {s.userHandle}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                                <span className="text-sm">{s.flag || "🌐"}</span>
                                <span
                                  className="truncate max-w-[170px] text-xs"
                                  title={s.locationLabel || s.region || s.countryName || "Venezuela"}
                                >
                                  {s.locationLabel || s.region || s.countryName || "Venezuela"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 font-semibold text-[10px] text-slate-700">
                                {s.favoriteTeam || "LVBP"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              <div>{s.sectionLabel}</div>
                              <a
                                href={s.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 font-mono text-[10px] hover:text-amber-700"
                              >
                                {s.path}
                              </a>
                              {Array.isArray(s.recentPaths) && s.recentPaths.length > 1 ? (
                                <div
                                  className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[220px]"
                                  title={s.recentPaths.join(" → ")}
                                >
                                  Reciente: {s.recentPaths.slice(0, 3).join(" → ")}
                                </div>
                              ) : null}
                            </td>
                            <td
                              className="py-2.5 px-3 text-slate-700 max-w-[240px]"
                              title={s.viewport || formatSessionDeviceLabel(s)}
                            >
                              <div className="font-medium leading-snug">
                                {formatSessionDeviceLabel(s)}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {s.isPwa ? (
                                  <span className="px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-[9px] font-semibold text-violet-700">
                                    PWA
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-medium text-slate-600">
                                    Web
                                  </span>
                                )}
                                {s.language ? (
                                  <span className="text-[9px] text-slate-400">{s.language}</span>
                                ) : null}
                              </div>
                              {s.viewport ? (
                                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  {s.viewport}
                                </div>
                              ) : null}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                              <div>hace {secAgo}s</div>
                              {typeof s.pageViews === "number" && s.pageViews > 0 ? (
                                <div className="text-[10px] text-slate-400">
                                  {s.pageViews} vista{s.pageViews === 1 ? "" : "s"}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Desglose Geográfico: Países y Estados/Regiones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Países de los Visitantes */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                        Países de los Visitantes
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {geoTab === "live"
                          ? "Conectados ahora mismo"
                          : "Visitantes únicos acumulados hoy"}
                      </p>
                    </div>
                  </div>

                  {/* Selector En Vivo vs Hoy */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setGeoTab("live")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        geoTab === "live"
                          ? "bg-white text-slate-900 shadow-2xs font-semibold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      En Vivo ({presence.onlineCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeoTab("today")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        geoTab === "today"
                          ? "bg-white text-slate-900 shadow-2xs font-semibold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Hoy ({presence.todayUniqueVisitors})
                    </button>
                  </div>
                </div>

                {topCountriesList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    Esperando visitas geolocalizadas...
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topCountriesList.slice(0, 8).map((item) => (
                      <div key={item.country} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium text-slate-700">
                          <span className="flex items-center gap-1.5">
                            {item.country}
                          </span>
                          <span className="tabular-nums text-slate-600">
                            {item.count} {item.count === 1 ? "visita" : "visitas"} ({item.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full transition-all"
                            style={{ width: `${Math.max(4, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estados y Regiones */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                        Estados / Regiones Más Activas
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Venezuela (por Estado) e Internacional
                      </p>
                    </div>
                  </div>
                </div>

                {topRegionsList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    Esperando datos por estado / región...
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topRegionsList.slice(0, 10).map((item) => (
                      <div key={item.region} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium text-slate-700">
                          <span className="flex items-center gap-1.5">
                            {item.region}
                          </span>
                          <span className="tabular-nums text-slate-600">
                            {item.count} {item.count === 1 ? "visita" : "visitas"} ({item.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${Math.max(4, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desglose de Secciones Más Vistas, Sistemas Operativos y Ranking de Equipos Favoritos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Secciones Más Vistas Hoy */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                    Secciones Más Vistas Hoy
                  </h3>
                </div>
                {Object.keys(presence.sectionHits || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">
                    Sin datos registrados aún hoy.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(presence.sectionHits || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([sec, hits]) => {
                        const totalHits = Math.max(
                          1,
                          Object.values(presence.sectionHits || {}).reduce(
                            (acc, v) => acc + v,
                            0
                          )
                        );
                        const pct = Math.round((hits / totalHits) * 100);
                        return (
                          <div key={sec} className="space-y-1 text-xs">
                            <div className="flex justify-between font-medium text-slate-700">
                              <span className="truncate max-w-[150px]">{sec}</span>
                              <span className="tabular-nums text-slate-600">
                                {hits} vistas ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-slate-900 rounded-full transition-all"
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Sistemas Operativos Hoy */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                    Sistemas Operativos (Hoy)
                  </h3>
                </div>
                {Object.keys(presence.osHits || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">
                    Sin datos registrados aún hoy.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(presence.osHits || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([osName, hits]) => {
                        const totalOs = Math.max(
                          1,
                          Object.values(presence.osHits || {}).reduce(
                            (acc, v) => acc + v,
                            0
                          )
                        );
                        const pct = Math.round((hits / totalOs) * 100);
                        return (
                          <div key={osName} className="space-y-1 text-xs">
                            <div className="flex justify-between font-medium text-slate-700">
                              <span>{osName}</span>
                              <span className="tabular-nums text-slate-600">
                                {hits} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-sky-600 rounded-full transition-all"
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Ranking de Equipos Favoritos de los Usuarios Registrados */}
              <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                    Fanaticada por Equipo ({registeredUsers.length})
                  </h3>
                </div>
                {favoriteTeamsRanking.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">
                    Aún no hay fanáticos registrados.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {favoriteTeamsRanking.slice(0, 8).map((item) => (
                      <div key={item.team} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium text-slate-700">
                          <span>{item.team}</span>
                          <span className="tabular-nums text-slate-600">
                            {item.count} fans ({item.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${Math.max(5, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de Visitas Mensuales (Acumulado por Mes) */}
            {Array.isArray(presence.monthlyHistory) &&
              presence.monthlyHistory.length > 0 && (
                <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                        Histórico de Visitas Mensuales (Acumulado por Mes)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Consolidado mensual de visitas únicas acumuladas, páginas vistas, promedio diario y picos concurrentes.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                          <th className="py-2.5 px-3">Mes</th>
                          <th className="py-2.5 px-3">Visitas Únicas</th>
                          <th className="py-2.5 px-3">Móvil / Desktop</th>
                          <th className="py-2.5 px-3">Páginas Vistas</th>
                          <th className="py-2.5 px-3">Promedio Diario</th>
                          <th className="py-2.5 px-3">Pico Simultáneo</th>
                          <th className="py-2.5 px-3">Días Registrados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {presence.monthlyHistory.map((m) => {
                          const isCurrent = m.monthKey === presence.currentMonthKey;
                          return (
                            <tr
                              key={m.monthKey}
                              className={`transition-colors ${
                                isCurrent
                                  ? "bg-indigo-50/40 hover:bg-indigo-50/60"
                                  : "hover:bg-slate-50/70"
                              }`}
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span>{m.monthLabel}</span>
                                  {isCurrent && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                      En curso
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 tabular-nums">
                                {m.uniqueVisitors.toLocaleString("es-VE")}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium tabular-nums">
                                {m.mobileVisitors.toLocaleString("es-VE")} móv · {m.desktopVisitors.toLocaleString("es-VE")} PC
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-900 tabular-nums">
                                {m.pageViews.toLocaleString("es-VE")}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium tabular-nums">
                                {m.avgDailyVisitors.toLocaleString("es-VE")}/día
                              </td>
                              <td className="py-2.5 px-3 font-medium text-emerald-600 tabular-nums">
                                {m.peakOnline} concurrentes
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                                {m.daysCounted} {m.daysCounted === 1 ? "día" : "días"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Histórico de Tráfico Diario (Últimos 30 días) */}
            {Array.isArray(presence.trafficHistory) &&
              presence.trafficHistory.length > 0 && (
                <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                        Histórico de Tráfico Diario (Últimos 30 días)
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Evolución diaria de visitantes únicos, páginas vistas y pico de usuarios conectados simultáneamente.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Visitantes Únicos</th>
                          <th className="py-2.5 px-3">Móvil / Desktop</th>
                          <th className="py-2.5 px-3">Páginas Vistas</th>
                          <th className="py-2.5 px-3">Pico Simultáneo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {presence.trafficHistory.map((day) => (
                          <tr key={day.dateKey} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-slate-700 tabular-nums">
                              {day.dateKey}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 tabular-nums">
                              {day.uniqueVisitors.toLocaleString("es-VE")}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium tabular-nums">
                              {day.mobileVisitors} móv · {day.desktopVisitors} PC
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 tabular-nums">
                              {day.pageViews.toLocaleString("es-VE")}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-emerald-600 tabular-nums">
                              {day.peakOnline} concurrentes
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Tabla de Usuarios Registrados + Exportar CSV */}
            <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Usuarios Registrados ({registeredUsers.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Busca por nombre, correo, usuario o equipo favorito, o descarga la base de datos en CSV.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar usuario o correo..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportUsersCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer transition shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-6 text-center text-xs text-slate-500">
                  No hay usuarios registrados que coincidan con la búsqueda.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Usuario</th>
                        <th className="py-2.5 px-3">Correo</th>
                        <th className="py-2.5 px-3">Equipo</th>
                        <th className="py-2.5 px-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {u.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {u.handle}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {u.email || "Acceso Rápido"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 font-semibold text-[10px] text-slate-700">
                              {u.favoriteTeam}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                            {new Date(u.createdAt).toLocaleDateString("es-VE")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: SISTEMA Y SEGURIDAD
           =================================================================== */}
        {activeTab === "system" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  Estado Técnico de enjuego.online
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-200/80">
                  <span className="font-medium text-slate-700">
                    Almacenamiento Híbrido (Edge Cache + KV)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {systemHealth?.kvConnected
                      ? `Conectado (${systemHealth.kvLatencyMs} ms)`
                      : "Modo Local"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-200/80">
                  <span className="font-medium text-slate-700">
                    Feed de Datos Béisbol (StatsAPI)
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium border tabular-nums ${
                      systemHealth?.mlbApiStatus === "online"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : "bg-amber-50 text-amber-800 border-amber-200/60"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        systemHealth?.mlbApiStatus === "online"
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-amber-500"
                      }`}
                    />
                    {systemHealth?.mlbApiStatus === "online"
                      ? `En Línea (${systemHealth.mlbLatencyMs} ms)`
                      : "Latencia Alta"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-200/80">
                  <span className="font-medium text-slate-700">
                    Hora del Servidor (Caracas VET)
                  </span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    {systemHealth?.serverTimeCaracas || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  Seguridad y Acceso al Panel
                </h2>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Nueva contraseña maestra para /admin
                  </label>
                  <input
                    type="password"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    placeholder="Escribe tu nueva contraseña..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs"
                    required
                    minLength={4}
                  />
                </div>

                {passChangeMsg && (
                  <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{passChangeMsg}</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer shadow-xs"
                >
                  Actualizar Contraseña
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
