import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeededPortal } from "@/components/SeededPortal";
import { LEAGUES, parseLeague, type LeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ liga: string }>;
}

const RESULTADOS_SEO_PROFILES: Record<
  LeagueId,
  {
    title: string;
    description: string;
    keywords: string[];
  }
> = {
  lvbp: {
    title: "Resultados Béisbol Venezolano Hoy en Vivo · LVBP Pizarra y Marcadores | En Juego",
    description:
      "Resultados del Béisbol Venezolano y LVBP de hoy en vivo en tiempo real: marcadores actualizados jugada a jugada, pizarra C·H·E, box score completo y juegos del día.",
    keywords: [
      "resultados beisbol venezolano hoy vivo",
      "resultados beisbol venezolano",
      "resultado del beisbol venezolano de hoy en vivo",
      "resultado liga venezolana de beisbol",
      "pizarra beisbol venezolano",
      "resultados lvbp hoy en vivo",
      "marcador lvbp",
      "juegos de hoy lvbp",
    ],
  },
  mlb: {
    title: "Resultados MLB en Vivo Hoy · Grandes Ligas, Pizarra y Marcadores | En Juego",
    description:
      "Resultados de las Grandes Ligas (MLB) hoy en vivo minuto a minuto: pizarra jugada a jugada, marcadores de Yankees, Dodgers, Astros, box score completo y posiciones del béisbol mayor.",
    keywords: [
      "resultados mlb hoy",
      "resultados grandes ligas en vivo",
      "marcador mlb hoy",
      "pizarra mlb",
      "juegos de hoy mlb",
      "partidos mlb en vivo",
      "yankees en vivo",
      "dodgers en vivo",
      "baseball en vivo mlb",
    ],
  },
  lidom: {
    title: "Resultados LIDOM Hoy en Vivo · Béisbol Dominicano, Pizarra y Marcadores | En Juego",
    description:
      "Resultados de la pelota invernal dominicana (LIDOM) hoy en tiempo real: marcadores de Tigres del Licey, Águilas Cibaeñas, Leones del Escogido, box score y juegos de hoy.",
    keywords: [
      "resultados lidom hoy",
      "beisbol dominicano en vivo",
      "marcador lidom",
      "juegos de hoy lidom",
      "licey en vivo",
      "aguilas cibaeñas hoy",
      "pizarra lidom",
      "pelota dominicana en vivo",
    ],
  },
  lmp: {
    title: "Resultados LMP Hoy en Vivo · Liga Mexicana del Pacífico, Pizarra y Marcadores | En Juego",
    description:
      "Resultados de la Liga ARCO Mexicana del Pacífico (LMP) hoy en vivo: marcadores de Tomateros de Culiacán, Naranjeros de Hermosillo, Yaquis, pizarra en directo y box score.",
    keywords: [
      "resultados lmp hoy",
      "liga mexicana del pacifico en vivo",
      "marcador lmp hoy",
      "pizarra lmp",
      "tomateros en vivo",
      "naranjeros en vivo",
      "beisbol mexicano en vivo",
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { liga } = await params;
  const leagueId = parseLeague(liga);
  const cfg = LEAGUES[leagueId];

  if (!cfg) {
    return {
      title: "Resultados de Béisbol en Vivo · En Juego",
    };
  }

  const profile = RESULTADOS_SEO_PROFILES[leagueId] || {
    title: `Resultados en Vivo ${cfg.shortName} Hoy · Pizarra y Marcadores | En Juego`,
    description: `Resultados oficiales de ${cfg.name} (${cfg.shortName}): marcadores en vivo jugada a jugada y box score en En Juego.`,
    keywords: [`resultados ${cfg.shortName.toLowerCase()}`, `pizarra ${cfg.shortName.toLowerCase()}`],
  };

  const canonical =
    leagueId === "lvbp"
      ? "https://enjuego.online/resultados"
      : `https://enjuego.online/resultados/${leagueId}`;

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

export default async function ResultadosLigaPage({ params }: PageProps) {
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
        "name": "Resultados",
        "item": "https://enjuego.online/resultados",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": LEAGUES[leagueId].name,
        "item": `https://enjuego.online/resultados/${leagueId}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeededPortal initialSection="resultados" initialLeague={leagueId} />
    </>
  );
}
