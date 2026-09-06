-- 마스터 커리큘럼 패키지 (초급/중급/마스터 + 방문/전화/화상 가격)

create table if not exists public.master_packages (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters(id) on delete cascade,
  level text not null check (level in ('beginner', 'intermediate', 'master')),
  title text not null,
  description text,
  weeks jsonb not null default '[]'::jsonb,
  price_visit integer not null check (price_visit >= 0),
  price_phone integer not null check (price_phone >= 0),
  price_video integer not null check (price_video >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists master_packages_master_id_idx
  on public.master_packages (master_id);

alter table public.master_packages enable row level security;

drop policy if exists "master_packages: public read active" on public.master_packages;
create policy "master_packages: public read active" on public.master_packages
  for select using (
    is_active = true
    or master_id in (select public.auth_master_ids())
  );

drop policy if exists "master_packages: insert own" on public.master_packages;
create policy "master_packages: insert own" on public.master_packages
  for insert with check (master_id in (select public.auth_master_ids()));

drop policy if exists "master_packages: update own" on public.master_packages;
create policy "master_packages: update own" on public.master_packages
  for update using (master_id in (select public.auth_master_ids()));

drop policy if exists "master_packages: delete own" on public.master_packages;
create policy "master_packages: delete own" on public.master_packages
  for delete using (master_id in (select public.auth_master_ids()));

-- 피드백 완료 시 패키지 추천
alter table public.feedback_orders
  add column if not exists recommended_package_id uuid
  references public.master_packages(id) on delete set null;
