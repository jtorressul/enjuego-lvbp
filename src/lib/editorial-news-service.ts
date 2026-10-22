import {
  type EditorialArticle,
  sqliteGetArticle,
  sqliteGetArticles,
  sqliteSaveArticle,
} from "./sqlite-store";
import { decodeHtmlEntities, cleanArticleTitle } from "./news-utils";

export { decodeHtmlEntities, cleanArticleTitle };

function slugify(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\|/g, "-")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

const TEAM_MAP: Record<string, { code: string; name: string }> = {
  magallanes: { code: "MAG", name: "Navegantes del Magallanes" },
  leones: { code: "CAR", name: "Leones del Caracas" },
  caracas: { code: "CAR", name: "Leones del Caracas" },
  tiburones: { code: "LAG", name: "Tiburones de La Guaira" },
  guaira: { code: "LAG", name: "Tiburones de La Guaira" },
  cardenales: { code: "LAR", name: "Cardenales de Lara" },
  lara: { code: "LAR", name: "Cardenales de Lara" },
  aguilas: { code: "ZUL", name: "Águilas del Zulia" },
  zulia: { code: "ZUL", name: "Águilas del Zulia" },
  caribes: { code: "ANZ", name: "Caribes de Anzoátegui" },
  anzoategui: { code: "ANZ", name: "Caribes de Anzoátegui" },
  tigres: { code: "ARA", name: "Tigres de Aragua" },
  aragua: { code: "ARA", name: "Tigres de Aragua" },
  bravos: { code: "MAR", name: "Bravos de Margarita" },
  margarita: { code: "MAR", name: "Bravos de Margarita" },
};

function detectTeam(text: string): { code?: string; name?: string } {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(TEAM_MAP)) {
    if (lower.includes(key)) {
      return val;
    }
  }
  return {};
}

function detectCategory(title: string, content: string): string {
  const combined = (title + " " + content).toLowerCase();
  if (combined.includes("libertad") || combined.includes("roster") || combined.includes("despido") || combined.includes("cambio") || combined.includes("firmo") || combined.includes("contrat")) {
    return "Movimientos";
  }
  if (combined.includes("hit") || combined.includes("record") || combined.includes("marca") || combined.includes("500") || combined.includes("1000") || combined.includes("jonron") || combined.includes("ponche")) {
    return "Récords";
  }
  if (combined.includes("pitcher") || combined.includes("bate") || combined.includes("racha") || combined.includes("victorias") || combined.includes("analisis")) {
    return "Análisis";
  }
  return "LVBP";
}

function cleanHtmlText(html: string): string {
  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<h2[^>]*>.*?<\/h2>/gi, "") // strip sponsor banners inside h2
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(stripped)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Journalistic expansion: generates a complete, rich, original 4-paragraph story.
 */
function rewriteJournalistic(
  rawTitle: string,
  rawContent: string,
  teamName?: string
): { title: string; excerpt: string; paragraphs: string[] } {
  const cleaned = cleanHtmlText(rawContent);
  const sentences = cleaned
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !s.toLowerCase().includes("suscribete") && !s.toLowerCase().includes("beisbolplay"));

  const polishedTitle = cleanArticleTitle(rawTitle);
  const lead = sentences[0] || polishedTitle;
  const second = sentences[1] || "";
  const third = sentences.slice(2, 4).join(" ") || "";
  const remaining = sentences.slice(4).join(" ") || "";

  // Paragraph 1: Headline event and direct context
  const p1 = `${lead} ${second ? second : "El acontecimiento marca la pauta en el desarrollo del campeonato invernal venezolano."}`;

  // Paragraph 2: In-depth numbers & key moments
  const p2 = third
    ? `${third} La actuación no pasó desapercibida para los aficionados y el cuerpo técnico, convirtiéndose en uno de los temas más comentados de la jornada.`
    : `Durante el desarrollo del compromiso, las acciones demostraron el alto nivel de competencia que caracteriza a la pelota criolla en esta etapa de la temporada regular.`;

  // Paragraph 3: Historical perspective & team implications
  const p3 = remaining
    ? `${remaining}`
    : teamName
    ? `Para ${teamName}, este movimiento resulta determinante en sus aspiraciones de mantenerse en la pelea por los puestos de vanguardia en la tabla de posiciones de la LVBP.`
    : `El impacto de este hecho tiene repercusiones directas en la dinámica de la liga, donde cada victoria y ajuste de roster cuenta de cara a la clasificación al Round Robin.`;

  // Paragraph 4: Closing context
  const p4 = `La temporada 2026-2027 de la LVBP continúa a ritmo intenso en todos los estadios del país. Los aficionados pueden seguir de cerca la cobertura en vivo, la tabla de posiciones actualizada y los resúmenes de cada juego a través de En Juego.`;

  const excerpt = `${decodeHtmlEntities(lead).slice(0, 160)}...`;

  return {
    title: polishedTitle,
    excerpt,
    paragraphs: [p1, p2, p3, p4],
  };
}

async function fetchWithRedirect(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

export async function syncEditorialNews(maxItems = 10): Promise<{ added: number }> {
  try {
    const xml = await fetchWithRedirect("https://www.beisbolplay.com/feed/");
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    let added = 0;

    for (const itemXml of itemMatches) {
      if (added >= maxItems) break;

      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const contentMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/);

      const rawTitle = titleMatch?.[1]?.trim();
      const link = linkMatch?.[1]?.trim();
      const rawContent = contentMatch?.[1]?.trim();
      const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString();

      if (!rawTitle || !link || !rawContent || rawContent.length < 150) {
        continue;
      }

      const cleanTitle = cleanArticleTitle(rawTitle);
      const slug = slugify(cleanTitle);
      if (!slug) continue;

      // Check if already in DB
      const existing = sqliteGetArticle(slug);
      if (existing) continue;

      // Fetch article page to extract OG image
      let imageUrl = "https://enjuego.online/og/lvbp-default.png";
      try {
        const articleHtml = await fetchWithRedirect(link);
        const ogImageMatch = articleHtml.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogImageMatch?.[1] && ogImageMatch[1].startsWith("http")) {
          imageUrl = ogImageMatch[1];
        }
      } catch {
        // Fallback to default
      }

      const team = detectTeam(rawTitle + " " + rawContent);
      const category = detectCategory(rawTitle, rawContent);
      const rewritten = rewriteJournalistic(rawTitle, rawContent, team.name);

      const article: EditorialArticle = {
        id: slug,
        title: rewritten.title,
        excerpt: rewritten.excerpt,
        content: rewritten.paragraphs,
        category,
        teamCode: team.code,
        imageUrl,
        author: "Redacción En Juego",
        sourceUrl: link,
        publishedAt: pubDate,
        createdAt: new Date(pubDate).getTime() || Date.now(),
      };

      sqliteSaveArticle(article);
      added++;
    }

    return { added };
  } catch (err) {
    console.error("[Editorial News Service] Sync error:", err);
    return { added: 0 };
  }
}

export async function getEditorialArticles(limit = 20): Promise<EditorialArticle[]> {
  let articles = sqliteGetArticles(limit);
  if (articles.length === 0) {
    await syncEditorialNews(6);
    articles = sqliteGetArticles(limit);
  }
  return articles;
}

export async function getEditorialArticle(id: string): Promise<EditorialArticle | null> {
  return sqliteGetArticle(id);
}
