import React, { Suspense } from "react";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";

export const dynamic = "force-dynamic";

export default function ResultadosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="resultados" />
    </Suspense>
  );
}
