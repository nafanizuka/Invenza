/* ==========================================================================
   INVENZA — Service Worker
   Melakukan caching terhadap asset dasar aplikasi (app shell) agar
   Invenza dapat di-install sebagai PWA dan tetap dapat dibuka meski
   koneksi internet tidak stabil. Data dari Supabase TIDAK di-cache
   di sini karena bersifat dinamis/real-time.
   ========================================================================== */

const CACHE_NAME = "invenza-cache-v2";

const APP_SHELL = [
  "./index.html",
  "./login.html",
  "./signup.html",
  "./reset-password.html",
  "./dashboard.html",
  "./products.html",
  "./product-detail.html",
  "./about.html",
  "./download.html",
  "./manifest.json",
  "./css/style.css",
  "./css/auth.css",
  "./css/dashboard.css",
  "./css/products.css",
  "./css/about.css",
  "./css/download.css",
  "./js/config.js",
  "./js/supabase.js",
  "./js/utils.js",
  "./js/auth.js",
  "./js/login.js",
  "./js/signup.js",
  "./js/reset-password.js",
  "./js/dashboard.js",
  "./js/products.js",
  "./js/product-detail.js",
  "./js/download.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/favicon.png",
];

// Install: cache seluruh app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch((err) => {
      console.warn("Service worker gagal melakukan precache:", err);
    })
  );
  self.skipWaiting();
});

// Activate: bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Permintaan ke Supabase (API/Storage) -> selalu network (data real-time)
// - Permintaan app shell -> cache-first, fallback ke network
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.includes("supabase.co") || url.includes("supabase.in")) {
    // Jangan intercept permintaan ke Supabase; biarkan selalu ke network.
    return;
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Simpan salinan ke cache untuk permintaan same-origin
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
