import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { FeaturedRecap, RecapCard } from "@/components/news/RecapCards";
import { buildGameRecaps, formatRecapDate } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";
import { findGameHighlight } from "@/lib/youtube-highlight";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Noticias y Highlights LVBP · Resúmenes en Video de Cada Juego",
  description:
    "Videos oficiales, highlights y resúmenes de cada juego final de la LVBP. Revive las mejores jugadas, jonrones y momentos decisivos con video oficial de BeisbolPlay.",
  alternates: {
    canonical: "https://enjuego.online/noticias",
  },
  keywords: [
    "highlights lvbp",
    "videos lvbp",
    "resumen lvbp",
    "noticias lvbp",
    "beisbolplay highlights",
    "mejores jugadas lvbp",
    "resumen de juegos lvbp",
  ],
  openGraph: {
    title: "Noticias y Highlights LVBP · Resúmenes en Video",
    description: "Revive en video las mejores jugadas de cada partido de la LVBP.",
    url: "https://enjuego.online/noticias",
  },
};

export default async function NoticiasPage() {
  const [games, table] = await Promise.all([
    fetchLvbpSchedule("2026"),
    fetchLvbpStandingsAndLeaders("2026"),
  ]);
  const recaps = buildGameRecaps(games, table.standings).slice(0, 24);
  const [featured, ...rest] = recaps;
  const dates = [...new Set(rest.map((recap) => recap.date))];

  const featuredHighlight = featured
    ? await findGameHighlight({
        id: featured.id,
        date: featured.date,
        awayName: featured.away.name,
        homeName: featured.home.name,
        awayNick: featured.away.nick,
        homeNick: featured.home.nick,
      })
    : null;

  return (
    <InfoPage wide bare>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600">LVBP</p>
          <h1 className="mt-1 text-2xl sm:text-4xl font-black text-slate-950">Noticias de la jornada</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            El resumen sale del marcador en cuanto el juego termina: resultado, pitcheo de decisión y lugar en la tabla.
          </p>
        </div>
        {featured ? (
          <FeaturedRecap recap={featured} highlight={featuredHighlight} />
        ) : (
          <p className="text-sm text-slate-500">Todavía no hay juegos finalizados.</p>
        )}
        {dates.map((date) => (
          <section key={date}>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">{formatRecapDate(date)}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {rest
                .filter((recap) => recap.date === date)
                .map((recap) => (
                  <RecapCard key={recap.id} recap={recap} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </InfoPage>
  );
}
