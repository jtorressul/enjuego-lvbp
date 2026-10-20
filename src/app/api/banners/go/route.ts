import { NextResponse } from "next/server";
import {
  detectUserAgentMeta,
  getAdCampaigns,
  recordBannerMetric,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const slot = searchParams.get("slot") || "top-leaderboard";
  const pagePath = searchParams.get("path") || "/inicio";

  if (!id) {
    return NextResponse.redirect(new URL("/inicio", request.url), 302);
  }

  try {
    const campaigns = await getAdCampaigns();
    const ad = campaigns.find((c) => c.id === id);
    const ua = request.headers.get("user-agent") || "";
    const isBot = /(bot|crawler|spider|whatsapp|facebookexternalhit|twitterbot|curl|python|headless)/i.test(ua);
    const uaMeta = detectUserAgentMeta(ua);

    if (!isBot) {
      await recordBannerMetric(id, "click", {
        device: uaMeta.device,
        os: uaMeta.os,
        slot,
        pagePath,
        campaignName: ad?.name || ad?.companyName || id,
        targetUrl: ad?.linkUrl || "",
      }).catch(() => {});
    }

    if (ad && ad.linkUrl && /^https?:\/\//i.test(ad.linkUrl.trim())) {
      return NextResponse.redirect(ad.linkUrl.trim(), 302);
    }
  } catch {
    // Fallback on error
  }

  return NextResponse.redirect(new URL("/inicio", request.url), 302);
}
