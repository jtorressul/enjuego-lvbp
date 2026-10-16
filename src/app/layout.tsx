import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "En Juego · LVBP en Vivo — Resultados, Gameday, Box Score y Posiciones",
  description:
    "Resultados en vivo de la Liga Venezolana de Béisbol Profesional (LVBP): jugada a jugada, terreno 2D, zona de strike, mapa de bateo, box score, líderes y tabla de posiciones.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#060a12] text-slate-100 antialiased selection:bg-amber-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
