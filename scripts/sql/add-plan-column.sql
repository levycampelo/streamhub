alter table public.app_users
  add column if not exists plan text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_plan_check'
  ) then
    alter table public.app_users
      add constraint app_users_plan_check
      check (plan is null or plan in ('basico', 'premium'));
  end if;
end
$$;