import { NextResponse } from "next/server";
import { fetchLvbpGameday } from "@/lib/mlb-lvbp-service";
import { simulateGamedayStep } from "@/lib/live-simulator";
import { checkAndDispatchGameAlerts } from "@/lib/score-notifications";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const simulate = searchParams.get("simulate") === "1";
    const stepParam = searchParams.get("step");
    const step = stepParam != null ? Number(stepParam) : undefined;

    const realId = id === "sim-live" ? "870098" : id;
    const gameday = await fetchLvbpGameday(realId);

    if (!simulate && id !== "sim-live" && gameday) {
      checkAndDispatchGameAlerts([gameday as any]).catch(() => {});
    }

    if (simulate || id === "sim-live") {
      return NextResponse.json(simulateGamedayStep(gameday, step), {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const isFinal = gameday?.status === "FINISHED";
    const isLive = gameday?.status === "IN_PROGRESS";
    const cacheHeader = isFinal
      ? "public, s-maxage=3600, stale-while-revalidate=7200"
      : isLive
        ? "public, s-maxage=10, stale-while-revalidate=20"
        : "public, s-maxage=60, stale-while-revalidate=120";

    return NextResponse.json(gameday, {
      headers: {
        "Cache-Control": cacheHeader,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo obtener el detalle del partido" },
      { status: 500 }
    );
  }
}
