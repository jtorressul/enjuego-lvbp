import { NextResponse } from "next/server";
import { fetchLvbpRoster } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team") || "CAR";
    const league = searchParams.get("league") === "mlb" ? "mlb" : "lvbp";
    const data = await fetchLvbpRoster(team, league);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "No se pudo cargar el roster", players: [] },
      { status: 500 }
    );
  }
}
