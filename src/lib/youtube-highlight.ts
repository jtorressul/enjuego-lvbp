export type YoutubeHighlight = {
  videoId: string;
  title: string;
  author: string;
};

type HighlightQuery = {
  id: string;
  date: string;
  awayName: string;
  homeName: string;
  awayNick: string;
  homeNick: string;
};

type Candidate = YoutubeHighlight & {
  published: string;
  length: string;
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const memory = new Map<string, { at: number; value: YoutubeHighlight | null }>();
const MEMORY_MS = 20 * 60 * 1000;

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function datePhrase(iso: string): string {
  const [, month, day] = iso.split("-");
  const monthName = MONTHS[(Number(month) || 1) - 1];
  return `${Number(day)} de ${monthName}`;
}

function lengthMinutes(length: string): number | null {
  const parts = length.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  return null;
}

function isRecent(published: string): boolean {
  const text = plain(published);
  if (/minuto|hora/.test(text)) return true;
  const days = text.match(/(\d+)\s*dia/);
  return Boolean(days && Number(days[1]) <= 2);
}

function teamKeywords(name: string, nick?: string): string[] {
  const raw = `${name || ""} ${nick || ""}`;
  return plain(raw)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !["para", "club", "beisbol", "base", "valencia", "barquisimeto"].includes(w));
}

function scoreCandidate(item: Candidate, query: HighlightQuery): number {
  const title = plain(item.title);
  const author = plain(item.author);
  const isBeisbolPlay = author.includes("beisbolplay");

  // Exclude non-summary videos
  if (/antesala|donde verlo|en vivo|play by play|audio y score|rueda de prensa|conferencia/.test(title)) {
    return -1;
  }

  // Check year: if title contains a different year than query.date, discard!
  const targetYear = query.date.split("-")[0];
  const titleYears = item.title.match(/\b(20\d\d)\b/g);
  if (titleYears && titleYears.length > 0 && !titleYears.includes(targetYear)) {
    return -1;
  }

  const awayKeywords = teamKeywords(query.awayName, query.awayNick);
  const homeKeywords = teamKeywords(query.homeName, query.homeNick);

  const awayHit = awayKeywords.some((w) => title.includes(w));
  const homeHit = homeKeywords.some((w) => title.includes(w));

  const dated = title.includes(plain(datePhrase(query.date)));
  const recent = isRecent(item.published);
  if (!dated && !recent) return -1;

  // We require either:
  // 1. Both teams mentioned + dated/recent
  // 2. Or official BeisbolPlay channel + at least one team mentioned + dated/recent
  if (!(awayHit && homeHit) && !(isBeisbolPlay && (awayHit || homeHit) && (dated || recent))) {
    return -1;
  }

  let score = 0;
  if (isBeisbolPlay) score += 20;
  if (titleYears && titleYears.includes(targetYear)) score += 15;
  if (awayHit && homeHit) score += 10;
  if (dated) score += 12;
  if (/resumen|highlight|mejores jugadas/.test(title)) score += 8;

  const minutes = lengthMinutes(item.length);
  if (minutes != null && minutes >= 3 && minutes <= 30) score += 4;
  if (minutes != null && minutes > 45) score -= 10;

  return score;
}

function textOf(node: { runs?: { text?: string }[]; simpleText?: string } | undefined): string {
  if (!node) return "";
  if (node.simpleText) return node.simpleText;
  return (node.runs || []).map((run) => run.text || "").join("");
}

function collectVideos(node: unknown, found: Candidate[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, found);
    return;
  }
  const record = node as Record<string, unknown>;
  const video = record.videoRenderer as Record<string, unknown> | undefined;
  if (video && typeof video.videoId === "string") {
    found.push({
      videoId: video.videoId,
      title: textOf(video.title as { runs?: { text?: string }[] }),
      author: textOf(video.ownerText as { runs?: { text?: string }[] }),
      published: textOf(video.publishedTimeText as { simpleText?: string }),
      length: textOf(video.lengthText as { simpleText?: string }),
    });
  }
  for (const value of Object.values(record)) collectVideos(value, found);
}

export async function findGameHighlight(query: HighlightQuery): Promise<YoutubeHighlight | null> {
  const cached = memory.get(query.id);
  if (cached && Date.now() - cached.at < MEMORY_MS) return cached.value;

  const awayKeys = teamKeywords(query.awayName, query.awayNick).join(" ");
  const homeKeys = teamKeywords(query.homeName, query.homeNick).join(" ");
  const search = `${awayKeys} vs ${homeKeys} LVBP resumen ${datePhrase(query.date)}`;
  let value: YoutubeHighlight | null = null;
  try {
    const response = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "es-VE,es;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20241001.00.00", hl: "es", gl: "VE" },
        },
        query: search,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      const videos: Candidate[] = [];
      collectVideos(data, videos);
      const ranked = videos
        .map((video) => ({ video, score: scoreCandidate(video, query) }))
        .filter((item) => item.score >= 8)
        .sort((a, b) => b.score - a.score);
      const best = ranked[0]?.video;
      if (best) value = { videoId: best.videoId, title: best.title, author: best.author };
    }
  } catch {
    value = null;
  }

  memory.set(query.id, { at: Date.now(), value });
  return value;
}
