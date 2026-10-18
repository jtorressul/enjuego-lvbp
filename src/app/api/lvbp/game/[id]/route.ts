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

    return NextResponse.json(gameday, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo obtener el detalle del partido" },
      { status: 500 }
    );
  }
}
