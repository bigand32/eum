-- 고음 피치 챌린지 세션 결과

create table if not exists public.high_note_pitch_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date_key date not null,
  target_note text not null default '',
  accuracy_pct integer not null default 0,
  avg_cents_abs numeric(8, 2) not null default 0,
  max_hold_sec numeric(8, 2) not null default 0,
  vibrato_stability numeric(8, 2) not null default 0,
  on_pitch_ratio numeric(8, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_high_note_pitch_sessions_student
  on public.high_note_pitch_sessions(student_id, created_at desc);

create index if not exists idx_high_note_pitch_sessions_student_date
  on public.high_note_pitch_sessions(student_id, date_key);

alter table public.high_note_pitch_sessions enable row level security;

drop policy if exists "high_note_pitch_sessions: student read"
  on public.high_note_pitch_sessions;
drop policy if exists "high_note_pitch_sessions: student insert"
  on public.high_note_pitch_sessions;

create policy "high_note_pitch_sessions: student read"
  on public.high_note_pitch_sessions for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );

create policy "high_note_pitch_sessions: student insert"
  on public.high_note_pitch_sessions for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );
