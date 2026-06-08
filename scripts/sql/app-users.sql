create table if not exists public.app_users (
  id bigint generated always as identity primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  auth_provider text not null default 'google',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_last_login
  on public.app_users (last_login_at desc nulls last);

alter table public.app_users enable row level security;

drop policy if exists "service role can manage app users" on public.app_users;
create policy "service role can manage app users"
  on public.app_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
