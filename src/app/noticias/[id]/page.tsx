import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/InfoPage";
import { RecapArticle } from "@/components/news/RecapCards";
import { buildGameRecaps } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

async function loadRecap(id: string) {
  const [games, table] = await Promise.all([
    fetchLvbpSchedule("2026"),
    fetchLvbpStandingsAndLeaders("2026"),
  ]);
  const recaps = buildGameRecaps(games, table.standings);
  const recap = recaps.find((item) => item.id === id);
  const more = recap ? recaps.filter((item) => item.date === recap.date && item.id !== id).slice(0, 3) : [];
  return { recap, more };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { recap } = await loadRecap(id);
  if (!recap) return { title: "Noticia · En Juego" };
  return {
    title: `${recap.headline} · En Juego`,
    description: recap.paragraphs[0],
  };
}

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recap, more } = await loadRecap(id);
  if (!recap) notFound();

  return (
    <InfoPage wide bare>
      <RecapArticle recap={recap} more={more} />
    </InfoPage>
  );
}
