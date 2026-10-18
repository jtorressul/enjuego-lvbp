import { NextResponse } from "next/server";
import {
  savePushSubscription,
  removePushSubscription,
  getPushSubscriberCount,
} from "@/lib/push-store";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscriberCount = await getPushSubscriberCount();
    return NextResponse.json({
      vapidPublicKey: VAPID_PUBLIC_KEY,
      subscriberCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, teamPreference } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Suscripción inválida. Se requiere endpoint y keys." },
        { status: 400 }
      );
    }

    await savePushSubscription({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      teamPreference: teamPreference || "all",
      createdAt: Date.now(),
    });

    const subscriberCount = await getPushSubscriberCount();

    return NextResponse.json({
      success: true,
      subscriberCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al registrar suscripción push." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (endpoint) {
      await removePushSubscription(endpoint);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
