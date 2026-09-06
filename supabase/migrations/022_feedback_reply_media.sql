-- 강사 피드백 답변용 영상/음성 첨부

alter table public.feedback_orders
  add column if not exists reply_media_url text,
  add column if not exists reply_media_type text
    check (reply_media_type is null or reply_media_type in ('audio', 'video')),
  add column if not exists reply_media_label text;
