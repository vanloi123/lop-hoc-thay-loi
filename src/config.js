/* Kết nối Supabase (tùy chọn).
   Giá trị lấy từ tệp .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
   Để trống thì ứng dụng vẫn chạy, dữ liệu chỉ lưu trên từng máy. */
const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
window.LHVT_CLOUD = url && anonKey ? { url, anonKey } : null;
