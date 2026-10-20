import React, { Suspense } from "react";
import type { Metadata } from "next";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";
import { fetchLvbpGameday } from "@/lib/mlb-lvbp-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await fetchLvbpGameday(id);
    if (data?.awayTeam && data?.homeTeam) {
      const isFinal = data.status === "FINISHED";
      const statusText = isFinal
        ? `Final: ${data.awayTeam.name} ${data.awayScore} - ${data.homeScore} ${data.homeTeam.name}`
        : `${data.awayTeam.name} vs ${data.homeTeam.name} en Vivo`;
      const title = `${statusText} · Marcador, Box Score y Jugada a Jugada`;
      const description = `Sigue el partido ${data.awayTeam.name} vs ${data.homeTeam.name} en vivo por la LVBP. Marcador actualizado, jugada a jugada, alineaciones, box score, canales de TV abierta y highlights en video.`;
      return {
        title,
        description,
        alternates: {
          canonical: `https://enjuego.online/juego/${id}`,
        },
        openGraph: {
          title,
          description,
          url: `https://enjuego.online/juego/${id}`,
          images: [{ url: data.homeTeam.logoUrl || "/logo.png", alt: `${data.awayTeam.name} vs ${data.homeTeam.name}` }],
        },
      };
    }
  } catch {}

  return {
    title: "Juego LVBP en Vivo · Pizarra, Box Score y Jugada a Jugada",
    description: "Sigue el partido de la LVBP en vivo: marcador actualizado, jugada a jugada, alineaciones y canales de TV.",
  };
}

export default async function JuegoIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="juego" initialGameId={id} />
    </Suspense>
  );
}
