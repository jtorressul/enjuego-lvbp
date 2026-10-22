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
      const isLive = data.status === "IN_PROGRESS";
      const isFinal = data.status === "FINISHED";

      const awayCode = (data.awayTeam.code || "").toUpperCase();
      const homeCode = (data.homeTeam.code || "").toUpperCase();
      const awayName = data.awayTeam.name || "Visitante";
      const homeName = data.homeTeam.name || "Home Club";

      // Live stream indicator
      const hasLiveStream =
        id === "870072" ||
        ((awayCode === "CAR" && homeCode === "LAG") || (awayCode === "LAG" && homeCode === "CAR")) ||
        Boolean(data.youtubeVideoId);

      const inningText = data.inningState
        ? `${data.inningState.top ? "Alta" : "Baja"} ${data.inningState.inning}°`
        : data.statusLabel || "En Vivo";

      const statusPrefix = isLive
        ? `EN VIVO (${inningText}): ${awayName} ${data.awayScore} - ${data.homeScore} ${homeName}`
        : isFinal
          ? `FINAL: ${awayName} ${data.awayScore} - ${data.homeScore} ${homeName}`
          : `HOY (${data.time || "7:00 PM"}): ${awayName} vs ${homeName}`;

      const title = `${statusPrefix} · Pizarra, Box Score y Transmisión`;

      const tvList =
        hasLiveStream
          ? "TVES (Señal Oficial TV Abierta), TV y Cable"
          : data.tvChannels && data.tvChannels.length > 0
            ? data.tvChannels.join(", ")
            : data.tv || "TV Abierta y Streaming";

      const description = isLive
        ? `Sigue en vivo el juego ${awayName} (${data.awayScore}) vs ${homeName} (${data.homeScore}) en ${data.venue || "Venezuela"}. Señal de TV: ${tvList}. Pizarra jugada a jugada, alineaciones, pitcheos y estadísticas en tiempo real.`
        : isFinal
          ? `Marcador final: ${awayName} ${data.awayScore} - ${data.homeScore} ${homeName} en ${data.venue || "el estadio"}. Box score completo, estadísticas de bateo y pitcheo, decisiones y resumen del partido.`
          : `Partido oficial: ${awayName} vs ${homeName} a las ${data.time || "7:00 PM"} (VET) en ${data.venue || "Venezuela"}. Transmisión: ${tvList}. Alineaciones oficiales y pizarra en vivo.`;

      // 1200x630 Matchup Open Graph Image (Only existing LVBP matchups have static graphics)
      const LVBP_CODES = new Set(["ANZ", "ARA", "CAR", "LAG", "LAR", "MAG", "MAR", "ZUL"]);
      const hasStaticMatchup =
        Boolean(awayCode && homeCode && LVBP_CODES.has(awayCode) && LVBP_CODES.has(homeCode));

      const ogImageUrl = hasStaticMatchup
        ? `https://enjuego.online/og/matchups/${awayCode}-${homeCode}.png`
        : "https://enjuego.online/og/lvbp-default.png";

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
          siteName: "En Juego · Béisbol Venezolano",
          type: "article",
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: `${awayName} vs ${homeName}`,
              type: "image/png",
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [ogImageUrl],
        },
      };
    }
  } catch {}

  const fallbackTitle = "Juego LVBP en Vivo · Pizarra, Marcadores y Transmisión";
  const fallbackDesc =
    "Sigue los partidos de la LVBP en vivo: marcadores jugada a jugada, canales de TV en vivo, alineaciones y tabla de posiciones del béisbol venezolano.";

  return {
    title: fallbackTitle,
    description: fallbackDesc,
    alternates: {
      canonical: `https://enjuego.online/juego/${id}`,
    },
    openGraph: {
      title: fallbackTitle,
      description: fallbackDesc,
      url: `https://enjuego.online/juego/${id}`,
      siteName: "En Juego · Béisbol Venezolano",
      type: "article",
      images: [
        {
          url: "https://enjuego.online/og/lvbp-default.png",
          width: 1200,
          height: 630,
          alt: "En Juego · Béisbol Venezolano",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fallbackTitle,
      description: fallbackDesc,
      images: ["https://enjuego.online/og/lvbp-default.png"],
    },
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
