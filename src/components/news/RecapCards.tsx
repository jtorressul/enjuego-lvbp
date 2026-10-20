import Link from "next/link";
import type { GameRecap, RecapSide, RecapStanding } from "@/lib/game-recaps";

function TeamMark({ side, won, align = "start" }: { side: RecapSide; won: boolean; align?: "start" | "end" }) {
  return (
    <div className={`flex items-center gap-2.5 min-w-0 flex-1 ${align === "end" ? "flex-row-reverse text-right" : ""}`}>
      <img src={side.logo} alt="" className="w-11 h-11 sm:w-14 sm:h-14 object-contain shrink-0" />
      <div className="min-w-0">
        <p className={`truncate text-sm sm:text-base font-black ${won ? "text-white" : "text-slate-300"}`}>
          {side.nick}
        </p>
        <p className={`text-2xl sm:text-4xl font-black tabular-nums leading-none ${won ? "text-amber-300" : "text-white"}`}>
          {side.score}
        </p>
      </div>
    </div>
  );
}

function LightTeam({ side, won, align = "start" }: { side: RecapSide; won: boolean; align?: "start" | "end" }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 flex-1 ${align === "end" ? "flex-row-reverse text-right" : ""}`}>
      <img src={side.logo} alt="" className="w-9 h-9 object-contain shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-slate-950">{side.nick}</p>
        <p className={`text-xl font-black tabular-nums leading-none ${won ? "text-slate-950" : "text-slate-400"}`}>
          {side.score}
        </p>
      </div>
    </div>
  );
}

function StandingChip({ standing, logo }: { standing: RecapStanding; logo: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-3">
      <img src={logo} alt="" className="w-10 h-10 object-contain" />
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
          {standing.leading ? "Líder" : `${standing.place}° lugar`}
        </p>
        <p className="text-sm font-black text-slate-950">{standing.name}</p>
        <p className="text-xs text-slate-500">
          {standing.wins}-{standing.losses}
          {standing.leading ? " · primero" : ` · a ${standing.behind} del primero`}
        </p>
      </div>
    </div>
  );
}

export function FeaturedRecap({ recap }: { recap: GameRecap }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-md">
      <div className="px-5 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
          <span>Final de la jornada</span>
          <span className="text-slate-400">{recap.dateLabel}</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <TeamMark side={recap.away} won={recap.winnerSide === "away"} />
          <div className="shrink-0 text-center px-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">vs</p>
          </div>
          <TeamMark side={recap.home} won={recap.winnerSide === "home"} align="end" />
        </div>
        <h2 className="mt-6 text-xl sm:text-3xl font-black leading-tight">{recap.headline}</h2>
        <p className="mt-2 text-sm text-slate-300 max-w-3xl">{recap.paragraphs[0]}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/noticias/${recap.id}`}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950"
          >
            Leer el resumen
          </Link>
          <Link
            href={`/juego/${recap.id}`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-extrabold text-white"
          >
            Ver el juego
          </Link>
        </div>
      </div>
    </article>
  );
}

export function RecapCard({ recap }: { recap: GameRecap }) {
  return (
    <Link
      href={`/noticias/${recap.id}`}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-amber-300"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{recap.venue || "LVBP"}</p>
      <div className="mt-3 flex items-center gap-2">
        <LightTeam side={recap.away} won={recap.winnerSide === "away"} />
        <LightTeam side={recap.home} won={recap.winnerSide === "home"} align="end" />
      </div>
      <h3 className="mt-3 text-sm font-black text-slate-950 leading-snug">{recap.headline}</h3>
      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{recap.paragraphs[0]}</p>
      <p className="mt-3 text-[11px] font-extrabold text-amber-800">
        {recap.winnerPitcher ? `Ganó ${recap.winnerPitcher}` : "Ver resumen ›"}
      </p>
    </Link>
  );
}

export function RecapArticle({ recap, more }: { recap: GameRecap; more: GameRecap[] }) {
  const winner = recap.winnerSide === "away" ? recap.away : recap.home;
  const loser = recap.winnerSide === "away" ? recap.home : recap.away;
  return (
    <div className="space-y-5">
      <Link href="/noticias" className="text-xs font-extrabold text-slate-500 hover:text-slate-950">
        ← Noticias
      </Link>
      <article className="overflow-hidden rounded-3xl bg-slate-950 text-white">
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
            {recap.dateLabel}
            {recap.venue ? ` · ${recap.venue}` : ""}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <TeamMark side={recap.away} won={recap.winnerSide === "away"} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">final</span>
            <TeamMark side={recap.home} won={recap.winnerSide === "home"} align="end" />
          </div>
          <h1 className="mt-6 text-2xl sm:text-4xl font-black leading-tight">{recap.headline}</h1>
          <p className="mt-2 text-sm text-slate-300">Definido {recap.marginLabel}.</p>
        </div>
      </article>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Hits visita", String(recap.away.hits)],
          ["Hits casa", String(recap.home.hits)],
          ["Errores", `${recap.away.errors}-${recap.home.errors}`],
          ["Margen", recap.marginLabel.replace("por ", "")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-black text-slate-950 capitalize">{value}</p>
          </div>
        ))}
      </div>

      {(recap.winnerPitcher || recap.loserPitcher || recap.savePitcher) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Victoria", recap.winnerPitcher, "bg-emerald-50 text-emerald-800"],
            ["Derrota", recap.loserPitcher, "bg-rose-50 text-rose-800"],
            ["Salvado", recap.savePitcher, "bg-sky-50 text-sky-800"],
          ]
            .filter(([, name]) => name)
            .map(([label, name, tone]) => (
              <div key={label} className={`rounded-2xl px-4 py-3 ${tone}`}>
                <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">{label}</p>
                <p className="text-sm font-black">{name}</p>
              </div>
            ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {recap.winnerStanding ? <StandingChip standing={recap.winnerStanding} logo={winner.logo} /> : null}
        {recap.loserStanding ? <StandingChip standing={recap.loserStanding} logo={loser.logo} /> : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 space-y-4 text-sm sm:text-base leading-relaxed text-slate-700">
        {recap.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <Link
          href={`/juego/${recap.id}`}
          className="inline-flex rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950"
        >
          Abrir el gameday
        </Link>
      </div>

      {more.length > 0 ? (
        <section>
          <h2 className="text-sm font-black text-slate-950">Más de esa jornada</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {more.map((item) => (
              <RecapCard key={item.id} recap={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
