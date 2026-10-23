import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeededPortal } from "@/components/SeededPortal";
import { LEAGUES, parseLeague, type LeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ liga: string }>;
}

const CALENDARIO_SEO_PROFILES: Record<
  LeagueId,
  {
    title: string;
    description: string;
    keywords: string[];
  }
> = {
  lvbp: {
    title: "Calendario LVBP 2026 · Juegos de Hoy del Béisbol Venezolano, Horarios y TV | En Juego",
    description:
      "Calendario oficial de la LVBP y Béisbol Venezolano: horarios en Venezuela (VET), estadios, juegos de hoy, canales de transmisión en vivo (TVES, ByM Sport, IVC) y transmisiones.",
    keywords: [
      "calendario lvbp",
      "juegos de hoy lvbp",
      "juego de beisbol venezolano para hoy",
      "horarios lvbp",
      "partidos de beisbol venezolano hoy",
      "canales lvbp",
      "bym sport",
    ],
  },
  mlb: {
    title: "Calendario MLB 2026 · Juegos de Hoy Grandes Ligas, Horarios y TV | En Juego",
    description:
      "Calendario oficial de juegos de las Grandes Ligas (MLB): cartelera del día, horarios en hora de Venezuela y EE. UU., lanzadores probables y canales de televisión.",
    keywords: [
      "calendario mlb 2026",
      "juegos de hoy mlb",
      "partidos mlb hoy",
      "horarios mlb",
      "juegos de hoy grandes ligas",
      "cartelera mlb hoy",
      "juegos mlb hoy en vivo",
    ],
  },
  lidom: {
    title: "Calendario LIDOM 2026 · Juegos de Hoy Béisbol Dominicano y Horarios | En Juego",
    description:
      "Calendario oficial de la pelota invernal dominicana (LIDOM): partidos de hoy de Licey, Águilas, Escogido, estadios, horarios y señales de TV y streaming en vivo.",
    keywords: [
      "calendario lidom",
      "juegos de hoy lidom",
      "partidos lidom hoy",
      "horarios lidom",
      "beisbol dominicano juegos de hoy",
      "juegos de hoy pelota dominicana",
    ],
  },
  lmp: {
    title: "Calendario LMP 2026 · Juegos de Hoy Liga Mexicana del Pacífico | En Juego",
    description:
      "Calendario oficial de la Liga ARCO Mexicana del Pacífico (LMP): partidos de hoy, horarios, lanzadores abridores y transmisiones del béisbol invernal mexicano.",
    keywords: [
      "calendario lmp",
      "juegos de hoy lmp",
      "partidos lmp hoy",
      "horarios lmp",
      "liga mexicana del pacifico juegos de hoy",
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { liga } = await params;
  const leagueId = parseLeague(liga);
  const cfg = LEAGUES[leagueId];

  if (!cfg) {
    return {
      title: "Calendario de Béisbol · Juegos de Hoy | En Juego",
    };
  }

  const profile = CALENDARIO_SEO_PROFILES[leagueId] || {
    title: `Calendario ${cfg.shortName} 2026 · Juegos de Hoy y Horarios | En Juego`,
    description: `Calendario oficial de ${cfg.name} (${cfg.shortName}): horarios, estadios y juegos del día en En Juego.`,
    keywords: [`calendario ${cfg.shortName.toLowerCase()}`, `juegos ${cfg.shortName.toLowerCase()}`],
  };

  const canonical =
    leagueId === "lvbp"
      ? "https://enjuego.online/calendario"
      : `https://enjuego.online/calendario/${leagueId}`;

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
      siteName: "En Juego · Resultados en Vivo",
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

export default async function CalendarioLigaPage({ params }: PageProps) {
  const { liga } = await params;
  const leagueId = parseLeague(liga);

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
        "name": "Calendario",
        "item": "https://enjuego.online/calendario",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": LEAGUES[leagueId].name,
        "item": `https://enjuego.online/calendario/${leagueId}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeededPortal initialSection="calendario" initialLeague={leagueId} />
    </>
  );
}
