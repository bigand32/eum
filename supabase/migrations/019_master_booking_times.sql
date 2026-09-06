-- 마스터 전화·방문 예약 가능 시간대 (HH:mm)
alter table public.masters
  add column if not exists booking_times text[] not null default array[
    '10:00',
    '11:00',
    '14:00',
    '14:30',
    '15:00',
    '19:00',
    '19:30',
    '20:00',
    '21:00'
  ];

comment on column public.masters.booking_times is
  'Bookable phone/visit slot times as HH:mm strings';
