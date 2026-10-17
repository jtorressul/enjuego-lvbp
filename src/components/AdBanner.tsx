"use client";

import React, { useState } from "react";
import { Megaphone, ExternalLink, ArrowUpRight } from "lucide-react";

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
  linkUrl = "https://wa.me/?text=Hola%20EnJuego,%20deseo%20informaci%C3%B3n%20para%20pautar%20publicidad%20en%20su%20portal%20de%20b%C3%A9isbol",
  alt = "Publicidad en EnJuego",
  title,
  subtitle,
  ctaText,
  className = "",
}: AdBannerProps) {
  const [imageError, setImageError] = useState(false);

  // Clean, honest copy without any fake official claims
  const defaultTitle =
    title ||
    (slot === "in-feed"
      ? "Llega a la fanaticada del béisbol"
      : slot === "gameday-sidebar"
        ? "Patrocina la Pizarra en Vivo"
        : "Tu marca en EnJuego.online");

  const defaultSubtitle =
    subtitle ||
    (slot === "in-feed"
      ? "Promociona tu negocio en cada jornada ante miles de fanáticos."
      : slot === "gameday-sidebar"
        ? "Presencia destacada durante las transmisiones y jugada a jugada."
        : "Espacio disponible para banners y patrocinios.");

  const defaultCta = ctaText || "Anúnciate";

  const isSidebar = slot === "gameday-sidebar";

  return (
    <div className={`w-full ${className}`}>
      {/* CLEAN EDITORIAL CARD CONTAINER */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-1.5 sm:p-2.5 shadow-2xs">
        {imageUrl && !imageError ? (
          /* Custom Banner Image */
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full overflow-hidden rounded-xl bg-slate-950 aspect-[21/9] sm:aspect-[32/9] max-h-[115px]"
            aria-label={alt}
          >
            <img
              src={imageUrl}
              alt={alt}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            />
            <div
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs"
              style={{ backgroundColor: "rgba(6, 10, 18, 0.85)", color: "#ffffff" }}
            >
              <span>Abrir</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </div>
          </a>
        ) : (
          /* High-Contrast Sleek Banner Inside Card (Immune to CSS Overrides) */
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full overflow-hidden rounded-xl px-2.5 py-2 sm:px-4 sm:py-3 transition-all"
            style={{
              background: "linear-gradient(135deg, #0b1324 0%, #13203c 55%, #1e293b 100%)",
              border: "1px solid #1e293b",
              color: "#ffffff",
            }}
            aria-label={alt}
          >
            {/* Subtle decorative glow */}
            <div
              className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20 blur-2xl"
              style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }}
            />

            <div
              className={`relative flex ${
                isSidebar
                  ? "flex-col items-start gap-2.5"
                  : "flex-row items-center justify-between gap-2 sm:gap-4"
              }`}
            >
              {/* Left Info */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105"
                  style={{ backgroundColor: "#f59e0b", color: "#0f172a" }}
                >
                  <Megaphone className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none"
                      style={{
                        backgroundColor: "rgba(245, 158, 11, 0.18)",
                        color: "#fbbf24",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                      }}
                    >
                      Patrocinio
                    </span>
                    <span
                      className="text-xs sm:text-sm font-black tracking-tight leading-snug truncate"
                      style={{ color: "#ffffff" }}
                    >
                      {defaultTitle}
                    </span>
                  </div>
                  <p
                    className="text-[10px] sm:text-[11px] leading-snug mt-0.5 line-clamp-1"
                    style={{ color: "#cbd5e1" }}
                  >
                    {defaultSubtitle}
                  </p>
                </div>
              </div>

              {/* Right CTA Button */}
              <div className={`shrink-0 ${isSidebar ? "w-full pt-0.5" : "self-center"}`}>
                <span
                  className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition-transform group-hover:scale-102 shadow-xs whitespace-nowrap ${
                    isSidebar ? "w-full" : ""
                  }`}
                  style={{ backgroundColor: "#f59e0b", color: "#0f172a" }}
                >
                  <span>{defaultCta}</span>
                  {!ctaText && <span className="hidden sm:inline">aquí</span>}
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                </span>
              </div>
            </div>
          </a>
        )}

        {/* Centered PUBLICIDAD Label (Like Reference Design) */}
        <div className="pt-1 sm:pt-1.5 text-center leading-none">
          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
            PUBLICIDAD
          </span>
        </div>
      </div>
    </div>
  );
}
