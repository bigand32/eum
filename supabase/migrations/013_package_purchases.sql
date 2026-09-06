-- 패키지 구매 내역

create table if not exists public.package_purchases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  package_id uuid not null references public.master_packages(id) on delete restrict,
  mode text not null check (mode in ('phone', 'video', 'visit')),
  price_at_purchase integer not null check (price_at_purchase >= 0),
  package_title text not null,
  coupon_claim_id uuid references public.student_coupon_claims(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists package_purchases_student_id_idx
  on public.package_purchases (student_id);
create index if not exists package_purchases_master_id_idx
  on public.package_purchases (master_id);

alter table public.package_purchases enable row level security;

drop policy if exists "package_purchases: student read own" on public.package_purchases;
create policy "package_purchases: student read own" on public.package_purchases
  for select using (student_id in (select public.auth_student_ids()));

drop policy if exists "package_purchases: student insert own" on public.package_purchases;
create policy "package_purchases: student insert own" on public.package_purchases
  for insert with check (student_id in (select public.auth_student_ids()));

drop policy if exists "package_purchases: master read own" on public.package_purchases;
create policy "package_purchases: master read own" on public.package_purchases
  for select using (master_id in (select public.auth_master_ids()));
