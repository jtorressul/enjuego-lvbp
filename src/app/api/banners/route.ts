import { NextResponse } from "next/server";
import {
  detectUserAgentMeta,
  getAdCampaigns,
  isAdCampaignLive,
  pickAdsForPageSlots,
  recordBannerMetric,
  recordPresenceHeartbeat,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slotsParam = searchParams.get("slots");
    const pagePath = searchParams.get("path") || "/inicio";
    const ua = request.headers.get("user-agent");
    const uaMeta = detectUserAgentMeta(ua);

    if (slotsParam) {
      const requested = Array.from(
        new Set(
          slotsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ).slice(0, 12);

      const assigned = await pickAdsForPageSlots(requested, {
        device: uaMeta.device,
        os: uaMeta.os,
        pagePath,
      });
      return NextResponse.json(
        {
          ...assigned,
          slots: assigned,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const campaigns = await getAdCampaigns();
    const activeCampaigns = campaigns.filter(isAdCampaignLive);
    const assigned = await pickAdsForPageSlots(
      [
        "home_top",
        "home_mid",
        "home_bottom",
        "listas_top",
        "listas_bottom",
        "gameday",
      ],
      {
        device: uaMeta.device,
        os: uaMeta.os,
        pagePath,
      }
    );

    return NextResponse.json(
      {
        ...assigned,
        campaigns: activeCampaigns,
        slots: assigned,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al cargar banners" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;
    const ua = request.headers.get("user-agent");
    const uaMeta = detectUserAgentMeta(ua);

    if (action === "metric") {
      const { campaignId, metric, slot, path } = body;
      if (campaignId && (metric === "impression" || metric === "click")) {
        await recordBannerMetric(String(campaignId), metric, {
          device: uaMeta.device,
          os: uaMeta.os,
          slot: slot ? String(slot) : "top-leaderboard",
          pagePath: path ? String(path) : "/inicio",
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "heartbeat") {
      const {
        sessionId,
        userId,
        userName,
        userHandle,
        favoriteTeam,
        isRegistered,
        path,
        sectionLabel,
        device,
      } = body;

      if (!sessionId) {
        return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
      }

      const res = await recordPresenceHeartbeat(
        {
          sessionId: String(sessionId).slice(0, 64),
          userId: userId ? String(userId).slice(0, 64) : undefined,
          userName: String(userName || "Visitante").slice(0, 48),
          userHandle: userHandle ? String(userHandle).slice(0, 32) : undefined,
          favoriteTeam: favoriteTeam ? String(favoriteTeam).slice(0, 8) : undefined,
          isRegistered: Boolean(isRegistered),
          path: String(path || "/inicio").slice(0, 80),
          sectionLabel: String(sectionLabel || "Inicio").slice(0, 48),
          device: device === "mobile" ? "mobile" : uaMeta.device,
          os: uaMeta.os,
        },
        ua
      );

      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
