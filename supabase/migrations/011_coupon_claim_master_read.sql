-- 마스터가 본인 쿠폰 다운로드 내역/수강생 이름 조회

drop policy if exists "student_coupon_claims: master read" on public.student_coupon_claims;
create policy "student_coupon_claims: master read" on public.student_coupon_claims
  for select using (
    coupon_id in (
      select id from public.master_coupons
      where master_id in (select public.auth_master_ids())
    )
  );

create or replace function public.master_can_read_student(target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.feedback_orders fo
    where fo.student_id = target_student_id
      and fo.master_id in (select public.auth_master_ids())
  ) or exists (
    select 1 from public.reservations r
    where r.student_id = target_student_id
      and r.master_id in (select public.auth_master_ids())
  ) or exists (
    select 1
    from public.student_coupon_claims scc
    join public.master_coupons mc on mc.id = scc.coupon_id
    where scc.student_id = target_student_id
      and mc.master_id in (select public.auth_master_ids())
  );
$$;
