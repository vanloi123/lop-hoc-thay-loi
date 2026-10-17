# Lớp Học Thầy Lợi

Sân chơi ôn tập điều khiển bằng **cử chỉ tay qua webcam**: 23 trò chơi, soạn bộ đề (nhập/xuất Excel), bảng điểm lớp, thống kê câu hay sai, đọc câu hỏi thành tiếng, đồng bộ dữ liệu qua Supabase.

> Informatics | Mường Nhé

---

## Cấu trúc thư mục

```
lop-hoc-thay-loi/
├─ index.html                 Khung trang (menu, thanh trên, vùng hiển thị)
├─ public/favicon.svg         Biểu tượng tab trình duyệt
├─ src/
│  ├─ main.js                 Điểm khởi động: nạp CSS → cấu hình → ứng dụng
│  ├─ config.js               Đọc cấu hình Supabase từ tệp .env
│  ├─ app.js                  Toàn bộ logic: nhận diện tay, 23 trò chơi, các trang
│  ├─ data/sample-sets.js     4 bộ đề mẫu
│  ├─ lib/xlsx.js             Đọc / ghi Excel (.xlsx) và CSV, không cần thư viện ngoài
│  ├─ assets/logo-loi.png     Logo
│  └─ styles/                 CSS chia theo phần (nạp theo thứ tự trong index.css)
├─ supabase/schema.sql        Tạo bảng + quy tắc bảo mật trên Supabase
├─ .github/workflows/deploy.yml   Tự động đưa lên GitHub Pages
├─ .env.example               Mẫu cấu hình (sao chép thành .env)
└─ vite.config.js
```

## Chạy trên máy

Cần cài [Node.js](https://nodejs.org) bản 20 trở lên.

```bash
npm install          # chỉ cần chạy lần đầu
npm run dev          # mở http://localhost:5173 — sửa mã là trang tự cập nhật
```

Camera chỉ bật được khi trang chạy qua `localhost` hoặc `https`.

## Tạo bản phát hành

| Lệnh | Kết quả | Dùng khi |
|---|---|---|
| `npm run build` | Thư mục `dist/` | Đưa lên GitHub Pages hoặc máy chủ web |
| `npm run build:single` | Tệp duy nhất `dist-single/index.html` | Chép qua USB sang máy ở lớp, mở trực tiếp bằng trình duyệt |
| `npm run preview` | Xem thử bản `dist/` tại http://localhost:4173 | Kiểm tra trước khi đưa lên |

Lưu ý: thư mục `dist/` **không** mở trực tiếp bằng cách bấm đúp được (trình duyệt chặn tệp JavaScript dạng module khi mở từ ổ đĩa). Muốn mở trực tiếp, dùng bản `build:single`.

## Đưa lên GitHub Pages

1. Tạo repository mới trên GitHub, ví dụ `lop-hoc-thay-loi`.
2. Đẩy mã lên (trong thư mục dự án):
   ```bash
   git remote add origin https://github.com/<tên-tài-khoản>/lop-hoc-thay-loi.git
   git push -u origin main
   ```
   (Dự án đã có sẵn một commit đầu tiên. Nếu chưa có git: `git init && git add . && git commit -m "Khởi tạo"` trước.)
3. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Khai báo Supabase cho bản trên mạng: **Settings → Secrets and variables → Actions → tab Variables → New repository variable**, tạo 2 biến:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Vào tab **Actions**, chạy lại workflow *Deploy lên GitHub Pages* (hoặc đẩy một commit mới). Sau khoảng 1 phút, trang có ở:
   `https://<tên-tài-khoản>.github.io/lop-hoc-thay-loi/`

Từ đó, mỗi lần `git push` lên nhánh `main`, trang tự cập nhật.

## Cấu hình Supabase (tùy chọn)

Không cấu hình thì trang vẫn chạy đủ chức năng, dữ liệu chỉ lưu trên từng máy.

1. Sao chép `.env.example` thành `.env` và điền 2 giá trị lấy ở **Supabase → Project Settings → API**. Tệp `.env` đã có trong `.gitignore` nên không bị đẩy lên GitHub.
2. Chạy `supabase/schema.sql` trong **Supabase → SQL Editor** để tạo bảng và bật quy tắc bảo mật (RLS). Khóa *anon* nằm công khai trong trang web là bình thường; an toàn hoàn toàn dựa vào RLS, nên hãy chắc chắn đã chạy phần RLS.
3. Để email xác nhận tài khoản / đặt lại mật khẩu quay về đúng trang: **Supabase → Authentication → URL Configuration**, thêm địa chỉ GitHub Pages của bạn vào *Site URL* và *Redirect URLs*.

## Ghi chú kỹ thuật

- Bộ nhận diện bàn tay (MediaPipe) được tải từ CDN ở lần đầu bật camera, nên lần đầu cần Internet.
- Font Lexend và Be Vietnam Pro tải từ Google Fonts; nếu mất mạng, trang tự dùng font Segoe UI của máy.
- Dữ liệu lưu trên trình duyệt gắn với **địa chỉ trang**. Khi chuyển từ bản cũ (mở tệp trên máy) sang bản GitHub Pages, hãy đăng nhập Supabase ở bản cũ để đồng bộ lên đám mây rồi đăng nhập ở bản mới, hoặc dùng **Bộ đề → Sao lưu tất cả (.json)** rồi nhập lại ở bản mới.
