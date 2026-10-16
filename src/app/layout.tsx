import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "En Juego · Béisbol Venezolano — Marcadores, Jugada a Jugada y Estadísticas",
  description:
    "Resultados y marcadores en vivo de la temporada de béisbol venezolano: jugada a jugada, alineaciones, box score, líderes individuales y tabla de posiciones.",
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
