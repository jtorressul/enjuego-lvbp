import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#060a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://enjuego.online"),
  title: "En Juego · Béisbol Venezolano — Marcadores, Jugada a Jugada y Estadísticas",
  description:
    "Resultados y marcadores en vivo de la temporada de béisbol venezolano: jugada a jugada, alineaciones, box score, canales de TV en vivo, líderes individuales y tabla de posiciones.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/icon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "En Juego · Béisbol Venezolano en Vivo",
    description:
      "Sigue la LVBP en tiempo real: marcadores en vivo, jugada a jugada, estadísticas, transmisiones de televisión y la comunidad de fanáticos.",
    url: "https://enjuego.online",
    siteName: "En Juego · Béisbol Venezolano",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 300,
        alt: "En Juego · Béisbol Venezolano",
      },
    ],
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "En Juego · Béisbol Venezolano en Vivo",
    description:
      "Marcadores, jugada a jugada, canales de TV y posiciones del béisbol venezolano.",
    images: ["/logo.png"],
  },
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
