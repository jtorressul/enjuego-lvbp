import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";
import { LEAGUES, parseLeague } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; league?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const leagueId = parseLeague(sp?.liga || sp?.league);
  const cfg = LEAGUES[leagueId];

  const title = `Tabla de Posiciones ${cfg.shortName} 2026 · Clasificación ${cfg.name}`;
  const description = `Tabla de posiciones oficial de ${cfg.name} (${cfg.shortName}): juegos ganados, perdidos, porcentaje (PCT), diferencia (DIF) y racha actualizada.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://enjuego.online/posiciones?liga=${leagueId}`,
    },
    openGraph: {
      title,
      description,
      url: `https://enjuego.online/posiciones?liga=${leagueId}`,
    },
  };
}

export default function PosicionesPage() {
  return <SeededPortal initialSection="posiciones" />;
}
