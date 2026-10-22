/**
 * News text formatting utilities
 */

export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  let res = str;
  for (let i = 0; i < 2; i++) {
    res = res
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#8211;/g, "–")
      .replace(/&#8212;/g, "—")
      .replace(/&#8216;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, "«")
      .replace(/&#8221;/g, "»")
      .replace(/&#8230;/g, "...");
  }
  return res;
}

export function cleanArticleTitle(rawTitle: string): string {
  let t = decodeHtmlEntities(rawTitle).trim();
  t = t.replace(/\s*\|\s*/g, " - ");
  t = t.replace(/^de esta manera\s+/i, "");
  t = t.replace(/^lvbp:\s*/i, "");
  t = t.replace(/^noticias:\s*/i, "");
  t = t.replace(/\s+-\s+-\s+/g, " - ");
  t = t.replace(/\s+/g, " ");

  const m = t.match(/^Resumen:?\s*(?:-\s*)?(.+?)\s*(?:-|–|\(|\|)\s*(\d{1,2}\/\d{1,2}\/\d{4})\)?/i);
  if (m) {
    t = `Resumen: ${m[1].trim()} (${m[2].trim()})`;
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}
