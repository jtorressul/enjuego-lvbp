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

  // Respuestas honestas: EnJuego NO transmite video. Solo ofrece pizarra, jugada a jugada,
  // estadisticas y la guia de donde ver/escuchar cada juego por vias oficiales.
  const faqs = isSoccer
    ? [
        {
          q: "¿Dónde ver la Champions League hoy por TV y streaming?",
          a: "En Venezuela y buena parte de Latinoamérica la UEFA Champions League se transmite por los canales y plataformas con derechos oficiales (principalmente ESPN y Disney+). La disponibilidad puede variar según el país y el partido, así que conviene confirmar en la guía de tu operador. EnJuego.online no transmite video: ofrece el marcador en vivo, goles, tarjetas, alineaciones y estadísticas de cada partido.",
        },
        {
          q: "¿Qué canales transmiten la Liga FUTVE en Venezuela?",
          a: "La Liga FUTVE se transmite por los canales y plataformas con los derechos de la temporada, que pueden cambiar de un año a otro. Te recomendamos revisar los anuncios oficiales de la liga. En EnJuego puedes consultar resultados en tiempo real, alineaciones y la tabla de clasificación.",
        },
        {
          q: "¿Dónde ver LaLiga de España, Premier League y Serie A?",
          a: "Cada liga tiene sus propios derechos de transmisión por país (por ejemplo ESPN, Disney+ o DSports en Latinoamérica). Consulta la programación de tu operador para el partido que quieres ver. En EnJuego.online tienes el minuto a minuto, alineaciones confirmadas y goleadores en directo de las grandes ligas europeas.",
        },
        {
          q: "¿Puedo ver los partidos en video en EnJuego?",
          a: "No. EnJuego.online no transmite ni enlaza señales de video. Lo que ofrecemos gratis es el seguimiento en vivo: marcador, eventos del partido (goles, tarjetas, cambios), estadísticas y tablas, sin registro ni descargas. Para ver el video usa los canales o plataformas oficiales de tu país.",
        },
      ]
    : [
        {
          q: "¿Dónde ver la LVBP hoy gratis por señal abierta?",
          a: "En Venezuela algunos juegos de la LVBP se transmiten en televisión abierta gratuita (por ejemplo Televen o Venevisión), según la programación de cada día. En la ficha de cada juego en EnJuego.online indicamos los canales anunciados para ese partido. Para ver todos los juegos por internet, la plataforma de streaming oficial es BeisbolPlay (de pago).",
        },
        {
          q: "¿Puedo ver los juegos en video en EnJuego?",
          a: "No. EnJuego.online no transmite ni enlaza señales de video. Lo que ofrecemos gratis es la pizarra en vivo jugada a jugada, el boxscore, la tabla de posiciones, el calendario y la guía de canales y emisoras de cada juego. Para ver el video usa la TV o BeisbolPlay, y para escucharlo, la radio oficial de cada equipo.",
        },
        {
          q: "¿Qué canales transmiten el béisbol venezolano en cable y TV paga?",
          a: "Por cable y satélite, los juegos de la LVBP suelen transmitirse por canales como IVC, ByM Sport y 1Baseball Network, según la jornada. Los canales exactos de cada partido aparecen en la cartelera diaria de EnJuego.",
        },
        {
          q: "¿Cómo escuchar los juegos de la LVBP por radio gratis?",
          a: "Cada equipo tiene su circuito radial oficial, que transmite gratis por FM/AM en su región y, en la mayoría de los casos, también por streaming en la web de la emisora. En la ficha de cada juego en EnJuego.online encontrarás la emisora de cada equipo.",
        },
        {
          q: "¿A qué hora se juegan los partidos de la LVBP en España e Italia?",
          a: "En horario de invierno (de finales de octubre a finales de marzo) España peninsular e Italia van 5 horas por delante de Venezuela, y 6 horas en horario de verano. Un juego de las 7:00 PM de Caracas empieza a la medianoche en Madrid o Roma en invierno (1:00 AM en verano). En Canarias es una hora menos. En EnJuego.online puedes seguir la pizarra en vivo o revisar los resultados y boxscores completos al despertar.",
        },
        {
          q: "¿Cómo seguir la LVBP desde España, Italia y el exterior?",
          a: "Fuera de Venezuela la vía oficial para ver los juegos por internet es BeisbolPlay, que tiene cobertura internacional. Muchas emisoras de los equipos también transmiten por streaming, aunque la disponibilidad puede variar. Y en EnJuego.online puedes seguir gratis la pizarra jugada a jugada desde cualquier país.",
        },
        {
          q: "¿Dónde ver los juegos de Grandes Ligas (MLB) hoy?",
          a: "La MLB se transmite por los canales con derechos en cada país (en Latinoamérica, principalmente ESPN y Disney+) y por la plataforma oficial MLB.TV. En EnJuego.online sigues cada jugada, los resultados y la postemporada al instante.",
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
                : "¿Dónde ver la LVBP hoy? Canales de TV, streaming oficial y radio"}
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
                  Algunos juegos se ven sin suscripción por señal abierta (por ejemplo{" "}
                  <strong>Televen</strong> o <strong>Venevisión</strong>), según la programación del
                  día. Por cable y satélite suelen transmitir <strong>IVC</strong>,{" "}
                  <strong>ByM Sport</strong> y <strong>1Baseball Network</strong>. La plataforma
                  oficial de streaming es <strong>BeisbolPlay</strong>. Los canales de cada juego
                  aparecen en su ficha.
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
                  Si no tienes la señal de TV, en <strong>EnJuego.online</strong> puedes seguir gratis
                  el marcador minuto a minuto con goles, tarjetas, cambios, estadísticas y
                  alineaciones desde tu teléfono o computadora (sin video).
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

          {!isSoccer && (
            <div className="sm:col-span-2 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 sm:p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-950 font-black text-xs sm:text-sm">
                <span className="text-base">🌍</span>
                <span>Horarios en España, Italia y Europa (+5 horas en invierno · +6 en verano)</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Si estás en <strong>España</strong> (Madrid, Barcelona, Valencia) o en <strong>Italia</strong> (Roma, Milán, Nápoles), un juego de las <strong>7:00 PM (Venezuela)</strong> empieza a la <strong>medianoche</strong> en horario de invierno y a la <strong>1:00 AM</strong> en horario de verano (una hora menos en Canarias). Puedes seguir la pizarra en vivo durante la noche o revisar los resultados finales y boxscores al despertar en <strong>EnJuego.online</strong>.
              </p>
            </div>
          )}
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
