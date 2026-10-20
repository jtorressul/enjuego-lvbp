import type { Metadata } from "next";
import { SeededPortal } from "@/components/SeededPortal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendario LVBP 2026 · Juegos de Hoy, Horarios y Canales de TV",
  description:
    "Calendario completo de la LVBP 2026. Conoce a qué hora juegan hoy y qué canales transmiten en vivo: Venevisión, Televen, IVC, 1Base TV, Canal I y BeisbolPlay.",
  alternates: {
    canonical: "https://enjuego.online/calendario",
  },
  keywords: [
    "calendario lvbp",
    "juegos de hoy lvbp",
    "juegos lvbp hoy",
    "a que hora juega el caracas hoy",
    "a que hora juega el magallanes hoy",
    "canales transmite beisbol venezolano",
    "donde ver lvbp hoy",
    "horarios lvbp",
  ],
  openGraph: {
    title: "Calendario LVBP 2026 · Juegos de Hoy y Canales de TV",
    description:
      "Horarios oficiales de Venezuela y transmisiones de TV abierta y cable para todos los juegos de la LVBP.",
    url: "https://enjuego.online/calendario",
  },
};

export default function CalendarioPage() {
  return <SeededPortal initialSection="calendario" />;
}
