import React, { Suspense } from "react";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";

export default async function EquipoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="equipos" initialTeamSlug={slug} />
    </Suspense>
  );
}
