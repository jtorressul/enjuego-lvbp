import { NextResponse } from "next/server";
import { fetchLvbpGameday } from "@/lib/mlb-lvbp-service";
import { simulateGamedayStep } from "@/lib/live-simulator";

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

    if (simulate || id === "sim-live") {
      return NextResponse.json(simulateGamedayStep(gameday, step), {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const cacheControl =
      gameday.status === "LIVE"
        ? "public, s-maxage=4, stale-while-revalidate=3"
        : "public, s-maxage=30, stale-while-revalidate=15";

    return NextResponse.json(gameday, {
      headers: {
        "Cache-Control": cacheControl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo obtener el detalle del partido" },
      { status: 500 }
    );
  }
}
