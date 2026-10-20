

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

## Dùng khi không có mạng

Bản web (GitHub Pages / tên miền riêng) có service worker lưu sẵn vào máy:

- **Giao diện và 23 trò chơi**: tự lưu sau lần mở trang đầu tiên.
- **Bộ nhận diện bàn tay** (khoảng 17 MB) và **phông chữ**: tự tải ngầm sau vài giây (trừ khi máy bật chế độ tiết kiệm dữ liệu), hoặc bấm **Cài đặt → Dùng khi không có mạng → Tải sẵn để dùng offline**.
- Khi mất mạng, thanh trên cùng hiện **Ngoại tuyến**; bộ đề, điểm và lớp học vẫn lưu trên máy và tự đồng bộ khi có mạng lại.
- Khi có bản mới trên GitHub, trang hiện thông báo **Đã có phiên bản mới → Cập nhật ngay** (không tự tải lại giữa lúc đang chơi).
- Có thể **cài như ứng dụng** (Chrome / Edge): Cài đặt → **Cài ứng dụng lên máy**, hoặc biểu tượng cài đặt trên thanh địa chỉ.

Tệp liên quan: `src/pwa/sw.js` (mẫu service worker; khi build, `vite.config.js` điền danh sách tệp và mã phiên bản rồi ghi ra `dist/sw.js`), `public/manifest.webmanifest`, `public/icons/`.
Bản một tệp (`build:single`) không có chức năng này vì trình duyệt không cho service worker chạy với tệp mở từ ổ đĩa.

## Điều khiển bằng điện thoại

Nút hình **điện thoại** trên thanh trên cùng của máy chiếu → hiện mã QR. Quét bằng Camera/Zalo trên điện thoại để mở trang điều khiển (cùng địa chỉ web, có thêm `#remote=…`).

- Điện thoại thấy những gì máy chiếu đang hiện: câu hỏi, đáp án A/B/C/D, các nút, danh sách trò chơi; bấm trên điện thoại = bấm trên máy chiếu.
- Tab **Gọi tên** (quay số trên máy chiếu, cộng +1/+2/+5), **Điểm** (cộng/trừ điểm từng bạn), **Trang** (chuyển nhanh: sảnh, gọi tên, chia nhóm, xếp hạng…).
- Hai máy **không cần chung Wi-Fi**, chỉ cần Internet. Kết nối qua **Supabase Realtime (Broadcast)**: tin nhắn chỉ chuyển tiếp, không lưu vào cơ sở dữ liệu, không cần tạo bảng.
- Mỗi phiên có mã kênh + khóa bí mật ngẫu nhiên; tin nhắn sai khóa bị bỏ qua. **Tạo mã mới** để thu hồi quyền của các điện thoại cũ; phiên tự hết hạn sau 12 giờ không dùng.
- Nếu điện thoại cứ báo "Đang kết nối…": kiểm tra **Supabase → Realtime → Settings**, mục cho phép kênh công khai (không bật "Private channels only").

Mã nguồn: `src/remote/channel.js` (kết nối), `src/remote/phone.js` (giao diện điện thoại), phần máy chiếu nằm trong `src/app.js` (tìm "ĐIỀU KHIỂN BẰNG ĐIỆN THOẠI").

## Chia nhóm ngẫu nhiên

Trang **Học sinh & điểm → Chia nhóm**: chia theo số nhóm hoặc số bạn mỗi nhóm, chỉ bạn có mặt, cân bằng nam/nữ, hạn chế ghép lại như lần trước. Bấm vào 2 bạn ở 2 nhóm để đổi chỗ; có trình chiếu, xuất Excel và **Dùng làm tổ thi đua** (ghi tên nhóm vào cột Tổ để xem thi đua ở tab Xếp hạng).

## Cấu hình Supabase (tùy chọn)

Không cấu hình thì trang vẫn chạy đủ chức năng, dữ liệu chỉ lưu trên từng máy.

1. Sao chép `.env.example` thành `.env` và điền 2 giá trị lấy ở **Supabase → Project Settings → API**. Tệp `.env` đã có trong `.gitignore` nên không bị đẩy lên GitHub.
2. Chạy `supabase/schema.sql` trong **Supabase → SQL Editor** để tạo bảng và bật quy tắc bảo mật (RLS). Khóa *anon* nằm công khai trong trang web là bình thường; an toàn hoàn toàn dựa vào RLS, nên hãy chắc chắn đã chạy phần RLS.
3. Để email xác nhận tài khoản / đặt lại mật khẩu quay về đúng trang: **Supabase → Authentication → URL Configuration**, thêm địa chỉ GitHub Pages của bạn vào *Site URL* và *Redirect URLs*.

## Ghi chú kỹ thuật

- Bộ nhận diện bàn tay (MediaPipe) được tải từ CDN ở lần đầu bật camera, nên lần đầu cần Internet.
- Font Lexend và Be Vietnam Pro tải từ Google Fonts; nếu mất mạng, trang tự dùng font Segoe UI của máy.
- Dữ liệu lưu trên trình duyệt gắn với **địa chỉ trang**. Khi chuyển từ bản cũ (mở tệp trên máy) sang bản GitHub Pages, hãy đăng nhập Supabase ở bản cũ để đồng bộ lên đám mây rồi đăng nhập ở bản mới, hoặc dùng **Bộ đề → Sao lưu tất cả (.json)** rồi nhập lại ở bản mới.
