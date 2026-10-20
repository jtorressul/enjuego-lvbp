import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Líderes de Bateo y Pitcheo LVBP 2026 · Estadísticas Individuales",
  description:
    "Líderes individuales de la LVBP: promedio de bateo (AVG), jonrones (HR), carreras impulsadas (CI), efectividad (ERA), ponches y juegos salvados del béisbol venezolano.",
  alternates: {
    canonical: "https://enjuego.online/lideres",
  },
  keywords: [
    "lideres lvbp",
    "estadisticas lvbp",
    "lider de bateo lvbp",
    "lider de jonrones lvbp",
    "lider de efectividad lvbp",
    "estadisticas individuales beisbol venezolano",
  ],
  openGraph: {
    title: "Líderes LVBP 2026 · Bateo, Pitcheo y Estadísticas",
    description: "Estadísticas individuales de bateadores y lanzadores de la LVBP y MLB.",
    url: "https://enjuego.online/lideres",
  },
};

export default function LideresPage() {
  return <SeededPortal initialSection="lideres" />;
}
