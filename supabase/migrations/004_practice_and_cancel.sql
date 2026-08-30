-- practice_records 테이블 + 취소 RLS

create table if not exists public.practice_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null default '',
  duration_sec integer not null default 0,
  media_url text,
  created_at timestamptz not null default now()
);

alter table public.practice_records enable row level security;

drop policy if exists "practice_records: student read" on public.practice_records;
drop policy if exists "practice_records: student insert" on public.practice_records;

create policy "practice_records: student read" on public.practice_records for select using (
  student_id in (select id from public.students where user_id = auth.uid())
);

create policy "practice_records: student insert" on public.practice_records for insert with check (
  student_id in (select id from public.students where user_id = auth.uid())
);

drop policy if exists "students: update own points" on public.students;
create policy "students: update own points" on public.students for update using (
  auth.uid() = user_id
);

drop policy if exists "feedback_orders: student cancel" on public.feedback_orders;
create policy "feedback_orders: student cancel" on public.feedback_orders for update using (
  student_id in (select id from public.students where user_id = auth.uid())
);

drop policy if exists "reservations: student cancel" on public.reservations;
create policy "reservations: student cancel" on public.reservations for update using (
  student_id in (select id from public.students where user_id = auth.uid())
);

create index if not exists idx_practice_records_student on public.practice_records(student_id);
