import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { buildGameRecaps, formatRecapDate } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Noticias de la LVBP · En Juego",
  description:
    "Resúmenes automáticos de cada juego final de la LVBP: marcador, lanzadores de decisión y lugar en la tabla.",
};

export default async function NoticiasPage() {
  const [games, table] = await Promise.all([
    fetchLvbpSchedule("2026"),
    fetchLvbpStandingsAndLeaders("2026"),
  ]);
  const recaps = buildGameRecaps(games, table.standings).slice(0, 24);
  const dates = [...new Set(recaps.map((recap) => recap.date))];

  return (
    <InfoPage eyebrow="Marcador LVBP" title="Noticias de la jornada">
      <p>
        Cada nota se escribe sola cuando el juego termina. Usa el marcador, los hits, los errores,
        el lanzador ganador y la tabla de posiciones de En Juego. No es una crónica firmada por un
        periodista.
      </p>
      {recaps.length === 0 ? (
        <p>Todavía no hay juegos finalizados para resumir.</p>
      ) : null}
      {dates.map((date) => (
        <section key={date} className="space-y-3 pt-2">
          <h2 className="text-base font-black text-slate-950">{formatRecapDate(date)}</h2>
          <div className="space-y-3">
            {recaps
              .filter((recap) => recap.date === date)
              .map((recap) => (
                <article key={recap.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                    Final · {recap.scoreLine}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    <Link href={`/noticias/${recap.id}`} className="hover:text-amber-800">
                      {recap.headline}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{recap.paragraphs[0]}</p>
                  <Link
                    href={`/noticias/${recap.id}`}
                    className="mt-3 inline-flex text-xs font-extrabold text-amber-800"
                  >
                    Leer el resumen ›
                  </Link>
                </article>
              ))}
          </div>
        </section>
      ))}
    </InfoPage>
  );
}
