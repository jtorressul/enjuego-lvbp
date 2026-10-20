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
const reportedImpressions = new Set<string>();
const pendingImpressions: { campaignId: string; slot: string; path: string }[] = [];
let impressionFlush: ReturnType<typeof setTimeout> | null = null;

function reportImpression(campaignId: string, slot: string, path: string) {
  const key = `${path}|${slot}|${campaignId}`;
  if (reportedImpressions.has(key)) return;
  reportedImpressions.add(key);
  pendingImpressions.push({ campaignId, slot, path });
  if (impressionFlush) return;
  impressionFlush = setTimeout(() => {
    impressionFlush = null;
    const items = pendingImpressions.splice(0, pendingImpressions.length);
    if (!items.length) return;
    fetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "impressions", items }),
    }).catch(() => {});
  }, 400);
}

function getSlotsForRoute(routeKey: string): string {
  if (routeKey === "/" || routeKey.startsWith("/inicio")) {
    return "top-leaderboard,in-feed,home-bottom";
  }
  if (routeKey.startsWith("/juego")) {
    return "top-leaderboard,gameday-sidebar,recap-large,home-bottom";
  }
  if (routeKey.startsWith("/noticias")) {
    return "top-leaderboard,recap-large,home-bottom";
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
      `/api/banners?slots=${encodeURIComponent(slotsQuery)}&path=${encodeURIComponent(routeKey)}`
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

  useEffect(() => {
    if (!ad?.id) return;
    reportImpression(ad.id, slot, pathname);
  }, [ad?.id, slot, pathname]);

  const finalImageUrl = propImageUrl || ad?.imageUrl || "";
  const finalHref = propLinkUrl || ad?.href || "";
  const finalAlt = ad?.alt || alt || "Publicidad";

  // Fallback to AADS Ad Unit when no direct sponsor banner is assigned
  if (!finalImageUrl || imageError) {
    if (slot === "recap-large" || slot === "in-feed" || slot === "home-bottom") {
      return <AadsAdaptiveBanner className={className} />;
    }

    if (slot === "gameday-sidebar") {
      return (
        <div className={`w-full my-3 ${className}`} data-ad-slot={slot}>
          <div className="w-full flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div style={{ width: "100%", textAlign: "center", marginBottom: "4px" }}>
              <a
                style={{
                  display: "inline-block",
                  fontSize: "11px",
                  color: "#64748b",
                  padding: "2px 8px",
                  background: "#F8F8F9",
                  textDecoration: "none",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
                  fontWeight: 600,
                }}
                target="_blank"
                rel="noopener"
                href="https://aads.com/campaigns/new?source_id=2459266&source_type=ad_unit&partner=2459266"
              >
                Advertise here
              </a>
            </div>
            <iframe
              data-aa="2459266"
              src="//acceptable.a-ads.com/2459266/?size=Adaptive"
              title="Publicidad"
              style={{
                border: 0,
                padding: 0,
                width: "100%",
                minHeight: "250px",
                height: "auto",
                overflow: "hidden",
                margin: "0 auto",
                display: "block",
              }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Publicidad
            </span>
          </div>
        </div>
      );
    }

    // Only render A-Ads unit in top-leaderboard so there are no duplicate IDs
    // or overlaps with mobile navigation bars at the bottom
    if (slot !== "top-leaderboard") {
      return null;
    }

    return (
      <div
        className={`w-full my-3 flex flex-col items-center justify-center ${className}`}
        data-ad-slot={slot}
      >
        <div
          className="ad-box flex flex-col items-center gap-1 pt-2 px-3 pb-1.5 rounded-[14px] border border-[#e4e8ee] bg-white shadow-2xs"
          style={{ backgroundColor: "#ffffff", borderColor: "#e4e8ee" }}
        >
          <div
            id="frame-2459241"
            style={{
              width: "320px",
              margin: "auto",
              zIndex: 1,
              position: "relative",
              height: "auto",
            }}
          >
            <iframe
              data-aa="2459241"
              src="//acceptable.a-ads.com/2459241/?size=320x50"
              title="Publicidad"
              style={{
                border: 0,
                padding: 0,
                width: "320px",
                height: "50px",
                overflow: "hidden",
                display: "block",
                margin: "auto",
              }}
            />
          </div>
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

  const imgElement = (
    <img
      src={finalImageUrl}
      alt={finalAlt}
      loading="lazy"
      decoding="async"
      onError={() => setImageError(true)}
      className="block w-full aspect-[8.63/1] object-fill rounded-[8px]"
      style={{ width: "100%", display: "block" }}
    />
  );

  return (
    <div
      className={`w-full my-2.5 ${className}`}
      data-ad-slot={slot}
    >
      <div
        className="ad-box w-full flex flex-col items-center gap-1 pt-2 px-2 pb-1.5 rounded-[14px] border border-[#e4e8ee] bg-white shadow-2xs"
        style={{ backgroundColor: "#ffffff", borderColor: "#e4e8ee" }}
      >
        {finalHref ? (
          <a
            href={finalHref}
            target="_blank"
            rel="noopener sponsored"
            className="block w-full leading-none"
            style={{ width: "100%", display: "block" }}
          >
            {imgElement}
          </a>
        ) : (
          <div className="block w-full leading-none" style={{ width: "100%" }}>
            {imgElement}
          </div>
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

/**
 * A-Ads Sticky Floating Header Unit (ID: 2459265, Adaptive)
 * Renders at the top with a dismiss button.
 */
export function AadsStickyBanner() {
  const [closed, setClosed] = useState(false);

  const handleClose = () => {
    setClosed(true);
  };

  if (closed) return null;

  return (
    <div
      className="aads-sticky-container"
      style={{ position: "relative", zIndex: 40 }}
    >
      <input
        autoComplete="off"
        type="checkbox"
        id="aadsstickymvh66k9g"
        hidden
        checked={closed}
        onChange={handleClose}
      />
      <div style={{ paddingTop: "auto", paddingBottom: 0 }}>
        <div
          style={{
            width: "100%",
            height: "auto",
            position: "fixed",
            textAlign: "center",
            fontSize: 0,
            top: 0,
            left: 0,
            right: 0,
            margin: "auto",
            zIndex: 40,
            backgroundColor: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
          }}
        >
          <label
            htmlFor="aadsstickymvh66k9g"
            onClick={handleClose}
            style={{
              top: "50%",
              transform: "translateY(-50%)",
              right: "16px",
              position: "absolute",
              borderRadius: "6px",
              background: "rgba(241, 245, 249, 0.95)",
              padding: "6px",
              zIndex: 41,
              cursor: "pointer",
              border: "1px solid rgba(203, 213, 225, 0.8)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Cerrar anuncio"
            aria-label="Cerrar anuncio"
          >
            <svg
              fill="#000000"
              height="14px"
              width="14px"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 490 490"
            >
              <polygon points="456.851,0 245,212.564 33.149,0 0.708,32.337 212.669,245.004 0.708,457.678 33.149,490 245,277.443 456.851,490 489.292,457.678 277.331,245.004 489.292,32.337 " />
            </svg>
          </label>
          <div
            id="frame"
            style={{
              width: "100%",
              margin: "auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            <iframe
              data-aa="2459265"
              src="//acceptable.a-ads.com/2459265/?size=Adaptive"
              title="Publicidad"
              style={{
                border: 0,
                padding: 0,
                width: "min(70%, 970px)",
                minHeight: "90px",
                height: "auto",
                overflow: "hidden",
                margin: "auto",
                display: "block",
              }}
            />
          </div>
        </div>
        <style>{`
          #aadsstickymvh66k9g:checked + div {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
}

/**
 * A-Ads Large Adaptive Banner Unit (ID: 2459265)
 * In-content responsive banner container for recaps and news articles.
 */
export function AadsAdaptiveBanner({
  className = "",
  label = "Publicidad",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`w-full my-5 flex flex-col items-center justify-center ${className}`}
      data-ad-slot="recap-large"
    >
      <div className="w-full max-w-4xl flex flex-col items-center gap-1.5 pt-2 px-2.5 pb-1.5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div
          style={{
            width: "100%",
            margin: "auto",
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <iframe
            data-aa="2459265"
            src="//acceptable.a-ads.com/2459265/?size=Adaptive"
            title="Publicidad"
            style={{
              border: 0,
              padding: 0,
              width: "100%",
              maxWidth: "970px",
              minHeight: "90px",
              height: "auto",
              overflow: "hidden",
              display: "block",
              margin: "auto",
            }}
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * A-Ads Adaptive Banner Unit (ID: 2459266)
 * Clean, 100% visible in-page adaptive container without hidden duplicates.
 */
export function AadsSkyscraperBanner({
  className = "",
}: {
  className?: string;
  mode?: string;
}) {
  return (
    <div
      className={`w-full my-4 flex flex-col items-center justify-center ${className}`}
      data-ad-slot="aads-2459266"
    >
      <div
        className="w-full max-w-4xl flex flex-col items-center gap-1.5 pt-2 px-3 pb-2 rounded-2xl border border-slate-200 bg-white shadow-2xs"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div
          id="frame-2459266"
          style={{
            width: "100%",
            margin: "auto",
            position: "relative",
            zIndex: 1,
            display: "block",
            textAlign: "center",
          }}
        >
          <iframe
            data-aa="2459266"
            src="//acceptable.a-ads.com/2459266/?size=Adaptive"
            title="Publicidad"
            style={{
              border: 0,
              padding: 0,
              width: "min(70%, 970px)",
              minHeight: "90px",
              height: "auto",
              overflow: "hidden",
              display: "block",
              margin: "auto",
            }}
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Publicidad
        </span>
      </div>
    </div>
  );
}
