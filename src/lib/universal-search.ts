type MediaKind = "movie" | "tv";

type TmdbSearchItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
};

type TmdbExternalIdsResponse = {
  imdb_id?: string | null;
};

type OmdbResponse = {
  imdbRating?: string;
  Response?: "True" | "False";
};

type ProviderRecord = {
  provider_name: string;
  provider_id?: number;
};

type TmdbProvidersResponse = {
  results?: {
    BR?: {
      link?: string;
      flatrate?: ProviderRecord[];
      rent?: ProviderRecord[];
      buy?: ProviderRecord[];
    };
  };
};

type TmdbSearchResponse = {
  results: TmdbSearchItem[];
};

export type UniversalSearchResult = {
  id: number;
  mediaType: MediaKind;
  title: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  imdbRating: number | null;
  imdbUrl: string | null;
  year: string;
  platforms: string[];
  preferredProvider: string | null;
  preferredWatchUrl: string | null;
  offers: {
    flatrate: string[];
    rent: string[];
    buy: string[];
  };
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; data: UniversalSearchResult[] }>();

function getTmdbAuth(): { headers: HeadersInit; apiKeyForQuery?: string } {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  const readAccessToken = process.env.TMDB_API_READ_ACCESS_TOKEN?.trim();

  if (!apiKey && !readAccessToken) {
    throw new Error("TMDB_API_KEY ou TMDB_API_READ_ACCESS_TOKEN nao configurada");
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

async function tmdbFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const { headers, apiKeyForQuery } = getTmdbAuth();
  const url = new URL(`https://api.themoviedb.org/3${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (apiKeyForQuery) {
    url.searchParams.set("api_key", apiKeyForQuery);
  }

  const response = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`TMDB error ${response.status}`);
  }

  return (await response.json()) as T;
}

function toYear(date?: string): string {
  if (!date) return "-";
  return date.slice(0, 4);
}

function uniqueNames(list?: ProviderRecord[]): string[] {
  if (!list) return [];
  return [...new Set(list.map((item) => item.provider_name).filter(Boolean))].slice(0, 8);
}

function encodeSearchTerm(title: string): string {
  return encodeURIComponent(title.trim());
}

function buildProviderUrl(providerName: string, title: string): string | null {
  const query = encodeSearchTerm(title);

  switch (providerName.toLowerCase()) {
    case "netflix":
      return `https://www.netflix.com/search?q=${query}`;
    case "prime video":
    case "amazon prime video":
    case "amazon video":
      return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
    case "disney plus":
    case "disney+":
      return `https://www.disneyplus.com/search?q=${query}`;
    case "max":
    case "hbo max":
      return `https://play.max.com/search?q=${query}`;
    case "apple tv plus":
    case "apple tv+":
    case "apple tv":
      return `https://tv.apple.com/br/search?term=${query}`;
    case "paramount+":
    case "paramount plus":
      return `https://www.paramountplus.com/br/search/?q=${query}`;
    case "globoplay":
      return `https://globoplay.globo.com/busca/?q=${query}`;
    case "telecine amazon channel":
      return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
    default:
      return null;
  }
}

function pickPreferredProvider(
  title: string,
  flatrate?: ProviderRecord[],
  rent?: ProviderRecord[],
  buy?: ProviderRecord[],
  tmdbWatchUrl?: string
): { preferredProvider: string | null; preferredWatchUrl: string | null } {
  const byPriority = [
    ...(flatrate ?? []),
    ...(rent ?? []),
    ...(buy ?? []),
  ].filter((provider) => provider.provider_name);

  if (byPriority.length === 0) {
    return {
      preferredProvider: null,
      preferredWatchUrl: tmdbWatchUrl ?? null,
    };
  }

  const netflixProvider = byPriority.find(
    (provider) => provider.provider_name.toLowerCase() === "netflix"
  );

  const directCandidates = byPriority
    .map((provider) => ({
      provider,
      url: buildProviderUrl(provider.provider_name, title),
    }))
    .filter((candidate) => candidate.url);

  const netflixCandidate = netflixProvider
    ? directCandidates.find(
        (candidate) => candidate.provider.provider_name.toLowerCase() === "netflix"
      )
    : undefined;

  if (netflixCandidate) {
    return {
      preferredProvider: netflixCandidate.provider.provider_name,
      preferredWatchUrl: netflixCandidate.url ?? null,
    };
  }

  if (directCandidates.length > 0) {
    return {
      preferredProvider: directCandidates[0].provider.provider_name,
      preferredWatchUrl: directCandidates[0].url ?? null,
    };
  }

  return {
    preferredProvider: null,
    preferredWatchUrl: tmdbWatchUrl ?? null,
  };
}

async function getImdbId(mediaType: MediaKind, id: number): Promise<string | null> {
  const data = await tmdbFetch<TmdbExternalIdsResponse>(`/${mediaType}/${id}/external_ids`, {});
  return data.imdb_id ?? null;
}

async function getOmdbImdbRating(imdbId: string): Promise<number | null> {
  const omdbApiKey = process.env.OMDB_API_KEY?.trim();
  if (!omdbApiKey) {
    return null;
  }

  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("i", imdbId);
  url.searchParams.set("apikey", omdbApiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OmdbResponse;
  if (data.Response !== "True" || !data.imdbRating || data.imdbRating === "N/A") {
    return null;
  }

  const parsed = Number(data.imdbRating);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getProviders(mediaType: MediaKind, id: number): Promise<{
  platforms: string[];
  preferredProvider: string | null;
  preferredWatchUrl: string | null;
  offers: { flatrate: string[]; rent: string[]; buy: string[] };
}> {
  const data = await tmdbFetch<TmdbProvidersResponse>(`/${mediaType}/${id}/watch/providers`, {});
  const br = data.results?.BR;

  const flatrate = uniqueNames(br?.flatrate);
  const rent = uniqueNames(br?.rent);
  const buy = uniqueNames(br?.buy);

  return {
    platforms: [...new Set([...flatrate, ...rent, ...buy])].slice(0, 10),
    preferredProvider: null,
    preferredWatchUrl: br?.link ?? null,
    offers: { flatrate, rent, buy },
  };
}

function normalize(items: TmdbSearchItem[], mediaType: MediaKind): UniversalSearchResult[] {
  return items.map((item) => ({
    id: item.id,
    mediaType,
    title: item.title ?? item.name ?? "Sem titulo",
    overview: item.overview ?? "Sem sinopse disponivel.",
    posterPath: item.poster_path ?? null,
    voteAverage: item.vote_average ?? 0,
    imdbRating: null,
    imdbUrl: null,
    year: toYear(item.release_date ?? item.first_air_date),
    platforms: [],
    preferredProvider: null,
    preferredWatchUrl: null,
    offers: { flatrate: [], rent: [], buy: [] },
  }));
}

export async function searchUniversalContent(query: string): Promise<{
  items: UniversalSearchResult[];
  cacheHit: boolean;
}> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return { items: [], cacheHit: false };
  }

  const cached = cache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) {
    return { items: cached.data, cacheHit: true };
  }

  const [movies, tv] = await Promise.all([
    tmdbFetch<TmdbSearchResponse>("/search/movie", {
      query,
      language: "pt-BR",
      include_adult: "false",
      page: "1",
    }),
    tmdbFetch<TmdbSearchResponse>("/search/tv", {
      query,
      language: "pt-BR",
      include_adult: "false",
      page: "1",
    }),
  ]);

  const base = [...normalize(movies.results.slice(0, 8), "movie"), ...normalize(tv.results.slice(0, 8), "tv")]
    .sort((a, b) => b.voteAverage - a.voteAverage)
    .slice(0, 12);

  await Promise.all(
    base.slice(0, 8).map(async (item) => {
      try {
        const [providers, imdbId] = await Promise.all([
          getProviders(item.mediaType, item.id),
          getImdbId(item.mediaType, item.id),
        ]);

        const preferred = pickPreferredProvider(
          item.title,
          providers.offers.flatrate.map((providerName) => ({ provider_name: providerName })),
          providers.offers.rent.map((providerName) => ({ provider_name: providerName })),
          providers.offers.buy.map((providerName) => ({ provider_name: providerName })),
          providers.preferredWatchUrl ?? undefined
        );

        item.platforms = providers.platforms;
        item.preferredProvider = preferred.preferredProvider;
        item.preferredWatchUrl = preferred.preferredWatchUrl;
        item.offers = providers.offers;
        if (imdbId) {
          item.imdbRating = await getOmdbImdbRating(imdbId);
          item.imdbUrl = `https://www.imdb.com/title/${imdbId}/`;
        }
      } catch {
        item.platforms = [];
        item.preferredProvider = null;
        item.preferredWatchUrl = null;
        item.offers = { flatrate: [], rent: [], buy: [] };
        item.imdbRating = null;
        item.imdbUrl = null;
      }
    })
  );

  cache.set(normalizedQuery, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: base,
  });

  return { items: base, cacheHit: false };
}
