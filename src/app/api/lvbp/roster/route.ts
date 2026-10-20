import { NextResponse } from "next/server";
import { fetchLvbpRoster } from "@/lib/mlb-lvbp-service";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const team = searchParams.get("team") || "CAR";
      const league = searchParams.get("league") === "mlb" ? "mlb" : "lvbp";
      const data = await fetchLvbpRoster(team, league);
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
