-- Lớp Học Thầy Lợi — cấu trúc dữ liệu trên Supabase
-- Chạy trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao.
-- Nếu trước đây bạn đã chạy một tệp schema khác, phần "BẢO MẬT (RLS)" bên dưới
-- vẫn nên chạy lại để chắc chắn mỗi giáo viên chỉ đọc/ghi được dữ liệu của chính mình.

-- Bộ đề: mỗi dòng là một bộ đề của một giáo viên
create table if not exists public.question_sets (
  user_id  uuid    not null references auth.users (id) on delete cascade,
  id       text    not null,
  data     jsonb,
  ts       bigint  not null default 0,          -- thời điểm sửa (mili giây)
  deleted  boolean not null default false,      -- đánh dấu đã xóa để đồng bộ giữa các máy
  primary key (user_id, id)
);

-- Dữ liệu dạng khóa–giá trị: thiết lập, danh sách lớp, kỷ lục, thống kê câu hỏi…
create table if not exists public.user_kv (
  user_id  uuid   not null references auth.users (id) on delete cascade,
  key      text   not null,
  value    jsonb,
  ts       bigint not null default 0,
  primary key (user_id, key)
);

-- ============ BẢO MẬT (RLS) ============
-- Khóa anon nằm công khai trong trang web là bình thường; an toàn hoàn toàn dựa vào các quy tắc này.
alter table public.question_sets enable row level security;
alter table public.user_kv       enable row level security;

drop policy if exists "Giáo viên quản lý bộ đề của mình" on public.question_sets;
create policy "Giáo viên quản lý bộ đề của mình" on public.question_sets
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Giáo viên quản lý dữ liệu của mình" on public.user_kv;
create policy "Giáo viên quản lý dữ liệu của mình" on public.user_kv
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Người chưa đăng nhập (anon) không có quyền gì
revoke all on public.question_sets from anon;
revoke all on public.user_kv       from anon;
grant select, insert, update, delete on public.question_sets to authenticated;
grant select, insert, update, delete on public.user_kv       to authenticated;
