import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tabla de Posiciones LVBP 2026 · Clasificación Béisbol Venezolano",
  description:
    "Tabla de posiciones oficial de la LVBP: juegos ganados, perdidos, average, diferencia de juegos (DIF) y racha de los 8 equipos del béisbol venezolano.",
  alternates: {
    canonical: "https://enjuego.online/posiciones",
  },
  keywords: [
    "tabla de posiciones lvbp",
    "posiciones lvbp",
    "posiciones beisbol venezolano",
    "clasificacion lvbp",
    "como van las posiciones de la lvbp",
    "tabla round robin lvbp",
    "posiciones lvbp 2026",
  ],
  openGraph: {
    title: "Tabla de Posiciones LVBP 2026 · Clasificación Béisbol Venezolano",
    description:
      "Consulta cómo van los 8 equipos en la tabla de la LVBP: juegos ganados, perdidos, average y racha.",
    url: "https://enjuego.online/posiciones",
  },
};

export default function PosicionesPage() {
  return <SeededPortal initialSection="posiciones" />;
}
