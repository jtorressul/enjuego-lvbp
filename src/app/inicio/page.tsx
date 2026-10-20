import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inicio · Resultados LVBP Hoy en Vivo y Béisbol Venezolano",
  description:
    "Resultados de la LVBP hoy en vivo: marcadores jugada a jugada, juegos de hoy, tabla de posiciones, canales de TV abierta y cable, y highlights en video.",
  alternates: {
    canonical: "https://enjuego.online/inicio",
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
  ],
};

export default function InicioPage() {
  return <SeededPortal initialSection="home" />;
}
