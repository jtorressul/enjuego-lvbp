import { NextResponse } from "next/server";
import {
  getAdCampaigns,
  getRotationSeconds,
  recordBannerMetric,
  recordPresenceHeartbeat,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [campaigns, rotationSeconds] = await Promise.all([
      getAdCampaigns(),
      getRotationSeconds(),
    ]);
    const activeCampaigns = campaigns.filter((c) => c.active);
    return NextResponse.json(
      {
        campaigns: activeCampaigns,
        rotationSeconds,
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

    if (action === "metric") {
      const { campaignId, metric } = body;
      if (campaignId && (metric === "impression" || metric === "click")) {
        await recordBannerMetric(String(campaignId), metric);
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

      const res = await recordPresenceHeartbeat({
        sessionId: String(sessionId).slice(0, 64),
        userId: userId ? String(userId).slice(0, 64) : undefined,
        userName: String(userName || "Visitante").slice(0, 40),
        userHandle: userHandle ? String(userHandle).slice(0, 32) : undefined,
        favoriteTeam: favoriteTeam ? String(favoriteTeam).slice(0, 8) : undefined,
        isRegistered: Boolean(isRegistered),
        path: String(path || "/inicio").slice(0, 120),
        sectionLabel: String(sectionLabel || "Inicio").slice(0, 60),
        device: device === "mobile" ? "mobile" : "desktop",
      });

      return NextResponse.json({ ok: true, onlineCount: res.onlineCount });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}
