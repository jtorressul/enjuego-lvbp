"use client";

import React, { useEffect, useState } from "react";
import { X, Smartphone, Zap, Bell, Check, Share, ArrowRight } from "lucide-react";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  title = "¿Quieres instalar nuestra app?",
  subtitle = "Béisbol venezolano en vivo en tu pantalla de inicio",
}: PwaInstallModalProps) {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [showManualTip, setShowManualTip] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIos(/iphone|ipad|ipod/.test(ua));
      setIsStandalone(
        (window.navigator as any).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches
      );
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (window.__ENJUEGO_TRIGGER_INSTALL__) {
      setInstalling(true);
      const success = await window.__ENJUEGO_TRIGGER_INSTALL__();
      setInstalling(false);
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
        return;
      }
    }
    setShowManualTip(true);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2 space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500 mx-auto flex items-center justify-center shadow-lg border border-white/20">
            <span className="text-2xl font-black text-white tracking-tight">EJ</span>
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-2.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-100">Carga Ultrarrápida</p>
              <p className="text-[11px] text-slate-400">Sin esperas ni abrir el navegador</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-100">Notificaciones en Pantalla</p>
              <p className="text-[11px] text-slate-400">Avisos de jonrones y resultados</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-sky-400/10 text-sky-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-100">Experiencia de App Nativa</p>
              <p className="text-[11px] text-slate-400">Pantalla completa sin barras web</p>
            </div>
          </div>
        </div>

        {/* Action Button: iOS vs Android/Desktop */}
        {isIos && !isStandalone ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Share className="w-4 h-4" />
                <span>Instalación en iPhone (2 pasos):</span>
              </div>
              <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                <li>Toca el botón <strong>Compartir ⎋</strong> en la barra inferior de Safari.</li>
                <li>Selecciona <strong>"Añadir a pantalla de inicio ⊞"</strong>.</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {installedSuccess ? (
              <div className="py-3 text-center text-emerald-400 font-bold text-xs bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>¡App instalada con éxito!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4" />
                <span>{installing ? "Instalando..." : "Instalar App Ahora"}</span>
              </button>
            )}

            {showManualTip && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center leading-relaxed">
                Toca los tres puntos (<strong>⋮</strong> o <strong>⋯</strong>) de tu navegador y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Ahora no, seguir en la web
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
