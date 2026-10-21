import { NextResponse } from "next/server";
import { fetchSoccerStandings } from "@/lib/soccer-service";
import { parseSoccerLeague } from "@/lib/soccer-leagues";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const rawLeague = searchParams.get("league") || searchParams.get("liga");
      const leagueId = parseSoccerLeague(rawLeague);

      const standings = await fetchSoccerStandings(leagueId);

      return NextResponse.json(
        { league: leagueId, standings },
        { headers: publicCacheHeaders(300) }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Error al obtener tabla de posiciones de fútbol", standings: [] },
        { status: 500 }
      );
    }
  });
}
