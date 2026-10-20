import { NextResponse } from "next/server";
import { findGameHighlight } from "@/lib/youtube-highlight";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const date = searchParams.get("date");
    const away = searchParams.get("away") || "";
    const home = searchParams.get("home") || "";
    const awayNick = searchParams.get("awayNick") || away;
    const homeNick = searchParams.get("homeNick") || home;

    if (!id || !date) {
      return NextResponse.json({ error: "Missing id or date" }, { status: 400 });
    }

    const highlight = await findGameHighlight({
      id,
      date,
      awayName: away,
      homeName: home,
      awayNick,
      homeNick,
    });

    return NextResponse.json(
      { highlight },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
          "CDN-Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch {
    return NextResponse.json({ highlight: null }, { status: 200 });
  }
}
