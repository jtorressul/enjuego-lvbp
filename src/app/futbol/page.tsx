import type { Metadata } from "next";
import { SoccerPortal } from "@/components/SoccerPortal";
import {
  fetchSoccerMatchDetail,
  fetchSoccerScoreboard,
  fetchSoccerStandings,
} from "@/lib/soccer-service";
import { parseSoccerLeague, SOCCER_LEAGUES } from "@/lib/soccer-leagues";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string; league?: string; partido?: string; match?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const leagueId = parseSoccerLeague(sp?.liga || sp?.league);
  const cfg = SOCCER_LEAGUES[leagueId];
  const matchId = sp?.partido || sp?.match;

  if (matchId) {
    try {
      const detail = await fetchSoccerMatchDetail(leagueId, matchId);
      if (detail) {
        const isLive = detail.status === "IN_PROGRESS";
        const isFinal = detail.status === "FINISHED";
        const scoreStr =
          isLive || isFinal
            ? `${detail.homeTeam.name} ${detail.homeTeam.score ?? 0} - ${detail.awayTeam.score ?? 0} ${detail.awayTeam.name}`
            : `${detail.homeTeam.name} vs ${detail.awayTeam.name}`;
        const statusPrefix = isLive
          ? `EN VIVO (${detail.statusText}): ${scoreStr}`
          : isFinal
            ? `FINAL: ${scoreStr}`
            : `${scoreStr} (${detail.timeCaracas} VET)`;

        const title = `${statusPrefix} · ${cfg.name} | En Juego`;
        const venueInfo = detail.venue
          ? ` en ${detail.venue}${detail.city ? ` (${detail.city})` : ""}`
          : "";
        const description = `${scoreStr} por ${cfg.name}${venueInfo}. Alineaciones confirmadas, formaciones en cancha, mapa de tiros (xG), estadísticas y relato minuto a minuto en español.`;

        return {
          title,
          description,
          alternates: {
            canonical: `https://enjuego.online/futbol?liga=${leagueId}&partido=${matchId}`,
          },
          openGraph: {
            title,
            description,
            url: `https://enjuego.online/futbol?liga=${leagueId}&partido=${matchId}`,
            siteName: "En Juego · Deportes en Vivo",
            type: "article",
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
          },
        };
      }
    } catch {
      // Fallback to league metadata below
    }
  }

  const title = `${cfg.name} en Vivo · Marcadores, Calendario y Posiciones | En Juego`;
  const description = `Cobertura oficial de ${cfg.name} (${cfg.country}): resultados en directo minuto a minuto, tabla de clasificación actualizada, calendario por jornada y estadísticas en En Juego.`;

  const canonical =
    sp?.liga || sp?.league
      ? `https://enjuego.online/futbol/${cfg.slug}`
      : "https://enjuego.online/futbol";

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "En Juego · Deportes en Vivo",
    },
    keywords: [
      cfg.name.toLowerCase(),
      cfg.shortName.toLowerCase(),
      "champions league en vivo",
      "futbol europeo hoy",
      "tabla de posiciones futbol",
      "calendario futbol europeo",
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
