-- feedback_orders에 미디어 URL 컬럼 + feedback-media 스토리지 버킷

alter table public.feedback_orders
  add column if not exists media_url text;

insert into storage.buckets (id, name, public)
values ('feedback-media', 'feedback-media', true)
on conflict (id) do nothing;

drop policy if exists "feedback-media: public read" on storage.objects;
drop policy if exists "feedback-media: user upload" on storage.objects;

create policy "feedback-media: public read" on storage.objects
  for select using (bucket_id = 'feedback-media');

create policy "feedback-media: user upload" on storage.objects
  for insert with check (
    bucket_id = 'feedback-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
