-- Vocal AI 분석 히스토리 + Pro 플래그 (챌린지 제외)

alter table public.students
  add column if not exists vocal_ai_pro boolean not null default false;

create table if not exists public.vocal_ai_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null default '내 보컬 분석',
  duration_sec integer not null default 0,
  scores jsonb not null default '{}'::jsonb,
  range_label text not null default '',
  summary text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  pro_tips jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_vocal_ai_reports_student
  on public.vocal_ai_reports(student_id, created_at desc);

alter table public.vocal_ai_reports enable row level security;

drop policy if exists "vocal_ai_reports: student read" on public.vocal_ai_reports;
drop policy if exists "vocal_ai_reports: student insert" on public.vocal_ai_reports;
drop policy if exists "vocal_ai_reports: student delete" on public.vocal_ai_reports;

create policy "vocal_ai_reports: student read"
  on public.vocal_ai_reports for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );

create policy "vocal_ai_reports: student insert"
  on public.vocal_ai_reports for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );

create policy "vocal_ai_reports: student delete"
  on public.vocal_ai_reports for delete using (
    student_id in (select id from public.students where user_id = auth.uid())
  );
