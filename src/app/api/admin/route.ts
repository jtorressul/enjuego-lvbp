import { NextResponse } from "next/server";
import {
  AD_SLOTS_CATALOG,
  DEFAULT_5_CAMPAIGNS,
  getAdCampaigns,
  getAdminKv,
  getLivePresenceSummary,
  getRegisteredUsersList,
  isAdCampaignLive,
  saveAdCampaigns,
  updateAdminPassword,
  verifyAdminPassword,
  type AdCampaign,
  type AdSlotType,
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
      presence,
      registeredUsers,
    ] = await Promise.all([
      getAdminKv(),
      getAdCampaigns(),
      getLivePresenceSummary(),
      getRegisteredUsersList(),
    ]);

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

    const enrichedCampaigns = campaigns.map((c) => ({
      ...c,
      live: isAdCampaignLive(c),
    }));

    return NextResponse.json({
      slots: AD_SLOTS_CATALOG,
      campaigns: enrichedCampaigns,
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

    // Create a new ad directly from the "Nuevo anuncio" form (like jugadaenvivo.com)
    if (action === "create_ad") {
      const campaigns = await getAdCampaigns();
      const slot = (body.slot || "general") as AdSlotType;
      const newAd: AdCampaign = {
        id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        companyName: String(body.companyName || "Nuevo Anunciante").slice(0, 80),
        slot,
        slots: [slot],
        title: String(
          body.title || body.companyName || "Anuncio en EnJuego.online"
        ).slice(0, 90),
        subtitle: String(
          body.subtitle || "Patrocinador en EnJuego.online"
        ).slice(0, 130),
        ctaText: String(body.ctaText || "Visitar").slice(0, 24),
        linkUrl: String(body.linkUrl || "").trim(),
        imageUrl: body.imageUrl ? String(body.imageUrl) : "",
        accentColor: String(body.accentColor || "#e11d48"),
        startsOn: body.startsOn ? String(body.startsOn).trim() : "",
        endsOn: body.endsOn ? String(body.endsOn).trim() : "",
        active: true,
        impressions: 0,
        clicks: 0,
        updatedAt: Date.now(),
      };
      const updated = [newAd, ...campaigns];
      const saved = await saveAdCampaigns(updated);
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
      });
    }

    // Update a single ad (toggle active, change dates, slot, link, etc.)
    if (action === "update_ad") {
      const adId = String(body.id || "");
      const campaigns = await getAdCampaigns();
      const updated = campaigns.map((c) => {
        if (c.id !== adId) return c;
        const nextSlot = (body.slot ?? c.slot ?? "general") as AdSlotType;
        return {
          ...c,
          companyName:
            body.companyName !== undefined
              ? String(body.companyName).slice(0, 80)
              : c.companyName,
          slot: nextSlot,
          slots: [nextSlot],
          title:
            body.title !== undefined
              ? String(body.title).slice(0, 90)
              : c.title,
          subtitle:
            body.subtitle !== undefined
              ? String(body.subtitle).slice(0, 130)
              : c.subtitle,
          ctaText:
            body.ctaText !== undefined
              ? String(body.ctaText).slice(0, 24)
              : c.ctaText,
          linkUrl:
            body.linkUrl !== undefined
              ? String(body.linkUrl).trim()
              : c.linkUrl,
          imageUrl:
            body.imageUrl !== undefined ? String(body.imageUrl) : c.imageUrl,
          startsOn:
            body.startsOn !== undefined
              ? String(body.startsOn).trim()
              : c.startsOn,
          endsOn:
            body.endsOn !== undefined ? String(body.endsOn).trim() : c.endsOn,
          active:
            body.active !== undefined ? Boolean(body.active) : c.active,
          updatedAt: Date.now(),
        };
      });
      const saved = await saveAdCampaigns(updated);
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
      });
    }

    // Delete a single ad
    if (action === "delete_ad") {
      const adId = String(body.id || "");
      const campaigns = await getAdCampaigns();
      const updated = campaigns.filter((c) => c.id !== adId);
      const saved = await saveAdCampaigns(updated);
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
      });
    }

    if (action === "save_campaigns") {
      const incoming = body?.campaigns as AdCampaign[];
      if (!Array.isArray(incoming)) {
        return NextResponse.json(
          { error: "Formato de campañas inválido" },
          { status: 400 }
        );
      }

      const sanitized: AdCampaign[] = incoming.map((c, idx) => {
        const slot = (c.slot ||
          (Array.isArray(c.slots) && c.slots[0]) ||
          "general") as AdSlotType;
        return {
          id: String(c.id || `emp_${Date.now()}_${idx}`),
          companyName: String(c.companyName || `Empresa #${idx + 1}`).slice(
            0,
            80
          ),
          slot,
          slots: [slot],
          title: String(
            c.title || "Anuncia tu marca en EnJuego.online"
          ).slice(0, 90),
          subtitle: String(
            c.subtitle || "Espacio publicitario disponible."
          ).slice(0, 130),
          ctaText: String(c.ctaText || "Pautar").slice(0, 24),
          linkUrl: String(c.linkUrl || "").trim(),
          imageUrl: c.imageUrl ? String(c.imageUrl) : "",
          accentColor: String(c.accentColor || "#e11d48"),
          startsOn: c.startsOn ? String(c.startsOn).trim() : "",
          endsOn: c.endsOn ? String(c.endsOn).trim() : "",
          active: Boolean(c.active),
          impressions: Number(c.impressions) || 0,
          clicks: Number(c.clicks) || 0,
          updatedAt: Date.now(),
        };
      });

      const saved = await saveAdCampaigns(sanitized);
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
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
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
      });
    }

    if (action === "restore_defaults") {
      const saved = await saveAdCampaigns(DEFAULT_5_CAMPAIGNS);
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
      });
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
