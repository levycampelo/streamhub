create table if not exists public.streaming_catalog_items (
  id bigint generated always as identity primary key,
  snapshot_date date not null,
  category text not null,
  provider_key text not null,
  provider_name text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  release_date date,
  vote_average numeric,
  popularity numeric,
  score numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (snapshot_date, category, provider_key, media_type, tmdb_id)
);

create index if not exists idx_streaming_catalog_items_snapshot_date
  on public.streaming_catalog_items (snapshot_date desc);

create index if not exists idx_streaming_catalog_items_provider
  on public.streaming_catalog_items (provider_key, snapshot_date desc);

create table if not exists public.streaming_catalog_events (
  id bigint generated always as identity primary key,
  event_date date not null,
  event_type text not null check (event_type in ('added', 'removed')),
  category text not null,
  provider_key text not null,
  provider_name text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (event_date, event_type, category, provider_key, media_type, tmdb_id)
);

create index if not exists idx_streaming_catalog_events_event_date
  on public.streaming_catalog_events (event_date desc);

create index if not exists idx_streaming_catalog_events_provider
  on public.streaming_catalog_events (provider_key, event_date desc);

alter table public.streaming_catalog_items enable row level security;
alter table public.streaming_catalog_events enable row level security;

drop policy if exists "public read streaming items" on public.streaming_catalog_items;
create policy "public read streaming items"
  on public.streaming_catalog_items
  for select
  using (true);

drop policy if exists "public read streaming events" on public.streaming_catalog_events;
create policy "public read streaming events"
  on public.streaming_catalog_events
  for select
  using (true);
