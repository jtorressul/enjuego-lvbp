import { NextResponse } from "next/server";
import webpush from "web-push";
import {
  getAllPushSubscriptions,
  removePushSubscription,
  getPushSubscriberCount,
} from "@/lib/push-store";
import {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
} from "@/lib/push-config";
import { verifyAdminPassword } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminPassword = request.headers.get("x-admin-password") || "";
    const isValid = await verifyAdminPassword(adminPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "No autorizado. Contraseña de administrador requerida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      body: messageBody,
      url,
      image,
      tag,
      teamFilter,
      isSponsored,
      sponsorName,
    } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "Se requiere título y mensaje para la notificación." },
        { status: 400 }
      );
    }

    // Configure Web Push VAPID credentials
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const subscriptions = await getAllPushSubscriptions();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        failedCount: 0,
        totalSubscribers: 0,
        message: "No hay dispositivos suscritos para recibir notificaciones todavía.",
      });
    }

    // Payload formatting
    const displayTitle = isSponsored && sponsorName
      ? `⚡ [${sponsorName}] ${title}`
      : title;

    const payload = JSON.stringify({
      title: displayTitle,
      body: messageBody,
      url: url || "/",
      icon: "/icon.png",
      badge: "/icon.png",
      image: image || undefined,
      tag: tag || "enjuego-push-" + Date.now(),
    });

    let sentCount = 0;
    let failedCount = 0;

    // Filter by team preference if specified
    const targetSubs = subscriptions.filter((sub) => {
      if (!teamFilter || teamFilter === "all") return true;
      if (!sub.teamPreference || sub.teamPreference === "all") return true;
      return sub.teamPreference === teamFilter;
    });

    await Promise.all(
      targetSubs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          );
          sentCount++;
        } catch (err: any) {
          failedCount++;
          // If subscription is expired or unsubscribed, remove from KV
          if (err.statusCode === 404 || err.statusCode === 410) {
            await removePushSubscription(sub.endpoint).catch(() => {});
          }
        }
      })
    );

    const totalSubscribers = await getPushSubscriberCount();

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalSubscribers,
      message: `Notificación enviada a ${sentCount} dispositivo(s).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al enviar notificaciones push." },
      { status: 500 }
    );
  }
}
