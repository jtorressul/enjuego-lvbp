"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  Megaphone,
  Monitor,
  MousePointerClick,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import type { AdCampaign, AdSlotType, LiveSession } from "@/lib/admin-store";
import type { UserProfile } from "@/lib/user-auth";

const SLOT_LABELS: Record<AdSlotType, string> = {
  "top-leaderboard": "Superior (Inicio)",
  "in-feed": "Intermedio (Secciones)",
  "gameday-sidebar": "Pizarra en Vivo",
};

const PRESET_COLORS = [
  "#e11d48", // Crimson EnJuego
  "#d97706", // Amber LVBP
  "#0284c7", // Sky Blue
  "#059669", // Emerald Green
  "#7c3aed", // Violet
  "#dc2626", // Red
  "#0f172a", // Slate Dark
];

// Client-side image compressor so uploaded banners fit cleanly and load fast from Cloudflare KV
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 1100;
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
        const dataUrl = canvas.toDataURL("image/webp", 0.82);
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
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [activeTab, setActiveTab] = useState<"banners" | "users" | "system">("banners");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Dashboard Data
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [rotationSeconds, setRotationSeconds] = useState<number>(6);
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

        if (!silent && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
        } else if (silent && Array.isArray(data.campaigns)) {
          // Update only live metrics (impressions/clicks) without overwriting unsaved form edits
          setCampaigns((prev) =>
            prev.map((item) => {
              const fresh = data.campaigns.find((f: AdCampaign) => f.id === item.id);
              return fresh
                ? {
                    ...item,
                    impressions: fresh.impressions,
                    clicks: fresh.clicks,
                  }
                : item;
            })
          );
        }

        if (!silent && data.rotationSeconds) {
          setRotationSeconds(Number(data.rotationSeconds) || 6);
        }
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

  // Restore saved admin password on mount
  useEffect(() => {
    const saved = window.localStorage.getItem("enjuego_admin_pwd");
    if (saved) {
      setPassword(saved);
      fetchAdminData(saved, false);
    }
  }, [fetchAdminData]);

  // Auto-refresh live presence & click counters every 10 seconds
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

  const handleCampaignChange = <K extends keyof AdCampaign>(
    id: string,
    field: K,
    value: AdCampaign[K]
  ) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleToggleSlot = (id: string, slot: AdSlotType) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const exists = c.slots.includes(slot);
        const nextSlots = exists
          ? c.slots.filter((s) => s !== slot)
          : [...c.slots, slot];
        return {
          ...c,
          slots: nextSlots.length > 0 ? nextSlots : ["top-leaderboard"],
        };
      })
    );
  };

  const handleImageUpload = async (id: string, file: File | undefined) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      handleCampaignChange(id, "imageUrl", compressed);
      setSaveMessage(
        "Imagen cargada y optimizada. Recuerda pulsar 'Guardar y Publicar'."
      );
    } catch (err: any) {
      alert(err?.message || "No se pudo procesar la imagen");
    }
  };

  const handleAddCompany = () => {
    const nextNum = campaigns.length + 1;
    const newCompany: AdCampaign = {
      id: `emp_${Date.now()}`,
      companyName: `Empresa #${nextNum}`,
      title: "Anuncia tu marca en EnJuego.online",
      subtitle: "Espacio publicitario activo en toda la jornada.",
      ctaText: "Pautar",
      linkUrl: "https://wa.me/",
      imageUrl: "",
      accentColor: PRESET_COLORS[(nextNum - 1) % PRESET_COLORS.length],
      slots: ["top-leaderboard", "in-feed", "gameday-sidebar"],
      active: true,
      impressions: 0,
      clicks: 0,
      updatedAt: Date.now(),
    };
    setCampaigns((prev) => [...prev, newCompany]);
  };

  const handleDeleteCompany = (id: string) => {
    if (campaigns.length <= 1) {
      alert("Debes mantener al menos 1 empresa en la lista.");
      return;
    }
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveCampaigns = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "save_campaigns",
          campaigns,
          rotationSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setCampaigns(data.campaigns);
      setRotationSeconds(data.rotationSeconds);
      setSaveMessage("¡Banners y empresas publicados en vivo exitosamente!");
      setTimeout(() => setSaveMessage(""), 4500);
    } catch (err: any) {
      alert(err?.message || "Error al guardar cambios");
    } finally {
      setSaving(false);
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
  const activeCompaniesCount = useMemo(
    () => campaigns.filter((c) => c.active).length,
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
              Monitoreo en vivo y gestión de empresas anunciantes
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
  // MAIN ADMIN DASHBOARD VIEW
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
              Admin
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
              title="Refrescar datos ahora"
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
          {/* KPI 1: Online Now */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Usuarios en Vivo
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

          {/* KPI 2: Today Traffic & Registered */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Comunidad y Tráfico
              </span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {registeredUsers.length}
              </span>
              <span className="text-xs font-bold text-slate-500">
                cuentas creadas
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span>Hoy: {presence.todayUniqueVisitors} únicos</span>
              <span>· Pico: {presence.todayPeakOnline}</span>
            </div>
          </div>

          {/* KPI 3: Active Companies */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Empresas en Banners
              </span>
              <Megaphone className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950">
                {activeCompaniesCount}
              </span>
              <span className="text-xs font-bold text-slate-500">
                de {campaigns.length} activas
              </span>
            </div>
            <div className="mt-2 text-[11px] font-bold text-slate-500">
              Banners fijos por espacio · <strong className="text-emerald-700">Sin carrusel</strong>
            </div>
          </div>

          {/* KPI 4: Total Banner Performance */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Rendimiento Banners
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
                / {totalImpressions} vistas
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

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("banners")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "banners"
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Megaphone className="w-4 h-4 text-rose-500" />
            <span>Empresas y Banners ({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "users"
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>
              Usuarios en Vivo ({presence.onlineCount}) y Registrados (
              {registeredUsers.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "system"
                ? "bg-slate-950 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Monitoreo y Seguridad</span>
          </button>
        </div>

        {/* ===================================================================
            TAB 1: GESTIÓN DE EMPRESAS Y BANNERS DINÁMICOS
           =================================================================== */}
        {activeTab === "banners" && (
          <div className="space-y-6">
            {/* Global Controls Bar */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-black text-slate-950">
                  Gestor de Empresas y Banners Fijos
                </h2>
                <p className="text-xs text-slate-500">
                  Cada empresa se muestra de forma fija y elegante en su espacio publicitario asignado, sin saltos ni carrusel.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddCompany}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Empresa</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCampaigns}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black shadow-md transition cursor-pointer active:scale-98"
                  style={{
                    background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                  }}
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Guardando..." : "Guardar y Publicar"}</span>
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 flex items-center gap-2.5 text-xs sm:text-sm font-black text-emerald-900 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}

            {/* List of Companies (Default 5 Companies) */}
            <div className="grid grid-cols-1 gap-5">
              {campaigns.map((camp, index) => {
                const ctr =
                  camp.impressions > 0
                    ? ((camp.clicks / camp.impressions) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={camp.id}
                    className={`rounded-2xl bg-white border transition-all shadow-2xs overflow-hidden ${
                      camp.active
                        ? "border-slate-200"
                        : "border-slate-200 opacity-70 bg-slate-50"
                    }`}
                  >
                    {/* Card Top Header */}
                    <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-2xs"
                          style={{ backgroundColor: camp.accentColor }}
                        >
                          #{index + 1}
                        </span>
                        <span className="font-black text-sm text-slate-950">
                          {camp.companyName || `Empresa #${index + 1}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            camp.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {camp.active ? "Activa en Carrusel" : "Pausada"}
                        </span>
                      </div>

                      {/* Metrics & Quick Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            {camp.impressions} vistas
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MousePointerClick className="w-3.5 h-3.5 text-rose-500" />
                            {camp.clicks} clics
                          </span>
                          <span className="text-emerald-700 font-black">
                            ({ctr}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResetMetrics(camp.id)}
                            className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                            title="Reiniciar contador de vistas y clics de esta empresa"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={camp.active}
                            onChange={(e) =>
                              handleCampaignChange(
                                camp.id,
                                "active",
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-extrabold text-slate-700">
                            Mostrar
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleDeleteCompany(camp.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body: Form + Live Preview */}
                    <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Form Fields (7 cols) */}
                      <div className="lg:col-span-7 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                              Nombre de la Empresa / Cliente
                            </label>
                            <input
                              type="text"
                              value={camp.companyName}
                              onChange={(e) =>
                                handleCampaignChange(
                                  camp.id,
                                  "companyName",
                                  e.target.value
                                )
                              }
                              placeholder="Ej. Empresas Polar / Tienda X"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                              Texto del Botón (CTA)
                            </label>
                            <input
                              type="text"
                              value={camp.ctaText}
                              onChange={(e) =>
                                handleCampaignChange(
                                  camp.id,
                                  "ctaText",
                                  e.target.value
                                )
                              }
                              placeholder="Ej. Pautar / Ver Oferta / WhatsApp"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                            Título Principal del Anuncio
                          </label>
                          <input
                            type="text"
                            value={camp.title}
                            onChange={(e) =>
                              handleCampaignChange(camp.id, "title", e.target.value)
                            }
                            placeholder="Ej. 20% de descuento en gorras y camisas para fanáticos"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                            Subtítulo / Descripción Corta
                          </label>
                          <input
                            type="text"
                            value={camp.subtitle}
                            onChange={(e) =>
                              handleCampaignChange(
                                camp.id,
                                "subtitle",
                                e.target.value
                              )
                            }
                            placeholder="Ej. Envíos a toda Venezuela · Escríbenos por WhatsApp"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                            Enlace de Destino (WhatsApp, Instagram o Página Web)
                          </label>
                          <input
                            type="url"
                            value={camp.linkUrl}
                            onChange={(e) =>
                              handleCampaignChange(
                                camp.id,
                                "linkUrl",
                                e.target.value
                              )
                            }
                            placeholder="https://wa.me/58412..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-800"
                          />
                        </div>

                        {/* Image Upload or URL + Brand Color */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                              Banner Gráfico (Opcional: Subir o URL)
                            </label>
                            <div className="flex items-center gap-2">
                              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-black text-slate-800 cursor-pointer shrink-0">
                                <Upload className="w-3.5 h-3.5 text-rose-600" />
                                <span>Subir Imagen</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleImageUpload(camp.id, e.target.files?.[0])
                                  }
                                />
                              </label>
                              {camp.imageUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCampaignChange(camp.id, "imageUrl", "")
                                  }
                                  className="px-2.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                                >
                                  Quitar Imagen
                                </button>
                              ) : (
                                <input
                                  type="text"
                                  value={camp.imageUrl || ""}
                                  onChange={(e) =>
                                    handleCampaignChange(
                                      camp.id,
                                      "imageUrl",
                                      e.target.value
                                    )
                                  }
                                  placeholder="O pega URL https://..."
                                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs"
                                />
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                              Color de Marca
                            </label>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {PRESET_COLORS.map((col) => (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() =>
                                    handleCampaignChange(
                                      camp.id,
                                      "accentColor",
                                      col
                                    )
                                  }
                                  className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                                    camp.accentColor === col
                                      ? "scale-115 border-slate-950"
                                      : "border-transparent"
                                  }`}
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                              <input
                                type="color"
                                value={camp.accentColor}
                                onChange={(e) =>
                                  handleCampaignChange(
                                    camp.id,
                                    "accentColor",
                                    e.target.value
                                  )
                                }
                                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Slot Checkboxes */}
                        <div className="pt-1">
                          <span className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1.5">
                            Ubicaciones donde aparece esta empresa:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                "top-leaderboard",
                                "in-feed",
                                "gameday-sidebar",
                              ] as AdSlotType[]
                            ).map((slotKey) => {
                              const checked = camp.slots.includes(slotKey);
                              return (
                                <button
                                  key={slotKey}
                                  type="button"
                                  onClick={() => handleToggleSlot(camp.id, slotKey)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                                    checked
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-slate-50 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {checked ? "✓ " : ""}
                                  {SLOT_LABELS[slotKey]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Live Banner Preview (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col justify-center bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Vista Previa en Vivo
                        </span>

                        {camp.imageUrl ? (
                          <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 aspect-[21/9] max-h-[120px]">
                            <img
                              src={camp.imageUrl}
                              alt={camp.companyName}
                              className="w-full h-full object-cover"
                            />
                            <span
                              className="absolute top-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase"
                              style={{
                                backgroundColor: "rgba(15,23,42,0.8)",
                                color: "#ffffff",
                              }}
                            >
                              {camp.companyName}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="relative w-full overflow-hidden rounded-2xl p-3.5 shadow-2xs"
                            style={{
                              background:
                                "linear-gradient(110deg, #ffffff 0%, #f8fafc 65%, #fff1f2 100%)",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div
                              className="absolute inset-y-0 left-0 w-1.5"
                              style={{
                                background: `linear-gradient(180deg, ${camp.accentColor} 0%, #0f172a 100%)`,
                              }}
                            />
                            <div className="pl-2.5 flex items-center justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase"
                                    style={{
                                      backgroundColor: `${camp.accentColor}18`,
                                      color: camp.accentColor,
                                    }}
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>{camp.companyName}</span>
                                  </span>
                                </div>
                                <h4 className="text-xs font-black text-slate-950 leading-snug">
                                  {camp.title}
                                </h4>
                                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                                  {camp.subtitle}
                                </p>
                              </div>
                              <span
                                className="px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0"
                                style={{
                                  backgroundColor: camp.accentColor,
                                  color: "#ffffff",
                                }}
                              >
                                {camp.ctaText} →
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: USUARIOS EN VIVO Y DIRECTORIO DE REGISTRADOS
           =================================================================== */}
        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Live Sessions Right Now */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-base sm:text-lg font-black text-slate-950">
                      Usuarios Conectados en este Instante ({presence.onlineCount})
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Muestra todas las personas con{" "}
                    <strong>enjuego.online</strong> abierto en los últimos 75
                    segundos y qué sección están viendo.
                  </p>
                </div>
              </div>

              {presence.sessions.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-500">
                  No hay sesiones activas reportadas en los últimos 75 segundos.
                  Abre otra pestaña en <strong>enjuego.online</strong> para verla
                  aparecer en tiempo real.
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
                        <th className="py-2.5 px-3">Último Pulso</th>
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

            {/* Registered Users Directory */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    Directorio de Usuarios Registrados ({registeredUsers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Todos los fanáticos que han creado cuenta o ingresado en{" "}
                    <strong>enjuego.online</strong>.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo o equipo..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-500">
                  Aún no hay usuarios que coincidan con la búsqueda.
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
                        <th className="py-2.5 px-3">Registro</th>
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
            TAB 3: MONITOREO DE LA WEB Y SEGURIDAD
           =================================================================== */}
        {activeTab === "system" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Health Card */}
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
                    Base de Datos Cloudflare KV (ENJUEGO_KV)
                  </span>
                  <span className="px-2.5 py-1 rounded-full font-black bg-emerald-100 text-emerald-800">
                    {systemHealth?.kvConnected
                      ? `Conectado (${systemHealth.kvLatencyMs} ms)`
                      : "Modo Local / Memoria"}
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
                      : "Lento / Degradado"}
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

            {/* Change Admin Password Card */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-black text-slate-950">
                  Cambiar Contraseña de Administrador
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
