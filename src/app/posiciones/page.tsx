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
  const rawLeague = sp?.liga || sp?.league;
  const leagueId = parseLeague(rawLeague);
  const cfg = LEAGUES[leagueId];

  const isLvbp = leagueId === "lvbp";

  const title = isLvbp
    ? "Tabla de Posiciones LVBP 2026 · Clasificación del Béisbol Venezolano"
    : `Tabla de Posiciones ${cfg.shortName} 2026 · Clasificación ${cfg.name}`;

  const description = isLvbp
    ? "Tabla de posiciones oficial de la LVBP y Béisbol Venezolano: juegos ganados, perdidos, porcentaje (PCT), diferencia de juegos (DIF) y racha actualizada al momento."
    : `Tabla de posiciones oficial de ${cfg.name} (${cfg.shortName}): juegos ganados, perdidos, porcentaje (PCT), diferencia (DIF) y racha actualizada.`;

  const canonical =
    rawLeague && rawLeague !== "lvbp"
      ? `https://enjuego.online/posiciones/${leagueId}`
      : "https://enjuego.online/posiciones";

  return {
    title,
    description,
    keywords: [
      "posiciones lvbp",
      "tabla de posiciones lvbp",
      "clasificacion lvbp",
      "standing lvbp",
      "posiciones beisbol venezolano",
    ],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
    },
  };
}

export default function PosicionesPage() {
  return <SeededPortal initialSection="posiciones" />;
}
