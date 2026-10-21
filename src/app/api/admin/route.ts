import { NextResponse } from "next/server";
import {
  AD_SLOTS_CATALOG,
  clearAdClickLog,
  getAdCampaigns,
  getAdminKv,
  getAdminPassword,
  getAdminSecurityQA,
  getLivePresenceSummary,
  getRecentAdClickLog,
  getRegisteredUsersList,
  isAdCampaignLive,
  normalizeSlotKey,
  purgeAllSportsMemCache,
  resetCampaignMetricsInStore,
  saveAdCampaigns,
  updateAdminPassword,
  updateAdminSecurityQA,
  verifyAdminPassword,
  verifyAdminSecurityAnswer,
  type AdCampaign,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("public_meta") === "1") {
      const qa = await getAdminSecurityQA();
      return NextResponse.json({
        ok: true,
        securityQuestion: qa.question,
        hasCustomAnswer: qa.hasCustomAnswer,
      });
    }

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
      storeInfo,
      campaigns,
      presence,
      registeredUsers,
      clickLog,
      securityQA,
      activeAdminPassword,
    ] = await Promise.all([
      getAdminKv(),
      getAdCampaigns(),
      getLivePresenceSummary(),
      getRegisteredUsersList(),
      getRecentAdClickLog(),
      getAdminSecurityQA(),
      getAdminPassword(),
    ]);

    const gScope = globalThis as unknown as {
      __ENJUEGO_MLB_HEALTH_CACHE__?: {
        status: "online" | "degraded";
        latencyMs: number;
        expiresAt: number;
      };
    };

    let mlbApiStatus: "online" | "degraded" = "online";
    let mlbLatencyMs = 0;

    const cachedHealth = gScope.__ENJUEGO_MLB_HEALTH_CACHE__;
    if (cachedHealth && Date.now() < cachedHealth.expiresAt) {
      mlbApiStatus = cachedHealth.status;
      mlbLatencyMs = cachedHealth.latencyMs;
    } else {
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
      gScope.__ENJUEGO_MLB_HEALTH_CACHE__ = {
        status: mlbApiStatus,
        latencyMs: mlbLatencyMs,
        expiresAt: Date.now() + 60_000,
      };
    }

    const enrichedCampaigns = campaigns.map((c) => ({
      ...c,
      live: isAdCampaignLive(c),
    }));

    return NextResponse.json({
      slots: AD_SLOTS_CATALOG,
      campaigns: enrichedCampaigns,
      clickLog,
      presence,
      registeredUsers,
      securityQA,
      activeAdminPassword,
      systemHealth: {
        kvConnected: Boolean(storeInfo.isCloudflareKv || storeInfo.isSqliteConnected),
        storageType: storeInfo.storageType,
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

    if (action === "recover_with_question") {
      const answer = String(body?.securityAnswer || "");
      const newPassword = String(body?.newPassword || "").trim();
      const isAnswerValid = await verifyAdminSecurityAnswer(answer);
      if (!isAnswerValid) {
        return NextResponse.json(
          { error: "Respuesta secreta incorrecta. Verifica tu respuesta e intenta de nuevo." },
          { status: 401 }
        );
      }
      if (newPassword) {
        if (newPassword.length < 4) {
          return NextResponse.json(
            { error: "La nueva contraseña debe tener al menos 4 caracteres." },
            { status: 400 }
          );
        }
        await updateAdminPassword(newPassword);
      }
      const activePassword = await getAdminPassword();
      return NextResponse.json({
        ok: true,
        recoveredPassword: activePassword,
      });
    }

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

    if (action === "create_ad") {
      const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
      if (!imageUrl) {
        return NextResponse.json(
          { error: "Debes elegir una imagen (PNG, JPG, WebP o GIF) para publicar el anuncio." },
          { status: 400 }
        );
      }

      const campaigns = await getAdCampaigns();
      const slot = normalizeSlotKey(body.slot);
      const name = String(body.name || body.companyName || "Anuncio").slice(0, 80);

      const newAd: AdCampaign = {
        id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        companyName: name,
        slot,
        linkUrl: String(body.linkUrl || "").trim(),
        imageUrl,
        startsOn: body.startsOn ? String(body.startsOn).trim() : "",
        endsOn: body.endsOn ? String(body.endsOn).trim() : "",
        size: "970x90",
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

    if (action === "update_ad") {
      const adId = String(body.id || "");
      const campaigns = await getAdCampaigns();
      const updated = campaigns.map((c) => {
        if (c.id !== adId) return c;
        const nextSlot =
          body.slot !== undefined ? normalizeSlotKey(body.slot) : c.slot;
        const nextName =
          body.name !== undefined || body.companyName !== undefined
            ? String(body.name ?? body.companyName).slice(0, 80)
            : c.name;

        return {
          ...c,
          name: nextName,
          companyName: nextName,
          slot: nextSlot,
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

    if (action === "reset_metrics") {
      const targetId = body?.campaignId ? String(body.campaignId) : undefined;
      await resetCampaignMetricsInStore(targetId);
      const campaigns = await getAdCampaigns();
      const updated = campaigns.map((c) => {
        if (!targetId || c.id === targetId) {
          return {
            ...c,
            impressions: 0,
            clicks: 0,
            mobileImpressions: 0,
            desktopImpressions: 0,
            mobileClicks: 0,
            desktopClicks: 0,
            todayImpressions: 0,
            todayClicks: 0,
            bySlot: {},
            daily: {},
          };
        }
        return c;
      });
      const saved = await saveAdCampaigns(updated);
      return NextResponse.json({
        ok: true,
        campaigns: saved.map((c) => ({ ...c, live: isAdCampaignLive(c) })),
      });
    }

    if (action === "change_password") {
      const newPassword = String(body?.newPassword || "");
      await updateAdminPassword(newPassword);
      return NextResponse.json({ ok: true, activeAdminPassword: newPassword.trim() });
    }

    if (action === "update_security_qa") {
      const question = String(body?.question || "");
      const answer = String(body?.answer || "");
      const securityQA = await updateAdminSecurityQA(question, answer);
      return NextResponse.json({ ok: true, securityQA });
    }

    if (action === "clear_click_log") {
      const clickLog = await clearAdClickLog();
      return NextResponse.json({ ok: true, clickLog });
    }

    if (action === "purge_sports_cache") {
      const clearedEntries = purgeAllSportsMemCache();
      return NextResponse.json({ ok: true, clearedEntries });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en el servidor admin" },
      { status: 500 }
    );
  }
}
