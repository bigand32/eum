-- 마스터 주간 휴무 요일 (0=일 … 6=토). 기본: 일요일
alter table public.masters
  add column if not exists off_weekdays integer[] not null default '{0}';

comment on column public.masters.off_weekdays is
  'Weekly off days as JS getDay() values: 0=Sun … 6=Sat';
