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
      ? "Llega a la fanaticada del béisbol venezolano"
      : "Tu marca en En Juego · Espacio Publicitario");

  const defaultSubtitle =
    subtitle ||
    (slot === "in-feed"
      ? "Promociona tu negocio o producto en cada jornada ante miles de aficionados."
      : "Espacio disponible para banners y patrocinantes. Contáctanos para pautas.");

  const defaultCta = ctaText || "Anúnciate aquí";

  return (
    <div className={`w-full ${className}`}>
      {/* CLEAN CARD CONTAINER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-2xs">
        {imageUrl && !imageError ? (
          /* Custom Banner Image */
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full overflow-hidden rounded-xl bg-slate-950 aspect-[21/9] sm:aspect-[36/9] max-h-[110px]"
            aria-label={alt}
          >
            <img
              src={imageUrl}
              alt={alt}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 text-white rounded-md px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
              <span>Abrir</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </div>
          </a>
        ) : (
          /* Clean, High-Contrast Ad Placeholder Card */
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="keep-dark group relative block w-full overflow-hidden rounded-xl bg-slate-950 p-3 sm:p-4 text-white border border-slate-800 transition-all hover:border-amber-400/70"
            aria-label={alt}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Left Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-2xs group-hover:scale-105 transition-transform">
                  <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                    {defaultTitle}
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    {defaultSubtitle}
                  </p>
                </div>
              </div>

              {/* Right Button */}
              <div className="shrink-0 self-end sm:self-center">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-2xs group-hover:scale-105">
                  <span>{defaultCta}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </a>
        )}

        {/* Discreet Footer Label */}
        <div className="flex items-center justify-between px-1.5 pt-1.5 text-[9px] text-slate-400 font-semibold">
          <span>EnJuego Publicidad</span>
          <span className="uppercase tracking-wider">PUBLICIDAD</span>
        </div>
      </div>
    </div>
  );
}
