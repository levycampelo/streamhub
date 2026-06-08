import { createHash } from "node:crypto";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const REGION = "BR";

export const MONITORED_PROVIDERS = {
  netflix: { tmdbId: 8, label: "Netflix" },
  disney_plus: { tmdbId: 337, label: "Disney+" },
  prime_video: { tmdbId: 119, label: "Prime Video" },
  max: { tmdbId: 384, label: "Max" },
} as const;

export type ProviderKey = keyof typeof MONITORED_PROVIDERS;

export type NewsCategory =
  | "trending_movie"
  | "trending_tv"
  | "popular_movie"
  | "popular_tv"
  | "recent_movies_12m";

type MediaType = "movie" | "tv";

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
};

type TmdbCollectionResponse = {
  results: TmdbItem[];
};

type TmdbWatchProvidersResponse = {
  results?: {
    BR?: {
      flatrate?: Array<{ provider_id: number; provider_name: string }>;
      rent?: Array<{ provider_id: number; provider_name: string }>;
      buy?: Array<{ provider_id: number; provider_name: string }>;
    };
  };
};

type SnapshotRow = {
  snapshot_date: string;
  category: NewsCategory;
  provider_key: ProviderKey;
  provider_name: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  popularity: number | null;
  score: number | null;
  payload: Record<string, unknown>;
};

type EventType = "added" | "removed";

type EventRow = {
  event_date: string;
  event_type: EventType;
  category: NewsCategory;
  provider_key: ProviderKey;
  provider_name: string;
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  metadata: Record<string, unknown>;
};

export type StreamingNewsItem = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  popularity: number | null;
  category: NewsCategory;
  providerKey: ProviderKey;
  providerName: string;
  snapshotDate: string;
};

export type StreamingNewsEvent = {
  eventDate: string;
  eventType: EventType;
  category: NewsCategory;
  providerKey: ProviderKey;
  providerName: string;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  metadata: Record<string, unknown>;
};

export type StreamingNewsFeed = {
  snapshotDate: string | null;
  previousSnapshotDate: string | null;
  items: StreamingNewsItem[];
  events: StreamingNewsEvent[];
};

export type SyncSummary = {
  snapshotDate: string;
  previousSnapshotDate: string | null;
  insertedItems: number;
  insertedEvents: number;
  totalCollected: number;
};

function getTmdbAuth(): { headers: HeadersInit; apiKeyForQuery?: string } {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  const readAccessToken = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();

  if (!apiKey && !readAccessToken) {
    throw new Error("TMDB_API_KEY ou TMDB_API_READ_ACCESS_TOKEN nao configurado");
  }

  const headers: HeadersInit = {};
  if (readAccessToken) {
    headers.Authorization = `Bearer ${readAccessToken}`;
  }

  return {
    headers,
    apiKeyForQuery: readAccessToken ? undefined : apiKey,
  };
}

async function fetchTmdbData<T>(path: string, params: Record<string, string>): Promise<T> {
  const { headers, apiKeyForQuery } = getTmdbAuth();
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (apiKeyForQuery) {
    url.searchParams.set("api_key", apiKeyForQuery);
  }

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${path} -> ${response.status}`);
  }

  return (await response.json()) as T;
}

function isoDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthsAgoIso(months: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()));
  return isoDateUTC(d);
}

function categoryMedia(category: NewsCategory): MediaType {
  if (category === "trending_tv" || category === "popular_tv") {
    return "tv";
  }

  return "movie";
}

async function fetchCategoryItems(category: NewsCategory): Promise<TmdbItem[]> {
  switch (category) {
    case "trending_movie": {
      const data = await fetchTmdbData<TmdbCollectionResponse>("/trending/movie/week", {
        language: "pt-BR",
        page: "1",
      });
      return data.results.slice(0, 30);
    }
    case "trending_tv": {
      const data = await fetchTmdbData<TmdbCollectionResponse>("/trending/tv/week", {
        language: "pt-BR",
        page: "1",
      });
      return data.results.slice(0, 30);
    }
    case "popular_movie": {
      const data = await fetchTmdbData<TmdbCollectionResponse>("/movie/popular", {
        language: "pt-BR",
        page: "1",
      });
      return data.results.slice(0, 30);
    }
    case "popular_tv": {
      const data = await fetchTmdbData<TmdbCollectionResponse>("/tv/popular", {
        language: "pt-BR",
        page: "1",
      });
      return data.results.slice(0, 30);
    }
    case "recent_movies_12m": {
      const data = await fetchTmdbData<TmdbCollectionResponse>("/discover/movie", {
        language: "pt-BR",
        page: "1",
        include_adult: "false",
        sort_by: "popularity.desc",
        "primary_release_date.gte": monthsAgoIso(12),
        "primary_release_date.lte": isoDateUTC(new Date()),
      });
      return data.results.slice(0, 50);
    }
    default:
      return [];
  }
}

function mapProviderIdToKey(providerId: number): ProviderKey | null {
  const hit = Object.entries(MONITORED_PROVIDERS).find(([, value]) => value.tmdbId === providerId);
  return (hit?.[0] as ProviderKey | undefined) ?? null;
}

async function fetchProvidersForItem(mediaType: MediaType, tmdbId: number): Promise<ProviderKey[]> {
  const data = await fetchTmdbData<TmdbWatchProvidersResponse>(`/${mediaType}/${tmdbId}/watch/providers`, {});
  const region = data.results?.BR;
  if (!region) return [];

  const flatrate = region.flatrate ?? [];
  const keys = flatrate
    .map((provider) => mapProviderIdToKey(provider.provider_id))
    .filter((value): value is ProviderKey => value !== null);

  return [...new Set(keys)];
}

function scoreFrom(item: TmdbItem): number {
  const vote = item.vote_average ?? 0;
  const popularity = item.popularity ?? 0;
  return Number((vote * 10 + popularity * 0.05).toFixed(4));
}

function normalizeTitle(item: TmdbItem): string {
  return item.title ?? item.name ?? "Sem titulo";
}

function toSnapshotRow(item: TmdbItem, category: NewsCategory, providerKey: ProviderKey, snapshotDate: string): SnapshotRow {
  const mediaType = categoryMedia(category);
  const provider = MONITORED_PROVIDERS[providerKey];

  return {
    snapshot_date: snapshotDate,
    category,
    provider_key: providerKey,
    provider_name: provider.label,
    media_type: mediaType,
    tmdb_id: item.id,
    title: normalizeTitle(item),
    poster_path: item.poster_path ?? null,
    release_date: (item.release_date ?? item.first_air_date) || null,
    vote_average: item.vote_average ?? null,
    popularity: item.popularity ?? null,
    score: scoreFrom(item),
    payload: {
      source: "tmdb",
      region: REGION,
    },
  };
}

function uniqueRows(rows: SnapshotRow[]): SnapshotRow[] {
  const map = new Map<string, SnapshotRow>();

  for (const row of rows) {
    const key = [row.snapshot_date, row.category, row.provider_key, row.media_type, row.tmdb_id].join("|");
    map.set(key, row);
  }

  return [...map.values()];
}

function snapshotKey(row: Pick<SnapshotRow, "category" | "provider_key" | "media_type" | "tmdb_id">): string {
  return [row.category, row.provider_key, row.media_type, row.tmdb_id].join("|");
}

function hashMetadata(value: Record<string, unknown>): string {
  const input = JSON.stringify(value);
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function detectEvents(currentRows: SnapshotRow[], previousRows: SnapshotRow[], eventDate: string): EventRow[] {
  const currentMap = new Map(currentRows.map((row) => [snapshotKey(row), row]));
  const previousMap = new Map(previousRows.map((row) => [snapshotKey(row), row]));
  const events: EventRow[] = [];

  for (const [key, row] of currentMap.entries()) {
    if (!previousMap.has(key)) {
      const metadata = {
        reason: "entered_monitored_set",
        score: row.score,
      };

      events.push({
        event_date: eventDate,
        event_type: "added",
        category: row.category,
        provider_key: row.provider_key,
        provider_name: row.provider_name,
        media_type: row.media_type,
        tmdb_id: row.tmdb_id,
        title: row.title,
        poster_path: row.poster_path,
        metadata,
      });
    }
  }

  for (const [key, row] of previousMap.entries()) {
    if (!currentMap.has(key)) {
      const metadata = {
        reason: "left_provider_or_list",
        score: row.score,
      };

      events.push({
        event_date: eventDate,
        event_type: "removed",
        category: row.category,
        provider_key: row.provider_key,
        provider_name: row.provider_name,
        media_type: row.media_type,
        tmdb_id: row.tmdb_id,
        title: row.title,
        poster_path: row.poster_path,
        metadata,
      });
    }
  }

  const byKey = new Map<string, EventRow>();
  for (const event of events) {
    const dedupeKey = [
      event.event_date,
      event.event_type,
      event.category,
      event.provider_key,
      event.media_type,
      event.tmdb_id,
      hashMetadata(event.metadata),
    ].join("|");

    byKey.set(dedupeKey, event);
  }

  return [...byKey.values()];
}

function requireSupabaseEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRole) {
    throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios");
  }

  return { url, serviceRole };
}

async function supabaseRequest(path: string, init: RequestInit): Promise<Response> {
  const { url, serviceRole } = requireSupabaseEnv();

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function getPreviousSnapshotDate(currentDate: string): Promise<string | null> {
  const response = await supabaseRequest(
    `streaming_catalog_items?select=snapshot_date&snapshot_date=lt.${currentDate}&order=snapshot_date.desc&limit=1`,
    { method: "GET" }
  );

  if (!response.ok) {
    throw new Error(`Supabase query error on previous snapshot: ${response.status}`);
  }

  const data = (await response.json()) as Array<{ snapshot_date: string }>;
  return data[0]?.snapshot_date ?? null;
}

async function getSnapshotRows(date: string): Promise<SnapshotRow[]> {
  const response = await supabaseRequest(
    `streaming_catalog_items?select=snapshot_date,category,provider_key,provider_name,media_type,tmdb_id,title,poster_path,release_date,vote_average,popularity,score,payload&snapshot_date=eq.${date}&order=score.desc.nullslast`,
    { method: "GET" }
  );

  if (!response.ok) {
    throw new Error(`Supabase query error on snapshot rows: ${response.status}`);
  }

  return (await response.json()) as SnapshotRow[];
}

async function upsertSnapshotRows(rows: SnapshotRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const response = await supabaseRequest(
    "streaming_catalog_items?on_conflict=snapshot_date,category,provider_key,media_type,tmdb_id",
    {
      method: "POST",
      body: JSON.stringify(rows),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase upsert error on items: ${response.status} ${body}`);
  }

  const result = (await response.json()) as SnapshotRow[];
  return result.length;
}

async function upsertEventRows(rows: EventRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const response = await supabaseRequest(
    "streaming_catalog_events?on_conflict=event_date,event_type,category,provider_key,media_type,tmdb_id",
    {
      method: "POST",
      body: JSON.stringify(rows),
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase upsert error on events: ${response.status} ${body}`);
  }

  const result = (await response.json()) as EventRow[];
  return result.length;
}

export async function collectStreamingSnapshot(snapshotDate: string): Promise<SnapshotRow[]> {
  const categories: NewsCategory[] = [
    "trending_movie",
    "trending_tv",
    "popular_movie",
    "popular_tv",
    "recent_movies_12m",
  ];

  const rows: SnapshotRow[] = [];

  for (const category of categories) {
    const mediaType = categoryMedia(category);
    const items = await fetchCategoryItems(category);

    for (const item of items) {
      const providers = await fetchProvidersForItem(mediaType, item.id);
      for (const providerKey of providers) {
        rows.push(toSnapshotRow(item, category, providerKey, snapshotDate));
      }
    }
  }

  return uniqueRows(rows);
}

export async function runStreamingNewsSync(): Promise<SyncSummary> {
  const snapshotDate = isoDateUTC(new Date());
  const currentRows = await collectStreamingSnapshot(snapshotDate);
  const previousSnapshotDate = await getPreviousSnapshotDate(snapshotDate);
  const previousRows = previousSnapshotDate ? await getSnapshotRows(previousSnapshotDate) : [];

  const insertedItems = await upsertSnapshotRows(currentRows);
  const events = detectEvents(currentRows, previousRows, snapshotDate);
  const insertedEvents = await upsertEventRows(events);

  return {
    snapshotDate,
    previousSnapshotDate,
    insertedItems,
    insertedEvents,
    totalCollected: currentRows.length,
  };
}

export async function fetchLatestStreamingNews(provider?: ProviderKey, limit = 100): Promise<StreamingNewsFeed> {
  const response = await supabaseRequest("streaming_catalog_items?select=snapshot_date&order=snapshot_date.desc&limit=1", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Supabase query error on latest snapshot: ${response.status}`);
  }

  const snapshotRows = (await response.json()) as Array<{ snapshot_date: string }>;
  const snapshotDate = snapshotRows[0]?.snapshot_date ?? null;

  if (!snapshotDate) {
    return {
      snapshotDate: null,
      previousSnapshotDate: null,
      items: [],
      events: [],
    };
  }

  const previousSnapshotDate = await getPreviousSnapshotDate(snapshotDate);

  const supportedProviderKeys = Object.keys(MONITORED_PROVIDERS) as ProviderKey[];
  const inList = supportedProviderKeys.join(",");
  const providerFilter = provider ? `&provider_key=eq.${provider}` : "";
  const supportedFilter = `&provider_key=in.(${inList})`;

  const itemsResponse = await supabaseRequest(
    `streaming_catalog_items?select=snapshot_date,category,provider_key,provider_name,media_type,tmdb_id,title,poster_path,release_date,vote_average,popularity,score&snapshot_date=eq.${snapshotDate}${supportedFilter}${providerFilter}&order=score.desc.nullslast&limit=${Math.max(1, Math.min(limit, 200))}`,
    { method: "GET" }
  );

  if (!itemsResponse.ok) {
    throw new Error(`Supabase query error on latest items: ${itemsResponse.status}`);
  }

  const itemsData = (await itemsResponse.json()) as Array<
    Omit<SnapshotRow, "payload"> & { score: number | null }
  >;

  const eventsResponse = await supabaseRequest(
    `streaming_catalog_events?select=event_date,event_type,category,provider_key,provider_name,media_type,tmdb_id,title,poster_path,metadata&event_date=eq.${snapshotDate}${supportedFilter}${providerFilter}&order=event_type.asc,title.asc&limit=200`,
    { method: "GET" }
  );

  if (!eventsResponse.ok) {
    throw new Error(`Supabase query error on latest events: ${eventsResponse.status}`);
  }

  const eventsData = (await eventsResponse.json()) as EventRow[];

  return {
    snapshotDate,
    previousSnapshotDate,
    items: itemsData.map((row) => ({
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      title: row.title,
      posterPath: row.poster_path,
      releaseDate: row.release_date,
      voteAverage: row.vote_average,
      popularity: row.popularity,
      category: row.category,
      providerKey: row.provider_key,
      providerName: row.provider_name,
      snapshotDate: row.snapshot_date,
    })),
    events: eventsData.map((row) => ({
      eventDate: row.event_date,
      eventType: row.event_type,
      category: row.category,
      providerKey: row.provider_key,
      providerName: row.provider_name,
      mediaType: row.media_type,
      tmdbId: row.tmdb_id,
      title: row.title,
      posterPath: row.poster_path,
      metadata: row.metadata,
    })),
  };
}
