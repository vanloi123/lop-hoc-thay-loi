/* Lớp Học Thầy Lợi — service worker: cho ứng dụng chạy khi mất mạng.
   Tệp này là MẪU: khi build, vite.config.js điền danh sách tệp và mã phiên bản rồi ghi ra dist/sw.js. */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const SHELL = "lhtl-shell-" + VERSION;   // giao diện của phiên bản hiện tại
const RUNTIME = "lhtl-runtime-v1";       // thư viện nhận diện tay, font (địa chỉ có số phiên bản → giữ qua các lần cập nhật)

/* các máy chủ có nội dung cố định theo phiên bản: lấy từ bộ nhớ trước, không có mới tải */
const IMMUTABLE_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com", "fonts.gstatic.com"];
/* tệp CSS font: dùng bản đã lưu ngay, đồng thời cập nhật ngầm */
const SWR_HOSTS = ["fonts.googleapis.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" }))))
  );
  // lần cài đầu tiên: kích hoạt ngay. Các lần cập nhật sau: chờ giáo viên bấm "Cập nhật".
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("lhtl-shell-") && key !== SHELL) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

async function fromNetworkAndStore(req, cacheName) {
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(cacheName).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

/* trang chính: ưu tiên mạng (để luôn có bản mới), mạng chậm quá 4 giây hoặc mất mạng thì dùng bản đã lưu */
async function handleNavigate(req) {
  try {
    const res = await Promise.race([fetch(req), timeout(4000)]);
    if (res.ok) {
      const copy = res.clone();
      caches.open(SHELL).then((c) => c.put("./index.html", copy)).catch(() => {});
    }
    return res;
  } catch (e) {
    const cache = await caches.open(SHELL);
    return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req, { ignoreVary: true });
  // phản hồi "mờ" (opaque) không dùng được cho yêu cầu cần CORS → tải lại
  if (hit && !(hit.type === "opaque" && req.mode === "cors")) return hit;
  try {
    return await fromNetworkAndStore(req, cacheName);
  } catch (e) {
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const hit = await caches.match(req, { ignoreVary: true });
  const net = fromNetworkAndStore(req, cacheName).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") { event.respondWith(handleNavigate(req)); return; }
    if (url.pathname.endsWith("/sw.js")) return;
    event.respondWith(cacheFirst(req, RUNTIME));
    return;
  }
  if (IMMUTABLE_HOSTS.includes(url.hostname)) { event.respondWith(cacheFirst(req, RUNTIME)); return; }
  if (SWR_HOSTS.includes(url.hostname)) { event.respondWith(staleWhileRevalidate(req, RUNTIME)); return; }
  // Supabase, giọng đọc trực tuyến…: để trình duyệt xử lý bình thường
});
