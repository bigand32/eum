-- RLS 순환 참조 수정 (students ↔ feedback_orders)

create or replace function public.auth_student_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.students where user_id = auth.uid();
$$;

create or replace function public.auth_master_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.masters where user_id = auth.uid();
$$;

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
  );
$$;

-- students
drop policy if exists "students: read own" on public.students;
drop policy if exists "students: insert own" on public.students;
drop policy if exists "students: master read via orders" on public.students;

create policy "students: read own" on public.students for select using (auth.uid() = user_id);
create policy "students: insert own" on public.students for insert with check (auth.uid() = user_id);
create policy "students: master read via orders" on public.students for select using (
  public.master_can_read_student(id)
);

-- profiles (master read)
drop policy if exists "profiles: master read via orders" on public.profiles;
create policy "profiles: master read via orders" on public.profiles for select using (
  id in (
    select s.user_id from public.students s
    where public.master_can_read_student(s.id)
  )
);

-- feedback_orders
drop policy if exists "feedback_orders: student read" on public.feedback_orders;
drop policy if exists "feedback_orders: student insert" on public.feedback_orders;
drop policy if exists "feedback_orders: student cancel" on public.feedback_orders;

create policy "feedback_orders: student read" on public.feedback_orders for select using (
  student_id in (select public.auth_student_ids())
);
create policy "feedback_orders: student insert" on public.feedback_orders for insert with check (
  student_id in (select public.auth_student_ids())
);
create policy "feedback_orders: student cancel" on public.feedback_orders for update using (
  student_id in (select public.auth_student_ids())
);

-- reservations
drop policy if exists "reservations: student read" on public.reservations;
drop policy if exists "reservations: student insert" on public.reservations;
drop policy if exists "reservations: student cancel" on public.reservations;

create policy "reservations: student read" on public.reservations for select using (
  student_id in (select public.auth_student_ids())
);
create policy "reservations: student insert" on public.reservations for insert with check (
  student_id in (select public.auth_student_ids())
);
create policy "reservations: student cancel" on public.reservations for update using (
  student_id in (select public.auth_student_ids())
);

-- practice_records
drop policy if exists "practice_records: student read" on public.practice_records;
drop policy if exists "practice_records: student insert" on public.practice_records;

create policy "practice_records: student read" on public.practice_records for select using (
  student_id in (select public.auth_student_ids())
);
create policy "practice_records: student insert" on public.practice_records for insert with check (
  student_id in (select public.auth_student_ids())
);

-- student_reviews
drop policy if exists "student_reviews: student insert" on public.student_reviews;
create policy "student_reviews: student insert" on public.student_reviews for insert with check (
  student_id in (select public.auth_student_ids())
);
