import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeededPortal } from "@/components/SeededPortal";
import { LEAGUES, parseLeague, type LeagueId } from "@/lib/leagues";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ liga: string }>;
}

const POSICIONES_SEO_PROFILES: Record<
  LeagueId,
  {
    title: string;
    description: string;
    keywords: string[];
  }
> = {
  lvbp: {
    title: "Tabla de Posiciones LVBP 2026 · Clasificación del Béisbol Venezolano | En Juego",
    description:
      "Tabla de posiciones oficial de la LVBP y Béisbol Venezolano: juegos ganados, perdidos, porcentaje (PCT), diferencia de juegos (DIF) y racha actualizada al momento.",
    keywords: [
      "posiciones lvbp",
      "tabla de posiciones lvbp",
      "clasificacion lvbp",
      "standing lvbp",
      "posiciones beisbol venezolano",
    ],
  },
  mlb: {
    title: "Tabla de Posiciones MLB 2026 · Clasificación, Divisiones y Comodín | En Juego",
    description:
      "Tabla de posiciones oficial de las Grandes Ligas (MLB): récord de ganados y perdidos, líderes de división (Liga Americana y Nacional), carrera por el comodín (Wild Card) y rachas.",
    keywords: [
      "posiciones mlb 2026",
      "tabla de posiciones grandes ligas",
      "wild card mlb",
      "comodin mlb",
      "standings mlb",
      "clasificacion mlb",
      "tabla de posiciones mlb",
    ],
  },
  lidom: {
    title: "Tabla de Posiciones LIDOM 2026 · Clasificación Béisbol Dominicano | En Juego",
    description:
      "Tabla de posiciones oficial de la LIDOM (Pelota Dominicana): récord de Tigres del Licey, Águilas Cibaeñas, Escogido, Gigantes, Estrellas y Toros con juegos ganados, perdidos y diferencia.",
    keywords: [
      "posiciones lidom",
      "tabla lidom",
      "standing lidom",
      "beisbol dominicano posiciones",
      "licey posiciones",
      "aguilas cibaeñas standing",
      "tabla de posiciones lidom",
    ],
  },
  lmp: {
    title: "Tabla de Posiciones LMP 2026 · Clasificación Liga Mexicana del Pacífico | En Juego",
    description:
      "Tabla de posiciones de la Liga ARCO Mexicana del Pacífico (LMP): puntos, ganados y perdidos de Tomateros de Culiacán, Naranjeros de Hermosillo, Yaquis, Venados y Charros.",
    keywords: [
      "posiciones lmp",
      "tabla lmp",
      "clasificacion liga mexicana del pacifico",
      "standing lmp",
      "posiciones beisbol mexicano",
      "tabla de posiciones lmp",
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { liga } = await params;
  const leagueId = parseLeague(liga);
  const cfg = LEAGUES[leagueId];

  if (!cfg) {
    return {
      title: "Tabla de Posiciones de Béisbol · En Juego",
    };
  }

  const profile = POSICIONES_SEO_PROFILES[leagueId] || {
    title: `Tabla de Posiciones ${cfg.shortName} 2026 · Clasificación ${cfg.name} | En Juego`,
    description: `Tabla de posiciones oficial de ${cfg.name} (${cfg.shortName}): clasificación, juegos ganados, perdidos y porcentaje en En Juego.`,
    keywords: [`posiciones ${cfg.shortName.toLowerCase()}`, `tabla ${cfg.shortName.toLowerCase()}`],
  };

  const canonical =
    leagueId === "lvbp"
      ? "https://enjuego.online/posiciones"
      : `https://enjuego.online/posiciones/${leagueId}`;

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

export default async function PosicionesLigaPage({ params }: PageProps) {
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
        "name": "Posiciones",
        "item": "https://enjuego.online/posiciones",
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": LEAGUES[leagueId].name,
        "item": `https://enjuego.online/posiciones/${leagueId}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeededPortal initialSection="posiciones" initialLeague={leagueId} />
    </>
  );
}
