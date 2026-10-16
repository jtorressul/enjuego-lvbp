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
    <html lang="es" data-theme="light">
      <body className="min-h-screen antialiased selection:bg-amber-400 selection:text-slate-950 transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
