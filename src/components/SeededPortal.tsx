import { Suspense } from "react";
import { EnJuegoPortal, type NavSection } from "@/components/EnJuegoPortal";
import { loadLvbpPortalSeed } from "@/lib/portal-seed";

export async function SeededPortal({
  initialSection,
  initialTeamSlug,
  initialGameId,
}: {
  initialSection: NavSection;
  initialTeamSlug?: string;
  initialGameId?: string;
}) {
  const seed = await loadLvbpPortalSeed();
  const activeDate =
    [...new Set(seed.schedule.map((g) => g.date))].sort()[seed.dateIndex] || "";
  const gamesOfDay = seed.schedule
    .filter((g) => !activeDate || g.date === activeDate)
    .slice(0, 8);

  const liveSportsEventsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Resultados en Vivo Hoy · Béisbol LVBP, MLB y Fútbol en Directo | En Juego",
    description:
      "Marcadores y resultados en vivo hoy minuto a minuto de la LVBP, Grandes Ligas (MLB), Champions League y Fútbol Europeo en EnJuego.online.",
    itemListElement: gamesOfDay.map((g, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "SportsEvent",
        name: `${g.awayTeam.name} vs ${g.homeTeam.name} - Resultados en Vivo`,
        startDate: g.date,
        eventStatus:
          g.status === "IN_PROGRESS" || g.status === "FINISHED"
            ? "https://schema.org/EventScheduled"
            : "https://schema.org/EventScheduled",
        sport: "Baseball",
        location: {
          "@type": "Place",
          name: g.venue || "Estadio LVBP",
          address: g.venueCity || "Venezuela",
        },
        homeTeam: {
          "@type": "SportsTeam",
          name: g.homeTeam.name,
        },
        awayTeam: {
          "@type": "SportsTeam",
          name: g.awayTeam.name,
        },
        url: `https://enjuego.online/juego/${g.id}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(liveSportsEventsJsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
        <EnJuegoPortal
          initialSection={initialSection}
          initialTeamSlug={initialTeamSlug}
          initialGameId={initialGameId}
          initialSchedule={seed.schedule}
          initialStandings={seed.standings}
          initialLeaders={seed.leaders}
          initialDateIndex={seed.dateIndex}
          initialSoccerMatches={seed.soccerMatches}
        />
      </Suspense>
    </>
  );
}
