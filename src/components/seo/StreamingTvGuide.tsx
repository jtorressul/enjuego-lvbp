"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Tv, Radio, HelpCircle, ChevronDown, Sparkles, ShieldCheck } from "lucide-react";

interface StreamingTvGuideProps {
  sport?: "baseball" | "soccer";
  leagueId?: string;
}

export function StreamingTvGuide({ sport = "baseball", leagueId = "lvbp" }: StreamingTvGuideProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isSoccer = sport === "soccer";

  const faqs = isSoccer
    ? [
        {
          q: "¿Dónde ver la Champions League hoy gratis por internet y televisión?",
          a: "En Venezuela y Latinoamérica, la UEFA Champions League se transmite oficialmente por ESPN y Disney+. En televisión abierta nacional, Televen transmite partidos seleccionados de la jornada sin costo. Para seguir el relato minuto a minuto, jugadas clave, mapa de tiros xG y estadísticas en vivo segundo a segundo sin costo, puedes seguir la cobertura completa en directo en EnJuego.online.",
        },
        {
          q: "¿Qué canales transmiten la Liga FUTVE en Venezuela?",
          a: "La Liga FUTVE se transmite en señal abierta por Televen y a través del canal oficial de YouTube de la Liga FUTVE y GolTV Play en streaming. En EnJuego puedes consultar resultados en tiempo real, alineaciones y tabla de clasificación actualizada al instante.",
        },
        {
          q: "¿Dónde ver LaLiga de España, Premier League y Serie A?",
          a: "La Premier League y la Serie A se transmiten por ESPN y Disney+. LaLiga española se transmite por DSports (DIRECTV) y Disney+. En EnJuego.online cuentas con la pizarra minuto a minuto con alineaciones confirmadas y goleadores en directo de las 5 grandes ligas europeas.",
        },
        {
          q: "¿Cómo seguir los partidos de fútbol en vivo si no tengo televisión por cable?",
          a: "Puedes seguir cada partido en vivo gratis en EnJuego.online a través de nuestra cobertura jugada a jugada con relatos en directo, tiempos adicionales, sustituciones, tarjetas y estadísticas oficiales sin necesidad de suscripción ni descargas.",
        },
      ]
    : [
        {
          q: "¿Dónde ver la LVBP hoy gratis por internet y señal abierta?",
          a: "Los juegos de la Liga Venezolana de Béisbol Profesional (LVBP) se transmiten en televisión abierta gratuita en Venezuela a través de Televen (Canal 10), Venevisión (Canal 4) y TVES (Canal 2), según la programación rotativa del día. En streaming digital oficial, la plataforma BeisbolPlay transmite el 100% de los encuentros. Además, en EnJuego.online puedes seguir la pizarra en vivo jugada a jugada con boxscores, pitcheo a pitcheo y corredores en base al segundo.",
        },
        {
          q: "¿Qué canales transmiten el béisbol venezolano en cable y TV paga?",
          a: "En televisión por cable y satélite, la LVBP es transmitida por IVC Networks, ByM Sport (disponible en Inter y SimpleTV) y 1Baseball Network. Cada juego cuenta con la señal especificada en la cartelera diaria de EnJuego.",
        },
        {
          q: "¿Cómo escuchar los juegos de la LVBP por radio en vivo gratis?",
          a: "Todos los equipos cuentan con circuitos radiales oficiales gratuitos que transmiten en vivo por radio FM/AM y streaming online: Leones del Caracas (Unión Radio 90.3 FM), Navegantes del Magallanes (La Mega 107.3 FM / Unión Radio), Tiburones de La Guaira (Onda 107.9 FM), Cardenales de Lara (Fiesta 89.1 FM), Águilas del Zulia (Urbe 96.3 FM), Tigres de Aragua (Aragüeña 99.5 FM), Caribes de Anzoátegui (Éxitos 95.3 FM) y Bravos de Margarita (Caribe 93.5 FM).",
        },
        {
          q: "¿Dónde ver los juegos de Grandes Ligas (MLB) hoy?",
          a: "En Venezuela y Latinoamérica, la MLB (Grandes Ligas) se transmite a través de ESPN, Disney+, IVC y MLB.TV. En EnJuego.online sigues cada jugada, cuadrangulares y estadísticas de bateadores venezolanos en las Mayores al instante.",
        },
      ];

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <>
      {/* Schema JSON-LD para Featured Snippets de Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <section
        aria-label="Guía Oficial de Transmisión y Canales de TV"
        className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-2xs space-y-5"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}
      >
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Guía de Canales y Señales en Vivo
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Oficial y Seguro
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">
              {isSoccer
                ? "¿Dónde ver la Champions League, FUTVE y Fútbol Europeo Hoy en Vivo?"
                : "¿Dónde ver la LVBP y Juegos de Hoy Gratis por Internet y TV en Venezuela?"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isSoccer
                ? "Consulta los canales de televisión abierta, plataformas de streaming autorizadas y diales para seguir cada partido."
                : "Señales de televisión abierta, canales por cable (ByM Sport, IVC), streaming oficial y circuitos de radio en directo."}
            </p>
          </div>
        </div>

        {/* Tarjetas de Medios de Transmisión */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: Televisión y Streaming */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-sm">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-300 flex items-center justify-center text-amber-800">
                <Tv className="w-4 h-4 text-amber-600" />
              </div>
              <span>{isSoccer ? "Televisión Abierta y Cable" : "Señal Abierta y TV por Cable"}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isSoccer ? (
                <>
                  En Venezuela, <strong>Televen</strong> transmite partidos oficiales de la UEFA
                  Champions League y Liga FUTVE sin costo en señal abierta. En televisión paga y
                  streaming por suscripción, la cobertura completa está a cargo de{" "}
                  <strong>ESPN</strong> y <strong>Disney+</strong> en toda Latinoamérica.
                </>
              ) : (
                <>
                  Puedes ver los juegos sin suscripción por <strong>Televen</strong> (Canal 10),{" "}
                  <strong>Venevisión</strong> (Canal 4) y <strong>TVES</strong> (Canal 2). Por
                  cable y satélite transmiten <strong>IVC</strong>,{" "}
                  <strong>ByM Sport</strong> (Inter/SimpleTV) y <strong>1Baseball Network</strong>.
                  La plataforma oficial de streaming en vivo es <strong>BeisbolPlay</strong>.
                </>
              )}
            </p>
          </div>

          {/* Card 2: Radio Oficial y Pizarra EnJuego */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs sm:text-sm">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-300 flex items-center justify-center text-sky-800">
                <Radio className="w-4 h-4 text-sky-600" />
              </div>
              <span>{isSoccer ? "Pizarra en Vivo Segundo a Segundo" : "Circuitos Radiales Oficiales"}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isSoccer ? (
                <>
                  Si no cuentas con señal de TV, en <strong>EnJuego.online</strong> dispones de la
                  pizarra en vivo minuto a minuto con relatos, estadísticas avanzadas de tiros,
                  posesión y formaciones en cancha 100% gratis en tu teléfono o computadora.
                </>
              ) : (
                <>
                  Escucha las narraciones oficiales gratuitas a través de los circuitos de{" "}
                  <strong>Unión Radio</strong>, <strong>La Mega</strong>, <strong>Onda</strong> y
                  las emisoras matrices de cada equipo en FM y web, mientras sigues la pizarra jugada
                  a jugada en <strong>EnJuego.online</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Sección FAQ Interactiva (Rich Snippets) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Preguntas Frecuentes sobre Transmisiones en Directo</span>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white transition-colors overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 p-3 text-left font-extrabold text-xs sm:text-sm text-slate-900 hover:text-amber-600 cursor-pointer transition select-none"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-amber-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100/80 bg-slate-50/50">
                      <p className="pt-2">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Enlaces Rápidos Internos para SEO */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
          <span className="text-slate-400 font-extrabold">Secciones recomendadas:</span>
          <Link href="/calendario" className="text-slate-700 hover:text-amber-600 hover:underline">
            Calendario y Horarios LVBP
          </Link>
          <span>·</span>
          <Link href="/resultados" className="text-slate-700 hover:text-amber-600 hover:underline">
            Resultados de Hoy en Vivo
          </Link>
          <span>·</span>
          <Link href="/posiciones" className="text-slate-700 hover:text-amber-600 hover:underline">
            Tabla de Posiciones
          </Link>
          <span>·</span>
          <Link href="/futbol" className="text-slate-700 hover:text-amber-600 hover:underline">
            Fútbol y Champions League
          </Link>
        </div>
      </section>
    </>
  );
}
