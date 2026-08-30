-- practice 녹음 업로드: upsert/update 허용

insert into storage.buckets (id, name, public)
values ('feedback-media', 'feedback-media', true)
on conflict (id) do nothing;

drop policy if exists "feedback-media: user update" on storage.objects;
drop policy if exists "feedback-media: user delete" on storage.objects;

create policy "feedback-media: user update" on storage.objects
  for update using (
    bucket_id = 'feedback-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'feedback-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "feedback-media: user delete" on storage.objects
  for delete using (
    bucket_id = 'feedback-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
