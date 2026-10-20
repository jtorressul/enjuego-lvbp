import React, { Suspense } from "react";
import type { Metadata } from "next";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const team = Object.values(LVBP_TEAMS).find(
    (t) => t.slug === slug.toLowerCase() || t.code.toLowerCase() === slug.toLowerCase()
  );

  if (team) {
    const title = `${team.name} · Roster, Calendario, Resultados y Posición LVBP`;
    const description = `Toda la información de ${team.name} (${team.city}): roster oficial, juegos de hoy, calendario, resultados recientes, estadio ${team.venue} y estadísticas en la LVBP.`;
    return {
      title,
      description,
      alternates: {
        canonical: `https://enjuego.online/equipos/${team.slug}`,
      },
      openGraph: {
        title,
        description,
        url: `https://enjuego.online/equipos/${team.slug}`,
        images: [{ url: team.logoSvg, alt: team.name }],
      },
    };
  }

  return {
    title: "Equipo de Béisbol · Roster y Calendario LVBP",
    description: "Información de equipos, rosters, juegos y estadísticas del béisbol profesional.",
  };
}

export default async function EquipoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="equipos" initialTeamSlug={slug} />
    </Suspense>
  );
}
