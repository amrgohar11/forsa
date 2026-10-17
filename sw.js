// ============================================
// FORSA Service Worker - PWA
// ============================================

const CACHE_VERSION = "forsa-v2";
const STATIC_CACHE = "forsa-static-v2";
const DYNAMIC_CACHE = "forsa-dynamic-v2";

// الملفات الأساسية اللي تتخزن دايمًا
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

// ===== INSTALL =====
self.addEventListener("install", event => {
  console.log("🔧 Service Worker: Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log("📦 Caching static files");
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.warn("⚠️ Cache failed:", err))
  );
});

// ===== ACTIVATE =====
self.addEventListener("activate", event => {
  console.log("✅ Service Worker: Activated");
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log("🗑️ Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ===== FETCH =====
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات دي:
  // - غير GET
  // - Firebase APIs
  // - Google Analytics
  // - Facebook Pixel
  // - مواقع خارجية
  if (request.method !== "GET") return;
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/api/")) return;
  if (url.hostname.includes("firebase")) return;

  // ===== استراتيجية: Network First للـ HTML =====
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ===== استراتيجية: Cache First للـ CSS/JS/Images =====
  event.respondWith(cacheFirst(request));
});

// ===== Network First (للـ HTML) =====
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback
    return caches.match("/index.html");
  }
}

// ===== Cache First (للـ assets) =====
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn("⚠️ Offline: no cache for", request.url);
    throw error;
  }
}

// ===== رسائل من الصفحة =====
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});