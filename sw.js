// ============================================
// FORSA Service Worker - PWA (v4)
// الشبكة أولاً للـ HTML والـ JS
// ============================================

const CACHE_VERSION = "forsa-v4";
const STATIC_CACHE = "forsa-static-v4";
const DYNAMIC_CACHE = "forsa-dynamic-v4";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/shop.html",
  "/blog.html",
  "/style.css",
  "/animations.js",
  "/assets/logo.png",
  "/manifest.json"
];

const NEVER_CACHE_PATTERNS = [
  /\.m?js$/i,
  /\.html?$/i,
  /\/api\//i
];

// ===== INSTALL =====
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(PRECACHE_URLS.map(async path => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) {
          await cache.put(path, response);
        }
      } catch (error) {
        console.warn("Precache skipped:", path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

// ===== ACTIVATE =====
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key =>
          key.startsWith("forsa-") &&
          ![STATIC_CACHE, DYNAMIC_CACHE].includes(key)
        )
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// ===== FETCH =====
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (
    NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
    request.destination === "script" ||
    request.destination === "document"
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

// ===== NETWORK FIRST (للـ JS والـ HTML) =====
async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offlinePage = await caches.match("/index.html");
      if (offlinePage) return offlinePage;
    }
    return new Response("Offline: resource unavailable", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

// ===== CACHE FIRST (للصور والـ CSS) =====
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// ===== رسائل =====
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});