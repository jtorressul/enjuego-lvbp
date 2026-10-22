import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/InfoPage";
import { RecapArticle } from "@/components/news/RecapCards";
import { EditorialArticleView } from "@/components/news/EditorialNewsCards";
import { AadsStickyBanner, AadsSkyscraperBanner } from "@/components/AdBanner";
import { buildGameRecaps } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";
import { findGameHighlight } from "@/lib/youtube-highlight";
import {
  getEditorialArticle,
  getEditorialArticles,
} from "@/lib/editorial-news-service";

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

  // 1. Try editorial article
  const editorial = await getEditorialArticle(id);
  if (editorial) {
    const shareTitle = `${editorial.title} · En Juego`;
    const shareDesc = editorial.excerpt;
    const ogImg = editorial.imageUrl || "https://enjuego.online/og/lvbp-default.png";
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
            url: ogImg,
            width: 1200,
            height: 630,
            alt: editorial.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: shareTitle,
        description: shareDesc,
        images: [ogImg],
      },
    };
  }

  // 2. Try game recap
  const { recap } = await loadRecap(id);
  if (!recap) return { title: "Noticia · En Juego" };
  const shareTitle = `${recap.headline} · En Juego`;
  const shareDesc = `${recap.scoreLine}. ${recap.paragraphs[0]}`;
  const awayCode = (recap.away.code || "").toUpperCase();
  const homeCode = (recap.home.code || "").toUpperCase();

  const LVBP_CODES = new Set(["ANZ", "ARA", "CAR", "LAG", "LAR", "MAG", "MAR", "ZUL"]);
  const hasStaticMatchup =
    Boolean(awayCode && homeCode && LVBP_CODES.has(awayCode) && LVBP_CODES.has(homeCode));

  // Check if we have the real game action highlight thumbnail from YouTube
  let ogImageUrl = hasStaticMatchup
    ? `https://enjuego.online/og/matchups/${awayCode}-${homeCode}.png`
    : "https://enjuego.online/og/lvbp-default.png";

  try {
    const highlight = await findGameHighlight({
      id: recap.id,
      date: recap.date,
      awayName: recap.away.name,
      homeName: recap.home.name,
      awayNick: recap.away.nick,
      homeNick: recap.home.nick,
    });
    if (highlight?.videoId) {
      ogImageUrl = `https://i.ytimg.com/vi/${highlight.videoId}/maxresdefault.jpg`;
    }
  } catch {
    // Fall back to matchup graphic
  }

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

  // 1. Check if it is an editorial article
  const editorial = await getEditorialArticle(id);
  if (editorial) {
    const allArticles = await getEditorialArticles(6);
    const related = allArticles.filter((a) => a.id !== id).slice(0, 3);
    return (
      <InfoPage wide bare>
        <AadsStickyBanner />
        <AadsSkyscraperBanner />
        <EditorialArticleView article={editorial} related={related} />
      </InfoPage>
    );
  }

  // 2. Check if it is a game recap
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
