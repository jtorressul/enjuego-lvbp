import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultados en Vivo Hoy · Béisbol LVBP, MLB y Fútbol en Directo | En Juego",
  description:
    "Resultados en vivo hoy en tiempo real: marcadores jugada a jugada de la LVBP, Grandes Ligas (MLB) y Fútbol Europeo (Champions League, LaLiga, Premier League), tabla de posiciones y juegos de hoy.",
  alternates: {
    canonical: "https://enjuego.online",
  },
  keywords: [
    "resultados en vivo",
    "resultados en vivo hoy",
    "marcadores en vivo",
    "resultados de hoy en vivo",
    "resultados lvbp",
    "resultados lvbp en vivo",
    "lvbp hoy",
    "juegos de hoy lvbp",
    "pizarra en vivo",
    "resultados beisbol en vivo",
    "resultados futbol en vivo",
    "en juego",
  ],
};

export default function HomePage() {
  return <SeededPortal initialSection="home" />;
}
