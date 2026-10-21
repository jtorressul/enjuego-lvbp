import { MetadataRoute } from "next";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { SOCCER_LEAGUES_LIST } from "@/lib/soccer-leagues";
import { fetchLvbpSchedule } from "@/lib/mlb-lvbp-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://enjuego.online";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/inicio`,
      lastModified: now,
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/resultados`,
      lastModified: now,
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/futbol`,
      lastModified: now,
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/posiciones`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calendario`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/noticias`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lideres`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/teams`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/quienes-somos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // League result & soccer competition routes
  const leagueRoutes: MetadataRoute.Sitemap = [
    ...["lvbp", "mlb", "lidom", "lmp"].map((liga) => ({
      url: `${baseUrl}/resultados?liga=${liga}`,
      lastModified: now,
      changeFrequency: "always" as const,
      priority: 0.95,
    })),
    ...SOCCER_LEAGUES_LIST.map((lg) => ({
      url: `${baseUrl}/futbol?liga=${lg.id}`,
      lastModified: now,
      changeFrequency: "always" as const,
      priority: 0.95,
    })),
  ];

  // Team pages for all 8 LVBP franchises
  const teamRoutes: MetadataRoute.Sitemap = Object.values(LVBP_TEAMS).map((team) => ({
    url: `${baseUrl}/teams/${team.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Live, upcoming, and finished game Gameday & Recap URLs
  let gameRoutes: MetadataRoute.Sitemap = [];
  try {
    const games = await fetchLvbpSchedule("2026");
    gameRoutes = games.slice(0, 60).flatMap((g) => [
      {
        url: `${baseUrl}/juego/${g.id}`,
        lastModified: now,
        changeFrequency: (g.status === "IN_PROGRESS" ? "always" : "daily") as "always" | "daily",
        priority: g.status === "IN_PROGRESS" ? 0.95 : 0.8,
      },
      ...(g.status === "FINISHED"
        ? [
            {
              url: `${baseUrl}/noticias/${g.id}`,
              lastModified: now,
              changeFrequency: "weekly" as const,
              priority: 0.7,
            },
          ]
        : []),
    ]);
  } catch {}

  return [...staticRoutes, ...leagueRoutes, ...teamRoutes, ...gameRoutes];
}
