"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Lock,
  LogOut,
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
  type LiveSession,
  type TrafficDaySummary,
} from "@/lib/admin-store";
import type { UserProfile } from "@/lib/user-auth";
import { SocialCardGenerator } from "@/components/admin/SocialCardGenerator";

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
    "ads" | "generator" | "users" | "system"
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
    trafficHistory?: TrafficDaySummary[];
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
    trafficHistory: [],
  });
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
    <div className="min-h-dvh bg-slate-100 text-slate-900 pb-20">
      {/* TOP BAR */}
      <header
        className="keep-dark sticky top-0 z-40 border-b border-slate-800 shadow-md"
        style={{ backgroundColor: "#060a12", color: "#ffffff" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/inicio"
              className="flex items-center gap-1.5 group"
              title="Ir a la web pública"
            >
              <img
                src="/logo.png"
                alt="EnJuego"
                className="h-8 sm:h-9 w-auto object-contain"
              />
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black italic"
                style={{
                  background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  color: "#ffffff",
                }}
              >
                .online
              </span>
            </Link>
            <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30">
              Panel
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
              title="Activar o pausar actualización automática cada 10 segundos"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              <span className="hidden sm:inline">En Vivo (10s)</span>
            </button>

            <button
              type="button"
              onClick={() => fetchAdminData(password, false)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Refrescar datos ahora mismo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <Link
              href="/inicio"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ver Web</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Usuarios en Línea
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {presence.onlineCount}
              </span>
              <span className="text-xs font-bold text-slate-500">
                conectados ahora
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-rose-600" />
                {presence.mobileCount} Móvil
              </span>
              <span className="inline-flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5 text-sky-600" />
                {presence.desktopCount} PC
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Tráfico de Hoy
              </span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {presence.todayUniqueVisitors}
              </span>
              <span className="text-xs font-bold text-slate-500">
                visitantes únicos hoy
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
              <span>{presence.todayPageViews || 0} págs vistas</span>
              <span>· Pico: {presence.todayPeakOnline}</span>
              <span>· {registeredUsers.length} reg.</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Anuncios en Emisión
              </span>
              <Megaphone className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {liveAdsCount}
              </span>
              <span className="text-xs font-bold text-slate-500">
                de {campaigns.length} publicados
              </span>
            </div>
            <div className="mt-2 text-[11px] font-bold text-slate-500">
              Hoy: <strong className="text-slate-900">{todayTotalImpressions}</strong> imp ·{" "}
              <strong className="text-rose-600">{todayTotalClicks}</strong> clics
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Impresiones y Clics
              </span>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-slate-950">
                  {totalClicks}
                </span>
                <span className="text-xs font-bold text-slate-500 ml-1">
                  clics
                </span>
              </div>
              <div className="text-xs font-bold text-slate-400">
                / {totalImpressions} impresiones
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-emerald-700">
              CTR Global:{" "}
              {totalImpressions > 0
                ? ((totalClicks / totalImpressions) * 100).toFixed(2)
                : "0.00"}
              %
            </div>
          </div>
        </div>

        {/* NAVIGATION MENU */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("ads")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "ads"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Publicidad y Analíticas ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("generator")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "generator"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generador de Artes (LVBP & MLB)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "users"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>
              Usuarios, Tráfico y Audiencia ({presence.onlineCount} online)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "system"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Estado y Ajustes</span>
          </button>
        </div>

        {statusMessage && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-3.5 flex items-center gap-2.5 text-xs sm:text-sm font-black text-emerald-900 shadow-xs">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
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
            TAB 1: PUBLICIDAD (ROTATIVO GLOBAL EN TODO EL SITIO + ANALÍTICAS)
           =================================================================== */}
        {activeTab === "ads" && (
          <div className="space-y-6">
            {/* Section 1: Nuevo anuncio */}
            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Nuevo anuncio · Todo el sitio (Rotativo)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Todos los anuncios activos rotan al azar en toda la web (PC y móvil) sin repetirse en la misma página.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                  {liveAdsCount} en emisión · 970x90 px
                </span>
              </div>

              <form onSubmit={handleCreateAd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Anunciante o campaña
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ej. TuZapp / San Ignacio / Fly251"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Enlace al hacer clic (opcional)
                    </label>
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://wa.me/... o https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Desde (opcional)
                    </label>
                    <input
                      type="date"
                      value={newStartsOn}
                      onChange={(e) => setNewStartsOn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Hasta (opcional)
                    </label>
                    <input
                      type="date"
                      value={newEndsOn}
                      onChange={(e) => setNewEndsOn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Image Upload (PNG, JPG, WebP or Animated GIF) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="block text-xs font-extrabold uppercase text-slate-700">
                        Imagen (PNG, JPG, WebP o GIF)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Medida ideal: 1536×178 px (se muestra a 1102×128 px en PC y 100% en móvil · soporta GIF animado).
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
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
                          className="px-3 py-2 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  {newFileName && (
                    <p className="text-xs font-bold text-emerald-700">
                      ✓ Archivo listo: {newFileName}
                    </p>
                  )}

                  {newImageUrl && (
                    <div className="pt-1">
                      <img
                        src={newImageUrl}
                        alt="Vista previa"
                        className="max-h-[90px] w-auto rounded-lg border border-slate-300 bg-white object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={publishingNew}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs sm:text-sm font-black shadow-md transition cursor-pointer active:scale-98"
                    style={{
                      background:
                        "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {publishingNew
                        ? "Publicando…"
                        : "Publicar anuncio"}
                    </span>
                  </button>
                </div>
              </form>
            </section>

            {/* Section 2: Anuncios publicados + Rendimiento por Campaña */}
            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Campañas y Rendimiento Detallado ({campaigns.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Desglose por dispositivo (Móvil vs PC), ubicación en página y reporte listo para enviar al cliente por WhatsApp.
                  </p>
                </div>
                {campaigns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetMetrics()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reiniciar todas las estadísticas
                  </button>
                )}
              </div>

              {campaigns.length === 0 ? (
                <p className="text-xs font-bold text-slate-500 py-6 text-center">
                  Aún no hay anuncios. Sube el primero arriba.
                </p>
              ) : (
                <div className="space-y-4">
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
                        className={`rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start transition ${
                          isLive
                            ? "border-rose-200 bg-white"
                            : "border-slate-200 bg-slate-50/80 opacity-80"
                        }`}
                      >
                        {/* Left Preview Thumbnail (3 cols) */}
                        <div className="md:col-span-3 flex flex-col gap-2">
                          <img
                            src={ad.imageUrl}
                            alt={ad.companyName}
                            className="w-full h-[90px] object-contain rounded-lg bg-slate-100 border border-slate-200 p-1"
                          />

                          <label className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-bold text-slate-700 cursor-pointer text-center">
                            <Upload className="w-3 h-3" />
                            <span>Cambiar imagen (970x90)</span>
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
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-black text-emerald-800 cursor-pointer transition"
                            title="Copiar reporte ejecutivo listo para pegar en WhatsApp al patrocinador"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-600" />
                            <span>📲 Copiar Reporte Cliente</span>
                          </button>
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
                              className="text-sm sm:text-base font-black text-slate-950 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-rose-500 focus:outline-none px-1 -ml-1"
                            />
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                isLive
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {stateLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                              Todo el sitio (Rotativo)
                            </span>

                            <span>·</span>

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
                              className="flex-1 min-w-[180px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700"
                            />

                            {ad.linkUrl && (
                              <a
                                href={ad.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-rose-600 font-bold hover:underline"
                              >
                                <span>abrir</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Rich Metrics Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <div>
                              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                                Impresiones
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                {ad.impressions.toLocaleString("es-VE")}
                              </span>
                              <span className="block text-[10px] font-bold text-emerald-700">
                                Hoy: {ad.todayImpressions || 0}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                                Clics al enlace
                              </span>
                              <span className="font-black text-rose-600 text-sm">
                                {ad.clicks.toLocaleString("es-VE")}
                              </span>
                              <span className="block text-[10px] font-bold text-rose-700">
                                Hoy: {ad.todayClicks || 0}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                                Efectividad (CTR)
                              </span>
                              <span className="font-black text-emerald-700 text-sm">
                                {ctr}%
                              </span>
                              <span className="block text-[10px] font-bold text-slate-500">
                                Conversión
                              </span>
                            </div>

                            <div>
                              <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                                Dispositivos
                              </span>
                              {trackedImp > 0 ? (
                                <>
                                  <span className="font-black text-slate-800 text-xs">
                                    📱 {mobPct}% · 💻 {dskPct}%
                                  </span>
                                  <span className="block text-[10px] font-bold text-slate-500">
                                    {ad.mobileClicks || 0} clics móv /{" "}
                                    {ad.desktopClicks || 0} PC
                                  </span>
                                </>
                              ) : (
                                <span className="text-[11px] font-bold text-slate-400">
                                  Acumulando…
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Per-slot breakdown pills */}
                          {slotEntries.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">
                                Por ubicación:
                              </span>
                              {slotEntries.map(([slotKey, stat]) => (
                                <span
                                  key={slotKey}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700"
                                >
                                  {slotKey}: <b>{stat.impressions}</b> imp /{" "}
                                  <b className="text-rose-600">{stat.clicks}</b>{" "}
                                  clics
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Date range inputs (Desde / Hasta) like jugadaenvivo.com */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 max-w-md">
                            <label className="block text-[11px] font-bold text-slate-500">
                              Desde
                              <input
                                type="date"
                                value={ad.startsOn || ""}
                                onChange={(e) =>
                                  handleUpdateAd(ad.id, {
                                    startsOn: e.target.value,
                                  })
                                }
                                className="mt-0.5 block w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                              />
                            </label>
                            <label className="block text-[11px] font-bold text-slate-500">
                              Hasta
                              <input
                                type="date"
                                value={ad.endsOn || ""}
                                onChange={(e) =>
                                  handleUpdateAd(ad.id, {
                                    endsOn: e.target.value,
                                  })
                                }
                                className="mt-0.5 block w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                              ad.active
                                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500"
                            }`}
                          >
                            {ad.active ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
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
            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-5 h-5 text-rose-600" />
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-950">
                      Auditoría de Clics en Tiempo Real ({clickLog.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Últimos clics registrados en tus banners con hora de Caracas, dispositivo, sistema operativo y página donde ocurrió.
                    </p>
                  </div>
                </div>

                {clickLog.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearClickLog}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpiar historial de clics
                  </button>
                )}
              </div>

              {clickLog.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-500">
                  Aún no se han registrado clics individuales en esta sesión. Cuando un visitante toque un banner aparecerá aquí al instante.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold">
                        <th className="py-2.5 px-3">Hora (VET)</th>
                        <th className="py-2.5 px-3">Anunciante</th>
                        <th className="py-2.5 px-3">Dispositivo / SO</th>
                        <th className="py-2.5 px-3">Ubicación (Slot)</th>
                        <th className="py-2.5 px-3">Página Origen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clickLog.slice(0, 35).map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
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
                          <td className="py-2.5 px-3 font-black text-slate-950">
                            {entry.campaignName}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">
                            {entry.device === "mobile" ? "📱 Móvil" : "💻 PC"} ·{" "}
                            <span className="text-slate-500">{entry.os}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-700">
                              {entry.slot}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-rose-700 font-bold">
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
            {/* Sub-KPIs de Audiencia Hoy */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Visitantes Únicos Hoy
                </span>
                <p className="text-2xl font-black text-slate-950 mt-1">
                  {presence.todayUniqueVisitors}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  📱 {presence.todayMobileVisitors || 0} Móvil · 💻{" "}
                  {presence.todayDesktopVisitors || 0} PC
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Páginas Vistas Hoy
                </span>
                <p className="text-2xl font-black text-rose-600 mt-1">
                  {(presence.todayPageViews || 0).toLocaleString("es-VE")}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  Navegación acumulada del día
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Pico Simultáneo Hoy
                </span>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {presence.todayPeakOnline}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  Máximo de usuarios al mismo tiempo
                </p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Comunidad Registrada
                </span>
                <p className="text-2xl font-black text-slate-950 mt-1">
                  {registeredUsers.length}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  {presence.registeredOnlineCount} conectados ahora
                </p>
              </div>
            </div>

            {/* Usuarios en línea ahora mismo */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    Usuarios en línea ahora mismo ({presence.onlineCount})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visitantes activos en los últimos 75 segundos en{" "}
                  <strong>enjuego.online</strong>.
                </p>
              </div>

              {presence.sessions.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-500">
                  No hay sesiones activas en los últimos 75 segundos.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold">
                        <th className="py-2.5 px-3">Usuario / Visitante</th>
                        <th className="py-2.5 px-3">Equipo</th>
                        <th className="py-2.5 px-3">Viendo Ahora</th>
                        <th className="py-2.5 px-3">Dispositivo / SO</th>
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
                          <tr key={s.sessionId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    s.isRegistered
                                      ? "bg-emerald-500"
                                      : "bg-amber-400"
                                  }`}
                                />
                                <span>{s.userName}</span>
                                {s.userHandle && (
                                  <span className="text-slate-400 font-normal">
                                    {s.userHandle}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-black text-[10px] text-slate-700">
                                {s.favoriteTeam || "LVBP"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-rose-700">
                              {s.sectionLabel}{" "}
                              <span className="text-slate-400 font-mono text-[10px]">
                                ({s.path})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-600">
                              {s.device === "mobile" ? "📱 Móvil" : "💻 PC"}
                              {s.os ? ` · ${s.os}` : ""}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              hace {secAgo}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Desglose de Secciones Más Vistas, Sistemas Operativos y Ranking de Equipos Favoritos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Secciones Más Vistas Hoy */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-black text-slate-950">
                  📍 Secciones Más Vistas Hoy
                </h3>
                {Object.keys(presence.sectionHits || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold">
                    Sin datos aún hoy.
                  </p>
                ) : (
                  <div className="space-y-2">
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
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>{sec}</span>
                              <span>
                                {hits} vistas ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-rose-600 rounded-full"
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
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-black text-slate-950">
                  📲 Sistemas Operativos (Hoy)
                </h3>
                {Object.keys(presence.osHits || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold">
                    Sin datos aún hoy.
                  </p>
                ) : (
                  <div className="space-y-2">
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
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>{osName}</span>
                              <span>
                                {hits} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-sky-600 rounded-full"
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
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-black text-slate-950">
                  ⚾ Fanaticada por Equipo ({registeredUsers.length})
                </h3>
                {favoriteTeamsRanking.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold">
                    Aún no hay fanáticos registrados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {favoriteTeamsRanking.slice(0, 8).map((item) => (
                      <div key={item.team} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>{item.team}</span>
                          <span>
                            {item.count} fans ({item.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${Math.max(5, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Histórico de Tráfico Diario (Últimos 14 días) */}
            {Array.isArray(presence.trafficHistory) &&
              presence.trafficHistory.length > 0 && (
                <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-950">
                      📅 Histórico de Tráfico Diario (Últimos 14 días)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Evolución diaria de visitantes únicos, páginas vistas y pico de usuarios conectados simultáneamente.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold">
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3">Visitantes Únicos</th>
                          <th className="py-2 px-3">Móvil / PC</th>
                          <th className="py-2 px-3">Páginas Vistas</th>
                          <th className="py-2 px-3">Pico Simultáneo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {presence.trafficHistory.map((day) => (
                          <tr key={day.dateKey} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {day.dateKey}
                            </td>
                            <td className="py-2 px-3 font-black text-slate-950">
                              {day.uniqueVisitors.toLocaleString("es-VE")}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-bold">
                              📱 {day.mobileVisitors} · 💻 {day.desktopVisitors}
                            </td>
                            <td className="py-2 px-3 font-bold text-rose-700">
                              {day.pageViews.toLocaleString("es-VE")}
                            </td>
                            <td className="py-2 px-3 font-bold text-emerald-700">
                              {day.peakOnline} online
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Tabla de Usuarios Registrados + Exportar CSV */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    Usuarios registrados ({registeredUsers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Busca por nombre, correo, @usuario o equipo favorito, o descarga la base de datos en CSV.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar por nombre, correo, @..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportUsersCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-500">
                  Aún no hay usuarios registrados que coincidan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold">
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Usuario</th>
                        <th className="py-2.5 px-3">Correo</th>
                        <th className="py-2.5 px-3">Equipo</th>
                        <th className="py-2.5 px-3">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-black text-slate-900">
                            {u.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">
                            {u.handle}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {u.email || "Acceso Rápido"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 font-black text-[10px] text-amber-900">
                              {u.favoriteTeam}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
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
            TAB 3: ESTADO Y AJUSTES
           =================================================================== */}
        {activeTab === "system" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-black text-slate-950">
                  Estado Técnico de enjuego.online
                </h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-700">
                    Almacenamiento Híbrido (Edge Cache + KV)
                  </span>
                  <span className="px-2.5 py-1 rounded-full font-black bg-emerald-100 text-emerald-800">
                    {systemHealth?.kvConnected
                      ? `Conectado (${systemHealth.kvLatencyMs} ms)`
                      : "Modo Local"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-700">
                    Feed de Datos Béisbol (StatsAPI)
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full font-black ${
                      systemHealth?.mlbApiStatus === "online"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {systemHealth?.mlbApiStatus === "online"
                      ? `En Línea (${systemHealth.mlbLatencyMs} ms)`
                      : "Lento"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-700">
                    Hora del Servidor (Caracas VET)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {systemHealth?.serverTimeCaracas || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-black text-slate-950">
                  Cambiar Contraseña del Panel
                </h2>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Nueva Contraseña para /admin
                  </label>
                  <input
                    type="password"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    placeholder="Escribe tu nueva contraseña..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                    required
                    minLength={4}
                  />
                </div>

                {passChangeMsg && (
                  <p className="text-xs font-bold text-emerald-700">
                    {passChangeMsg}
                  </p>
                )}

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer"
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
