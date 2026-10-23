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
  const rawLeague = sp?.liga || sp?.league;
  const leagueId = parseLeague(rawLeague);
  const cfg = LEAGUES[leagueId];

  const isLvbp = leagueId === "lvbp";

  const title = isLvbp
    ? "Calendario LVBP 2026 · Juegos de Hoy del Béisbol Venezolano, Horarios y TV"
    : `Calendario ${cfg.shortName} 2026 · Juegos de Hoy, Horarios y Canales de TV`;

  const description = isLvbp
    ? "Calendario oficial de la LVBP y Béisbol Venezolano: horarios en Venezuela (VET), estadios, juegos de hoy, canales de transmisión en vivo (TVES, ByM Sport, IVC) y transmisiones."
    : `Calendario oficial de ${cfg.name} (${cfg.shortName}): horarios en Venezuela (VET), estadios, señales de transmisión en vivo y filtro por equipo.`;

  const canonical = rawLeague
    ? `https://enjuego.online/calendario?liga=${leagueId}`
    : "https://enjuego.online/calendario";

  return {
    title,
    description,
    keywords: [
      "calendario lvbp",
      "juegos de hoy lvbp",
      "juego de beisbol venezolano para hoy",
      "horarios lvbp",
      "partidos de beisbol venezolano hoy",
      "canales lvbp",
      "bym sport",
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

export default function CalendarioPage() {
  return <SeededPortal initialSection="calendario" />;
}
