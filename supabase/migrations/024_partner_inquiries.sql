-- 보컬학원 파트너 모집 신청

create table if not exists public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  -- 계정이 지워져도 신청 내역은 남겨 운영팀이 후속 연락할 수 있게 한다
  student_id uuid references public.students(id) on delete set null,
  academy_name text not null,
  address text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_partner_inquiries_created
  on public.partner_inquiries(created_at desc);

alter table public.partner_inquiries enable row level security;

drop policy if exists "partner_inquiries: own read" on public.partner_inquiries;
drop policy if exists "partner_inquiries: own insert" on public.partner_inquiries;

create policy "partner_inquiries: own read"
  on public.partner_inquiries for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );

create policy "partner_inquiries: own insert"
  on public.partner_inquiries for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );
