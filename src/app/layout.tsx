import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { PwaManager } from "@/components/pwa/PwaManager";
import { GlobalVisitorPresence } from "@/components/analytics/GlobalVisitorPresence";
import { DomainLock } from "@/components/security/DomainLock";

export const viewport: Viewport = {
  themeColor: "#060a12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://enjuego.online"),
  title: {
    default: "Resultados en Vivo Hoy · Béisbol LVBP, MLB y Fútbol en Directo | En Juego",
    template: "%s | En Juego · Resultados en Vivo",
  },
  description:
    "Resultados en vivo hoy minuto a minuto: marcadores en directo de Béisbol (LVBP, MLB, Serie del Caribe, LIDOM, LMP) y Fútbol Europeo (Champions League, LaLiga, Premier League), pizarra jugada a jugada, tabla de posiciones y canales de TV.",
  applicationName: "En Juego · Resultados en Vivo",
  keywords: [
    "resultados en vivo",
    "resultados en vivo hoy",
    "marcadores en vivo",
    "resultados de hoy en vivo",
    "pizarra en vivo",
    "juegos de hoy en vivo",
    "resultados lvbp",
    "resultados lvbp en vivo",
    "lvbp en vivo",
    "lvbp hoy",
    "juegos de hoy lvbp",
    "resultados lvbp hoy",
    "pizarra lvbp",
    "beisbol venezolano en vivo",
    "resultados beisbol en vivo",
    "resultados mlb en vivo",
    "resultados futbol en vivo",
    "champions league en vivo",
    "laliga en vivo",
    "tabla de posiciones lvbp",
    "calendario lvbp",
    "leones del caracas",
    "navegantes del magallanes",
    "tiburones de la guaira",
    "aguilas del zulia",
    "cardenales de lara",
    "caribes de anzoategui",
    "bravos de margarita",
    "tigres de aragua",
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
    title: "Resultados en Vivo Hoy · Béisbol LVBP, MLB y Fútbol en Directo | En Juego",
    description:
      "Consulta los resultados en vivo hoy: pizarra de la LVBP, Grandes Ligas (MLB) y Fútbol Europeo en tiempo real, jugada a jugada, posiciones y canales de TV.",
    url: "https://enjuego.online",
    siteName: "En Juego · Resultados en Vivo",
    images: [
      {
        url: "https://enjuego.online/og/lvbp-default.png",
        width: 1200,
        height: 630,
        alt: "En Juego · Resultados en Vivo",
      },
    ],
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resultados en Vivo Hoy · Béisbol LVBP, MLB y Fútbol | En Juego",
    description:
      "Marcadores y resultados en vivo jugada a jugada de la LVBP, MLB y Fútbol Europeo, calendario de TV y tabla de posiciones.",
    images: ["https://enjuego.online/og/lvbp-default.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://enjuego.online/#website",
      "url": "https://enjuego.online",
      "name": "En Juego · Resultados en Vivo",
      "alternateName": [
        "Resultados en Vivo",
        "EnJuego",
        "En Juego Online",
        "Resultados LVBP en Vivo",
        "Marcadores en Vivo",
        "Pizarra LVBP"
      ],
      "description":
        "Portal líder de resultados en vivo y marcadores en directo de Béisbol (LVBP, MLB, LIDOM, LMP) y Fútbol Europeo (Champions League, LaLiga, Premier League). Jugada a jugada, posiciones y canales de TV.",
      "inLanguage": "es-VE",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://enjuego.online/resultados?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "SportsOrganization",
      "@id": "https://enjuego.online/#organization",
      "name": "En Juego · Resultados en Vivo",
      "url": "https://enjuego.online",
      "logo": "https://enjuego.online/logo.png",
      "sport": ["Baseball", "Soccer"],
      "description": "Resultados en vivo hoy en tiempo real de béisbol venezolano (LVBP), Grandes Ligas (MLB) y fútbol internacional."
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
        <link rel="preload" as="image" href="/logo.png" fetchPriority="high" />
        <link rel="preconnect" href="https://a.espncdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://a.espncdn.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-amber-400 selection:text-slate-950 transition-colors duration-300">
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-T0Z5L7TQJF"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-T0Z5L7TQJF', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <DomainLock />
        <GlobalVisitorPresence />
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
