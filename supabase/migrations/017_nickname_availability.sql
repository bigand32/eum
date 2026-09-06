-- 닉네임(학생 이름 / 마스터 활동명) 중복 검사 — RLS 우회용 security definer

create or replace function public.is_nickname_available(
  p_nickname text,
  p_kind text,
  p_exclude_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text := lower(trim(p_nickname));
begin
  if trimmed is null or trimmed = '' then
    return false;
  end if;

  if p_kind = 'master_title' then
    return not exists (
      select 1
      from public.masters m
      where lower(trim(m.title)) = trimmed
        and (p_exclude_id is null or m.id <> p_exclude_id)
    );
  end if;

  if p_kind = 'student' then
    return not exists (
      select 1
      from public.profiles p
      where p.role = 'student'
        and lower(trim(p.name)) = trimmed
        and (p_exclude_id is null or p.id <> p_exclude_id)
    );
  end if;

  return false;
end;
$$;

revoke all on function public.is_nickname_available(text, text, uuid) from public;
grant execute on function public.is_nickname_available(text, text, uuid) to anon, authenticated;
