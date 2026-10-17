"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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

// Per-route batch cache so all AdBanner slots on the same page load share ONE non-repeating random shuffle,
// and re-shuffle dynamically whenever the user navigates to a new route or reloads the page (just like jugadaenvivo.com)
let cachedRouteKey = "";
let assignedSlotsCache: Record<string, AdCampaign | null> | null = null;
let fetchPromise: Promise<Record<string, AdCampaign | null>> | null = null;
const trackedImpressionsInSession = new Set<string>();

async function loadPageSlotAds(
  routeKey: string
): Promise<Record<string, AdCampaign | null>> {
  if (assignedSlotsCache && cachedRouteKey === routeKey) {
    return assignedSlotsCache;
  }
  if (!fetchPromise || cachedRouteKey !== routeKey) {
    cachedRouteKey = routeKey;
    assignedSlotsCache = null;
    fetchPromise = fetch(
      `/api/banners?slots=top-leaderboard,in-feed,home-bottom,gameday-sidebar&_t=${Date.now()}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const map: Record<string, AdCampaign | null> = data?.slots || {};
        assignedSlotsCache = map;
        return map;
      })
      .catch(() => {
        return {} as Record<string, AdCampaign | null>;
      })
      .finally(() => {
        setTimeout(() => {
          fetchPromise = null;
        }, 3000);
      });
  }
  return fetchPromise;
}

function sendBannerMetric(campaignId: string, metric: "impression" | "click") {
  if (!campaignId) return;
  if (metric === "impression") {
    const key = `${campaignId}:${cachedRouteKey}`;
    if (trackedImpressionsInSession.has(key)) return;
    trackedImpressionsInSession.add(key);
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
  alt = "Publicidad en EnJuego.online",
  title: propTitle,
  subtitle: propSubtitle,
  ctaText: propCtaText,
  companyName: propCompanyName,
  accentColor: propAccentColor,
  className = "",
}: AdBannerProps) {
  const pathname = usePathname() || "/inicio";
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setImageError(false);
    loadPageSlotAds(pathname).then((slotsMap) => {
      if (!mounted) return;
      setCampaign(slotsMap[slot] || null);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, [slot, pathname]);

  useEffect(() => {
    if (campaign?.id) {
      sendBannerMetric(campaign.id, "impression");
    }
  }, [campaign?.id]);

  // If loaded and no active ad exists for this slot and no explicit props were passed, hide the slot cleanly
  if (loaded && !campaign && !propImageUrl && !propTitle) {
    return null;
  }

  const activeImageUrl = propImageUrl ?? campaign?.imageUrl ?? "";
  const activeLinkUrl =
    propLinkUrl ||
    campaign?.linkUrl ||
    "https://wa.me/?text=Hola%20EnJuego.online,%20deseo%20informaci%C3%B3n%20para%20publicitar%20mi%20marca";
  const activeCompanyName =
    propCompanyName || campaign?.companyName || "enjuego.online";
  const activeAccentColor =
    propAccentColor || campaign?.accentColor || "#e11d48";

  const activeTitle =
    propTitle ||
    campaign?.title ||
    "Impulsa tu marca en EnJuego.online";

  const activeSubtitle =
    propSubtitle ||
    campaign?.subtitle ||
    "Espacio disponible para banners y alianzas comerciales.";

  const activeCta = propCtaText || campaign?.ctaText || "Pautar";
  const isSidebar = slot === "gameday-sidebar";

  const handleBannerClick = () => {
    if (campaign?.id) {
      sendBannerMetric(campaign.id, "click");
    }
  };

  return (
    <div className={`w-full min-w-0 max-w-full overflow-hidden ${className}`} data-ad-slot={slot}>
      {activeImageUrl && !imageError ? (
        /* CUSTOM UPLOADED GRAPHIC BANNER (PNG, JPG, WebP or Animated GIF) */
        <div className="relative group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <a
            href={activeLinkUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={handleBannerClick}
            className="block w-full leading-none"
            aria-label={`${activeCompanyName} - ${alt}`}
          >
            <img
              src={activeImageUrl}
              alt={activeCompanyName || alt}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className={`block w-full h-auto object-cover mx-auto ${
                isSidebar ? "max-h-[220px]" : "max-h-[115px]"
              }`}
            />
          </a>
        </div>
      ) : (
        /* ENJUEGO.ONLINE BROADCAST TICKET BANNER (FULL WIDTH, NO OUTER WHITE FRAME, ZERO OVERFLOW) */
        <div
          className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl transition-all hover:shadow-md"
          style={{
            background: "linear-gradient(110deg, #ffffff 0%, #f8fafc 65%, #fff1f2 100%)",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Left Signature Brand Accent Bar */}
          <div
            className="absolute inset-y-0 left-0 w-1.5"
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
            rel="sponsored noopener noreferrer"
            onClick={handleBannerClick}
            className={`group relative w-full min-w-0 pl-4 pr-3 py-2.5 sm:px-5 sm:py-3.5 flex ${
              isSidebar
                ? "flex-col items-start gap-2.5"
                : "flex-row items-center justify-between gap-2.5 sm:gap-4"
            }`}
            aria-label={`${activeCompanyName} - ${activeTitle}`}
          >
            {/* Left Content: Brand Pill + Copy */}
            <div className="min-w-0 flex-1 w-full">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider leading-none"
                  style={{
                    backgroundColor: `${activeAccentColor}18`,
                    color: activeAccentColor,
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{activeCompanyName}</span>
                </span>
                <span
                  className="text-[9px] font-extrabold uppercase tracking-widest"
                  style={{ color: "#94a3b8" }}
                >
                  · Patrocinador
                </span>
              </div>

              <h3
                className="text-xs sm:text-sm font-black tracking-tight leading-snug break-words"
                style={{ color: "#0f172a" }}
              >
                {activeTitle}
              </h3>

              <p
                className="text-[11px] sm:text-xs font-medium leading-snug mt-0.5 break-words"
                style={{ color: "#475569" }}
              >
                {activeSubtitle}
              </p>
            </div>

            {/* Right CTA Button */}
            <div className={`shrink-0 ${isSidebar ? "w-full pt-0.5" : "self-center"}`}>
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
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
