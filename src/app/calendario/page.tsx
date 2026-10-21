import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";
import { LEAGUES, parseLeague } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; league?: string; equipo?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const leagueId = parseLeague(sp?.liga || sp?.league);
  const cfg = LEAGUES[leagueId];

  const title = `Calendario ${cfg.shortName} 2026 · Juegos de Hoy, Horarios y Canales de TV`;
  const description = `Calendario oficial de ${cfg.name} (${cfg.shortName}): horarios en Venezuela (VET), estadios, señales de transmisión en vivo y filtro por equipo.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://enjuego.online/calendario?liga=${leagueId}`,
    },
    openGraph: {
      title,
      description,
      url: `https://enjuego.online/calendario?liga=${leagueId}`,
    },
  };
}

export default function CalendarioPage() {
  return <SeededPortal initialSection="calendario" />;
}
