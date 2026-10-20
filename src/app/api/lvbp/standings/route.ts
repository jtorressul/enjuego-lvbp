import { NextResponse } from "next/server";
import { fetchLvbpStandingsAndLeaders, fetchMlbStandingsAndLeaders } from "@/lib/mlb-lvbp-service";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const league = searchParams.get("league") === "mlb" ? "mlb" : "lvbp";
      const season = searchParams.get("season") || "2026";
      const data =
        league === "mlb"
          ? await fetchMlbStandingsAndLeaders(season)
          : await fetchLvbpStandingsAndLeaders(season);
      return NextResponse.json(data, {
        headers: publicCacheHeaders(90, 120),
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "No se pudo cargar posiciones", standings: [], leaders: { hitting: [], pitching: [] } },
        { status: 500 }
      );
    }
  });
}
