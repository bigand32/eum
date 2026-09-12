-- 마스터 가입 서류. 본인만 읽고, 파일은 비공개 버킷에 둔다.

create table if not exists public.master_verifications (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null unique references public.masters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_path text not null,
  file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.master_verifications enable row level security;

drop policy if exists "master_verifications: select own" on public.master_verifications;
create policy "master_verifications: select own" on public.master_verifications
  for select using (user_id = auth.uid());

drop policy if exists "master_verifications: insert own" on public.master_verifications;
create policy "master_verifications: insert own" on public.master_verifications
  for insert with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('master-verification', 'master-verification', false)
on conflict (id) do nothing;

drop policy if exists "master-verification: user insert" on storage.objects;
create policy "master-verification: user insert" on storage.objects
  for insert with check (
    bucket_id = 'master-verification'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "master-verification: user select" on storage.objects;
create policy "master-verification: user select" on storage.objects
  for select using (
    bucket_id = 'master-verification'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
