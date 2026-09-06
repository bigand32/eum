-- master_coupons ↔ student_coupon_claims RLS 순환 참조 제거
-- (PostgREST 500: infinite recursion detected in policy)

create or replace function public.student_claimed_coupon_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select scc.coupon_id
  from public.student_coupon_claims scc
  where scc.student_id in (select public.auth_student_ids());
$$;

create or replace function public.master_owned_coupon_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select mc.id
  from public.master_coupons mc
  where mc.master_id in (select public.auth_master_ids());
$$;

grant execute on function public.student_claimed_coupon_ids() to authenticated, anon;
grant execute on function public.master_owned_coupon_ids() to authenticated, anon;

drop policy if exists "master_coupons: public read available" on public.master_coupons;
create policy "master_coupons: public read available" on public.master_coupons
  for select using (
    (is_active = true and remaining_quantity > 0)
    or master_id in (select public.auth_master_ids())
    or id in (select public.student_claimed_coupon_ids())
  );

drop policy if exists "student_coupon_claims: master read" on public.student_coupon_claims;
create policy "student_coupon_claims: master read" on public.student_coupon_claims
  for select using (
    coupon_id in (select public.master_owned_coupon_ids())
  );
