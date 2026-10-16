import React, { Suspense } from "react";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";

export default async function JuegoQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; game?: string }>;
}) {
  const { id, game } = await searchParams;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="juego" initialGameId={id || game} />
    </Suspense>
  );
}
