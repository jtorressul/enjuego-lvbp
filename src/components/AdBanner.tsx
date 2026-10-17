"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AdSlotType, ServedSlotAd } from "@/lib/admin-store";

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

// Per-route batch cache so all AdBanner slots on the same page share ONE request
// and rotate ads without repeating on the same page.
let cachedRouteKey = "";
let assignedSlotsCache: Record<string, ServedSlotAd | null> | null = null;
let fetchPromise: Promise<Record<string, ServedSlotAd | null>> | null = null;

function getSlotsForRoute(routeKey: string): string {
  if (routeKey === "/" || routeKey.startsWith("/inicio")) {
    return "top-leaderboard,in-feed,home-bottom";
  }
  if (routeKey.startsWith("/juego")) {
    return "top-leaderboard,gameday-sidebar,home-bottom";
  }
  return "top-leaderboard,home-bottom";
}

async function loadPageSlotAds(
  routeKey: string
): Promise<Record<string, ServedSlotAd | null>> {
  if (assignedSlotsCache && cachedRouteKey === routeKey) {
    return assignedSlotsCache;
  }
  if (!fetchPromise || cachedRouteKey !== routeKey) {
    cachedRouteKey = routeKey;
    assignedSlotsCache = null;
    const slotsQuery = getSlotsForRoute(routeKey);
    fetchPromise = fetch(
      `/api/banners?slots=${encodeURIComponent(slotsQuery)}&_t=${Date.now()}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const map: Record<string, ServedSlotAd | null> =
          data?.slots || data || {};
        assignedSlotsCache = map;
        return map;
      })
      .catch(() => {
        return {} as Record<string, ServedSlotAd | null>;
      })
      .finally(() => {
        setTimeout(() => {
          fetchPromise = null;
        }, 1500);
      });
  }
  return fetchPromise;
}

export function AdBanner({
  slot = "top-leaderboard",
  imageUrl: propImageUrl,
  linkUrl: propLinkUrl,
  alt = "Publicidad",
  className = "",
}: AdBannerProps) {
  const pathname = usePathname() || "/inicio";
  const [ad, setAd] = useState<ServedSlotAd | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setImageError(false);
    loadPageSlotAds(pathname).then((slotsMap) => {
      if (!mounted) return;
      setAd(slotsMap[slot] ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [slot, pathname]);

  const finalImageUrl = propImageUrl || ad?.imageUrl || "";
  const finalHref = propLinkUrl || ad?.href || "";
  const finalAlt = ad?.alt || alt || "Publicidad";

  // Hidden completely when no active ad is assigned to this slot
  if (!finalImageUrl || imageError) {
    return null;
  }

  const imgElement = (
    <img
      src={finalImageUrl}
      alt={finalAlt}
      loading="lazy"
      decoding="async"
      onError={() => setImageError(true)}
      className="block w-full h-auto rounded-[8px]"
    />
  );

  return (
    <div
      className={`w-full max-w-[1120px] mx-auto my-2.5 ${className}`}
      data-ad-slot={slot}
    >
      <div
        className="ad-box w-full grid justify-items-center gap-1 pt-2 px-2 pb-1.5 rounded-[14px] border border-[#e4e8ee] bg-white"
        style={{ backgroundColor: "#ffffff", borderColor: "#e4e8ee" }}
      >
        {finalHref ? (
          <a
            href={finalHref}
            target="_blank"
            rel="noopener sponsored"
            className="block w-full leading-none"
          >
            {imgElement}
          </a>
        ) : (
          <div className="block w-full leading-none">{imgElement}</div>
        )}
        <span
          className="ad-label text-[0.62rem] font-bold uppercase tracking-[0.1em] leading-none"
          style={{ color: "#667085" }}
        >
          Publicidad
        </span>
      </div>
    </div>
  );
}
