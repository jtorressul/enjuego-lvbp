import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/InfoPage";
import { buildGameRecaps } from "@/lib/game-recaps";
import { fetchLvbpSchedule, fetchLvbpStandingsAndLeaders } from "@/lib/mlb-lvbp-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [games, table] = await Promise.all([
    fetchLvbpSchedule("2026"),
    fetchLvbpStandingsAndLeaders("2026"),
  ]);
  const recap = buildGameRecaps(games, table.standings).find((item) => item.id === id);
  if (!recap) return { title: "Noticia · En Juego" };
  return {
    title: `${recap.headline} · En Juego`,
    description: recap.paragraphs[0],
  };
}

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [games, table] = await Promise.all([
    fetchLvbpSchedule("2026"),
    fetchLvbpStandingsAndLeaders("2026"),
  ]);
  const recap = buildGameRecaps(games, table.standings).find((item) => item.id === id);
  if (!recap) notFound();

  return (
    <InfoPage eyebrow={recap.dateLabel} title={recap.headline}>
      <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
        Final · {recap.scoreLine}
        {recap.venue ? ` · ${recap.venue}` : ""}
      </p>
      {recap.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <p className="text-xs text-slate-500">
        Resumen automático armado con el marcador de En Juego. El juego completo está en el{" "}
        <Link href={`/juego/${recap.id}`} className="font-semibold text-amber-800 underline">
          gameday
        </Link>
        .
      </p>
      <p>
        <Link href="/noticias" className="font-semibold text-amber-800 underline">
          Volver a las noticias
        </Link>
      </p>
    </InfoPage>
  );
}
