import Link from "next/link";
import type { EditorialArticle } from "@/lib/sqlite-store";

const CATEGORY_COLORS: Record<string, string> = {
  Movimientos: "bg-rose-500/10 text-rose-600 border-rose-200",
  Récords: "bg-amber-500/10 text-amber-700 border-amber-200",
  Análisis: "bg-sky-500/10 text-sky-700 border-sky-200",
  LVBP: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

export function EditorialHeroCard({ article }: { article: EditorialArticle }) {
  const badgeClass =
    CATEGORY_COLORS[article.category] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:border-amber-300">
      <Link href={`/noticias/${article.id}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950 sm:aspect-[21/9]">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeClass}`}
              >
                {article.category}
              </span>
              <span className="text-xs text-slate-300">
                {article.author} · {new Date(article.publishedAt).toLocaleDateString("es-VE")}
              </span>
            </div>
            <h2 className="mt-2 text-xl sm:text-3xl font-black leading-tight text-white group-hover:text-amber-300 transition">
              {article.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-3xl">
              {article.excerpt}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function EditorialGridCard({ article }: { article: EditorialArticle }) {
  const badgeClass =
    CATEGORY_COLORS[article.category] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-amber-300">
      <Link href={`/noticias/${article.id}`} className="flex flex-col h-full">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs bg-white/90 ${badgeClass}`}
            >
              {article.category}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {new Date(article.publishedAt).toLocaleDateString("es-VE", {
                day: "numeric",
                month: "short",
              })}
            </p>
            <h3 className="mt-1 text-sm font-black leading-snug text-slate-950 group-hover:text-amber-600 transition">
              {article.title}
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
              {article.excerpt}
            </p>
          </div>
          <p className="mt-4 text-[11px] font-extrabold text-amber-700 group-hover:underline">
            Leer noticia completa →
          </p>
        </div>
      </Link>
    </article>
  );
}

export function EditorialArticleView({
  article,
  related = [],
}: {
  article: EditorialArticle;
  related?: EditorialArticle[];
}) {
  const shareText = encodeURIComponent(`${article.title} 👇`);
  const shareUrl = encodeURIComponent(`https://enjuego.online/noticias/${article.id}`);
  const twitterShareLink = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}&hashtags=LVBP,BeisbolVenezolano`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/noticias"
          className="inline-flex items-center gap-1 text-xs font-black text-slate-500 hover:text-slate-950 transition"
        >
          ← Volver a Noticias
        </Link>
        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-extrabold text-amber-800">
          {article.category}
        </span>
      </div>

      <header className="space-y-3">
        <h1 className="text-2xl sm:text-4xl font-black leading-tight text-slate-950">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="font-extrabold text-slate-800">{article.author}</span>
          <span>•</span>
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString("es-VE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>•</span>
          <span>Lectura de 2 min</span>
        </div>
      </header>

      {/* Featured Image */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 aspect-[16/9] sm:aspect-[21/9]">
        <img
          src={article.imageUrl}
          alt={article.title}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Quick Share to X button */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:px-5">
        <p className="text-xs font-bold text-slate-600">
          ¿Te gustó esta noticia? Compártela con los fanáticos:
        </p>
        <a
          href={twitterShareLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-black text-white hover:bg-slate-800 transition"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Compartir en X
        </a>
      </div>

      {/* Article Content */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-9 space-y-5 text-base sm:text-lg leading-relaxed text-slate-800">
        {article.content.map((paragraph, idx) => (
          <p key={idx} className={idx === 0 ? "font-medium text-slate-900" : ""}>
            {paragraph}
          </p>
        ))}

        <div className="mt-8 border-t border-slate-100 pt-5 text-xs text-slate-400">
          <p>
            Información y seguimiento en vivo de la Liga Venezolana de Béisbol Profesional (LVBP).
            {article.sourceUrl ? " Reporte con base en fuentes y notas de prensa oficiales." : ""}
          </p>
        </div>
      </div>

      {/* Related News */}
      {related.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-lg font-black text-slate-950">Más noticias de la LVBP</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {related.map((rel) => (
              <EditorialGridCard key={rel.id} article={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
