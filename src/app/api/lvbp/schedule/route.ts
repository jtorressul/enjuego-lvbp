import { NextResponse } from "next/server";
import { fetchLvbpSchedule, fetchMlbSchedule } from "@/lib/mlb-lvbp-service";
import { checkAndDispatchGameAlerts } from "@/lib/score-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get("league") === "mlb" ? "mlb" : "lvbp";
    const season = searchParams.get("season") || "2026";
    const games = league === "mlb" ? await fetchMlbSchedule(season) : await fetchLvbpSchedule(season);
    if (league === "lvbp" && Array.isArray(games)) {
      checkAndDispatchGameAlerts(games).catch(() => {});
    }
    const hasLive = Array.isArray(games) && games.some((g: any) => g.status === "IN_PROGRESS");
    const cacheHeader = hasLive
      ? "public, s-maxage=15, stale-while-revalidate=30"
      : "public, s-maxage=60, stale-while-revalidate=120";

    return NextResponse.json(
      { games, league },
      {
        headers: {
          "Cache-Control": cacheHeader,
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
