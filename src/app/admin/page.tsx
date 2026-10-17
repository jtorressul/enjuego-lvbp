"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  Monitor,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import {
  AD_SLOTS_CATALOG,
  type AdCampaign,
  type AdSlotInfo,
  type AdSlotType,
  type LiveSession,
} from "@/lib/admin-store";
import type { UserProfile } from "@/lib/user-auth";

type EnrichedCampaign = AdCampaign & { live?: boolean };

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
        const maxW = 1150;
        const maxH = 360;
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
        const dataUrl = canvas.toDataURL("image/webp", 0.86);
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

  const [activeTab, setActiveTab] = useState<"ads" | "users" | "system">("ads");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dashboard Data
  const [slots, setSlots] = useState<AdSlotInfo[]>(AD_SLOTS_CATALOG);
  const [campaigns, setCampaigns] = useState<EnrichedCampaign[]>([]);
  const [presence, setPresence] = useState<{
    sessions: LiveSession[];
    onlineCount: number;
    mobileCount: number;
    desktopCount: number;
    registeredOnlineCount: number;
    todayUniqueVisitors: number;
    todayPeakOnline: number;
  }>({
    sessions: [],
    onlineCount: 0,
    mobileCount: 0,
    desktopCount: 0,
    registeredOnlineCount: 0,
    todayUniqueVisitors: 0,
    todayPeakOnline: 0,
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
  const [newSlot, setNewSlot] = useState<AdSlotType>("top-leaderboard");
  const [newName, setNewName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newStartsOn, setNewStartsOn] = useState("");
  const [newEndsOn, setNewEndsOn] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
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

  // Publish new ad (like #ad-form in jugadaenvivo.com)
  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("Escribe el nombre del anunciante o campaña.");
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
          companyName: newName.trim(),
          linkUrl: newLinkUrl.trim(),
          startsOn: newStartsOn,
          endsOn: newEndsOn,
          imageUrl: newImageUrl,
          title: newTitle.trim() || newName.trim(),
          subtitle:
            newSubtitle.trim() || "Patrocinador en EnJuego.online",
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
      setNewTitle("");
      setNewSubtitle("");
      setStatusMessage("¡Anuncio publicado y en emisión!");
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

  const totalImpressions = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0),
    [campaigns]
  );
  const totalClicks = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0),
    [campaigns]
  );
  const liveAdsCount = useMemo(
    () => campaigns.filter((c) => c.live !== false && c.active).length,
    [campaigns]
  );

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
                Registros y Visitas
              </span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {registeredUsers.length}
              </span>
              <span className="text-xs font-bold text-slate-500">
                usuarios registrados
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span>Hoy: {presence.todayUniqueVisitors} únicos</span>
              <span>· Pico: {presence.todayPeakOnline}</span>
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
              5 espacios fijos · <strong className="text-emerald-700">970x90 px</strong>
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
                ? ((totalClicks / totalImpressions) * 100).toFixed(1)
                : "0.0"}
              %
            </div>
          </div>
        </div>

        {/* NAVIGATION MENU (Like jugadaenvivo.com/panel) */}
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
            <span>Publicidad ({campaigns.length})</span>
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
              Usuarios en línea ({presence.onlineCount}) y registros (
              {registeredUsers.length})
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
            TAB 1: PUBLICIDAD (EXACT JUGADAENVIVO.COM /PANEL SYSTEM)
           =================================================================== */}
        {activeTab === "ads" && (
          <div className="space-y-6">
            {/* Section 1: Espacios Publicitarios (#ad-slots) */}
            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Publicidad</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  Cada espacio muestra un anuncio vigente a la vez; si hay varios
                  en el mismo espacio, rotan al azar al cargar la página. Los
                  espacios sin anuncio propio muestran uno del rotativo{" "}
                  <strong>&ldquo;Todo el sitio&rdquo;</strong> (o cualquier
                  anuncio activo), sin repetirlo en la misma página.
                </p>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {slots.map((slotItem) => {
                  const countInSlot = campaigns.filter(
                    (ad) => ad.slot === slotItem.key && ad.live !== false && ad.active
                  ).length;

                  return (
                    <li
                      key={slotItem.key}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <strong className="block text-xs sm:text-sm font-black text-slate-900">
                          {slotItem.label}
                        </strong>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {slotItem.where} · <b>{slotItem.size} px</b>
                        </span>
                      </div>
                      <em
                        className={`shrink-0 not-italic text-xs font-extrabold px-2.5 py-1 rounded-full ${
                          countInSlot > 0
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-200/70 text-slate-600"
                        }`}
                      >
                        {countInSlot > 0
                          ? `${countInSlot} en emisión`
                          : slotItem.key === "general"
                            ? "Vacío"
                            : "Libre · usa el rotativo"}
                      </em>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Section 2: Nuevo anuncio (#ad-form) */}
            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <h2 className="text-lg font-black text-slate-950">
                Nuevo anuncio
              </h2>

              <form onSubmit={handleCreateAd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Espacio
                    </label>
                    <select
                      value={newSlot}
                      onChange={(e) => setNewSlot(e.target.value as AdSlotType)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
                    >
                      {slots.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label} ({s.size})
                        </option>
                      ))}
                    </select>
                    {selectedSlotInfo && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Medida recomendada: <b>{selectedSlotInfo.size} px</b>.{" "}
                        {selectedSlotInfo.where}.
                      </p>
                    )}
                  </div>

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
                      placeholder="Ej. San Ignacio / Fly251 / Mi Odontólogo – Octubre"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
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
                        Imagen del Banner (PNG, JPG, WebP o GIF animado · 970x90 px)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sube el arte gráfico horizontal del cliente o pega su URL directa.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Elegir archivo (PNG/JPG/GIF)</span>
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

                  {!newImageUrl && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Si no tienes imagen aún: Título del banner..."
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={newSubtitle}
                        onChange={(e) => setNewSubtitle(e.target.value)}
                        placeholder="Subtítulo opcional..."
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
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

            {/* Section 3: Anuncios publicados (#ad-list - exact jugadaenvivo.com .ad-row layout) */}
            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">
                  Anuncios ({campaigns.length})
                </h2>
                <button
                  type="button"
                  onClick={() => handleResetMetrics()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reiniciar todas las estadísticas
                </button>
              </div>

              {campaigns.length === 0 ? (
                <p className="text-xs font-bold text-slate-500 py-6 text-center">
                  Aún no hay anuncios. Sube el primero arriba.
                </p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((ad) => {
                    const isLive = ad.live !== false && ad.active;
                    const stateLabel = !ad.active
                      ? "Pausado"
                      : isLive
                        ? "En emisión"
                        : "Fuera de fechas";
                    const ctr =
                      ad.impressions > 0
                        ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                        : "0.0";

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
                          {ad.imageUrl ? (
                            <img
                              src={ad.imageUrl}
                              alt={ad.companyName}
                              className="w-full h-[90px] object-contain rounded-lg bg-slate-100 border border-slate-200 p-1"
                            />
                          ) : (
                            <div
                              className="w-full h-[90px] rounded-lg p-2.5 flex flex-col justify-center border border-slate-200"
                              style={{
                                background:
                                  "linear-gradient(110deg, #0b1324 0%, #1e293b 100%)",
                                borderLeft: `4px solid ${ad.accentColor}`,
                                color: "#ffffff",
                              }}
                            >
                              <span
                                className="inline-block self-start px-1.5 py-0.5 rounded text-[8px] font-black uppercase mb-1"
                                style={{ backgroundColor: ad.accentColor }}
                              >
                                {ad.companyName}
                              </span>
                              <p className="text-[11px] font-black text-white line-clamp-2 leading-tight">
                                {ad.title}
                              </p>
                            </div>
                          )}

                          <label className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-bold text-slate-700 cursor-pointer text-center">
                            <Upload className="w-3 h-3" />
                            <span>
                              {ad.imageUrl
                                ? "Cambiar imagen (970x90)"
                                : "Subir imagen (970x90)"}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) =>
                                handleReplaceAdImage(ad.id, e.target.files?.[0])
                              }
                            />
                          </label>
                        </div>

                        {/* Center Details (7 cols) */}
                        <div className="md:col-span-7 space-y-2.5">
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
                            <select
                              value={ad.slot || "general"}
                              onChange={(e) =>
                                handleUpdateAd(ad.id, {
                                  slot: e.target.value as AdSlotType,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                            >
                              {slots.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>

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

                          <p className="text-xs text-slate-700">
                            <b>{ad.impressions}</b> impresiones ·{" "}
                            <b>{ad.clicks}</b> clics · CTR <b>{ctr}%</b>
                          </p>

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
          </div>
        )}

        {/* ===================================================================
            TAB 2: USUARIOS EN LÍNEA Y REGISTROS
           =================================================================== */}
        {activeTab === "users" && (
          <div className="space-y-6">
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
                        <th className="py-2.5 px-3">Dispositivo</th>
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

            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    Usuarios registrados ({registeredUsers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Busca por nombre, correo, @usuario o equipo favorito.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo, @..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
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
