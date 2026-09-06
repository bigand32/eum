-- 피드백 주문 ↔ 연습 일지 연결

alter table public.feedback_orders
  add column if not exists practice_record_id uuid
    references public.practice_records(id) on delete set null;

create index if not exists feedback_orders_practice_record_id_idx
  on public.feedback_orders (practice_record_id);
