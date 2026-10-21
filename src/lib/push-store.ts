import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  teamPreference?: string;
  createdAt: number;
}

// In-memory fallback for local development
let memSubscriptions: Map<string, PushSubscriptionData> = new Map();

function isCloudflareRuntime(): boolean {
  return Boolean(
    process.env.CF_PAGES ||
    (typeof navigator !== "undefined" && (navigator as any).userAgent === "Cloudflare-Workers")
  );
}

async function getKV(): Promise<any | null> {
  if (isCloudflareRuntime()) {
    try {
      const ctx = await getCloudflareContext({ async: true });
      const env = ctx?.env as Record<string, any> | undefined;
      if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
        return env.ENJUEGO_KV;
      }
    } catch {
      // In local dev without cloudflare worker context
    }
  }
  return null;
}

function endpointHash(endpoint: string): string {
  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < endpoint.length; i++) {
    hash = (hash << 5) - hash + endpoint.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const INDEX_KEY = "push_sub_index_v1";

async function loadSqliteSubscriptions(): Promise<Map<string, PushSubscriptionData>> {
  const map = new Map<string, PushSubscriptionData>();
  try {
    const { sqliteGet } = await import("@/lib/sqlite-store");
    const raw = sqliteGet(INDEX_KEY);
    if (raw) {
      const list: PushSubscriptionData[] = JSON.parse(raw);
      for (const s of list) {
        if (s && s.endpoint) {
          map.set(endpointHash(s.endpoint), s);
        }
      }
    }
  } catch {}
  return map;
}

async function saveSqliteSubscriptions(map: Map<string, PushSubscriptionData>): Promise<void> {
  try {
    const { sqlitePut } = await import("@/lib/sqlite-store");
    sqlitePut(INDEX_KEY, JSON.stringify(Array.from(map.values())));
  } catch {}
}

export async function savePushSubscription(sub: PushSubscriptionData): Promise<void> {
  const kv = await getKV();
  const id = endpointHash(sub.endpoint);

  if (!kv) {
    const map = await loadSqliteSubscriptions();
    map.set(id, sub);
    memSubscriptions = map;
    await saveSqliteSubscriptions(map);
    return;
  }

  // 1. Save subscription object
  await kv.put(`push_sub:${id}`, JSON.stringify(sub));

  // 2. Update index
  const rawIndex = await kv.get(INDEX_KEY);
  let index: string[] = [];
  if (rawIndex) {
    try {
      index = JSON.parse(rawIndex);
    } catch {
      index = [];
    }
  }
  if (!index.includes(id)) {
    index.push(id);
    await kv.put(INDEX_KEY, JSON.stringify(index));
  }
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const kv = await getKV();
  const id = endpointHash(endpoint);

  if (!kv) {
    const map = await loadSqliteSubscriptions();
    map.delete(id);
    memSubscriptions = map;
    await saveSqliteSubscriptions(map);
    return;
  }

  await kv.delete(`push_sub:${id}`);

  const rawIndex = await kv.get(INDEX_KEY);
  if (rawIndex) {
    try {
      let index: string[] = JSON.parse(rawIndex);
      index = index.filter((item) => item !== id);
      await kv.put(INDEX_KEY, JSON.stringify(index));
    } catch {}
  }
}

export async function getAllPushSubscriptions(): Promise<PushSubscriptionData[]> {
  const kv = await getKV();

  if (!kv) {
    const map = await loadSqliteSubscriptions();
    memSubscriptions = map;
    return Array.from(map.values());
  }

  const rawIndex = await kv.get(INDEX_KEY);
  if (!rawIndex) return [];

  let ids: string[] = [];
  try {
    ids = JSON.parse(rawIndex);
  } catch {
    return [];
  }

  const results: PushSubscriptionData[] = [];
  for (const id of ids) {
    try {
      const raw = await kv.get(`push_sub:${id}`);
      if (raw) {
        results.push(JSON.parse(raw));
      }
    } catch {}
  }
  return results;
}

export async function getPushSubscriberCount(): Promise<number> {
  const kv = await getKV();
  if (!kv) {
    const map = await loadSqliteSubscriptions();
    return map.size;
  }
  const rawIndex = await kv.get(INDEX_KEY);
  if (!rawIndex) return 0;
  try {
    const ids: string[] = JSON.parse(rawIndex);
    return ids.length;
  } catch {
    return 0;
  }
}
