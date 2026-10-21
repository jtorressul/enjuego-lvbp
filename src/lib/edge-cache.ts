import { getCloudflareContext } from "@opennextjs/cloudflare";

export function publicCacheHeaders(maxAge: number, sMaxAge = maxAge, swr = maxAge) {
  return {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    "CDN-Cache-Control": `public, max-age=${sMaxAge}`,
  };
}

function cacheKeyFor(request: Request): Request {
  const url = new URL(request.url);
  url.searchParams.delete("sid");
  url.searchParams.delete("_t");
  url.searchParams.sort();
  return new Request(url.toString(), { method: "GET" });
}

function defaultCache(): Cache | null {
  try {
    const cachesApi = (globalThis as { caches?: { default?: Cache } }).caches;
    return cachesApi?.default ?? null;
  } catch {
    return null;
  }
}

/**
 * Colo cache in front of the route handler. The Worker still starts, but a hit
 * returns the stored response without MLB, KV, or JSON rebuilds.
 * Browser max-age on that response is what actually skips the next invocation.
 */
export async function withEdgeCache(
  request: Request,
  produce: () => Promise<Response>
): Promise<Response> {
  const cache = defaultCache();
  const key = cacheKeyFor(request);

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) return hit;
    } catch {
      // Cache API is unavailable outside the Workers runtime.
    }
  }

  const response = await produce();
  if (!cache || !response.ok) return response;

  const cacheControl = response.headers.get("Cache-Control") || "";
  if (!cacheControl.includes("public") || /no-store|private|no-cache/.test(cacheControl)) {
    return response;
  }

  const stored = response.clone();
  const write = cache.put(key, stored).catch(() => {});
  let handedOff = false;
  const isCloudflare = Boolean(
    process.env.CF_PAGES ||
    (typeof navigator !== "undefined" && (navigator as any).userAgent === "Cloudflare-Workers")
  );
  if (isCloudflare) {
    try {
      const cf = await getCloudflareContext({ async: true });
      if (cf?.ctx?.waitUntil) {
        cf.ctx.waitUntil(write);
        handedOff = true;
      }
    } catch {
      // Local dev has no execution context.
    }
  }
  if (!handedOff) await write;

  return response;
}
