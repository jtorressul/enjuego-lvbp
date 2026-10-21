import { NextResponse } from "next/server";
import { fetchLvbpRoster } from "@/lib/mlb-lvbp-service";
import { fetchWinterRoster, isWinterLeague } from "@/lib/winter-leagues-service";
import { LEAGUES, parseLeague } from "@/lib/leagues";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const league = parseLeague(searchParams.get("league") ?? searchParams.get("liga"));
      const team = searchParams.get("team") || LEAGUES[league].defaultTeamCode;
      const data = isWinterLeague(league)
        ? await fetchWinterRoster(league, team)
        : await fetchLvbpRoster(team, league === "mlb" ? "mlb" : "lvbp");
      return NextResponse.json(data, {
        headers: publicCacheHeaders(300),
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "No se pudo cargar el roster", players: [] },
        { status: 500 }
      );
    }
  });
}
