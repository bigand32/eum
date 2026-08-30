-- 마스터가 자신의 주문/예약 수강생 프로필 조회 가능

drop policy if exists "students: master read via orders" on public.students;
create policy "students: master read via orders" on public.students for select using (
  id in (
    select fo.student_id from public.feedback_orders fo
    where fo.master_id in (select id from public.masters where user_id = auth.uid())
    union
    select r.student_id from public.reservations r
    where r.master_id in (select id from public.masters where user_id = auth.uid())
  )
);

drop policy if exists "profiles: master read via orders" on public.profiles;
create policy "profiles: master read via orders" on public.profiles for select using (
  id in (
    select s.user_id from public.students s
    where s.id in (
      select fo.student_id from public.feedback_orders fo
      where fo.master_id in (select id from public.masters where user_id = auth.uid())
      union
      select r.student_id from public.reservations r
      where r.master_id in (select id from public.masters where user_id = auth.uid())
    )
  )
);
