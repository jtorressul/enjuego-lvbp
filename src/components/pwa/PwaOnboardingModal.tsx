"use client";

import React, { useState } from "react";
import { X, Sparkles, Bell, Trophy, Check, User, ArrowRight, Star, ShieldCheck, Mail, Lock } from "lucide-react";
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
  const [mode, setMode] = useState<"onboarding" | "login">("onboarding");
  const [league, setLeague] = useState<"lvbp" | "mlb">("lvbp");
  const [selectedTeam, setSelectedTeam] = useState<string>("CAR");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wantNotifications, setWantNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const activeCatalog = league === "lvbp" ? LVBP_TEAMS : MLB_TEAMS;
  const teamsList = Object.values(activeCatalog);
  const currentTeamMeta = activeCatalog[selectedTeam] || LVBP_TEAMS.CAR;

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

  const handleQuickOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const finalName = name.trim() || `Fan ${currentTeamMeta.nick || selectedTeam}`;
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick",
          name: finalName,
          favoriteTeam: selectedTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear tu perfil.");

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
      setErrorMsg(err.message || "Error al configurar tu perfil.");
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
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-1 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>App Oficial EnJuego</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {mode === "onboarding" ? "¡Bienvenido a la App!" : "Iniciar Sesión"}
          </h2>
          <p className="text-xs text-slate-300">
            {mode === "onboarding"
              ? "Personaliza tu experiencia eligiendo tu equipo y liga favorita"
              : "Ingresa a tu cuenta para sincronizar tus preferencias"}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-semibold">
            {errorMsg}
          </div>
        )}

        {mode === "onboarding" ? (
          <form onSubmit={handleQuickOnboardingSubmit} className="space-y-4">
            {/* Step 1: League Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>1. Elige tu Liga de Béisbol</span>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase">{league}</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setLeague("lvbp");
                    setSelectedTeam("CAR");
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    league === "lvbp"
                      ? "bg-amber-400 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
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
                      ? "bg-amber-400 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>⚾ MLB Grandes Ligas</span>
                </button>
              </div>
            </div>

            {/* Step 2: Team Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>2. Selecciona tu Equipo Favorito</span>
                <span className="text-[11px] text-amber-400 font-black">{currentTeamMeta.name}</span>
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                {teamsList.map((t) => {
                  const isSelected = selectedTeam === t.code;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => setSelectedTeam(t.code)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? "border-amber-400 bg-amber-400/15 shadow-sm scale-102"
                          : "border-slate-800/80 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                      style={isSelected ? { borderColor: t.color || "#f59e0b" } : undefined}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <img src={t.logoSvg} alt="" className="w-8 h-8 object-contain shrink-0" />
                      <span className="text-[10px] font-black mt-1 truncate max-w-full">
                        {t.nick || t.shortName || t.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Name / Nickname */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Tu Nombre o Apodo (Opcional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Ej: Fan de ${currentTeamMeta.nick || "los Leones"}`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Step 4: Notifications Toggle */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wantNotifications}
                onChange={(e) => setWantNotifications(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-400 focus:ring-amber-400 accent-amber-400 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  Activar alertas de juegos en vivo
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Recibe avisos cuando juegue {currentTeamMeta.name}, jonrones y pizarra final.
                </span>
              </div>
            </label>

            {/* Submit Action */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <span>{loading ? "Configurando tu App..." : "¡Comenzar a Disfrutar EnJuego!"}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer"
                >
                  ¿Ya tienes cuenta? Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-500 hover:text-slate-300 font-medium transition cursor-pointer"
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
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Contraseña</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
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
                  onClick={() => setMode("onboarding")}
                  className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer"
                >
                  ← Volver al selector de equipos
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-500 hover:text-slate-300 font-medium transition cursor-pointer"
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
