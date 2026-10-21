"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  Send,
  Smartphone,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Tag,
  Radio,
  Zap,
} from "lucide-react";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";

interface PushNotificationSenderProps {
  adminPassword: string;
}

export function PushNotificationSender({
  adminPassword,
}: PushNotificationSenderProps) {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Form fields
  const [title, setTitle] = useState("¡Comenzó el juego en vivo!");
  const [messageBody, setMessageBody] = useState(
    "Caracas vs Magallanes ya está en juego. Entra a ver el marcador y jugada a jugada minuto a minuto."
  );
  const [targetUrl, setTargetUrl] = useState("/inicio");
  const [teamFilter, setTeamFilter] = useState("all");
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorName, setSponsorName] = useState("");

  // Dispatch state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch subscriber count
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/push/subscribe");
      const data = await res.json();
      setSubscriberCount(data.subscriberCount ?? 0);
    } catch {
      setSubscriberCount(0);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Quick preset templates
  const applyPreset = (type: "start" | "final" | "homerun" | "ad") => {
    setSendResult(null);
    if (type === "start") {
      setIsSponsored(false);
      setTitle("¡Voz de Playball en vivo!");
      setMessageBody("La jornada de hoy ya está en marcha. Sigue todos los partidos jugada a jugada.");
      setTargetUrl("/inicio");
    } else if (type === "final") {
      setIsSponsored(false);
      setTitle("¡Juego Finalizado!");
      setMessageBody("Revisa la pizarra final, box score completo y las posiciones actualizadas.");
      setTargetUrl("/posiciones");
    } else if (type === "homerun") {
      setIsSponsored(false);
      setTitle("¡CUADRANGULAR en el 8vo Inning!");
      setMessageBody("Cambio dramático en la pizarra. Entra y mira cómo va el marcador ahora.");
      setTargetUrl("/inicio");
    } else if (type === "ad") {
      setIsSponsored(true);
      setSponsorName(sponsorName || "Patrocinador");
      setTitle("Promoción Especial durante el partido");
      setMessageBody("Disfruta de beneficios exclusivos para fanáticos de EnJuego. Toca aquí para ver más.");
      setTargetUrl("https://enjuego.online");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !messageBody.trim()) {
      alert("Por favor completa el título y el mensaje.");
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: messageBody.trim(),
          url: targetUrl.trim() || "/",
          teamFilter,
          isSponsored,
          sponsorName: isSponsored ? sponsorName.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al enviar notificación.");
      }

      setSendResult({
        success: true,
        message: data.message || `Notificación enviada a ${data.sentCount} dispositivo(s).`,
      });
      fetchStats();
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || "Error al enviar la notificación.",
      });
    } finally {
      setSending(false);
    }
  };

  const fullDisplayTitle = isSponsored && sponsorName.trim()
    ? `[${sponsorName.trim()}] ${title}`
    : title;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stat */}
      <div className="keep-dark bg-[#0a1120] text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Centro de Notificaciones Push y Anuncios
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  VAPID Activo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Llega directo a la pantalla de bloqueo de los usuarios en Android, iPhone y PC.
              </p>
            </div>
          </div>

          <div className="bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                Dispositivos Suscritos
              </p>
            </div>
            <p className="text-base font-extrabold font-mono text-white tabular-nums">
              {loadingStats ? "..." : subscriberCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Presets (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900">
                Plantillas Rápidas
              </label>
              <span className="text-[11px] text-slate-400">1 clic para autocompletar</span>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("start")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center justify-center sm:justify-start gap-1.5"
              >
                <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Inicio de Juego</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("homerun")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 transition cursor-pointer flex items-center justify-center sm:justify-start gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Jonrón / Alerta</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("final")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer flex items-center justify-center sm:justify-start gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Marcador Final</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("ad")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/60 transition cursor-pointer flex items-center justify-center sm:justify-start gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Anuncio Comercial</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Commercial Sponsor Switch */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-900">
                    Notificación Patrocinada / Publicitaria
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isSponsored}
                  onChange={(e) => setIsSponsored(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-rose-600 cursor-pointer"
                />
              </label>

              {isSponsored && (
                <div className="pt-2 border-t border-slate-200/80 animate-in fade-in duration-200">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Nombre de la Marca o Empresa Anunciante
                  </label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="Ej. Ridery, BetPlay, Farmatodo, Banco X"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 focus:outline-rose-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Aparecerá como prefijo <code className="text-rose-600 font-mono">[MARCA]</code> en el teléfono del usuario.
                  </p>
                </div>
              )}
            </div>

            {/* Notification Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título de la Notificación *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. ¡Caracas 4 - 2 Magallanes!"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:outline-slate-900"
              />
            </div>

            {/* Notification Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mensaje / Descripción *
              </label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={3}
                placeholder="Escribe el resumen del momento o el texto del anuncio..."
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs leading-relaxed focus:outline-slate-900 resize-none"
              />
            </div>

            {/* Destination URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                URL de Destino al Tocar la Notificación
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="/inicio, /posiciones o https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-mono focus:outline-slate-900"
                />
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Si es un anuncio, puedes colocar la web o red social del cliente (ej. <code className="font-mono">https://instagram.com/empresa</code>).
              </p>
            </div>

            {/* Target Audience Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audiencia Objetivo
              </label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-slate-900 cursor-pointer"
              >
                <option value="all">Todos los suscriptores (Transmisión general)</option>
                {Object.values(LVBP_TEAMS).map((team) => (
                  <option key={team.code} value={team.code}>
                    Fanáticos de {team.name} ({team.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Message */}
            {sendResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                  sendResult.success
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {sendResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{sendResult.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="dark-pill w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {sending
                  ? "Despachando notificaciones..."
                  : `Enviar Notificación Push (${subscriberCount ?? 0} suscriptores)`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Smartphone Lockscreen Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-900">
                Previsualización en Pantalla de Bloqueo
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Mobile Mockup</span>
          </div>

          {/* Smartphone Frame */}
          <div className="keep-dark bg-[#0a1120] text-white rounded-3xl p-4 shadow-xl border border-slate-800 space-y-3">
            {/* Top Phone Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 font-mono">
              <span>7:05 PM</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Notification Card */}
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-700/70 shadow-lg space-y-2">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-[10px] font-extrabold text-white shadow-xs">
                    EJ
                  </div>
                  <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                    EnJuego.online
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Ahora</span>
              </div>

              {/* Title & Body */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-white leading-tight">
                  {fullDisplayTitle || "Título de la Notificación"}
                </p>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {messageBody || "Cuerpo del mensaje en la pantalla del usuario."}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md">
                  Ver Marcador
                </span>
              </div>
            </div>

            {/* Lockscreen Hint */}
            <div className="text-center pt-2">
              <span className="text-[10px] text-slate-400">
                Compatible con Android, iPhone (iOS 16.4+) y Navegadores Web
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
