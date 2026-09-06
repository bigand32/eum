-- 마스터 직접 발급 쿠폰 (네이버 스마트플레이스 스타일)

create table if not exists public.master_coupons (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters(id) on delete cascade,
  title text not null default '할인 쿠폰',
  discount_amount integer not null check (discount_amount > 0),
  total_quantity integer not null check (total_quantity > 0),
  remaining_quantity integer not null check (remaining_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint master_coupons_remaining_lte_total
    check (remaining_quantity <= total_quantity)
);

create table if not exists public.student_coupon_claims (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.master_coupons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (coupon_id, student_id)
);

create index if not exists master_coupons_master_id_idx on public.master_coupons (master_id);
create index if not exists student_coupon_claims_student_id_idx on public.student_coupon_claims (student_id);

alter table public.master_coupons enable row level security;
alter table public.student_coupon_claims enable row level security;

-- 공개: 남은 수량 있는 활성 쿠폰만 조회 / 마스터는 본인 쿠폰 전체 조회
drop policy if exists "master_coupons: public read available" on public.master_coupons;
create policy "master_coupons: public read available" on public.master_coupons
  for select using (
    (is_active = true and remaining_quantity > 0)
    or master_id in (select public.auth_master_ids())
  );

drop policy if exists "master_coupons: insert own" on public.master_coupons;
create policy "master_coupons: insert own" on public.master_coupons
  for insert with check (master_id in (select public.auth_master_ids()));

drop policy if exists "master_coupons: update own" on public.master_coupons;
create policy "master_coupons: update own" on public.master_coupons
  for update using (master_id in (select public.auth_master_ids()));

-- 수강생: 본인 다운로드 내역
drop policy if exists "student_coupon_claims: read own" on public.student_coupon_claims;
create policy "student_coupon_claims: read own" on public.student_coupon_claims
  for select using (student_id in (select public.auth_student_ids()));

drop policy if exists "student_coupon_claims: insert own" on public.student_coupon_claims;
create policy "student_coupon_claims: insert own" on public.student_coupon_claims
  for insert with check (student_id in (select public.auth_student_ids()));

-- 원자적 다운로드 (수량 차감 + 중복 방지)
create or replace function public.claim_master_coupon(p_coupon_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_claim_id uuid;
  v_updated int;
begin
  select id into v_student_id from public.students where user_id = auth.uid();
  if v_student_id is null then
    raise exception 'STUDENT_REQUIRED';
  end if;

  if exists (
    select 1 from public.student_coupon_claims
    where coupon_id = p_coupon_id and student_id = v_student_id
  ) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  update public.master_coupons
  set remaining_quantity = remaining_quantity - 1
  where id = p_coupon_id
    and is_active = true
    and remaining_quantity > 0;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'SOLD_OUT';
  end if;

  insert into public.student_coupon_claims (coupon_id, student_id)
  values (p_coupon_id, v_student_id)
  returning id into v_claim_id;

  return v_claim_id;
end;
$$;

grant execute on function public.claim_master_coupon(uuid) to authenticated;
