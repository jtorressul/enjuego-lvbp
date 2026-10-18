"use client";

import React, { useEffect, useState } from "react";
import { Bell, Download, Share, X, CheckCircle2, Sparkles } from "lucide-react";
import { urlBase64ToUint8Array } from "@/lib/push-config";

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  // Notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Check for push manager support
          if ("PushManager" in window && "Notification" in window) {
            setPushSupported(true);
            setNotificationPermission(Notification.permission);

            // If permission is default and user hasn't dismissed before
            const dismissedPush = localStorage.getItem("enjuego_dismissed_push");
            if (Notification.permission === "default" && !dismissedPush) {
              // Delay slightly so it doesn't pop up abruptly on immediate page load
              const timer = setTimeout(() => {
                setShowPushBanner(true);
              }, 4000);
              return () => clearTimeout(timer);
            }
          }
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }

    // 2. Listen for beforeinstallprompt (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissedInstall = localStorage.getItem("enjuego_dismissed_install");
      if (!dismissedInstall) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      const dismissedIos = localStorage.getItem("enjuego_dismissed_ios_install");
      if (!dismissedIos) {
        // Show after 6 seconds on iOS
        const timer = setTimeout(() => {
          setShowIosTip(true);
        }, 6000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Handle native install click
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem("enjuego_dismissed_install", "1");
  };

  const dismissIosTip = () => {
    setShowIosTip(false);
    localStorage.setItem("enjuego_dismissed_ios_install", "1");
  };

  // Handle Push Notification subscription
  const handleSubscribePush = async () => {
    if (!pushSupported || isSubscribing) return;
    setIsSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        setShowPushBanner(false);
        return;
      }

      // Fetch VAPID key
      const res = await fetch("/api/push/subscribe");
      const { vapidPublicKey } = await res.json();

      if (!vapidPublicKey) {
        throw new Error("Clave VAPID no disponible.");
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });
      }

      // Save to server KV
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          teamPreference: "all",
        }),
      });

      setSubscriptionSuccess(true);
      setTimeout(() => {
        setShowPushBanner(false);
      }, 3500);
    } catch (err) {
      console.error("[PWA] Error subscribing to push:", err);
      alert("No se pudo activar las notificaciones. Verifica los permisos de tu navegador.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const dismissPushBanner = () => {
    setShowPushBanner(false);
    localStorage.setItem("enjuego_dismissed_push", "1");
  };

  return (
    <>
      {/* 1. Android / Chrome Install Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
                <span className="font-bold text-white text-base">EJ</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Instalar EnJuego</p>
                <p className="text-[11px] text-slate-300 truncate">
                  Marcadores rápidos y alertas en tu pantalla
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </button>
              <button
                type="button"
                onClick={dismissInstall}
                aria-label="Cerrar"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. iOS Safari Install Tip */}
      {showIosTip && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
                  <Share className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold">Instalar en tu iPhone</p>
                  <p className="text-[11px] text-slate-300">
                    Sigue la LVBP en tu pantalla de inicio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissIosTip}
                aria-label="Cerrar"
                className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-200 bg-white/10 p-2.5 rounded-xl leading-relaxed">
              Toca el botón <strong className="text-white">Compartir ⎋</strong> en la barra inferior de Safari y selecciona <strong className="text-amber-400">"Añadir a pantalla de inicio ⊞"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* 3. Push Notifications Opt-In Banner */}
      {showPushBanner && !showInstallBanner && !showIosTip && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {subscriptionSuccess ? "¡Alertas Activadas!" : "¿Activar Notificaciones?"}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {subscriptionSuccess
                    ? "Recibirás avisos de juegos en tu pantalla"
                    : "Entérate al instante de jonrones y resultados"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {subscriptionSuccess ? (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold py-1 px-2 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Listo</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSubscribePush}
                    disabled={isSubscribing}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubscribing ? "Activando..." : "Activar"}
                  </button>
                  <button
                    type="button"
                    onClick={dismissPushBanner}
                    aria-label="Cerrar"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
