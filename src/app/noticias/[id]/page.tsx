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
  const shareTitle = `${recap.headline} · En Juego`;
  const shareDesc = `${recap.scoreLine}. ${recap.paragraphs[0]}`;
  const awayCode = (recap.away.code || "").toUpperCase();
  const homeCode = (recap.home.code || "").toUpperCase();
  const ogImageUrl =
    awayCode && homeCode
      ? `https://enjuego.online/og/matchups/${awayCode}-${homeCode}.png`
      : "https://enjuego.online/og/lvbp-default.png";

  return {
    title: shareTitle,
    description: shareDesc,
    alternates: {
      canonical: `https://enjuego.online/noticias/${id}`,
    },
    openGraph: {
      title: shareTitle,
      description: shareDesc,
      url: `https://enjuego.online/noticias/${id}`,
      siteName: "En Juego · Béisbol Venezolano",
      type: "article",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: recap.headline,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDesc,
      images: [ogImageUrl],
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
