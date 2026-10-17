import { NextResponse } from "next/server";
import {
  DEFAULT_5_CAMPAIGNS,
  getAdCampaigns,
  getAdminKv,
  getLivePresenceSummary,
  getRegisteredUsersList,
  getRotationSeconds,
  saveAdCampaigns,
  setRotationSeconds,
  updateAdminPassword,
  verifyAdminPassword,
  type AdCampaign,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const adminPassword = request.headers.get("x-admin-password") || "";
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "No autorizado. Contraseña de administrador inválida." },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    const [
      { isCloudflareKv },
      campaigns,
      rotationSeconds,
      presence,
      registeredUsers,
    ] = await Promise.all([
      getAdminKv(),
      getAdCampaigns(),
      getRotationSeconds(),
      getLivePresenceSummary(),
      getRegisteredUsersList(),
    ]);

    // Quick MLB API reachability check
    let mlbApiStatus: "online" | "degraded" = "online";
    let mlbLatencyMs = 0;
    try {
      const mlbStart = Date.now();
      const res = await fetch(
        "https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135",
        { signal: AbortSignal.timeout(3500) }
      );
      mlbLatencyMs = Date.now() - mlbStart;
      if (!res.ok) mlbApiStatus = "degraded";
    } catch {
      mlbApiStatus = "degraded";
    }

    return NextResponse.json({
      campaigns,
      rotationSeconds,
      presence,
      registeredUsers,
      systemHealth: {
        kvConnected: isCloudflareKv,
        mlbApiStatus,
        mlbLatencyMs,
        kvLatencyMs: Date.now() - startTime,
        serverTimeCaracas: new Date(Date.now() - 4 * 3600 * 1000)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al consultar panel admin" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;
    const password =
      request.headers.get("x-admin-password") || body?.password || "";

    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Contraseña de administrador incorrecta." },
        { status: 401 }
      );
    }

    if (action === "login") {
      return NextResponse.json({ ok: true });
    }

    if (action === "save_campaigns") {
      const incoming = body?.campaigns as AdCampaign[];
      if (!Array.isArray(incoming)) {
        return NextResponse.json(
          { error: "Formato de campañas inválido" },
          { status: 400 }
        );
      }

      const sanitized: AdCampaign[] = incoming.map((c, idx) => ({
        id: String(c.id || `emp_${Date.now()}_${idx}`),
        companyName: String(c.companyName || `Empresa #${idx + 1}`).slice(0, 60),
        title: String(c.title || "Anuncia tu marca en EnJuego.online").slice(0, 90),
        subtitle: String(
          c.subtitle || "Espacio publicitario disponible."
        ).slice(0, 130),
        ctaText: String(c.ctaText || "Pautar").slice(0, 24),
        linkUrl: String(c.linkUrl || "https://wa.me/").trim(),
        imageUrl: c.imageUrl ? String(c.imageUrl) : "",
        accentColor: String(c.accentColor || "#e11d48"),
        slots:
          Array.isArray(c.slots) && c.slots.length > 0
            ? c.slots
            : ["top-leaderboard", "in-feed", "gameday-sidebar"],
        active: Boolean(c.active),
        impressions: Number(c.impressions) || 0,
        clicks: Number(c.clicks) || 0,
        updatedAt: Date.now(),
      }));

      const saved = await saveAdCampaigns(sanitized);
      let rotationSeconds = await getRotationSeconds();
      if (body?.rotationSeconds !== undefined) {
        rotationSeconds = await setRotationSeconds(Number(body.rotationSeconds));
      }

      return NextResponse.json({
        ok: true,
        campaigns: saved,
        rotationSeconds,
      });
    }

    if (action === "reset_metrics") {
      const targetId = body?.campaignId;
      const campaigns = await getAdCampaigns();
      const updated = campaigns.map((c) => {
        if (!targetId || c.id === targetId) {
          return { ...c, impressions: 0, clicks: 0 };
        }
        return c;
      });
      const saved = await saveAdCampaigns(updated);
      return NextResponse.json({ ok: true, campaigns: saved });
    }

    if (action === "restore_defaults") {
      const saved = await saveAdCampaigns(DEFAULT_5_CAMPAIGNS);
      return NextResponse.json({ ok: true, campaigns: saved });
    }

    if (action === "change_password") {
      const newPassword = String(body?.newPassword || "");
      await updateAdminPassword(newPassword);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en el servidor admin" },
      { status: 500 }
    );
  }
}
