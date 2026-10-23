import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultados en Vivo Hoy · Béisbol Venezolano LVBP, MLB y Fútbol | En Juego",
  description:
    "Resultados del Béisbol Venezolano y LVBP hoy en vivo en tiempo real: pizarra jugada a jugada, marcadores de Grandes Ligas (MLB) y Fútbol Europeo, posiciones y canales de TV.",
  alternates: {
    canonical: "https://enjuego.online",
  },
  keywords: [
    "resultados en vivo",
    "resultados en vivo hoy",
    "resultados beisbol venezolano hoy vivo",
    "resultado del beisbol venezolano de hoy en vivo",
    "resultados beisbol venezolano",
    "pizarra beisbol venezolano",
    "pizarra en vivo",
    "resultados lvbp",
    "resultados lvbp en vivo",
    "marcador lvbp",
    "juegos de hoy lvbp",
    "score lvbp hoy",
    "partidos de beisbol venezolano hoy en vivo",
    "caracas vs la guaira hoy en vivo",
    "leones del caracas hoy en vivo",
    "resultados beisbol en vivo",
    "resultados futbol en vivo",
    "en juego",
  ],
};

export default function HomePage() {
  return <SeededPortal initialSection="home" />;
}
