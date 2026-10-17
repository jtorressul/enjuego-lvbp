"use client";

import React, { useState } from "react";
import { Sparkles, ExternalLink, MessageCircle, ArrowRight } from "lucide-react";

export interface AdBannerProps {
  slot?: "top-leaderboard" | "in-feed" | "gameday-sidebar";
  imageUrl?: string;
  linkUrl?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  className?: string;
}

export function AdBanner({
  slot = "top-leaderboard",
  imageUrl,
  linkUrl = "https://wa.me/?text=Hola%20EnJuego.online,%20deseo%20informaci%C3%B3n%20para%20publicitar%20mi%20marca",
  alt = "Espacio Comercial en EnJuego.online",
  title,
  subtitle,
  ctaText,
  className = "",
}: AdBannerProps) {
  const [imageError, setImageError] = useState(false);

  // Concise copy that never truncates with "..." on mobile screens
  const defaultTitle =
    title ||
    (slot === "in-feed"
      ? "Impulsa tu marca en cada jornada"
      : slot === "gameday-sidebar"
        ? "Patrocina el Jugada a Jugada"
        : "Tu marca aquí en EnJuego.online");

  const defaultSubtitle =
    subtitle ||
    (slot === "in-feed"
      ? "Conecta con miles de fanáticos del béisbol en vivo."
      : slot === "gameday-sidebar"
        ? "Presencia directa junto a la pizarra en tiempo real."
        : "Espacio disponible para banners y alianzas comerciales.");

  const defaultCta = ctaText || "Pautar";

  const isSidebar = slot === "gameday-sidebar";

  if (imageUrl && !imageError) {
    return (
      <div className={`w-full ${className}`}>
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 aspect-[21/9] sm:aspect-[32/9] max-h-[115px] shadow-xs"
          aria-label={alt}
        >
          <img
            src={imageUrl}
            alt={alt}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
          <span
            className="absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-xs"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", color: "#e2e8f0" }}
          >
            Patrocinado
          </span>
          <div
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs"
            style={{ backgroundColor: "rgba(6, 10, 18, 0.85)", color: "#ffffff" }}
          >
            <span>Visitar</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </div>
        </a>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* ENJUEGO.ONLINE ORIGINAL BROADCAST TICKET BANNER (Single unified card, no outer white wrapper) */}
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full overflow-hidden rounded-2xl transition-all hover:shadow-md active:scale-[0.995]"
        style={{
          background: "linear-gradient(110deg, #ffffff 0%, #f8fafc 60%, #fff1f2 100%)",
          border: "1px solid #e2e8f0",
        }}
        aria-label={alt}
      >
        {/* Left Signature Crimson-to-Amber Accent Bar */}
        <div
          className="absolute inset-y-0 left-0 w-1.5"
          style={{
            background: "linear-gradient(180deg, #e11d48 0%, #f59e0b 100%)",
          }}
        />

        {/* Subtle Baseball Diamond SVG Watermark on the Right */}
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute -right-4 -bottom-6 w-28 h-28 opacity-[0.06] text-rose-600 rotate-12 transition-transform duration-500 group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
        >
          <rect x="20" y="20" width="60" height="60" rx="8" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="10" fill="currentColor" />
        </svg>

        <div
          className={`relative pl-4 pr-3 py-2.5 sm:px-5 sm:py-3.5 flex ${
            isSidebar
              ? "flex-col items-start gap-2.5"
              : "flex-row items-center justify-between gap-2.5 sm:gap-4"
          }`}
        >
          {/* Left Content: Brand Pill + Full Unclipped Copy */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider leading-none"
                style={{
                  backgroundColor: "#ffe4e6",
                  color: "#be123c",
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>enjuego.online</span>
              </span>
              <span
                className="text-[9px] font-extrabold uppercase tracking-widest"
                style={{ color: "#94a3b8" }}
              >
                · Espacio Comercial
              </span>
            </div>

            <h3
              className="text-xs sm:text-sm font-black tracking-tight leading-snug"
              style={{ color: "#0f172a" }}
            >
              {defaultTitle}
            </h3>

            <p
              className="text-[11px] sm:text-xs font-medium leading-snug mt-0.5"
              style={{ color: "#475569" }}
            >
              {defaultSubtitle}
            </p>
          </div>

          {/* Right CTA Pill with EnJuego Crimson/Dark Identity */}
          <div className={`shrink-0 ${isSidebar ? "w-full pt-1" : "self-center"}`}>
            <span
              className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl font-black text-[11px] sm:text-xs transition-all group-hover:translate-x-0.5 shadow-2xs whitespace-nowrap ${
                isSidebar ? "w-full" : ""
              }`}
              style={{
                background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                color: "#ffffff",
              }}
            >
              <MessageCircle className="w-3.5 h-3.5 stroke-[2.3]" />
              <span>{defaultCta}</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}

