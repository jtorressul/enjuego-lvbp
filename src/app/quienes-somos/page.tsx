import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Quiénes somos · En Juego",
  description:
    "En Juego es un portal independiente de marcadores, calendario, posiciones y líderes del béisbol venezolano.",
};

export default function QuienesSomosPage() {
  return (
    <InfoPage eyebrow="El proyecto" title="Quiénes somos">
      <p>
        En Juego lo mantiene un aficionado en Venezuela. El sitio muestra el marcador, la jornada
        del día, el calendario de la temporada, la tabla de posiciones y los líderes de bateo y
        pitcheo de la Liga Venezolana de Béisbol Profesional.
      </p>
      <p>
        El sitio es independiente. No está afiliado, autorizado ni patrocinado por la LVBP, por
        Major League Baseball ni por los clubes. Los nombres y logotipos se usan solo para
        identificar los juegos.
      </p>
      <p>
        La temporada se juega de noche, pero el calendario, la tabla y los líderes de la
        temporada quedan publicados durante el día para consultar la clasificación y el programa
        aunque no haya un juego en vivo.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <Link href="/calendario" className="font-semibold text-amber-800 underline">
            Calendario
          </Link>{" "}
          de la temporada 2026-2027.
        </li>
        <li>
          <Link href="/posiciones" className="font-semibold text-amber-800 underline">
            Tabla de posiciones
          </Link>{" "}
          rumbo al round robin.
        </li>
        <li>
          <Link href="/lideres" className="font-semibold text-amber-800 underline">
            Líderes de bateo y pitcheo
          </Link>
          .
        </li>
      </ul>
      <p>
        Si quieres escribir, usa la página de{" "}
        <Link href="/contacto" className="font-semibold text-amber-800 underline">
          contacto
        </Link>
        .
      </p>
    </InfoPage>
  );
}
