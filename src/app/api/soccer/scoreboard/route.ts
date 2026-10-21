import { NextResponse } from "next/server";
import { fetchSoccerScoreboard } from "@/lib/soccer-service";
import { parseSoccerLeague } from "@/lib/soccer-leagues";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const rawLeague = searchParams.get("league") || searchParams.get("liga");
      const leagueId = parseSoccerLeague(rawLeague);
      const date = searchParams.get("date") || searchParams.get("fecha") || undefined;

      const matches = await fetchSoccerScoreboard(leagueId, date);

      return NextResponse.json(
        { league: leagueId, matches },
        { headers: publicCacheHeaders(45) }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Error al obtener marcadores de fútbol", matches: [] },
        { status: 500 }
      );
    }
  });
}
