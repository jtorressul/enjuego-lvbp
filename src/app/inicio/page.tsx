import React, { Suspense } from "react";
import { EnJuegoPortal } from "@/components/EnJuegoPortal";

export default function InicioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6fb]" />}>
      <EnJuegoPortal initialSection="home" />
    </Suspense>
  );
}
