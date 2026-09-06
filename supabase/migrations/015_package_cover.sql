-- 온라인 강의 썸네일 (강사 직접 업로드)

alter table public.master_packages
  add column if not exists cover_url text;
