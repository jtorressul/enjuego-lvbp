import { NextResponse } from "next/server";
import {
  appendGameChat,
  castGameVote,
  createCommunityPost,
  getCommunityFeed,
  getGameInteractiveState,
  reactCommunityPost,
  touchGamePresence,
} from "@/lib/community-store";
import { publicCacheHeaders, withEdgeCache } from "@/lib/edge-cache";

export const dynamic = "force-dynamic";

const BOT_UA = /(bot|crawler|spider|whatsapp|facebookexternalhit|twitterbot|curl|python|headless)/i;

export async function GET(request: Request) {
  return withEdgeCache(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get("mode") || "game";

      if (mode === "community") {
        const posts = await getCommunityFeed();
        return NextResponse.json({ posts }, { headers: publicCacheHeaders(70) });
      }

      const gameId = searchParams.get("gameId") || "870098";
      const awayAbbr = searchParams.get("away") || "CAR";
      const homeAbbr = searchParams.get("home") || "MAG";
      const state = await getGameInteractiveState(gameId, awayAbbr, homeAbbr);
      return NextResponse.json(state, { headers: publicCacheHeaders(30) });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || "Error al obtener datos interactivos" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "presence") {
      const ua = request.headers.get("user-agent") || "";
      if (BOT_UA.test(ua)) return NextResponse.json({ ok: true, ignored: true });
      const gameId = String(body.gameId || "");
      const sid = String(body.sid || "");
      if (gameId && sid) await touchGamePresence(gameId, sid);
      return NextResponse.json({ ok: true });
    }

    if (action === "vote") {
      const gameId = String(body.gameId || "870098");
      const side = body.side === "away" ? "away" : "home";
      const votes = await castGameVote(gameId, side);
      return NextResponse.json({ votes });
    }

    if (action === "chat") {
      const gameId = String(body.gameId || "870098");
      const awayAbbr = String(body.away || "CAR");
      const homeAbbr = String(body.home || "MAG");
      const user = String(body.user || "AficionadoLVBP");
      const team = String(body.team || awayAbbr);
      const text = String(body.text || "");
      if (!text.trim()) {
        return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
      }
      const chat = await appendGameChat(gameId, awayAbbr, homeAbbr, user, team, text);
      return NextResponse.json({ chat });
    }

    if (action === "post") {
      const user = String(body.user || "Fanático LVBP");
      const team = String(body.team || "CAR");
      const text = String(body.text || "");
      const tag = body.tag ? String(body.tag) : undefined;
      if (!text.trim()) {
        return NextResponse.json({ error: "Publicación vacía" }, { status: 400 });
      }
      const posts = await createCommunityPost(user, team, text, tag);
      return NextResponse.json({ posts });
    }

    if (action === "react") {
      const postId = String(body.postId || "");
      const kind =
        body.kind === "fires" ? "fires" : body.kind === "claps" ? "claps" : "likes";
      const posts = await reactCommunityPost(postId, kind);
      return NextResponse.json({ posts });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al procesar acción interactiva" },
      { status: 500 }
    );
  }
}
