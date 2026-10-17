"use client";

import React, { useState } from "react";
import {
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  Flame,
  Award,
  BadgeCheck,
  TrendingUp,
} from "lucide-react";

export interface AdBannerProps {
  slot?: "top-leaderboard" | "in-feed" | "gameday-sidebar";
  imageUrl?: string;
  linkUrl?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  ctaText?: string;
  className?: string;
}

export function AdBanner({
  slot = "top-leaderboard",
  imageUrl,
  linkUrl = "https://wa.me/?text=Hola%20EnJuego,%20quiero%20informaci%C3%B3n%20para%20pautar%20publicidad%20en%20el%20portal%20de%20la%20LVBP",
  alt = "Patrocinio Oficial EnJuego",
  title,
  subtitle,
  badgeText,
  ctaText,
  className = "",
}: AdBannerProps) {
  const [imageError, setImageError] = useState(false);

  // High-impact sports editorial creative data
  const slotConfigs = {
    "top-leaderboard": {
      tag: "PARTNER OFICIAL",
      badge: badgeText || "LVBP 2026-2027",
      title: title || "LA PASIÓN DE LA PELOTA CRIOLLA",
      highlight: "EN CADA JORNADA",
      subtitle:
        subtitle ||
        "Sigue todos los marcadores en vivo, jugada a jugada, circuitos radiales y transmisiones de TV.",
      cta: ctaText || "Ver Patrocinio",
      gradient: "from-[#050b17] via-[#0b1b36] to-[#081326]",
      glowColor: "rgba(245, 158, 11, 0.25)",
      pillBg: "bg-amber-400 text-slate-950 hover:bg-amber-300",
      icon: Award,
    },
    "in-feed": {
      tag: "ESPACIO COMERCIAL",
      badge: badgeText || "ANÚNCIATE AQUÍ",
      title: title || "IMPULSA TU MARCA CON LA FANATICADA",
      highlight: "MÁS APASIONADA",
      subtitle:
        subtitle ||
        "Miles de fanáticos conectados en tiempo real. Posiciona tu negocio en las jornadas de la LVBP.",
      cta: ctaText || "Pautar Anuncio",
      gradient: "from-[#081120] via-[#0e2243] to-[#0a1528]",
      glowColor: "rgba(56, 189, 248, 0.25)",
      pillBg: "bg-sky-400 text-slate-950 hover:bg-sky-300",
      icon: TrendingUp,
    },
    "gameday-sidebar": {
      tag: "PATROCINIO EXCLUSIVO",
      badge: badgeText || "ZONA VIP",
      title: title || "LA MEJOR COBERTURA DEL JUEGO",
      highlight: "AL INSTANTE",
      subtitle:
        subtitle ||
        "Acompaña a tu equipo favorito entrada por entrada con estadísticas y comentarios en vivo.",
      cta: ctaText || "Conoce Más",
      gradient: "from-[#070d18] via-[#101f38] to-[#091222]",
      glowColor: "rgba(245, 158, 11, 0.2)",
      pillBg: "bg-amber-400 text-slate-950 hover:bg-amber-300",
      icon: Flame,
    },
  }[slot];

  const IconComponent = slotConfigs.icon;

  return (
    <div className={`w-full ${className}`}>
      {/* LUXURY EDITORIAL CARD WRAPPER */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-2 sm:p-2.5 shadow-2xs hover:shadow-sm transition-all duration-300">
        {/* Card Micro-Header */}
        <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] text-slate-400 font-bold border-b border-slate-100/80 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-extrabold uppercase tracking-wider text-slate-600">
              {slotConfigs.tag}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 font-medium">Publicidad Certificada</span>
          </div>
          <a
            href="https://wa.me/?text=Hola%20EnJuego,%20deseo%20pautar%20publicidad%20en%20el%20portal%20de%20la%20LVBP"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-extrabold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-0.5"
            title="Publicita tu marca en En Juego"
          >
            <span>Anúnciate aquí</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {/* Clickable Banner Body */}
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-xs transition-transform duration-200 active:scale-[0.99] cursor-pointer"
          aria-label={alt}
        >
          {imageUrl && !imageError ? (
            /* Custom Uploaded Image Banner */
            <div className="relative w-full aspect-[21/9] sm:aspect-[36/9] max-h-[120px] overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={imageUrl}
                alt={alt}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 text-white rounded-md px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                <span>Abrir enlace</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </div>
            </div>
          ) : (
            /* High-Fidelity Custom Styled Baseball Card Banner */
            <div
              className={`relative w-full p-3 sm:p-4 bg-gradient-to-r ${slotConfigs.gradient} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 overflow-hidden`}
            >
              {/* Background Ambient Glows & Baseball Field Motif */}
              <div
                className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-transform duration-700 group-hover:scale-125"
                style={{ backgroundColor: slotConfigs.glowColor }}
              />
              <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full blur-2xl opacity-20 bg-amber-400 pointer-events-none" />

              {/* Decorative Baseball Field Diamond Motif (Subtle Vector Lines) */}
              <svg
                className="absolute right-4 sm:right-32 top-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.06] text-white pointer-events-none"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <polygon points="50,10 90,50 50,90 10,50" />
                <circle cx="50" cy="50" r="18" />
                <line x1="50" y1="10" x2="50" y2="90" />
                <line x1="10" y1="50" x2="90" y2="50" />
              </svg>

              {/* Left Column: Graphic Badge + Headline + Description */}
              <div className="relative z-10 flex items-center gap-3 text-left min-w-0 flex-1">
                {/* Sports Badge Icon */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <IconComponent className="w-5 h-5 text-amber-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow-2xs">
                      <BadgeCheck className="w-2.5 h-2.5" />
                      {slotConfigs.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold hidden md:inline">
                      En Juego Oficial
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-black text-white tracking-tight leading-snug truncate">
                    {slotConfigs.title}{" "}
                    <span className="text-amber-400">{slotConfigs.highlight}</span>
                  </h3>
                  <p className="text-[11px] text-slate-300/90 leading-tight truncate mt-0.5 hidden sm:block">
                    {slotConfigs.subtitle}
                  </p>
                </div>
              </div>

              {/* Right Column: High-Impact Call-to-Action Pill Button */}
              <div className="relative z-10 flex items-center justify-end shrink-0 self-end sm:self-center">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-xs transition-all shadow-sm group-hover:shadow-md group-hover:scale-105 ${slotConfigs.pillBg}`}
                >
                  <span>{slotConfigs.cta}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </div>
            </div>
          )}
        </a>

        {/* Card Footer Micro-Bar */}
        <div className="flex items-center justify-between px-2 pt-1.5 text-[9px] text-slate-400 font-medium">
          <span>Espacio reservado para anunciantes de la LVBP</span>
          <span className="font-extrabold uppercase tracking-wider text-slate-400">
            PUBLICIDAD
          </span>
        </div>
      </div>
    </div>
  );
}
