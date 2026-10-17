"use client";

import React, { useEffect, useState } from "react";
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

// Single per-page-load assignment cache so all slots on the page get non-repeating ads (like jugadaenvivo.com's /api/ads?slots=...)
let assignedSlotsCache: Record<string, AdCampaign | null> | null = null;
let fetchPromise: Promise<Record<string, AdCampaign | null>> | null = null;
const trackedImpressionsInSession = new Set<string>();

async function loadPageSlotAds(): Promise<Record<string, AdCampaign | null>> {
  if (assignedSlotsCache) {
    return assignedSlotsCache;
  }
  if (!fetchPromise) {
    fetchPromise = fetch(
      "/api/banners?slots=top-leaderboard,in-feed,home-bottom,gameday-sidebar",
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
  alt = "Publicidad",
  title: propTitle,
  subtitle: propSubtitle,
  ctaText: propCtaText,
  companyName: propCompanyName,
  accentColor: propAccentColor,
  className = "",
}: AdBannerProps) {
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPageSlotAds().then((slotsMap) => {
      if (!mounted) return;
      setCampaign(slotsMap[slot] || null);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, [slot]);

  useEffect(() => {
    if (campaign?.id) {
      sendBannerMetric(campaign.id, "impression");
    }
  }, [campaign?.id]);

  // If loaded and no active ad exists for this slot and no explicit props were passed, hide the slot (like jugadaenvivo.com)
  if (loaded && !campaign && !propImageUrl && !propTitle) {
    return null;
  }

  const activeImageUrl = propImageUrl ?? campaign?.imageUrl ?? "";
  const activeLinkUrl = propLinkUrl ?? campaign?.linkUrl ?? "";
  const activeCompanyName =
    propCompanyName || campaign?.companyName || alt || "Publicidad";
  const activeAccentColor =
    propAccentColor || campaign?.accentColor || "#e11d48";
  const activeTitle =
    propTitle ||
    campaign?.title ||
    "Anuncia tu marca en EnJuego.online · Espacio 970x90 px";
  const activeSubtitle =
    propSubtitle ||
    campaign?.subtitle ||
    "Publicidad directa por espacio o rotativa en todo el sitio.";
  const activeCta = propCtaText || campaign?.ctaText || "Pautar";

  const handleBannerClick = () => {
    if (campaign?.id) {
      sendBannerMetric(campaign.id, "click");
    }
  };

  // Exact jugadaenvivo.com .ad-box structure:
  // Clean white card with 14px radius, centered 970x90 graphic banner inside, and "PUBLICIDAD" label underneath
  const bannerGraphic =
    activeImageUrl && !imageError ? (
      <img
        src={activeImageUrl}
        alt={activeCompanyName}
        loading="lazy"
        decoding="async"
        onError={() => setImageError(true)}
        className="block w-full max-w-[970px] h-auto max-h-[115px] object-contain rounded-[8px] mx-auto"
      />
    ) : (
      /* Crisp 970x90 Graphic Banner when no image file was uploaded yet */
      <div
        className="w-full max-w-[970px] rounded-[8px] px-3.5 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between gap-3 mx-auto"
        style={{
          background: "linear-gradient(110deg, #0b1324 0%, #13203c 65%, #1e293b 100%)",
          borderLeft: `5px solid ${activeAccentColor}`,
          color: "#ffffff",
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider leading-none"
              style={{
                backgroundColor: activeAccentColor,
                color: "#ffffff",
              }}
            >
              {activeCompanyName}
            </span>
          </div>
          <p
            className="text-xs sm:text-sm font-black tracking-tight leading-snug truncate"
            style={{ color: "#ffffff" }}
          >
            {activeTitle}
          </p>
          <p
            className="text-[10px] sm:text-xs font-medium leading-snug truncate mt-0.5"
            style={{ color: "#cbd5e1" }}
          >
            {activeSubtitle}
          </p>
        </div>

        <span
          className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-black whitespace-nowrap shadow-xs"
          style={{
            backgroundColor: activeAccentColor,
            color: "#ffffff",
          }}
        >
          {activeCta} →
        </span>
      </div>
    );

  return (
    <div className={`w-full my-2 ${className}`} data-ad-slot={slot}>
      <div className="grid justify-items-center gap-1 p-2 pb-1.5 rounded-[14px] border border-slate-200/90 bg-white shadow-2xs">
        {activeLinkUrl ? (
          <a
            href={activeLinkUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={handleBannerClick}
            className="block w-full max-w-[970px] leading-none"
          >
            {bannerGraphic}
          </a>
        ) : (
          <div className="block w-full max-w-[970px] leading-none">
            {bannerGraphic}
          </div>
        )}
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 leading-none pt-0.5">
          Publicidad
        </span>
      </div>
    </div>
  );
}
