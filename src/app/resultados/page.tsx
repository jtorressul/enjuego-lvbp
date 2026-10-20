import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resultados LVBP Hoy en Vivo · Pizarra y Marcadores Béisbol Venezolano",
  description:
    "Resultados de los juegos de la LVBP hoy en tiempo real. Pizarra jugada a jugada, box score completo, lanzadores ganadores y salvados, y highlights en video.",
  alternates: {
    canonical: "https://enjuego.online/resultados",
  },
  keywords: [
    "resultados lvbp",
    "resultados lvbp hoy",
    "pizarra lvbp",
    "marcadores lvbp",
    "juegos de hoy lvbp",
    "juegos de ayer lvbp",
    "quien gano ayer lvbp",
    "beisbol venezolano resultados",
    "box score lvbp",
  ],
  openGraph: {
    title: "Resultados LVBP Hoy en Vivo · Pizarra y Marcadores",
    description:
      "Consulta los resultados actualizados de la LVBP y MLB. Marcador jugada a jugada y box score de cada juego.",
    url: "https://enjuego.online/resultados",
  },
};

export default function ResultadosPage() {
  return <SeededPortal initialSection="resultados" />;
}
