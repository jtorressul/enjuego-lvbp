import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultados LVBP Hoy en Vivo · Pizarra, Marcadores y Juegos de Hoy",
  description:
    "Resultados de la LVBP hoy en vivo: marcadores jugada a jugada, juegos de hoy, tabla de posiciones, canales de TV abierta y cable, y highlights en video del béisbol venezolano.",
  alternates: {
    canonical: "https://enjuego.online",
  },
  keywords: [
    "resultados lvbp",
    "lvbp",
    "lvbp hoy",
    "juegos de hoy lvbp",
    "resultados lvbp hoy",
    "pizarra lvbp",
    "beisbol venezolano",
    "beisbol venezolano en vivo",
    "marcadores lvbp",
    "en juego",
  ],
};

export default function HomePage() {
  return <SeededPortal initialSection="home" />;
}
