-- 수강생 온보딩 선호도 (profiles에 저장)

alter table public.profiles
  add column if not exists onboarding_prefs jsonb;
