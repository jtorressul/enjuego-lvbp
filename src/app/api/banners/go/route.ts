import { NextResponse } from "next/server";
import { getAdCampaigns, recordBannerMetric } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";

  if (!id) {
    return NextResponse.redirect(new URL("/inicio", request.url), 302);
  }

  try {
    const campaigns = await getAdCampaigns();
    const ad = campaigns.find((c) => c.id === id);

    await recordBannerMetric(id, "click").catch(() => {});

    if (ad && ad.linkUrl && /^https?:\/\//i.test(ad.linkUrl.trim())) {
      return NextResponse.redirect(ad.linkUrl.trim(), 302);
    }
  } catch {
    // Fallback on error
  }

  return NextResponse.redirect(new URL("/inicio", request.url), 302);
}
