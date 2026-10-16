import { NextResponse } from "next/server";
import { fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season") || "2026";
    const data = await fetchLvbpStandingsAndLeaders(season);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo cargar posiciones", standings: [], leaders: { hitting: [], pitching: [] } },
      { status: 500 }
    );
  }
}
