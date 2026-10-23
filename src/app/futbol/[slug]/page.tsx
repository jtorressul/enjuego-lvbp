import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SoccerPortal } from "@/components/SoccerPortal";
import {
  SOCCER_LEAGUES,
  getSoccerLeagueBySlug,
  parseSoccerLeague,
} from "@/lib/soccer-leagues";
import {
  fetchSoccerScoreboard,
  fetchSoccerStandings,
} from "@/lib/soccer-service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ partido?: string; match?: string; fecha?: string }>;
}

const LEAGUE_SEO_PROFILES: Record<
  string,
  {
    title: string;
    description: string;
    keywords: string[];
    topTeams: string[];
  }
> = {
  futve: {
    title: "Liga FUTVE en Vivo · Caracas FC, Deportivo Táchira, Marcadores y Posiciones | En Juego",
    description:
      "Resultados en vivo de la Liga FUTVE y fútbol venezolano: marcadores al momento, Clásico Nacional (Caracas vs Táchira), tabla de posiciones de los cuadrangulares, goles y canales de TV (Televen y YouTube).",
    keywords: [
      "liga futve",
      "futve en vivo",
      "caracas fc en vivo",
      "deportivo tachira hoy",
      "clasico caracas vs tachira",
      "resultados futve hoy",
      "tabla futve",
      "tabla de posiciones futve",
      "futbol venezolano en vivo",
      "marcador liga futve",
    ],
    topTeams: ["Caracas FC", "Deportivo Táchira", "Monagas", "Carabobo", "Portuguesa"],
  },
  champions: {
    title: "Champions League en Vivo · Resultados, Clasificación y Próxima Jornada | En Juego",
    description:
      "Sigue la UEFA Champions League en directo minuto a minuto: marcadores en tiempo real, tabla de la fase de liga, partidos de Real Madrid, Barcelona, Manchester City, Bayern Múnich y PSG.",
    keywords: [
      "champions league en vivo",
      "resultados champions league hoy",
      "tabla champions league",
      "partidos champions hoy",
      "ucl en directo",
      "real madrid champions hoy",
      "barcelona champions en vivo",
    ],
    topTeams: ["Real Madrid", "FC Barcelona", "Manchester City", "Bayern Munich", "PSG"],
  },
  laliga: {
    title: "LaLiga en Vivo · Real Madrid, Barcelona, Atlético, Marcadores y Posiciones | En Juego",
    description:
      "Resultados en vivo de LALIGA EA Sports: marcadores en directo de Real Madrid, FC Barcelona y Atlético de Madrid, tabla de clasificación, goleadores (Pichichi) y canales de TV.",
    keywords: [
      "laliga en vivo",
      "real madrid hoy en vivo",
      "barcelona en vivo",
      "partidos de laliga hoy",
      "resultados laliga hoy",
      "tabla de posiciones laliga",
      "liga espanola en vivo",
    ],
    topTeams: ["Real Madrid", "FC Barcelona", "Atlético de Madrid", "Villarreal", "Athletic Club"],
  },
  premier: {
    title: "Premier League en Vivo · Manchester City, Liverpool, Arsenal y Pizarra | En Juego",
    description:
      "Marcadores en directo de la Premier League inglesa: partidos de hoy en vivo, tabla de posiciones actualizada, goleadores y resumen de la jornada en En Juego.",
    keywords: [
      "premier league en vivo",
      "manchester city hoy",
      "liverpool en vivo",
      "arsenal en directo",
      "resultados premier league hoy",
      "tabla premier league",
      "futbol ingles en vivo",
    ],
    topTeams: ["Manchester City", "Liverpool", "Arsenal", "Chelsea", "Manchester United"],
  },
  "serie-a": {
    title: "Serie A en Vivo · Inter, Juventus, Milan, Resultados y Tabla | En Juego",
    description:
      "Resultados en vivo del fútbol italiano (Serie A): partidos de hoy, tabla de posiciones, goles y estadísticas de Inter de Milán, Juventus, AC Milan, Napoli y Roma.",
    keywords: [
      "serie a en vivo",
      "inter de milan hoy",
      "juventus en vivo",
      "ac milan en directo",
      "resultados serie a hoy",
      "tabla serie a",
    ],
    topTeams: ["Inter", "Juventus", "AC Milan", "Napoli", "Roma"],
  },
  bundesliga: {
    title: "Bundesliga en Vivo · Bayern Múnich, Bayer Leverkusen, Marcadores y Tabla | En Juego",
    description:
      "Marcadores en directo de la Bundesliga alemana: resultados de Bayern Múnich, Bayer Leverkusen, Borussia Dortmund, posiciones y estadísticas en En Juego.",
    keywords: [
      "bundesliga en vivo",
      "bayern munich hoy",
      "bayer leverkusen en vivo",
      "borussia dortmund en directo",
      "resultados bundesliga hoy",
      "tabla bundesliga",
    ],
    topTeams: ["Bayern Munich", "Bayer Leverkusen", "Borussia Dortmund", "RB Leipzig"],
  },
  "ligue-1": {
    title: "Ligue 1 en Vivo · PSG, Marsella, Mónaco, Resultados y Posiciones | En Juego",
    description:
      "Resultados en vivo de la Ligue 1 de Francia: partidos de Paris Saint-Germain, Olympique de Marsella, Mónaco, tabla de posiciones y goles en directo.",
    keywords: [
      "ligue 1 en vivo",
      "psg hoy en vivo",
      "marseille en vivo",
      "resultados ligue 1 hoy",
      "tabla ligue 1",
    ],
    topTeams: ["PSG", "Marseille", "Monaco", "Lille", "Lyon"],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cfg = getSoccerLeagueBySlug(slug) || SOCCER_LEAGUES[parseSoccerLeague(slug)];

  if (!cfg) {
    return {
      title: "Fútbol en Vivo · Resultados y Posiciones | En Juego",
    };
  }

  const profile = LEAGUE_SEO_PROFILES[cfg.slug] || {
    title: `${cfg.name} en Vivo · Marcadores, Calendario y Posiciones | En Juego`,
    description: `Resultados en vivo de ${cfg.name} (${cfg.country}): marcadores en tiempo real, tabla de clasificación, calendario y estadísticas en En Juego.`,
    keywords: [`${cfg.name.toLowerCase()} en vivo`, `resultados ${cfg.name.toLowerCase()}`],
    topTeams: [],
  };

  const canonical = `https://enjuego.online/futbol/${cfg.slug}`;

  return {
    title: profile.title,
    description: profile.description,
    keywords: profile.keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: profile.title,
      description: profile.description,
      url: canonical,
      siteName: "En Juego · Deportes en Vivo",
      type: "website",
      locale: "es_VE",
      images: [
        {
          url: "https://enjuego.online/og/lvbp-default.png",
          width: 1200,
          height: 630,
          alt: profile.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: profile.title,
      description: profile.description,
      images: ["https://enjuego.online/og/lvbp-default.png"],
    },
  };
}

export default async function FutbolSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const cfg = getSoccerLeagueBySlug(slug);

  if (!cfg) {
    notFound();
  }

  // Preload matches and standings for fast SSR hydration and Schema
  const [initialMatches, initialStandings] = await Promise.all([
    fetchSoccerScoreboard(cfg.id).catch(() => []),
    fetchSoccerStandings(cfg.id).catch(() => []),
  ]);

  const matches = initialMatches;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Inicio",
        "item": "https://enjuego.online",
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Fútbol",
        "item": "https://enjuego.online/futbol",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": cfg.name,
        "item": `https://enjuego.online/futbol/${cfg.slug}`,
      },
    ],
  };

  const sportsEventsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cfg.name} - Partidos y Resultados en Vivo`,
    description: `Marcadores y próximos partidos de ${cfg.name} en En Juego Online`,
    itemListElement: matches.slice(0, 10).map((m, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "SportsEvent",
        name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        startDate: m.date,
        sport: "Soccer",
        location: {
          "@type": "Place",
          name: m.venue || "Estadio",
          address: m.city || cfg.country,
        },
        homeTeam: {
          "@type": "SportsTeam",
          name: m.homeTeam.name,
        },
        awayTeam: {
          "@type": "SportsTeam",
          name: m.awayTeam.name,
        },
        url: `https://enjuego.online/futbol/${cfg.slug}?partido=${m.id}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {matches.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventsJsonLd) }}
        />
      )}
      <SoccerPortal
        initialLeague={cfg.id}
        initialMatches={initialMatches}
        initialStandings={initialStandings}
        initialMatchId={sp?.partido || sp?.match || null}
      />
    </>
  );
}
