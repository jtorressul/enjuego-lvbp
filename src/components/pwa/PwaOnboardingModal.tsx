"use client";

import React, { useState, useMemo } from "react";
import { X, Sparkles, Bell, Check, User, ArrowRight, Mail, Lock, Search } from "lucide-react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { MLB_TEAMS } from "@/lib/mlb-teams";
import { UserProfile } from "@/lib/user-auth";
import { urlBase64ToUint8Array } from "@/lib/push-config";

interface PwaOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (user: UserProfile, league: "lvbp" | "mlb") => void;
}

export function PwaOnboardingModal({ isOpen, onClose, onComplete }: PwaOnboardingModalProps) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [league, setLeague] = useState<"lvbp" | "mlb">("lvbp");
  const [selectedTeam, setSelectedTeam] = useState<string>("CAR");
  const [mlbSearchQuery, setMlbSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wantNotifications, setWantNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeCatalog = league === "lvbp" ? LVBP_TEAMS : MLB_TEAMS;

  const filteredTeams = useMemo(() => {
    const list = Object.values(activeCatalog);
    if (league === "mlb" && mlbSearchQuery.trim()) {
      const q = mlbSearchQuery.toLowerCase().trim();
      return list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.nick.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.city?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCatalog, league, mlbSearchQuery]);

  const currentTeamMeta = activeCatalog[selectedTeam] || (league === "lvbp" ? LVBP_TEAMS.CAR : MLB_TEAMS.NYY) || {
    name: selectedTeam,
    nick: selectedTeam,
    shortName: selectedTeam,
    logoSvg: "/icon.png",
  };

  if (!isOpen) return null;

  const subscribeDeviceToPush = async (teamCode: string) => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const res = await fetch("/api/push/subscribe");
      const { vapidPublicKey } = await res.json();
      if (!vapidPublicKey) return;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          teamPreference: teamCode,
        }),
      });
    } catch (err) {
      console.warn("[PWA Onboarding] Push subscription error:", err);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Por favor ingresa tu nombre completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name: name.trim(),
          email: email.trim(),
          password,
          favoriteTeam: selectedTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear tu cuenta.");

      const user = data.user as UserProfile;
      localStorage.setItem("enjuego_user_session", JSON.stringify(user));
      localStorage.setItem("enjuego_fav_team", user.favoriteTeam);
      localStorage.setItem("enjuego_pwa_onboarded", "true");

      if (wantNotifications) {
        await subscribeDeviceToPush(user.favoriteTeam);
      }

      onComplete(user, league);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear tu cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Credenciales incorrectas.");

      const user = data.user as UserProfile;
      localStorage.setItem("enjuego_user_session", JSON.stringify(user));
      localStorage.setItem("enjuego_fav_team", user.favoriteTeam);
      localStorage.setItem("enjuego_pwa_onboarded", "true");

      const resolvedLeague = MLB_TEAMS[user.favoriteTeam] ? "mlb" : "lvbp";
      onComplete(user, resolvedLeague);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("enjuego_pwa_onboarded", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200 p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-1 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>App Oficial EnJuego</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            {mode === "register" ? "Crea tu Cuenta EnJuego" : "Iniciar Sesión"}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {mode === "register"
              ? "Crea tu cuenta de fanático para seguir a tu equipo, guardar tus preferencias y recibir alertas."
              : "Ingresa con tu correo y contraseña para sincronizar tus preferencias."}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-bold">
            {errorMsg}
          </div>
        )}

        {mode === "register" ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Step 1: League Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>1. Elige tu Liga de Béisbol</span>
                <span className="text-[10px] text-amber-700 font-extrabold uppercase bg-amber-100 px-2 py-0.5 rounded-md">
                  {league}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setLeague("lvbp");
                    setSelectedTeam("CAR");
                    setMlbSearchQuery("");
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    league === "lvbp"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <span>🇻🇪 LVBP Venezuela</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLeague("mlb");
                    setSelectedTeam("NYY");
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    league === "mlb"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <span>⚾ MLB Grandes Ligas</span>
                </button>
              </div>
            </div>

            {/* Step 2: Team Picker (Clean 2-column cards, no truncated names) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>2. Selecciona tu Equipo Favorito</span>
                <span className="text-[11px] text-amber-700 font-black">
                  {currentTeamMeta.nick || currentTeamMeta.name}
                </span>
              </label>

              {/* Optional Search filter for MLB */}
              {league === "mlb" && (
                <div className="relative mb-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={mlbSearchQuery}
                    onChange={(e) => setMlbSearchQuery(e.target.value)}
                    placeholder="Buscar equipo MLB (ej: Yankees, Dodgers)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                {filteredTeams.map((t) => {
                  const isSelected = selectedTeam === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setSelectedTeam(t.code)}
                      className={`relative flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer select-none ${
                        isSelected
                          ? "border-amber-500 bg-amber-50 shadow-xs ring-2 ring-amber-400/30"
                          : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <img src={t.logoSvg} alt="" className="w-7 h-7 object-contain shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black text-slate-900 leading-tight truncate">
                          {t.nick || t.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold leading-none truncate mt-0.5">
                          {t.city || t.shortName}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Real Account Fields (Name, Email, Password) */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nombre y Apellido</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Andrés González"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Contraseña</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>
            </div>

            {/* Step 4: Notifications Toggle */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wantNotifications}
                onChange={(e) => setWantNotifications(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  Activar alertas de juegos en vivo
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  Recibe avisos cuando juegue {currentTeamMeta.nick || currentTeamMeta.name}, jonrones y pizarra final.
                </span>
              </div>
            </label>

            {/* Submit Action */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <span>{loading ? "Creando tu cuenta..." : "Crear Cuenta y Comenzar"}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setMode("login");
                  }}
                  className="text-amber-700 hover:text-amber-800 font-bold transition cursor-pointer"
                >
                  ¿Ya tienes cuenta? Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 font-medium transition cursor-pointer"
                >
                  Omitir por ahora
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Mode: Login */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Contraseña</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <span>{loading ? "Iniciando sesión..." : "Entrar a mi Cuenta"}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setMode("register");
                  }}
                  className="text-amber-700 hover:text-amber-800 font-bold transition cursor-pointer"
                >
                  ← ¿No tienes cuenta? Regístrate aquí
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 font-medium transition cursor-pointer"
                >
                  Omitir
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
