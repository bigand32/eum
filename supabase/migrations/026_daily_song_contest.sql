-- 일일 곡 챌린지 대회 (엔트리 · 하트 · 프로필)
-- 앱은 우선 localStorage로 동작. Supabase 연동 시 이 테이블 사용.

create table if not exists public.contest_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  nickname text not null,
  instagram text,
  intro text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date_key text not null,
  song_title text not null,
  artist text not null,
  media_url text not null,
  media_type text not null check (media_type in ('audio', 'video')),
  nickname text not null,
  instagram text,
  intro text not null default '',
  heart_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, date_key)
);

create index if not exists contest_entries_date_hearts_idx
  on public.contest_entries (date_key, heart_count desc, created_at desc);

create table if not exists public.contest_hearts (
  entry_id uuid not null references public.contest_entries(id) on delete cascade,
  voter_student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, voter_student_id)
);

alter table public.contest_profiles enable row level security;
alter table public.contest_entries enable row level security;
alter table public.contest_hearts enable row level security;

drop policy if exists "contest_profiles_select" on public.contest_profiles;
create policy "contest_profiles_select" on public.contest_profiles
  for select to authenticated using (true);

drop policy if exists "contest_profiles_upsert_own" on public.contest_profiles;
create policy "contest_profiles_upsert_own" on public.contest_profiles
  for all to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()))
  with check (student_id in (select id from public.students where user_id = auth.uid()));

drop policy if exists "contest_entries_select" on public.contest_entries;
create policy "contest_entries_select" on public.contest_entries
  for select to authenticated using (true);

drop policy if exists "contest_entries_insert_own" on public.contest_entries;
create policy "contest_entries_insert_own" on public.contest_entries
  for insert to authenticated
  with check (student_id in (select id from public.students where user_id = auth.uid()));

drop policy if exists "contest_entries_update_own" on public.contest_entries;
create policy "contest_entries_update_own" on public.contest_entries
  for update to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));

drop policy if exists "contest_entries_delete_own" on public.contest_entries;
create policy "contest_entries_delete_own" on public.contest_entries
  for delete to authenticated
  using (student_id in (select id from public.students where user_id = auth.uid()));

drop policy if exists "contest_hearts_select" on public.contest_hearts;
create policy "contest_hearts_select" on public.contest_hearts
  for select to authenticated using (true);

drop policy if exists "contest_hearts_insert_own" on public.contest_hearts;
create policy "contest_hearts_insert_own" on public.contest_hearts
  for insert to authenticated
  with check (
    voter_student_id in (select id from public.students where user_id = auth.uid())
    and voter_student_id <> (select student_id from public.contest_entries where id = entry_id)
  );

drop policy if exists "contest_hearts_delete_own" on public.contest_hearts;
create policy "contest_hearts_delete_own" on public.contest_hearts
  for delete to authenticated
  using (voter_student_id in (select id from public.students where user_id = auth.uid()));
