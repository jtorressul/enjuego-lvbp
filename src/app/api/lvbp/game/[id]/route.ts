import { NextResponse } from "next/server";
import { fetchLvbpGameday } from "@/lib/mlb-lvbp-service";
import { simulateGamedayStep } from "@/lib/live-simulator";
import { checkAndDispatchGameAlerts } from "@/lib/score-notifications";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

const lastAlertCheckMap = new Map<string, number>();

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withEdgeCache(request, async () => {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const simulate = searchParams.get("simulate") === "1";
    const stepParam = searchParams.get("step");
    const step = stepParam != null ? Number(stepParam) : undefined;

    const realId = id === "sim-live" ? "870098" : id;
    const gameday = await fetchLvbpGameday(realId);

    if (!simulate && id !== "sim-live" && gameday) {
      const now = Date.now();
      const lastCheck = lastAlertCheckMap.get(realId) || 0;
      if (now - lastCheck > 40_000) {
        lastAlertCheckMap.set(realId, now);
        checkAndDispatchGameAlerts([gameday as any]).catch(() => {});
      }
    }

    if (simulate || id === "sim-live") {
      return NextResponse.json(simulateGamedayStep(gameday, step), {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const isFinal = gameday?.status === "FINISHED";
    return NextResponse.json(gameday, {
      headers: isFinal ? publicCacheHeaders(300, 3600, 7200) : publicCacheHeaders(6),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo obtener el detalle del partido" },
      { status: 500 }
    );
  }
  });
}
