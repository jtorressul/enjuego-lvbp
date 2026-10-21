import type { Metadata } from "next";
import { SoccerPortal } from "@/components/SoccerPortal";
import { fetchSoccerScoreboard, fetchSoccerStandings } from "@/lib/soccer-service";
import { parseSoccerLeague, SOCCER_LEAGUES } from "@/lib/soccer-leagues";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; league?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const leagueId = parseSoccerLeague(sp?.liga || sp?.league);
  const cfg = SOCCER_LEAGUES[leagueId];

  return {
    title: `${cfg.name} en Vivo · Marcadores, Pizarra y Posiciones | En Juego Fútbol`,
    description: `Sigue ${cfg.name} (${cfg.country}): resultados en directo minuto a minuto, tabla de clasificación oficial y calendario de partidos en En Juego.`,
    alternates: {
      canonical: `https://enjuego.online/futbol?liga=${leagueId}`,
    },
    keywords: [
      cfg.name.toLowerCase(),
      cfg.shortName.toLowerCase(),
      "champions league en vivo",
      "futbol europeo hoy",
      "tabla de posiciones futbol",
      "marcadores futbol en vivo",
      "en juego futbol",
    ],
  };
}

export default async function FutbolPage({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; league?: string; partido?: string; match?: string }>;
}) {
  const sp = await searchParams;
  const leagueId = parseSoccerLeague(sp?.liga || sp?.league);
  const matchId = sp?.partido || sp?.match || null;

  const [initialMatches, initialStandings] = await Promise.all([
    fetchSoccerScoreboard(leagueId),
    fetchSoccerStandings(leagueId),
  ]);

  return (
    <SoccerPortal
      initialLeague={leagueId}
      initialMatches={initialMatches}
      initialStandings={initialStandings}
      initialMatchId={matchId}
    />
  );
}
