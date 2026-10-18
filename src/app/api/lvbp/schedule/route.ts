import { NextResponse } from "next/server";
import { fetchLvbpSchedule, fetchMlbSchedule } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") === "mlb" ? "mlb" : "lvbp";
    const season = searchParams.get("season") || (league === "mlb" ? "2025" : "2026");
    const games = league === "mlb" ? await fetchMlbSchedule(season) : await fetchLvbpSchedule(season);
    return NextResponse.json(
      { games, league },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo cargar el calendario", games: [] },
      { status: 500 }
    );
  }
}
