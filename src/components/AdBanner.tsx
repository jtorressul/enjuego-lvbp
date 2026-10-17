"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  normalizeSlotKey,
  type AdSlotType,
  type ServedSlotAd,
} from "@/lib/admin-store";

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

// Per-route batch cache so all [data-ad-slot] components on the same page share ONE request to /api/banners?slots=...
// and never repeat the same ad on the same page (exact jugadaenvivo.com ads.js logic).
let cachedRouteKey = "";
let assignedSlotsCache: Record<string, ServedSlotAd | null> | null = null;
let fetchPromise: Promise<Record<string, ServedSlotAd | null>> | null = null;

const ALL_SLOTS_QUERY =
  "home_top,home_mid,home_bottom,listas_top,listas_bottom,gameday,top-leaderboard,in-feed,home-bottom,gameday-sidebar";

async function loadPageSlotAds(
  routeKey: string
): Promise<Record<string, ServedSlotAd | null>> {
  if (assignedSlotsCache && cachedRouteKey === routeKey) {
    return assignedSlotsCache;
  }
  if (!fetchPromise || cachedRouteKey !== routeKey) {
    cachedRouteKey = routeKey;
    assignedSlotsCache = null;
    fetchPromise = fetch(
      `/api/banners?slots=${encodeURIComponent(ALL_SLOTS_QUERY)}&_t=${Date.now()}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const map: Record<string, ServedSlotAd | null> = data?.slots || data || {};
        assignedSlotsCache = map;
        return map;
      })
      .catch(() => {
        return {} as Record<string, ServedSlotAd | null>;
      })
      .finally(() => {
        setTimeout(() => {
          fetchPromise = null;
        }, 2500);
      });
  }
  return fetchPromise;
}

export function AdBanner({
  slot = "home_top",
  imageUrl: propImageUrl,
  linkUrl: propLinkUrl,
  alt = "Publicidad",
  className = "",
}: AdBannerProps) {
  const pathname = usePathname() || "/inicio";
  const [ad, setAd] = useState<ServedSlotAd | null>(null);
  const [imageError, setImageError] = useState(false);

  // Map legacy slot names contextual to current pathname if needed
  const effectiveSlot = React.useMemo(() => {
    const isListPage =
      pathname.startsWith("/resultados") ||
      pathname.startsWith("/calendario") ||
      pathname.startsWith("/posiciones") ||
      pathname.startsWith("/lideres") ||
      pathname.startsWith("/equipos") ||
      pathname.startsWith("/comunidad") ||
      pathname.startsWith("/favoritos");

    if (isListPage) {
      if (slot === "top-leaderboard" || slot === "home_top") return "listas_top";
      if (slot === "home-bottom" || slot === "home_bottom" || slot === "in-feed")
        return "listas_bottom";
    }
    return normalizeSlotKey(slot);
  }, [slot, pathname]);

  useEffect(() => {
    let mounted = true;
    setImageError(false);
    loadPageSlotAds(pathname).then((slotsMap) => {
      if (!mounted) return;
      const picked = slotsMap[effectiveSlot] ?? slotsMap[slot] ?? null;
      setAd(picked);
    });
    return () => {
      mounted = false;
    };
  }, [effectiveSlot, slot, pathname]);

  const finalImageUrl = propImageUrl || ad?.imageUrl || "";
  const finalHref = propLinkUrl || ad?.href || "";
  const finalAlt = ad?.alt || alt || "Publicidad";

  // Exact jugadaenvivo.com behavior: if there is no active image ad for this slot, keep the container hidden (return null)
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
      className="block max-w-full h-auto rounded-[8px]"
    />
  );

  return (
    <div
      className={`w-full my-2 ${className}`}
      data-ad-slot={effectiveSlot}
    >
      <div
        className="ad-box grid justify-items-center gap-1 pt-2 px-2 pb-1.5 rounded-[14px] border border-[#e2e8f0] bg-white shadow-2xs"
        style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
      >
        {finalHref ? (
          <a
            href={finalHref}
            target="_blank"
            rel="noopener sponsored"
            className="block max-w-full leading-none"
          >
            {imgElement}
          </a>
        ) : (
          imgElement
        )}
        <span
          className="ad-label text-[0.62rem] font-bold uppercase tracking-[0.1em] leading-none"
          style={{ color: "#64748b" }}
        >
          Publicidad
        </span>
      </div>
    </div>
  );
}
