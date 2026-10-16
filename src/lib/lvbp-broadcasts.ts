import defaultBroadcasts from "./tv-official-schedule.json";

export interface OfficialBroadcastEntry {
  isoDate: string;
  awayCode: string;
  homeCode: string;
  gamePk?: string;
  channels: string[];
}

const LOGO_MAP: Record<string, string> = {
  "692": "ZUL",
  "693": "LAR",
  "694": "ANZ",
  "695": "CAR",
  "696": "MAG",
  "697": "BRA",
  "698": "LAG",
  "699": "ARA",
};

const MONTHS_ES: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

// In-memory cache to avoid repeated HTTP requests to stats.lvbp.com
let cachedBroadcasts: Record<string, OfficialBroadcastEntry> = {
  ...(defaultBroadcasts as Record<string, OfficialBroadcastEntry>),
};
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function normalizeChannelName(raw: string): string {
  const trimmed = raw.trim();
  if (/IVC/i.test(trimmed)) return "IVC";
  if (/YouTube|LVBP YouTube/i.test(trimmed)) return "YouTube";
  if (/1Baseball|1BN/i.test(trimmed)) return "1Baseball Network";
  if (/ByM|ByM Sport/i.test(trimmed)) return "ByM Sport";
  if (/Televen/i.test(trimmed)) return "Televen";
  if (/Venevisi[oó]n/i.test(trimmed)) return "Venevisión";
  if (/Meridiano/i.test(trimmed)) return "Meridiano TV";
  if (/Canal i/i.test(trimmed)) return "Canal i";
  if (/TVES/i.test(trimmed)) return "TVES";
  if (/VTV/i.test(trimmed)) return "VTV";
  return trimmed;
}

export function parseScheduleHtml(html: string): Record<string, OfficialBroadcastEntry> {
  const parsedMap: Record<string, OfficialBroadcastEntry> = {};
  if (!html || typeof html !== "string") return parsedMap;

  const dateSections = html.split(/<div class="col-12 fw-bold my-2">/i);
  for (let i = 1; i < dateSections.length; i++) {
    const sec = dateSections[i];
    const headerEnd = sec.indexOf("</div>");
    if (headerEnd === -1) continue;

    const dateHeader = sec.substring(0, headerEnd).trim();
    let isoDate = "";
    const dateMatch = dateHeader.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, "0");
      const m = MONTHS_ES[dateMatch[2].toLowerCase()] || "10";
      isoDate = `2026-${m}-${day}`;
    }
    if (!isoDate) continue;

    const itemParts = sec.split(/<div class="list-group-item">/i);
    for (let j = 1; j < itemParts.length; j++) {
      const item = itemParts[j];
      const logoMatches = [...item.matchAll(/assets\/lvbp\/logos\/30\/(\d+)\.png/g)];
      const awayCode = logoMatches[0] ? LOGO_MAP[logoMatches[0][1]] : "";
      const homeCode = logoMatches[1] ? LOGO_MAP[logoMatches[1][1]] : "";
      if (!awayCode || !homeCode) continue;

      const pkMatch = item.match(/game=(\d+)/);
      const gamePk = pkMatch ? pkMatch[1] : undefined;

      const tvMatches = [
        ...item.matchAll(/assets\/tv\/(?:100|300)\/[^"]+"[^>]*title="([^"]+)"/g),
      ];
      const channels = tvMatches.map((m) => normalizeChannelName(m[1]));

      if (!channels.includes("BeisbolPlay")) {
        channels.push("BeisbolPlay");
      }

      const entry: OfficialBroadcastEntry = {
        isoDate,
        awayCode,
        homeCode,
        gamePk,
        channels,
      };

      const matchupKey = `${isoDate}_${awayCode}_${homeCode}`;
      parsedMap[matchupKey] = entry;
      if (gamePk) {
        parsedMap[`pk_${gamePk}`] = entry;
      }
    }
  }

  return parsedMap;
}

export async function fetchStatsLvbpDate(targetDateIso?: string): Promise<Record<string, OfficialBroadcastEntry>> {
  try {
    const body = targetDateIso ? `date=${encodeURIComponent(targetDateIso)}` : "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://stats.lvbp.com/resources/views/schedule.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: body || undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return {};
    const html = await res.text();
    return parseScheduleHtml(html);
  } catch {
    return {};
  }
}

export async function getOfficialBroadcastsMap(
  targetDateIso?: string
): Promise<Record<string, OfficialBroadcastEntry>> {
  const now = Date.now();
  if (now - lastFetchTimestamp < CACHE_TTL_MS && Object.keys(cachedBroadcasts).length > 0) {
    return cachedBroadcasts;
  }

  try {
    // Fetch live from stats.lvbp.com
    const liveMap = await fetchStatsLvbpDate(targetDateIso);
    if (Object.keys(liveMap).length > 0) {
      cachedBroadcasts = {
        ...cachedBroadcasts,
        ...liveMap,
      };
      lastFetchTimestamp = now;
    }
  } catch {
    // Fall back to pre-scraped baseline
  }

  return cachedBroadcasts;
}

export function resolveRealGameBroadcast(
  gamePk: string | number | undefined,
  dateIso: string,
  awayCode: string,
  homeCode: string,
  broadcastMap?: Record<string, OfficialBroadcastEntry>
): string[] {
  const map = broadcastMap || cachedBroadcasts;

  // 1. Check exact gamePk
  if (gamePk) {
    const byPk = map[`pk_${gamePk}`];
    if (byPk && byPk.channels && byPk.channels.length > 0) {
      return byPk.channels;
    }
  }

  // 2. Check by date + awayCode + homeCode
  const matchupKey = `${dateIso}_${awayCode}_${homeCode}`;
  const byMatchup = map[matchupKey];
  if (byMatchup && byMatchup.channels && byMatchup.channels.length > 0) {
    return byMatchup.channels;
  }

  // 3. For marquee rivalry games where TV schedule is unconfirmed
  const pair = `${awayCode}-${homeCode}`;
  if (pair.includes("CAR") && pair.includes("MAG")) {
    return ["IVC", "Venevisión", "ByM Sport", "1Baseball Network", "BeisbolPlay"];
  }

  // 4. Default: BeisbolPlay is the official digital broadcaster for 100% of LVBP games
  return ["BeisbolPlay"];
}
