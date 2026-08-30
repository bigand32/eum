-- eum 전체 설정 (스키마 + Storage + 데모 시드)
-- Supabase Dashboard → SQL Editor → Run

-- ========== 스키마 ==========

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

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.masters enable row level security;
alter table public.feedback_orders enable row level security;
alter table public.reservations enable row level security;
alter table public.favorite_masters enable row level security;
alter table public.favorite_academies enable row level security;
alter table public.student_reviews enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "students: read own" on public.students;
drop policy if exists "students: insert own" on public.students;
create policy "students: read own" on public.students for select using (auth.uid() = user_id);
create policy "students: insert own" on public.students for insert with check (auth.uid() = user_id);

drop policy if exists "masters: public read" on public.masters;
drop policy if exists "masters: insert own" on public.masters;
drop policy if exists "masters: update own" on public.masters;
create policy "masters: public read" on public.masters for select using (true);
create policy "masters: insert own" on public.masters for insert with check (auth.uid() = user_id);
create policy "masters: update own" on public.masters for update using (auth.uid() = user_id);

drop policy if exists "feedback_orders: student read" on public.feedback_orders;
drop policy if exists "feedback_orders: master read" on public.feedback_orders;
drop policy if exists "feedback_orders: student insert" on public.feedback_orders;
drop policy if exists "feedback_orders: master update" on public.feedback_orders;
create policy "feedback_orders: student read" on public.feedback_orders for select using (
  student_id in (select id from public.students where user_id = auth.uid())
);
create policy "feedback_orders: master read" on public.feedback_orders for select using (
  master_id in (select id from public.masters where user_id = auth.uid())
);
create policy "feedback_orders: student insert" on public.feedback_orders for insert with check (
  student_id in (select id from public.students where user_id = auth.uid())
);
create policy "feedback_orders: master update" on public.feedback_orders for update using (
  master_id in (select id from public.masters where user_id = auth.uid())
);

drop policy if exists "reservations: student read" on public.reservations;
drop policy if exists "reservations: master read" on public.reservations;
drop policy if exists "reservations: student insert" on public.reservations;
create policy "reservations: student read" on public.reservations for select using (
  student_id in (select id from public.students where user_id = auth.uid())
);
create policy "reservations: master read" on public.reservations for select using (
  master_id in (select id from public.masters where user_id = auth.uid())
);
create policy "reservations: student insert" on public.reservations for insert with check (
  student_id in (select id from public.students where user_id = auth.uid())
);

drop policy if exists "favorite_masters: own" on public.favorite_masters;
drop policy if exists "favorite_academies: own" on public.favorite_academies;
create policy "favorite_masters: own" on public.favorite_masters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorite_academies: own" on public.favorite_academies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "student_reviews: public read" on public.student_reviews;
drop policy if exists "student_reviews: student insert" on public.student_reviews;
create policy "student_reviews: public read" on public.student_reviews for select using (true);
create policy "student_reviews: student insert" on public.student_reviews for insert with check (
  student_id in (select id from public.students where user_id = auth.uid())
);

create index if not exists idx_feedback_orders_student on public.feedback_orders(student_id);
create index if not exists idx_feedback_orders_master on public.feedback_orders(master_id);
create index if not exists idx_reservations_student on public.reservations(student_id);

-- ========== Storage (프로필 사진) ==========

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: user upload" on storage.objects;
drop policy if exists "avatars: user update" on storage.objects;

create policy "avatars: public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars: user upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars: user update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========== 데모 강사 시드 ==========

insert into public.masters (
  id, name, title, avatar_url, hero_image_url,
  rating, review_count, feedback_count, response_time_label,
  tags, bio, rank_label, career, phone_number, pricing
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '김뮤직', '김뮤직 마스터',
    'https://ui-avatars.com/api/?name=김뮤&background=f3f4f6&color=111827&font-size=0.4',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop',
    4.9, 312, 842, '30분',
    array['팝보컬','뮤지컬','입시전문'],
    E'정확한 진단이 빠른 성장을 만듭니다.\n불필요한 힘을 빼고 본인만의 톤을 찾을 수 있도록\n책임지고 코칭해드리겠습니다.',
    'eum 추천순위 1위',
    array['前 JYP Entertainment 보컬 트레이너', '실용음악과 외래교수', '누적 1:1 코칭 842건'],
    '010-1234-5678',
    '{"feedbackPrice":20000,"phonePrice15Min":18000,"phonePrice30Min":30000,"visitPrice":80000,"visitDurationMin":60,"feedbackIncludedMin":5,"feedbackExtraPer5Min":2000,"updatedAt":"2026-08-29T00:00:00.000Z"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '박소울', '박소울 마스터',
    'https://ui-avatars.com/api/?name=박소&background=f3f4f6&color=111827&font-size=0.4',
    'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=600&auto=format&fit=crop',
    4.8, 197, 520, '1시간',
    array['R&B','랩메이킹'],
    E'감성 보컬과 랩 플로우를 함께 잡아드려요.\n무대 경험을 바탕으로 실전 감각을 키워드립니다.',
    null,
    array['現 인디 레이블 보컬 디렉터', 'R&B 보컬 워크숍 강사', '누적 1:1 코칭 520건'],
    '010-9876-5432',
    '{"feedbackPrice":25000,"phonePrice15Min":20000,"phonePrice30Min":35000,"visitPrice":90000,"visitDurationMin":60,"feedbackIncludedMin":5,"feedbackExtraPer5Min":2000,"updatedAt":"2026-08-29T00:00:00.000Z"}'::jsonb
  )
on conflict (id) do nothing;
