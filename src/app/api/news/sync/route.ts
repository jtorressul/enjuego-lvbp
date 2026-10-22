import { NextResponse } from "next/server";
import { syncEditorialNews } from "@/lib/editorial-news-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await syncEditorialNews(10);
    return NextResponse.json({
      ok: true,
      added: result.added,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Sync failed" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
