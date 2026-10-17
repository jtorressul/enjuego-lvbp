"use client";

import React, { useState } from "react";
import { X, Sparkles, Mail, Lock, User, LogIn, UserPlus, Star, CheckCircle, ShieldCheck, LogOut } from "lucide-react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { UserProfile } from "@/lib/user-auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserUpdate: (user: UserProfile | null) => void;
  initialTab?: "quick" | "login" | "register" | "profile";
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
  initialTab = "quick",
}: AuthModalProps) {
  const [tab, setTab] = useState<"quick" | "login" | "register" | "profile">(
    currentUser ? "profile" : initialTab
  );

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>(
    currentUser?.favoriteTeam || "CAR"
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Por favor ingresa tu nombre o apodo.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick",
          name: name.trim(),
          favoriteTeam: selectedTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión rápida.");

      const user = data.user as UserProfile;
      localStorage.setItem("enjuego_user_session", JSON.stringify(user));
      localStorage.setItem("enjuego_fav_team", user.favoriteTeam);
      onUserUpdate(user);
      setSuccessMsg(`¡Bienvenido ${user.name}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg("Todos los campos son obligatorios.");
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
      if (!res.ok) throw new Error(data.error || "Error al crear la cuenta.");

      const user = data.user as UserProfile;
      localStorage.setItem("enjuego_user_session", JSON.stringify(user));
      localStorage.setItem("enjuego_fav_team", user.favoriteTeam);
      onUserUpdate(user);
      setSuccessMsg("¡Cuenta creada con éxito!");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrarse.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

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
      onUserUpdate(user);
      setSuccessMsg(`¡Hola de nuevo, ${user.name}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (teamCode: string) => {
    if (!currentUser) return;
    setSelectedTeam(teamCode);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          userId: currentUser.id,
          updates: { favoriteTeam: teamCode },
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        localStorage.setItem("enjuego_user_session", JSON.stringify(data.user));
        localStorage.setItem("enjuego_fav_team", teamCode);
        onUserUpdate(data.user);
        setSuccessMsg("¡Equipo favorito actualizado!");
        setTimeout(() => setSuccessMsg(""), 2000);
      }
    } catch {
      // Offline fallback: update locally
      const localUpdated = { ...currentUser, favoriteTeam: teamCode };
      localStorage.setItem("enjuego_user_session", JSON.stringify(localUpdated));
      localStorage.setItem("enjuego_fav_team", teamCode);
      onUserUpdate(localUpdated);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("enjuego_user_session");
    onUserUpdate(null);
    setSuccessMsg("Sesión cerrada.");
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const activeTeamObj = LVBP_TEAMS[selectedTeam] || LVBP_TEAMS["CAR"];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        {/* Modal Header */}
        <div
          className="auth-header p-4 sm:p-5 border-b flex items-center justify-between text-white"
          style={{ backgroundColor: "#060a12", borderColor: "#1e293b" }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="En Juego" className="h-6 sm:h-7 w-auto object-contain" />
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black italic tracking-tight shadow-xs select-none"
              style={{
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                color: "#ffffff",
                border: "1px solid rgba(251, 113, 133, 0.45)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
              <span style={{ color: "#ffffff" }}>.online</span>
            </span>
            <span className="hidden sm:inline text-xs font-bold text-slate-400 border-l border-slate-700 pl-2.5">
              Comunidad LVBP
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {currentUser ? (
          <div className="px-5 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Mi Perfil de Fanático
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Sesión Activa
            </span>
          </div>
        ) : (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab("quick");
                setErrorMsg("");
              }}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                tab === "quick"
                  ? "border-amber-500 text-slate-950 font-black bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Pase Fan Rápido</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMsg("");
              }}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                tab === "login"
                  ? "border-amber-500 text-slate-950 font-black bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-slate-600" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setErrorMsg("");
              }}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                tab === "register"
                  ? "border-amber-500 text-slate-950 font-black bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-600" />
              <span>Crear Cuenta</span>
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 max-h-[82dvh] overflow-y-auto overscroll-contain no-scrollbar">
          {/* PROFILE VIEW (LOGGED IN) */}
          {currentUser ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0"
                  style={{ backgroundColor: activeTeamObj.color }}
                >
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 text-sm truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{currentUser.handle}</div>
                  <div className="text-[11px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {currentUser.badge || "Fan Oficial"}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">
                  Equipo Favorito Seleccionado
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(LVBP_TEAMS).map((team) => {
                    const isSelected = selectedTeam === team.code;
                    return (
                      <button
                        key={team.code}
                        type="button"
                        onClick={() => handleUpdateTeam(team.code)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <img
                          src={team.logoSvg}
                          alt={team.nick}
                          className="w-7 h-7 object-contain mb-1"
                        />
                        <span className="text-[10px] font-black leading-tight text-slate-800">
                          {team.nick}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : tab === "quick" ? (
            /* TAB 1: QUICK FAN PASS */
            <form onSubmit={handleQuickLogin} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-950 font-medium">
                ⚡ <strong>Pase directo en 1 clic:</strong> Ingresa tu nombre o apodo y elige a tu equipo para participar en el chat en vivo y fijar a tu club en la pizarra principal.
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Tu Nombre o Apodo de Fanático
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="Ej. Carlos Caraquista, Pedro Magallanero"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">
                  Selecciona a Tu Equipo Favorito
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(LVBP_TEAMS).map((team) => {
                    const isSelected = selectedTeam === team.code;
                    return (
                      <button
                        key={team.code}
                        type="button"
                        onClick={() => setSelectedTeam(team.code)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <img
                          src={team.logoSvg}
                          alt={team.nick}
                          className="w-7 h-7 object-contain mb-1"
                        />
                        <span className="text-[10px] font-black leading-tight text-slate-800">
                          {team.nick}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Entrar como Fan Oficial ⚾"}
              </button>
            </form>
          ) : tab === "login" ? (
            /* TAB 2: EMAIL LOGIN */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="tunombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? "Verificando..." : "Iniciar Sesión"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                >
                  ¿No tienes cuenta? Regístrate aquí
                </button>
              </div>
            </form>
          ) : (
            /* TAB 3: REGISTER */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Nombre Completo o Apodo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="Carlos Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="tunombre@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-2">
                  Equipo Favorito
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(LVBP_TEAMS).map((team) => {
                    const isSelected = selectedTeam === team.code;
                    return (
                      <button
                        key={team.code}
                        type="button"
                        onClick={() => setSelectedTeam(team.code)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <img
                          src={team.logoSvg}
                          alt={team.nick}
                          className="w-7 h-7 object-contain mb-1"
                        />
                        <span className="text-[10px] font-black leading-tight text-slate-800">
                          {team.nick}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? "Creando cuenta..." : "Crear Cuenta de Fanático"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                >
                  ¿Ya tienes cuenta? Inicia sesión aquí
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
