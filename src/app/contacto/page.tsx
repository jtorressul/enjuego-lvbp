import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Contacto · En Juego",
  description: "Escribe al equipo de En Juego por correo para correcciones, publicidad o privacidad.",
};

export default function ContactoPage() {
  return (
    <InfoPage eyebrow="En Juego" title="Contacto">
      <p>
        Detrás de enjuego.online hay un equipo editorial. Respondemos correcciones de marcador,
        consultas de publicidad y solicitudes sobre datos personales.
      </p>
      <p>
        Correo:{" "}
        <a href="mailto:admin@enjuego.online" className="font-semibold text-amber-800 underline">
          admin@enjuego.online
        </a>
      </p>
      <form
        action="mailto:admin@enjuego.online"
        method="post"
        encType="text/plain"
        className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <label className="block text-xs font-bold text-slate-600">
          Nombre
          <input
            name="nombre"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Correo
          <input
            type="email"
            name="correo"
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Mensaje
          <textarea
            name="mensaje"
            required
            rows={5}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950"
        >
          Enviar por correo
        </button>
      </form>
      <p className="text-xs text-slate-500">
        También puedes leer{" "}
        <Link href="/quienes-somos" className="font-semibold text-amber-800 underline">
          quiénes somos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="font-semibold text-amber-800 underline">
          política de privacidad
        </Link>
        .
      </p>
    </InfoPage>
  );
}
