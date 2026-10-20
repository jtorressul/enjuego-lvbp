import type { ReactNode } from "react";
import Link from "next/link";
import { LVBP_OFFICIAL_LOGO } from "@/lib/lvbp-teams";

const LINKS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/calendario", label: "Calendario" },
  { href: "/posiciones", label: "Posiciones" },
  { href: "/lideres", label: "Líderes" },
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/contacto", label: "Contacto" },
  { href: "/privacidad", label: "Privacidad" },
];

export function InfoPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/inicio" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5">
              <img src={LVBP_OFFICIAL_LOGO} alt="" className="w-full h-full object-contain" />
            </span>
            <span className="font-black tracking-tight">EN JUEGO</span>
          </Link>
          <nav className="flex flex-wrap justify-end gap-3 text-xs font-semibold text-slate-500">
            <Link href="/contacto" className="hover:text-slate-900">
              Contacto
            </Link>
            <Link href="/privacidad" className="hover:text-slate-900">
              Privacidad
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600">{eyebrow}</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-8">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
