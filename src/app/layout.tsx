import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaManager } from "@/components/pwa/PwaManager";

export const viewport: Viewport = {
  themeColor: "#060a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://enjuego.online"),
  title: {
    default: "Resultados LVBP Hoy en Vivo · Pizarra y Béisbol Venezolano | En Juego",
    template: "%s | En Juego · Béisbol Venezolano",
  },
  description:
    "Resultados y marcadores en vivo de la LVBP: pizarra jugada a jugada, juegos de hoy, tabla de posiciones, canales de TV en vivo (Venevisión, Televen, IVC, 1Base) y highlights en video.",
  applicationName: "En Juego",
  keywords: [
    "resultados lvbp",
    "lvbp",
    "lvbp hoy",
    "juegos de hoy lvbp",
    "resultados lvbp hoy",
    "pizarra lvbp",
    "beisbol venezolano",
    "beisbol venezolano en vivo",
    "marcadores lvbp",
    "tabla de posiciones lvbp",
    "posiciones lvbp",
    "calendario lvbp",
    "canales transmite beisbol venezolano",
    "leones del caracas",
    "navegantes del magallanes",
    "tiburones de la guaira",
    "aguilas del zulia",
    "cardenales de lara",
    "caribes de anzoategui",
    "bravos de margarita",
    "tigres de aragua",
    "highlights lvbp",
    "en juego",
    "enjuego online",
  ],
  authors: [{ name: "En Juego Online", url: "https://enjuego.online" }],
  creator: "En Juego",
  publisher: "En Juego",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "Resultados LVBP Hoy en Vivo · Pizarra y Béisbol Venezolano | En Juego",
    description:
      "Sigue la LVBP en tiempo real: marcadores en vivo, jugada a jugada, estadísticas, transmisiones de televisión abierta y cable, tabla de posiciones y resúmenes en video.",
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
    title: "Resultados LVBP Hoy en Vivo · Pizarra y Marcadores | En Juego",
    description:
      "Marcadores jugada a jugada, calendario de canales de TV, tabla de posiciones y highlights en video del béisbol venezolano.",
    images: ["/logo.png"],
  },
  other: {
    coinzilla: "fc345bee396a9722c44693ef89327997",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://enjuego.online/#website",
      "url": "https://enjuego.online",
      "name": "En Juego · Béisbol Venezolano",
      "alternateName": [
        "EnJuego",
        "En Juego Online",
        "LVBP en vivo",
        "Resultados LVBP",
        "Pizarra LVBP"
      ],
      "description":
        "Portal líder de marcadores y resultados de la Liga Venezolana de Béisbol Profesional (LVBP) y Grandes Ligas (MLB). Jugada a jugada, transmisiones de TV y highlights en video.",
      "inLanguage": "es-VE"
    },
    {
      "@type": "SportsOrganization",
      "@id": "https://enjuego.online/#organization",
      "name": "En Juego",
      "url": "https://enjuego.online",
      "logo": "https://enjuego.online/logo.png",
      "sport": "Baseball",
      "description": "Cobertura en tiempo real del béisbol venezolano e internacional."
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light">
      <head>
        <meta name="coinzilla" content="fc345bee396a9722c44693ef89327997" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8181027493659485"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-amber-400 selection:text-slate-950 transition-colors duration-300">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
