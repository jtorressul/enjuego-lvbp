import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/InfoPage";
import { RecapArticle } from "@/components/news/RecapCards";
import { AadsStickyBanner, AadsSkyscraperBanner } from "@/components/AdBanner";
import { buildGameRecaps } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";
import { findGameHighlight } from "@/lib/youtube-highlight";

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
  const shareTitle = `🎥 Highlights: ${recap.headline} · En Juego`;
  const shareDesc = `Revive en video las mejores jugadas de ${recap.away.nick} vs ${recap.home.nick}. ${recap.paragraphs[0]}`;
  const teamLogo = recap.winnerSide === "away" ? recap.away.logo : recap.home.logo;

  return {
    title: shareTitle,
    description: shareDesc,
    openGraph: {
      title: shareTitle,
      description: shareDesc,
      images: [
        {
          url: teamLogo,
          width: 512,
          height: 512,
          alt: recap.headline,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDesc,
    },
  };
}

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { recap, more } = await loadRecap(id);
  if (!recap) notFound();
  const highlight = await findGameHighlight({
    id: recap.id,
    date: recap.date,
    awayName: recap.away.name,
    homeName: recap.home.name,
    awayNick: recap.away.nick,
    homeNick: recap.home.nick,
  });

  return (
    <InfoPage wide bare>
      <AadsStickyBanner />
      <AadsSkyscraperBanner />
      <RecapArticle recap={recap} more={more} highlight={highlight} />
    </InfoPage>
  );
}
