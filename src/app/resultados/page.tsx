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
  const leagueId = parseLeague(sp?.liga || sp?.league);
  const cfg = LEAGUES[leagueId];

  const title = `Resultados en Vivo ${cfg.shortName} Hoy · Pizarra, Marcadores y Box Score`;
  const description = `Resultados en vivo de ${cfg.name} (${cfg.shortName}) hoy minuto a minuto: marcadores en directo, pizarras C·H·E, box score completo, lanzadores y jugadas clave en En Juego.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://enjuego.online/resultados?liga=${leagueId}`,
    },
    openGraph: {
      title,
      description,
      url: `https://enjuego.online/resultados?liga=${leagueId}`,
    },
  };
}

export default function ResultadosPage() {
  return <SeededPortal initialSection="resultados" />;
}
