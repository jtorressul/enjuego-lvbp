import React, { Suspense } from "react";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";

export default async function EquiposPage({
  searchParams,
}: {
  searchParams?: Promise<{
    team?: string;
    equipo?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const teamSlug = sp.team || sp.equipo || sp[""];
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="equipos" initialTeamSlug={teamSlug} />
    </Suspense>
  );
}
