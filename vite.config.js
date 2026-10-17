import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";

// bản một tệp: nhúng luôn biểu tượng tab vào trang
const inlineFavicon = () => ({
  name: "inline-favicon",
  transformIndexHtml: (html) => html.replace(/href="[^"]*favicon\.svg"/, `href="data:image/svg+xml,${encodeURIComponent(readFileSync("public/favicon.svg", "utf8"))}"`),
});

// `npm run build`        → thư mục dist/ để đưa lên GitHub Pages (hoặc bất kỳ máy chủ web nào)
// `npm run build:single` → dist-single/index.html: MỘT tệp duy nhất, mở trực tiếp bằng trình duyệt,
//                          chép qua USB sang máy ở lớp là dùng được (giống bản cũ)
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    // đường dẫn tương đối: chạy được ở https://<tên>.github.io/<tên-repo>/ mà không cần sửa gì
    base: "./",
    plugins: single ? [viteSingleFile(), inlineFavicon()] : [],
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
