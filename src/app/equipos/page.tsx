import React, { Suspense } from "react";
import type { Metadata } from "next";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";

export const metadata: Metadata = {
  title: "Equipos LVBP 2026 · Rosters, Calendarios y Franquicias",
  description:
    "Directorio oficial de los 8 equipos de la LVBP: Leones, Magallanes, Tiburones, Cardenales, Águilas, Tigres, Caribes y Bravos. Rosters, estadísticas y calendarios.",
  alternates: {
    canonical: "https://enjuego.online/equipos",
  },
  keywords: [
    "equipos lvbp",
    "rosters lvbp",
    "leones del caracas",
    "navegantes del magallanes",
    "tiburones de la guaira",
    "aguilas del zulia",
    "cardenales de lara",
    "caribes de anzoategui",
    "bravos de margarita",
    "tigres de aragua",
  ],
};

export default async function EquiposPage({
  searchParams,
}: {
  searchParams?: Promise<{
    team?: string;
    equipo?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const teamSlug = sp.team || sp.equipo || sp[""];
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="equipos" initialTeamSlug={teamSlug} />
    </Suspense>
  );
}
