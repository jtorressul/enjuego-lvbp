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
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal
        initialSection={initialSection}
        initialTeamSlug={initialTeamSlug}
        initialGameId={initialGameId}
        initialSchedule={seed.schedule}
        initialStandings={seed.standings}
        initialLeaders={seed.leaders}
        initialDateIndex={seed.dateIndex}
      />
    </Suspense>
  );
}
