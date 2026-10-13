-- 生日网站 · 照片墙的云端存储
-- 用法：Supabase 项目 → 左侧 SQL Editor → New query → 粘贴整段 → Run（运行一次即可，重复运行也没关系）

-- 1) 存储桶 wall：公开可读；每张 ≤ 5 MB；只收图片
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wall', 'wall', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2) 网页（匿名用户）只能往 wall 里上传和读取，不能覆盖或删除
drop policy if exists "wall: anon upload" on storage.objects;
create policy "wall: anon upload" on storage.objects
  for insert to anon with check (bucket_id = 'wall');

drop policy if exists "wall: anon read" on storage.objects;
create policy "wall: anon read" on storage.objects
  for select to anon using (bucket_id = 'wall');

-- 3) 照片记录表（文件路径 + 一句话）
create table if not exists public.wall_photos (
  id uuid primary key default gen_random_uuid(),
  path text not null check (char_length(path) <= 200),
  caption text check (char_length(caption) <= 200),
  created_at timestamptz not null default now()
);
alter table public.wall_photos enable row level security;
grant select, insert on public.wall_photos to anon;

drop policy if exists "wall_photos: anon read" on public.wall_photos;
create policy "wall_photos: anon read" on public.wall_photos
  for select to anon using (true);

drop policy if exists "wall_photos: anon insert" on public.wall_photos;
create policy "wall_photos: anon insert" on public.wall_photos
  for insert to anon with check (true);

-- 删除照片：在 Table Editor → wall_photos 里删掉那一行；
-- 文件本身在 Storage → wall 里删（不删也不会显示，只是占空间）。
