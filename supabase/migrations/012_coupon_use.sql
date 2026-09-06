-- 쿠폰 사용 처리 + 수강생이 받은 쿠폰 조회 보장

alter table public.student_coupon_claims
  add column if not exists used_at timestamptz;

-- 수량 소진돼도, 본인이 받은 쿠폰은 조회 가능
drop policy if exists "master_coupons: public read available" on public.master_coupons;
create policy "master_coupons: public read available" on public.master_coupons
  for select using (
    (is_active = true and remaining_quantity > 0)
    or master_id in (select public.auth_master_ids())
    or id in (
      select coupon_id from public.student_coupon_claims
      where student_id in (select public.auth_student_ids())
    )
  );

create or replace function public.use_student_coupon_claim(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_updated int;
begin
  select id into v_student_id from public.students where user_id = auth.uid();
  if v_student_id is null then
    raise exception 'STUDENT_REQUIRED';
  end if;

  update public.student_coupon_claims
  set used_at = now()
  where id = p_claim_id
    and student_id = v_student_id
    and used_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'COUPON_UNAVAILABLE';
  end if;
end;
$$;

grant execute on function public.use_student_coupon_claim(uuid) to authenticated;
