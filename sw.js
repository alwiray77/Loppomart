const CACHE = "loppomart-v4-cache";
const FILES = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icon.svg",
  "./launchericon-48x48.png", "./launchericon-72x72.png", "./launchericon-96x96.png",
  "./launchericon-144x144.png", "./launchericon-192x192.png", "./launchericon-512x512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Halaman, CSS, dan JS: ambil versi terbaru dari jaringan lebih dulu agar update
   langsung terlihat tanpa harus menaikkan nama cache; saat offline pakai cache.
   Gambar/ikon: cache dulu supaya cepat. */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isImage = /\.(png|svg|ico|webp|jpg|jpeg)$/i.test(url.pathname);

  if (isImage) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req.url, { cache: "no-cache" })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(cached => cached || caches.match("./index.html")))
  );
});
