import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultados en Vivo Hoy · Marcadores LVBP, MLB y Fútbol en Directo",
  description:
    "Resultados en vivo hoy segundo a segundo: pizarra de la LVBP, Grandes Ligas (MLB) y Fútbol Europeo en directo, juegos de hoy, tabla de posiciones y canales de TV.",
  alternates: {
    canonical: "https://enjuego.online",
  },
  keywords: [
    "resultados en vivo",
    "resultados en vivo hoy",
    "marcadores en vivo",
    "resultados lvbp",
    "resultados lvbp en vivo",
    "lvbp hoy",
    "a que hora juega la lvbp en españa",
    "horarios beisbol venezolano en europa",
    "donde ver la lvbp en españa gratis",
    "juegos de hoy en vivo",
    "pizarra lvbp",
    "beisbol venezolano en vivo",
    "resultados futbol en vivo",
  ],
};

export default function InicioPage() {
  return <SeededPortal initialSection="home" />;
}
