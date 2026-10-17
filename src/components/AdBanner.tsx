"use client";

import React, { useState } from "react";
import { ExternalLink, Sparkles, Megaphone, ArrowUpRight } from "lucide-react";

export interface AdBannerProps {
  slot?: "top-leaderboard" | "in-feed" | "gameday-sidebar";
  imageUrl?: string;
  linkUrl?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  accentColor?: string;
  className?: string;
}

export function AdBanner({
  slot = "top-leaderboard",
  imageUrl,
  linkUrl = "https://wa.me/?text=Hola%20EnJuego,%20deseo%20pautar%20publicidad%20en%20el%20portal%20de%20la%20LVBP",
  alt = "Patrocinio Oficial EnJuego",
  title,
  subtitle,
  badgeText,
  accentColor,
  className = "",
}: AdBannerProps) {
  const [imageError, setImageError] = useState(false);

  // Default content tailored to Venezuelan baseball fans
  const defaultData = {
    "top-leaderboard": {
      title: title || "VIVE LA PASIÓN DE LA LVBP AL MÁXIMO",
      subtitle: subtitle || "La mejor cobertura de marcadores, jugada a jugada y transmisiones en vivo",
      badge: badgeText || "PATROCINADOR OFICIAL",
      cta: "Conoce más",
      gradient: "from-[#08152e] via-[#0f2754] to-[#1a3a78]",
      accent: accentColor || "#f59e0b",
      tag: "PUBLICIDAD",
    },
    "in-feed": {
      title: title || "¿QUIERES ANUNCIAR TU MARCA EN EN JUEGO?",
      subtitle: subtitle || "Llega a miles de fanáticos apasionados del béisbol venezolano en cada jornada",
      badge: badgeText || "ESPACIO PUBLICITARIO",
      cta: "Pautar Anuncio",
      gradient: "from-[#0c1829] via-[#122846] to-[#0f1f38]",
      accent: accentColor || "#38bdf8",
      tag: "PUBLICIDAD",
    },
    "gameday-sidebar": {
      title: title || "LA MEJOR SEÑAL DEL BÉISBOL",
      subtitle: subtitle || "Sigue cada entrada, jugada y batazo en tiempo real desde cualquier lugar",
      badge: badgeText || "PATROCINIO",
      cta: "Ver detalles",
      gradient: "from-[#111827] via-[#1f2937] to-[#111827]",
      accent: accentColor || "#f59e0b",
      tag: "PUBLICIDAD",
    },
  }[slot];

  return (
    <div className={`w-full text-center ${className}`}>
      {/* Banner Container */}
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:border-amber-400/80 active:scale-[0.99] cursor-pointer"
        aria-label={alt}
      >
        {imageUrl && !imageError ? (
          /* Custom Image Banner */
          <div className="relative w-full aspect-[21/9] sm:aspect-[32/9] max-h-[110px] overflow-hidden bg-slate-950 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={alt}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
            />
            {/* Subtle external link chip on hover */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 text-white rounded-md px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
              <span>Abrir</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </div>
          </div>
        ) : (
          /* Premium High-Fidelity Native Sponsor Banner */
          <div
            className={`relative w-full p-3 sm:p-4 text-white bg-gradient-to-r ${defaultData.gradient} flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden`}
          >
            {/* Decorative background lights */}
            <div
              className="absolute -right-8 -top-8 w-44 h-44 rounded-full blur-2xl opacity-20 pointer-events-none"
              style={{ backgroundColor: defaultData.accent }}
            />
            <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full blur-2xl opacity-15 bg-amber-400 pointer-events-none" />

            {/* Left Column: Brand badge and Text */}
            <div className="relative z-10 flex items-center gap-3 text-left w-full sm:w-auto min-w-0">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md border border-white/10"
                style={{ backgroundColor: `${defaultData.accent}20` }}
              >
                <Sparkles className="w-5 h-5" style={{ color: defaultData.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border text-slate-950 shadow-2xs"
                    style={{ backgroundColor: defaultData.accent, borderColor: defaultData.accent }}
                  >
                    {defaultData.badge}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-black text-white tracking-tight truncate mt-1">
                  {defaultData.title}
                </div>
                <p className="text-[11px] text-slate-300 truncate hidden sm:block">
                  {defaultData.subtitle}
                </p>
              </div>
            </div>

            {/* Right Column: CTA Pill */}
            <div className="relative z-10 flex items-center justify-end w-full sm:w-auto shrink-0">
              <div
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shadow-xs group-hover:scale-105"
                style={{
                  backgroundColor: defaultData.accent,
                  color: "#0f172a",
                }}
              >
                <span>{defaultData.cta}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </a>

      {/* Discreet Publicidad label underneath (identical to jugadaenvivo screenshot) */}
      <span className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mt-1">
        PUBLICIDAD
      </span>
    </div>
  );
}
