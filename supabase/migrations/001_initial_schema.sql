-- eum 초기 스키마
-- Supabase Dashboard → SQL Editor 에서 실행하거나 `supabase db push` 사용

-- profiles: auth.users 1:1 확장
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text,
  role text not null check (role in ('student', 'master')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.masters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  name text not null,
  title text not null,
  avatar_url text not null default '',
  hero_image_url text not null default '',
  rating numeric(2,1) not null default 0,
  review_count integer not null default 0,
  feedback_count integer not null default 0,
  response_time_label text not null default '1시간',
  tags text[] not null default '{}',
  bio text not null default '',
  rank_label text,
  career text[] not null default '{}',
  phone_number text not null default '',
  pricing jsonb not null default '{
    "feedbackPrice": 20000,
    "phonePrice15Min": 18000,
    "phonePrice30Min": 30000,
    "visitPrice": 80000,
    "visitDurationMin": 60,
    "feedbackIncludedMin": 5,
    "feedbackExtraPer5Min": 2000
  }'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  status text not null check (status in ('pending_payment', 'paid', 'in_review', 'completed', 'cancelled')),
  price_at_purchase integer not null,
  student_message text not null default '',
  media_label text not null default '',
  media_type text not null check (media_type in ('audio', 'video')),
  media_duration_sec integer,
  extra_duration_fee integer,
  timestamp_comments jsonb not null default '[]'::jsonb,
  master_summary text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  type text not null check (type in ('phone', 'visit')),
  status text not null check (status in ('scheduled', 'completed', 'cancelled')),
  price_at_purchase integer not null,
  duration_min integer,
  scheduled_at timestamptz not null,
  pre_question text,
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_masters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, master_id)
);

create table if not exists public.favorite_academies (
  user_id uuid not null references public.profiles(id) on delete cascade,
  academy_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, academy_id)
);

create table if not exists public.student_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  master_id uuid not null references public.masters(id) on delete cascade,
  product_label text not null,
  rating numeric(2,1) not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.masters enable row level security;
alter table public.feedback_orders enable row level security;
alter table public.reservations enable row level security;
alter table public.favorite_masters enable row level security;
alter table public.favorite_academies enable row level security;
alter table public.student_reviews enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- students
create policy "students: read own" on public.students
  for select using (auth.uid() = user_id);
create policy "students: insert own" on public.students
  for insert with check (auth.uid() = user_id);

-- masters: 공개 조회, 본인 수정
create policy "masters: public read" on public.masters
  for select using (true);
create policy "masters: insert own" on public.masters
  for insert with check (auth.uid() = user_id);
create policy "masters: update own" on public.masters
  for update using (auth.uid() = user_id);

-- feedback_orders
create policy "feedback_orders: student read" on public.feedback_orders
  for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );
create policy "feedback_orders: master read" on public.feedback_orders
  for select using (
    master_id in (select id from public.masters where user_id = auth.uid())
  );
create policy "feedback_orders: student insert" on public.feedback_orders
  for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );
create policy "feedback_orders: master update" on public.feedback_orders
  for update using (
    master_id in (select id from public.masters where user_id = auth.uid())
  );

-- reservations
create policy "reservations: student read" on public.reservations
  for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );
create policy "reservations: master read" on public.reservations
  for select using (
    master_id in (select id from public.masters where user_id = auth.uid())
  );
create policy "reservations: student insert" on public.reservations
  for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );

-- favorites
create policy "favorite_masters: own" on public.favorite_masters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorite_academies: own" on public.favorite_academies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reviews: 공개 조회, 본인 작성
create policy "student_reviews: public read" on public.student_reviews
  for select using (true);
create policy "student_reviews: student insert" on public.student_reviews
  for insert with check (
    student_id in (select id from public.students where user_id = auth.uid())
  );

-- Storage: avatars 버킷 (Dashboard에서 public bucket 생성 후)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create index if not exists idx_feedback_orders_student on public.feedback_orders(student_id);
create index if not exists idx_feedback_orders_master on public.feedback_orders(master_id);
create index if not exists idx_reservations_student on public.reservations(student_id);
