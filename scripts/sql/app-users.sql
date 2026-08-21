create table if not exists public.app_users (
  id bigint generated always as identity primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  plan text,
  auth_provider text not null default 'google',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists idx_app_users_last_login
  on public.app_users (last_login_at desc nulls last);

alter table public.app_users enable row level security;

drop policy if exists "service role can manage app users" on public.app_users;
create policy "service role can manage app users"
  on public.app_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
