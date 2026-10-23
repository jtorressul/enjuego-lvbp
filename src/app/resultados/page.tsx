import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";
import { LEAGUES, parseLeague } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; league?: string; fecha?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const rawLeague = sp?.liga || sp?.league;
  const leagueId = parseLeague(rawLeague);
  const cfg = LEAGUES[leagueId];

  const isLvbp = leagueId === "lvbp";

  const title = isLvbp
    ? "Resultados Béisbol Venezolano Hoy en Vivo · LVBP Pizarra y Marcadores"
    : `Resultados en Vivo ${cfg.shortName} Hoy · Pizarra, Marcadores y Box Score`;

  const description = isLvbp
    ? "Resultados del Béisbol Venezolano y LVBP de hoy en vivo en tiempo real: marcadores actualizados jugada a jugada, pizarra C·H·E, box score completo y juegos del día."
    : `Resultados en vivo de ${cfg.name} (${cfg.shortName}) hoy minuto a minuto: marcadores en directo, pizarras C·H·E, box score completo, lanzadores y jugadas clave en En Juego.`;

  const canonical = rawLeague
    ? `https://enjuego.online/resultados?liga=${leagueId}`
    : "https://enjuego.online/resultados";

  return {
    title,
    description,
    keywords: [
      "resultados beisbol venezolano hoy vivo",
      "resultados beisbol venezolano",
      "resultado del beisbol venezolano de hoy en vivo",
      "resultado liga venezolana de beisbol",
      "pizarra beisbol venezolano",
      "resultados lvbp hoy en vivo",
      "marcador lvbp",
      "juegos de hoy lvbp",
      "score lvbp hoy",
      "beisbol venezolano en vivo",
      "caracas vs la guaira hoy en vivo",
      "leones del caracas hoy en vivo",
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "En Juego · Resultados en Vivo",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ResultadosPage() {
  return <SeededPortal initialSection="resultados" />;
}
