// Service worker：讓網站 (1) 有網路時永遠拿最新版，不用再按 Ctrl+F5；(2) 沒網路時用上次存下來的版本。
// 做法是「先問網路，問不到才用存檔」。不需要維護檔案清單，也不需要每次更新改版本號。
const CACHE = "soroban-v1";
const TIMEOUT = 4000; // 網路太慢時，等 4 秒就先用存檔

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// 第一次開網站時，頁面會把已經載入的檔案清單傳過來存起來，這樣馬上就能離線使用
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "cache") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(event.data.urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (res.ok || res.type === "opaque") await cache.put(url, res);
      } catch { /* 存不到就算了，下次再試 */ }
    }));
  })());
});

const isFont = (url) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
// 整個網站只有一頁，所有網址都用同一份首頁存檔
const pageKey = () => self.registration.scope;

async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  const cached = () => cache.match(key, { ignoreSearch: true });
  try {
    // no-cache：每次都跟伺服器確認有沒有新版（沒有變就很快回來）
    const res = await Promise.race([
      fetch(request.mode === "navigate" ? request.url : request, { cache: "no-cache" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT)),
    ]);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cached();
    if (hit) return hit;
    throw err;
  }
}

// 字型不常變：先用存檔，背景再更新
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const fresh = fetch(request).then((res) => { if (res.ok || res.type === "opaque") cache.put(request, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, request.mode === "navigate" ? pageKey() : request));
  } else if (isFont(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
