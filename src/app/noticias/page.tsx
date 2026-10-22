import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { FeaturedRecap, RecapCard } from "@/components/news/RecapCards";
import {
  EditorialHeroCard,
  EditorialGridCard,
} from "@/components/news/EditorialNewsCards";
import { AadsStickyBanner, AadsSkyscraperBanner, AdBanner } from "@/components/AdBanner";
import { buildGameRecaps, formatRecapDate } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";
import { findGameHighlight } from "@/lib/youtube-highlight";
import { getEditorialArticles } from "@/lib/editorial-news-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Noticias y Highlights LVBP · Resúmenes en Video de Cada Juego",
  description:
    "Noticias de última hora, fichajes, despidos, récords y resúmenes en video de la LVBP con video oficial de BeisbolPlay.",
  alternates: {
    canonical: "https://enjuego.online/noticias",
  },
  keywords: [
    "noticias lvbp",
    "highlights lvbp",
    "videos lvbp",
    "resumen lvbp",
    "fichajes lvbp",
    "roster lvbp",
    "beisbol venezolano noticias",
  ],
  openGraph: {
    title: "Noticias y Highlights LVBP · Resúmenes en Video y Última Hora",
    description: "Noticias de última hora, fichajes, récords y videos de cada juego de la LVBP.",
    url: "https://enjuego.online/noticias",
    images: [
      {
        url: "https://enjuego.online/og/lvbp-default.png",
        width: 1200,
        height: 630,
        alt: "Noticias y Highlights LVBP",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Noticias y Highlights LVBP · Resúmenes en Video y Última Hora",
    description: "Noticias de última hora, fichajes, récords y videos de cada juego de la LVBP.",
    images: ["https://enjuego.online/og/lvbp-default.png"],
  },
};

export default async function NoticiasPage() {
  const [games, table, articles] = await Promise.all([
    fetchLvbpSchedule("2026"),
    fetchLvbpStandingsAndLeaders("2026"),
    getEditorialArticles(12),
  ]);

  const recaps = buildGameRecaps(games, table.standings).slice(0, 24);
  const [featuredRecap, ...restRecaps] = recaps;
  const dates = [...new Set(restRecaps.map((recap) => recap.date))];

  const featuredHighlight = featuredRecap
    ? await findGameHighlight({
        id: featuredRecap.id,
        date: featuredRecap.date,
        awayName: featuredRecap.away.name,
        homeName: featuredRecap.home.name,
        awayNick: featuredRecap.away.nick,
        homeNick: featuredRecap.home.nick,
      })
    : null;

  const [heroArticle, ...restArticles] = articles;

  return (
    <InfoPage wide bare>
      <AadsStickyBanner />
      <AadsSkyscraperBanner />
      <div className="space-y-10">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600">LVBP 2026-2027</p>
          <h1 className="mt-1 text-2xl sm:text-4xl font-black text-slate-950">Noticias y Última Hora</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Fichajes, movimientos de roster, récords y el resumen en video de cada juego finalizado.
          </p>
        </div>

        {/* Sección 1: Noticias Editoriales (Movimientos, Récords, Última Hora) */}
        {heroArticle && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Noticias destacadas
              </h2>
              <span className="text-xs font-bold text-amber-700">Actualizado al instante</span>
            </div>
            <EditorialHeroCard article={heroArticle} />

            {restArticles.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {restArticles.slice(0, 6).map((art) => (
                  <EditorialGridCard key={art.id} article={art} />
                ))}
              </div>
            )}
          </section>
        )}

        <AdBanner slot="recap-large" />

        {/* Sección 2: Crónicas de Partidos con Videos */}
        <section className="space-y-6 pt-4 border-t border-slate-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              Crónicas y Resúmenes de Juegos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pizarras finales, pitcheo ganador y mejores jugadas en video oficial.
            </p>
          </div>

          {featuredRecap ? (
            <FeaturedRecap recap={featuredRecap} highlight={featuredHighlight} />
          ) : (
            <p className="text-sm text-slate-500">Todavía no hay juegos finalizados.</p>
          )}

          {dates.map((date) => (
            <div key={date} className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {formatRecapDate(date)}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {restRecaps
                  .filter((recap) => recap.date === date)
                  .map((recap) => (
                    <RecapCard key={recap.id} recap={recap} />
                  ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </InfoPage>
  );
}
