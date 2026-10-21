import { NextResponse } from "next/server";
import { fetchSoccerMatchDetail } from "@/lib/soccer-service";
import { parseSoccerLeague } from "@/lib/soccer-leagues";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const rawLeague = searchParams.get("league") || searchParams.get("liga");
      const leagueId = parseSoccerLeague(rawLeague);
      const matchId = searchParams.get("id") || searchParams.get("matchId");

      if (!matchId) {
        return NextResponse.json(
          { error: "Parámetro 'id' del partido requerido" },
          { status: 400 }
        );
      }

      const match = await fetchSoccerMatchDetail(leagueId, matchId);

      if (!match) {
        return NextResponse.json(
          { error: "Partido no encontrado o no disponible" },
          { status: 404 }
        );
      }

      const cacheSeconds = match.status === "IN_PROGRESS" ? 15 : match.status === "FINISHED" ? 300 : 60;

      return NextResponse.json(
        { league: leagueId, match },
        { headers: publicCacheHeaders(cacheSeconds) }
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Error al obtener detalle del partido" },
        { status: 500 }
      );
    }
  });
}
