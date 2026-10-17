"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ExternalLink, MessageCircle, ArrowRight } from "lucide-react";
import type { AdCampaign, AdSlotType } from "@/lib/admin-store";

export interface AdBannerProps {
  slot?: AdSlotType;
  imageUrl?: string;
  linkUrl?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  companyName?: string;
  accentColor?: string;
  className?: string;
}

// Shared client-side cache so multiple AdBanners on the same page only fetch once
let cachedCampaigns: AdCampaign[] | null = null;
let cachedRotationSec = 6;
let fetchPromise: Promise<{ campaigns: AdCampaign[]; rotationSeconds: number }> | null = null;
const trackedImpressionsInSession = new Set<string>();

async function loadDynamicBanners(): Promise<{
  campaigns: AdCampaign[];
  rotationSeconds: number;
}> {
  if (cachedCampaigns) {
    return { campaigns: cachedCampaigns, rotationSeconds: cachedRotationSec };
  }
  if (!fetchPromise) {
    fetchPromise = fetch("/api/banners", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        cachedCampaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
        cachedRotationSec = Number(data.rotationSeconds) || 6;
        return { campaigns: cachedCampaigns, rotationSeconds: cachedRotationSec };
      })
      .catch(() => {
        return { campaigns: [], rotationSeconds: 6 };
      })
      .finally(() => {
        setTimeout(() => {
          fetchPromise = null;
        }, 15_000);
      });
  }
  return fetchPromise;
}

function sendBannerMetric(campaignId: string, metric: "impression" | "click") {
  if (!campaignId) return;
  if (metric === "impression") {
    if (trackedImpressionsInSession.has(campaignId)) return;
    trackedImpressionsInSession.add(campaignId);
  }
  fetch("/api/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "metric", campaignId, metric }),
  }).catch(() => {});
}

export function AdBanner({
  slot = "top-leaderboard",
  imageUrl: propImageUrl,
  linkUrl: propLinkUrl,
  alt = "Espacio Comercial en EnJuego.online",
  title: propTitle,
  subtitle: propSubtitle,
  ctaText: propCtaText,
  companyName: propCompanyName,
  accentColor: propAccentColor,
  className = "",
}: AdBannerProps) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [rotationSec, setRotationSec] = useState<number>(6);
  // Stagger initial index by slot so top-leaderboard, in-feed, and gameday-sidebar show different companies simultaneously
  const slotOffset = slot === "top-leaderboard" ? 0 : slot === "in-feed" ? 1 : 2;
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadDynamicBanners().then(({ campaigns: loaded, rotationSeconds }) => {
      if (!mounted) return;
      const matching = loaded.filter(
        (c) => c.active && (!Array.isArray(c.slots) || c.slots.includes(slot))
      );
      setCampaigns(matching);
      setRotationSec(rotationSeconds || 6);
      if (matching.length > 0) {
        setActiveIndex(slotOffset % matching.length);
      }
    });
    return () => {
      mounted = false;
    };
  }, [slot, slotOffset]);

  // Rotate automatically across all active companies (e.g., all 5 companies)
  useEffect(() => {
    if (campaigns.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % campaigns.length);
      setImageError(false);
    }, Math.max(3, rotationSec) * 1000);
    return () => clearInterval(timer);
  }, [campaigns.length, rotationSec]);

  const currentCampaign =
    campaigns.length > 0 ? campaigns[activeIndex % campaigns.length] : null;

  // Record impression when a campaign becomes visible
  useEffect(() => {
    if (currentCampaign?.id) {
      sendBannerMetric(currentCampaign.id, "impression");
    }
  }, [currentCampaign?.id]);

  const activeImageUrl = propImageUrl ?? currentCampaign?.imageUrl ?? "";
  const activeLinkUrl =
    propLinkUrl ||
    currentCampaign?.linkUrl ||
    "https://wa.me/?text=Hola%20EnJuego.online,%20deseo%20informaci%C3%B3n%20para%20publicitar%20mi%20marca";
  const activeCompanyName =
    propCompanyName || currentCampaign?.companyName || "enjuego.online";
  const activeAccentColor =
    propAccentColor || currentCampaign?.accentColor || "#e11d48";

  const activeTitle =
    propTitle ||
    currentCampaign?.title ||
    (slot === "in-feed"
      ? "Impulsa tu marca en cada jornada"
      : slot === "gameday-sidebar"
        ? "Patrocina el Jugada a Jugada"
        : "Tu marca aquí en EnJuego.online");

  const activeSubtitle =
    propSubtitle ||
    currentCampaign?.subtitle ||
    (slot === "in-feed"
      ? "Conecta con miles de fanáticos del béisbol en vivo."
      : slot === "gameday-sidebar"
        ? "Presencia directa junto a la pizarra en tiempo real."
        : "Espacio disponible para banners y alianzas comerciales.");

  const activeCta = propCtaText || currentCampaign?.ctaText || "Pautar";
  const isSidebar = slot === "gameday-sidebar";

  const handleBannerClick = () => {
    if (currentCampaign?.id) {
      sendBannerMetric(currentCampaign.id, "click");
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {activeImageUrl && !imageError ? (
        /* CUSTOM GRAPHIC BANNER IMAGE (WITH MULTI-COMPANY CAROUSEL CONTROLS) */
        <div className="relative group w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xs">
          <a
            href={activeLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleBannerClick}
            className="block w-full aspect-[21/9] sm:aspect-[32/9] max-h-[120px]"
            aria-label={`${activeCompanyName} - ${alt}`}
          >
            <img
              src={activeImageUrl}
              alt={activeCompanyName || alt}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
            />
            <span
              className="absolute top-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-xs"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.78)", color: "#ffffff" }}
            >
              {activeCompanyName}
            </span>
            <div
              className="absolute bottom-2 right-2 rounded-lg px-2.5 py-1 text-[10px] font-black flex items-center gap-1 backdrop-blur-xs shadow-xs"
              style={{ backgroundColor: activeAccentColor, color: "#ffffff" }}
            >
              <span>{activeCta}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </div>
          </a>

          {campaigns.length > 1 && (
            <div
              className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-xs"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
            >
              {campaigns.map((c, idx) => {
                const isCurrent = idx === activeIndex % campaigns.length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveIndex(idx);
                      setImageError(false);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isCurrent ? "w-4 bg-white" : "w-1.5 bg-white/45 hover:bg-white/80"
                    }`}
                    aria-label={`Ver anunciante ${idx + 1}: ${c.companyName}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ENJUEGO.ONLINE ORIGINAL BROADCAST TICKET BANNER (WITH MULTI-COMPANY ROTATION) */
        <div
          className="relative w-full overflow-hidden rounded-2xl transition-all hover:shadow-md"
          style={{
            background: "linear-gradient(110deg, #ffffff 0%, #f8fafc 65%, #fff1f2 100%)",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Left Signature Brand Accent Bar (Dynamic per Company) */}
          <div
            className="absolute inset-y-0 left-0 w-1.5 transition-colors duration-300"
            style={{
              background: `linear-gradient(180deg, ${activeAccentColor} 0%, #0f172a 100%)`,
            }}
          />

          {/* Subtle Baseball Diamond SVG Watermark on the Right */}
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute -right-4 -bottom-6 w-28 h-28 opacity-[0.05] rotate-12"
            style={{ color: activeAccentColor }}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          >
            <rect x="20" y="20" width="60" height="60" rx="8" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="10" fill="currentColor" />
          </svg>

          <a
            href={activeLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleBannerClick}
            className={`group relative pl-4 pr-3 py-2.5 sm:px-5 sm:py-3.5 flex ${
              isSidebar
                ? "flex-col items-start gap-2.5"
                : "flex-row items-center justify-between gap-2.5 sm:gap-4"
            }`}
            aria-label={`${activeCompanyName} - ${activeTitle}`}
          >
            {/* Left Content: Brand Pill + Full Unclipped Copy */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider leading-none"
                  style={{
                    backgroundColor: `${activeAccentColor}18`,
                    color: activeAccentColor,
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span>{activeCompanyName}</span>
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase tracking-widest"
                  style={{ color: "#94a3b8" }}
                >
                  · Patrocinador
                </span>
              </div>

              <h3
                className="text-xs sm:text-sm font-black tracking-tight leading-snug"
                style={{ color: "#0f172a" }}
              >
                {activeTitle}
              </h3>

              <p
                className="text-[11px] sm:text-xs font-medium leading-snug mt-0.5"
                style={{ color: "#475569" }}
              >
                {activeSubtitle}
              </p>
            </div>

            {/* Right CTA Pill + Carousel Dots */}
            <div
              className={`shrink-0 flex flex-col items-end gap-1.5 ${
                isSidebar ? "w-full pt-1 items-stretch" : "self-center"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl font-black text-[11px] sm:text-xs transition-all group-hover:translate-x-0.5 shadow-2xs whitespace-nowrap ${
                  isSidebar ? "w-full" : ""
                }`}
                style={{
                  backgroundColor: activeAccentColor,
                  color: "#ffffff",
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 stroke-[2.3]" />
                <span>{activeCta}</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </span>

              {campaigns.length > 1 && (
                <div
                  className="flex items-center justify-center gap-1 pt-0.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {campaigns.map((c, idx) => {
                    const isCurrent = idx === activeIndex % campaigns.length;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveIndex(idx);
                        }}
                        className="p-0.5 cursor-pointer"
                        title={c.companyName}
                        aria-label={`Ver ${c.companyName}`}
                      >
                        <span
                          className="block h-1.5 rounded-full transition-all"
                          style={{
                            width: isCurrent ? "14px" : "6px",
                            backgroundColor: isCurrent ? activeAccentColor : "#cbd5e1",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
