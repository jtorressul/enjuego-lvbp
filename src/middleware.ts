import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SOCCER_ALIASES: Record<string, string> = {
  futve: "futve",
  champions: "champions",
  "uefa.champions": "champions",
  laliga: "laliga",
  "esp.1": "laliga",
  premier: "premier",
  "eng.1": "premier",
  "serie-a": "serie-a",
  "ita.1": "serie-a",
  bundesliga: "bundesliga",
  "ger.1": "bundesliga",
  "ligue-1": "ligue-1",
  "fra.1": "ligue-1",
};

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const rawLiga = searchParams.get("liga") || searchParams.get("league");

  if (!rawLiga) {
    return NextResponse.next();
  }

  const liga = rawLiga.toLowerCase().trim();

  // 1. Baseball sections: /resultados, /posiciones, /calendario
  if (pathname === "/resultados" || pathname === "/posiciones" || pathname === "/calendario") {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("liga");
    nextParams.delete("league");
    const query = nextParams.toString();
    const dest = liga === "lvbp" ? pathname : `${pathname}/${liga}`;
    const url = new URL(query ? `${dest}?${query}` : dest, request.url);
    return NextResponse.redirect(url, 301);
  }

  // 2. Soccer section: /futbol
  if (pathname === "/futbol") {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("liga");
    nextParams.delete("league");
    const query = nextParams.toString();
    const slug = SOCCER_ALIASES[liga] || liga;
    const dest = `/futbol/${slug}`;
    const url = new URL(query ? `${dest}?${query}` : dest, request.url);
    return NextResponse.redirect(url, 301);
  }

  // 3. Inicio & Lideres default cleanup
  if ((pathname === "/inicio" || pathname === "/lideres") && liga === "lvbp") {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("liga");
    nextParams.delete("league");
    const query = nextParams.toString();
    const url = new URL(query ? `${pathname}?${query}` : pathname, request.url);
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/resultados", "/posiciones", "/calendario", "/futbol", "/inicio", "/lideres"],
};
