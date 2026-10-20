import { MetadataRoute } from "next";
import { LVBP_TEAMS } from "@/lib/lvbp-teams";
import { fetchLvbpSchedule } from "@/lib/mlb-lvbp-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://enjuego.online";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/inicio`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/resultados`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/posiciones`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calendario`,
      lastModified: now,
      changeFrequency: "daily",
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

  // Team pages for all 8 LVBP franchises
  const teamRoutes: MetadataRoute.Sitemap = Object.values(LVBP_TEAMS).map((team) => ({
    url: `${baseUrl}/teams/${team.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Finished game recaps & highlights URLs
  let recapRoutes: MetadataRoute.Sitemap = [];
  try {
    const games = await fetchLvbpSchedule("2026");
    recapRoutes = games
      .filter((g) => g.status === "FINISHED")
      .slice(0, 40)
      .map((g) => ({
        url: `${baseUrl}/noticias/${g.id}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      }));
  } catch {}

  return [...staticRoutes, ...teamRoutes, ...recapRoutes];
}
