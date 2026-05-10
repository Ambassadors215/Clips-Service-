/* Clip Services PWA v9 — offline, precache, network-first for listings */
const CACHE = "clip-services-v11";
const OFFLINE_PAGE = "/offline.html";
const PRECACHE = [
  "/",
  "/stores",
  "/clip-services-marketplace",
  "/manifest.webmanifest",
  "/js/pwa-core.js",
  "/js/clip-whatsapp-float.js",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/css/global-search.css",
  OFFLINE_PAGE,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => cache.addAll(["/", "/offline.html"])))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const m = event.data;
  if (!m || m.type !== "CLIP_CACHE_URL" || !m.url) return;
  const u = m.url;
  if (!/^https?:/i.test(u) || !u.includes(self.location.origin)) return;
  event.waitUntil(
    fetch(u)
      .then((res) => {
        if (res && res.ok) {
          return caches.open(CACHE).then((c) => c.put(u, res));
        }
      })
      .catch(() => {})
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Clip Services", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try {
      data.body = event.data.text();
    } catch {
      /* */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const raw = event.notification.data?.url || "/";
  const href = /^https?:\/\//i.test(raw) ? raw : new URL(raw, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(href);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/") && url.pathname !== "/api/listings" && url.pathname !== "/api/public-stats") {
    return;
  }

  // Fresh listings grid after admin approvals (avoid HTTP disk cache staleness).
  if (url.pathname === "/api/listings" || url.pathname === "/api/public-stats") {
    const netReq = new Request(req, { cache: "no-store" });
    event.respondWith(
      fetch(netReq)
        .then((res) => {
          if (res && res.ok) {
            const c = res.clone();
            return caches.open(CACHE).then((cache) => {
              try {
                cache.put(req, c);
              } catch (e) {
                /* */
              }
              return res;
            });
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || new Response("{}", { status: 503, headers: { "content-type": "application/json" } })))
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/").catch(() => null) || caches.match(OFFLINE_PAGE)))
    );
    return;
  }

  const isFont = url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com");
  if (isFont) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && url.origin === self.location.origin) {
          caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
