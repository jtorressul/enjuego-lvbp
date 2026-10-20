import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = {
  title: "Política de privacidad · En Juego",
  description:
    "Cómo En Juego usa cookies, incluida la publicidad de Google AdSense, y qué datos guarda la cuenta de aficionado.",
};

export default function PrivacidadPage() {
  return (
    <InfoPage eyebrow="En Juego" title="Política de privacidad">
      <p>
        En Juego (enjuego.online) es un portal informativo de béisbol venezolano. Esta página
        explica qué datos se usan en el sitio y para qué.
      </p>
      <h2 className="text-base font-black text-slate-950 pt-2">Cookies de publicidad</h2>
      <p>
        Se utilizan cookies de terceros como Google AdSense para personalizar anuncios. Google y
        sus socios pueden usar cookies para mostrar anuncios según visitas anteriores a este sitio
        y a otros sitios de internet. Esos anuncios ayudan a mantener el marcador, el calendario y
        las estadísticas disponibles sin costo para el aficionado.
      </p>
      <p>
        Puedes desactivar la personalización de anuncios en la{" "}
        <a
          href="https://adssettings.google.com"
          className="font-semibold text-amber-800 underline"
          rel="noopener noreferrer"
        >
          configuración de anuncios de Google
        </a>
        . También puedes rechazar cookies de terceros desde el navegador.
      </p>
      <h2 className="text-base font-black text-slate-950 pt-2">Datos que guarda el sitio</h2>
      <p>
        Si creas una cuenta de aficionado, guardamos el nombre, el usuario y el equipo favorito
        para mostrar tu perfil en La Grada. El sitio recuerda en este navegador si ya iniciaste
        sesión y si instalaste la aplicación. No pedimos documentos de identidad ni datos bancarios.
      </p>
      <p>
        Las visitas se usan de forma agregada para saber qué secciones se consultan (inicio,
        calendario, posiciones, líderes o un juego). No vendemos listas de usuarios.
      </p>
      <h2 className="text-base font-black text-slate-950 pt-2">Contacto</h2>
      <p>
        Para pedir acceso, corrección o eliminación de los datos de tu cuenta, escribe a{" "}
        <a href="mailto:admin@enjuego.online" className="font-semibold text-amber-800 underline">
          admin@enjuego.online
        </a>
        .
      </p>
      <p className="text-xs text-slate-500">Última actualización: 20 de octubre de 2026.</p>
    </InfoPage>
  );
}
