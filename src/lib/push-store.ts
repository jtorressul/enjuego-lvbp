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

async function getKV(): Promise<any | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as Record<string, any> | undefined;
    if (env?.ENJUEGO_KV && typeof env.ENJUEGO_KV.get === "function") {
      return env.ENJUEGO_KV;
    }
  } catch {
    // In local dev without cloudflare worker context
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

export async function savePushSubscription(sub: PushSubscriptionData): Promise<void> {
  const kv = await getKV();
  const id = endpointHash(sub.endpoint);

  if (!kv) {
    memSubscriptions.set(id, sub);
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
    memSubscriptions.delete(id);
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
    return Array.from(memSubscriptions.values());
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
    return memSubscriptions.size;
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
