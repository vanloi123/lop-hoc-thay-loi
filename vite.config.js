import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// bản một tệp: nhúng luôn biểu tượng tab vào trang, bỏ các liên kết chỉ dùng cho bản web (manifest, biểu tượng ứng dụng)
const singleFileHtml = () => ({
  name: "single-file-html",
  transformIndexHtml: (html) => html
    .replace(/href="[^"]*favicon\.svg"/, `href="data:image/svg+xml,${encodeURIComponent(readFileSync("public/favicon.svg", "utf8"))}"`)
    .replace(/\s*<link rel="manifest"[^>]*>/, "")
    .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, ""),
});

// tạo dist/sw.js: liệt kê mọi tệp của bản build để lưu sẵn, mã phiên bản lấy từ nội dung các tệp
const serviceWorker = () => ({
  name: "service-worker",
  apply: "build",
  writeBundle({ dir }) {
    const walk = (d, base = "") => readdirSync(d).flatMap((f) => {
      const p = join(d, f), rel = base ? `${base}/${f}` : f;
      return statSync(p).isDirectory() ? walk(p, rel) : [rel];
    });
    const files = walk(dir).filter((f) => f !== "sw.js" && !f.endsWith(".map")).sort();
    const hash = createHash("sha256");
    files.forEach((f) => hash.update(f).update(readFileSync(join(dir, f))));
    const version = hash.digest("hex").slice(0, 12);
    const list = ["./", ...files.map((f) => "./" + f)];
    const sw = readFileSync("src/pwa/sw.js", "utf8")
      .replace("__VERSION__", version)
      .replace("__PRECACHE__", JSON.stringify(list, null, 2));
    writeFileSync(join(dir, "sw.js"), sw);
    console.log(`  service worker: ${files.length} tệp, phiên bản ${version}`);
  },
});

// `npm run build`        → thư mục dist/ để đưa lên GitHub Pages (hoặc bất kỳ máy chủ web nào), chạy được khi mất mạng
// `npm run build:single` → dist-single/index.html: MỘT tệp duy nhất, mở trực tiếp bằng trình duyệt,
//                          chép qua USB sang máy ở lớp là dùng được (giống bản cũ)
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    // đường dẫn tương đối: chạy được ở tên miền riêng lẫn https://<tên>.github.io/<tên-repo>/ mà không cần sửa gì
    base: "./",
    plugins: single ? [viteSingleFile(), singleFileHtml()] : [serviceWorker()],
    publicDir: single ? false : "public",
    build: {
      outDir: single ? "dist-single" : "dist",
      target: "es2020",
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      ...(single ? { assetsInlineLimit: 100_000_000, cssCodeSplit: false } : {}),
    },
  };
});
