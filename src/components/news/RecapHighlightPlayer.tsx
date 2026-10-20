"use client";

import React, { useEffect, useState } from "react";
import type { YoutubeHighlight } from "@/lib/youtube-highlight";
import { ExternalLink, Video } from "lucide-react";

export function RecapHighlightPlayer({
  initialHighlight,
  query,
}: {
  initialHighlight?: YoutubeHighlight | null;
  query: {
    id: string;
    date: string;
    awayName: string;
    homeName: string;
    awayNick: string;
    homeNick: string;
  };
}) {
  const [highlight, setHighlight] = useState<YoutubeHighlight | null | undefined>(
    initialHighlight
  );
  const [loading, setLoading] = useState(!initialHighlight);

  useEffect(() => {
    if (initialHighlight) {
      setHighlight(initialHighlight);
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          id: query.id,
          date: query.date,
          away: query.awayName,
          home: query.homeName,
          awayNick: query.awayNick,
          homeNick: query.homeNick,
        });
        const res = await fetch(`/api/highlight?${params.toString()}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (active) {
          setHighlight(data.highlight || null);
        }
      } catch {
        if (active) setHighlight(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [initialHighlight, query.id, query.date, query.awayName, query.homeName, query.awayNick, query.homeNick]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-900/5 p-8 text-center animate-pulse">
        <Video className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-xs font-bold text-slate-500">Buscando resumen oficial de BeisbolPlay...</p>
      </div>
    );
  }

  if (highlight) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="aspect-video bg-slate-950">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${highlight.videoId}?rel=0&modestbranding=1`}
            title={highlight.title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black text-slate-950">{highlight.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {highlight.author} · Resumen oficial LVBP
            </p>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${highlight.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
          >
            <span>Ver en YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>
    );
  }

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${query.awayNick} vs ${query.homeNick} LVBP resumen`
  )}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
          <Video className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-black text-slate-900">Resumen en video de la jornada</p>
          <p className="text-[11px] text-slate-500">
            BeisbolPlay suele publicar los resúmenes 30-60 min después del out 27.
          </p>
        </div>
      </div>
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-800 hover:bg-slate-100 shadow-2xs"
      >
        <span>Buscar en YouTube</span>
        <ExternalLink className="w-3 h-3 text-slate-400" />
      </a>
    </div>
  );
}
