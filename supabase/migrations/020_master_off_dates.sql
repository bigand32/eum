-- 마스터 특정 휴무일 (YYYY-MM-DD)
alter table public.masters
  add column if not exists off_dates text[] not null default '{}';

comment on column public.masters.off_dates is
  'Specific off dates as YYYY-MM-DD strings (vacation / personal)';
