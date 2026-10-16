import { NextResponse } from "next/server";
import { fetchLvbpSchedule } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || "2026";
    const games = await fetchLvbpSchedule(season);
    return NextResponse.json(
      { games },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo cargar el calendario LVBP", games: [] },
      { status: 500 }
    );
  }
}
