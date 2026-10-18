// ============================================================================
// EnJuego — Service Worker (PWA & Web Push Notifications)
// ============================================================================

const CACHE_NAME = "enjuego-static-v1";
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.png",
  "/logo.png",
  "/favicon.png"
];

// 1. INSTALL: Precache essential shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache non-critical error:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Clean up older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Smart caching strategy
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes or dynamic live queries
  if (url.pathname.startsWith("/api/")) {
    return; // Pass through to network
  }

  // Static assets (images, logos, fonts): Cache-first with network fallback
  if (
    url.pathname.startsWith("/logos/") ||
    url.pathname.startsWith("/teams/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (!res || res.status !== 200 || res.type !== "basic") {
            return res;
          }
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML Navigation: Network-first with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.match("/");
        });
      })
    );
  }
});

// 4. PUSH: Handle incoming Web Push Notifications (Alerts & Ads)
self.addEventListener("push", (event) => {
  let payload = {
    title: "EnJuego · Béisbol en Vivo",
    body: "¡Hay acción en el terreno! Entra a ver los marcadores.",
    url: "/",
    icon: "/icon.png",
    badge: "/icon.png",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/icon.png",
    image: payload.image || undefined,
    tag: payload.tag || "enjuego-update",
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || "/",
      timestamp: Date.now(),
    },
    actions: payload.actions || [
      { action: "open", title: "Ver Marcador ⚾" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// 5. NOTIFICATION CLICK: Open or focus application window
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url === targetUrl) {
            return client.focus();
          } else {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If no window open, open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
