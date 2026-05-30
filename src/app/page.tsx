import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { NavBar } from "@/components/nav-bar";
import { DeepLinkAnchor } from "@/components/deep-link-anchor";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { listSubscriptions, parseSubscriptionsCookie, setSubscriptions, SUBSCRIPTIONS_COOKIE_NAME } from "@/lib/user-data";
import { normalizeProviderName as normalizeDeepLinkProvider, type DeepLinkProvider } from "@/lib/deep-links";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Onde assistir filmes e series com comparador de streaming",
  description:
    "Encontre onde assistir filmes e series, compare catalogos, organize watchlist e descubra como economizar nas assinaturas de streaming.",
  keywords: [
    "onde assistir filmes",
    "onde assistir series",
    "comparador de streaming",
    "catalogo de streaming",
    "filmes online",
    "series online",
    "plataformas de streaming",
    "watchlist de filmes",
    "recomendacao de streaming",
  ],
  alternates: {
    canonical: "/",
  },
};

type TmdbTrendingItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
};

type TmdbTrendingResponse = {
  results: TmdbTrendingItem[];
};

type ProviderRecord = {
  provider_name: string;
};

type TmdbProvidersResponse = {
  results?: {
    BR?: {
      flatrate?: ProviderRecord[];
      rent?: ProviderRecord[];
      buy?: ProviderRecord[];
    };
  };
};

type TrendingCard = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  poster: string;
  tag: string;
  deepLinkUrl: string | null;
  webFallbackUrl: string | null;
  linkProvider: DeepLinkProvider | null;
};

const TMDB_PROVIDER_IDS: Record<string, number> = {
  netflix: 8,
  "prime video": 119,
  "disney+": 337,
  max: 384,
  "apple tv+": 350,
  "paramount+": 531,
  globoplay: 307,
};

function normalizeServiceName(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (normalized.includes("amazon prime") || normalized === "prime video") {
    return "prime video";
  }

  if (normalized.includes("disney")) {
    return "disney+";
  }

  if (normalized.includes("hbo max") || normalized === "max") {
    return "max";
  }

  if (normalized.includes("apple tv")) {
    return "apple tv+";
  }

  if (normalized.includes("paramount")) {
    return "paramount+";
  }

  if (normalized.includes("netflix")) {
    return "netflix";
  }

  if (normalized.includes("globoplay")) {
    return "globoplay";
  }

  return normalized;
}

function toTmdbProviderIds(services: string[]): number[] {
  return [
    ...new Set(
      services
        .map((service) => TMDB_PROVIDER_IDS[normalizeServiceName(service)])
        .filter((id): id is number => Number.isFinite(id))
    ),
  ];
}

async function fetchTmdbData<T>(path: string, params: Record<string, string>): Promise<T> {
  const { headers, apiKeyForQuery } = getTmdbAuth();
  const url = new URL(`https://api.themoviedb.org/3${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  if (apiKeyForQuery) {
    url.searchParams.set("api_key", apiKeyForQuery);
  }

  const response = await fetch(url.toString(), {
    headers,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB ${path} retornou ${response.status}`);
  }

  const data = (await response.json()) as T;
  return data;
}

async function fetchTmdbCollection(path: string, params: Record<string, string>): Promise<TmdbTrendingItem[]> {
  const data = await fetchTmdbData<TmdbTrendingResponse>(path, params);
  return data.results;
}

function toTrendingCards(items: TmdbTrendingItem[], mediaType: "movie" | "tv", limit = 12): TrendingCard[] {
  return items
    .filter((item) => item.poster_path)
    .slice(0, limit)
    .map((item) => {
      const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4) || "-";
      const score = item.vote_average?.toFixed(1) ?? "-";
      const title = item.title ?? item.name ?? "Sem titulo";
      const mediaLabel = mediaType === "movie" ? "Filme" : "Serie";

      return {
        id: item.id,
        mediaType,
        title,
        poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        tag: `${mediaLabel} • ${year} • Nota ${score}`,
        deepLinkUrl: null,
        webFallbackUrl: null,
        linkProvider: null,
      };
    });
}

function interleaveCards(first: TrendingCard[], second: TrendingCard[], maxItems = 12): TrendingCard[] {
  const merged: TrendingCard[] = [];
  const maxLength = Math.max(first.length, second.length);

  for (let index = 0; index < maxLength && merged.length < maxItems; index += 1) {
    if (first[index]) {
      merged.push(first[index]);
    }
    if (second[index] && merged.length < maxItems) {
      merged.push(second[index]);
    }
  }

  return merged;
}

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

async function fetchTrendingWeek(mediaType: "movie" | "tv"): Promise<TrendingCard[]> {
  const data = await fetchTmdbCollection(`/trending/${mediaType}/week`, {
    language: "pt-BR",
  });

  return toTrendingCards(data, mediaType);
}

async function fetchPopularWorldwide(): Promise<TrendingCard[]> {
  const [movies, series] = await Promise.all([
    fetchTmdbCollection("/movie/popular", {
      language: "pt-BR",
      page: "1",
    }),
    fetchTmdbCollection("/tv/popular", {
      language: "pt-BR",
      page: "1",
    }),
  ]);

  return interleaveCards(
    toTrendingCards(movies, "movie", 6),
    toTrendingCards(series, "tv", 6)
  );
}

async function fetchProviderCatalog(mediaType: "movie" | "tv", providerIds: number[]): Promise<TrendingCard[]> {
  const data = await fetchTmdbCollection(`/discover/${mediaType}`, {
    language: "pt-BR",
    page: "1",
    include_adult: "false",
    sort_by: "popularity.desc",
    watch_region: "BR",
    with_watch_monetization_types: "flatrate",
    with_watch_providers: providerIds.join("|"),
  });

  return toTrendingCards(data, mediaType);
}

function uniqueProvidersSortedAlphabetically(values: DeepLinkProvider[]): DeepLinkProvider[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function buildProviderSearchUrl(provider: DeepLinkProvider, title: string): string {
  const query = encodeURIComponent(title.trim());

  switch (provider) {
    case "Netflix":
      return `https://www.netflix.com/search?q=${query}`;
    case "Prime Video":
      return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
    case "Disney+":
      return `https://www.disneyplus.com/search?q=${query}`;
    case "Max":
      return `https://play.max.com/search?q=${query}`;
    case "Apple TV+":
      return `https://tv.apple.com/br/search?term=${query}`;
    case "Paramount+":
      return `https://www.paramountplus.com/br/search/?q=${query}`;
    case "Globoplay":
      return `https://globoplay.globo.com/busca/?q=${query}`;
    case "YouTube":
      return `https://www.youtube.com/results?search_query=${query}`;
    case "Spotify":
      return `https://open.spotify.com/search/${query}`;
    case "Crunchyroll":
      return `https://www.crunchyroll.com/search?q=${query}`;
    default:
      return `https://www.google.com/search?q=${query}`;
  }
}

async function attachDeepLinksForSubscriptions(
  cards: TrendingCard[],
  subscribedProviders: DeepLinkProvider[]
): Promise<TrendingCard[]> {
  if (subscribedProviders.length === 0) {
    return cards;
  }

  const subscribedSet = new Set(subscribedProviders);

  return Promise.all(
    cards.map(async (card) => {
      try {
        const providerData = await fetchTmdbData<TmdbProvidersResponse>(`/${card.mediaType}/${card.id}/watch/providers`, {});
        const br = providerData.results?.BR;
        const rawProviders = [
          ...(br?.flatrate ?? []),
          ...(br?.rent ?? []),
          ...(br?.buy ?? []),
        ];

        const availableProviders = uniqueProvidersSortedAlphabetically(
          rawProviders
            .map((provider) => normalizeDeepLinkProvider(provider.provider_name))
            .filter((provider): provider is DeepLinkProvider => provider !== null)
        );

        const matchingProviders = availableProviders.filter((provider) => subscribedSet.has(provider));
        if (matchingProviders.length === 0) {
          return card;
        }

        const selectedProvider = uniqueProvidersSortedAlphabetically(matchingProviders)[0];
        const universalProviderUrl = buildProviderSearchUrl(selectedProvider, card.title);

        return {
          ...card,
          deepLinkUrl: universalProviderUrl,
          webFallbackUrl: universalProviderUrl,
          linkProvider: selectedProvider,
        };
      } catch {
        return card;
      }
    })
  );
}

const streamingServices = [
  {
    name: "Netflix",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    logoClass: "service-logo--strong",
    href: "https://www.netflix.com/br/",
    price: "R$ 55,90",
    label: "Catalogo forte em series",
    tier: "Series premium",
    accent: "#e50914",
  },
  {
    name: "Disney+",
    logo: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg",
    logoClass: "service-logo--strong",
    href: "https://www.disneyplus.com/pt-br",
    price: "R$ 43,90",
    label: "Marvel, Pixar e Star Wars",
    tier: "Familia e franquias",
    accent: "#4ca3ff",
  },
  {
    name: "Prime Video",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png",
    logoClass: "service-logo--strong",
    href: "https://www.primevideo.com/",
    price: "R$ 19,90",
    label: "Melhor custo-beneficio",
    tier: "Entrada economica",
    accent: "#22d3ee",
  },
  {
    name: "Max",
    logo: "/logos/max.svg",
    logoClass: "service-logo--strong",
    href: "https://www.max.com/br/pt",
    price: "R$ 22,90",
    label: "HBO e grandes lancamentos",
    tier: "Filmes e drama",
    accent: "#b489ff",
  },
  {
    name: "Paramount+",
    logo: "/logos/paramount-plus.svg",
    logoClass: "service-logo--strong",
    href: "https://www.paramountplus.com/br/",
    price: "R$ 34,90",
    label: "Franquias, filmes e series exclusivas",
    tier: "Catalogo exclusivo",
    accent: "#8fb4ff",
  },
];

const experienceSlides = [
  {
    kicker: "Radar pessoal",
    title: "Descubra o que vale ver hoje",
    text: "A curadoria mistura popularidade, nota e seus streamings ativos para reduzir tempo perdido escolhendo titulo.",
    accent: "#58d2ff",
    cta: "/busca",
    ctaLabel: "Explorar catalogo",
  },
  {
    kicker: "Orcamento sob controle",
    title: "Cancele excessos sem perder conteudo",
    text: "Visualize gasto mensal, identifique servicos com baixo uso e simule economia antes de tomar decisao.",
    accent: "#7dffb1",
    cta: "/assinaturas",
    ctaLabel: "Revisar assinaturas",
  },
  {
    kicker: "Watchlist unificada",
    title: "Salve filmes e series em um fluxo unico",
    text: "Adicione titulos uma vez, acompanhe progresso e abra direto no provider correto com fallback quando necessario.",
    accent: "#ffb46a",
    cta: "/watchlist",
    ctaLabel: "Abrir watchlist",
  },
  {
    kicker: "Concierge orientado a acao",
    title: "Receba recomendacoes com impacto real",
    text: "A IA analisa seu contexto para sugerir combinacoes de catalogo e passos praticos para gastar menos.",
    accent: "#ff8aa8",
    cta: "/concierge",
    ctaLabel: "IA Concierge",
  },
];

export default async function HomePage() {
  const authenticatedUserId = await getAuthenticatedUserId();
  if (authenticatedUserId) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SUBSCRIPTIONS_COOKIE_NAME)?.value;
    const parsed = parseSubscriptionsCookie(cookieValue);
    if (parsed) {
      setSubscriptions(authenticatedUserId, parsed);
    }
  }

  const activeServices = authenticatedUserId ? listSubscriptions(authenticatedUserId).map((item) => item.service) : [];
  const subscribedDeepLinkProviders = uniqueProvidersSortedAlphabetically(
    activeServices
      .map((service) => normalizeDeepLinkProvider(service))
      .filter((provider): provider is DeepLinkProvider => provider !== null)
  );
  const activeProviderIds = toTmdbProviderIds(activeServices);
  const isPersonalizedCatalog = activeProviderIds.length > 0;

  let trendingMovies: TrendingCard[] = [];
  let trendingSeries: TrendingCard[] = [];
  let popularWorldwide: TrendingCard[] = [];
  let trendingError = "";
  let popularError = "";

  try {
    if (isPersonalizedCatalog) {
      [trendingMovies, trendingSeries] = await Promise.all([
        fetchProviderCatalog("movie", activeProviderIds),
        fetchProviderCatalog("tv", activeProviderIds),
      ]);
    } else {
      [trendingMovies, trendingSeries] = await Promise.all([
        fetchTrendingWeek("movie"),
        fetchTrendingWeek("tv"),
      ]);
    }
  } catch (error) {
    trendingError = error instanceof Error ? error.message : "Erro ao carregar trending da semana";
  }

  try {
    if (isPersonalizedCatalog) {
      const [catalogMovies, catalogSeries] = await Promise.all([
        fetchProviderCatalog("movie", activeProviderIds),
        fetchProviderCatalog("tv", activeProviderIds),
      ]);
      popularWorldwide = interleaveCards(catalogMovies, catalogSeries, 12);
    } else {
      popularWorldwide = await fetchPopularWorldwide();
    }
  } catch (error) {
    popularError = error instanceof Error ? error.message : "Erro ao carregar populares";
  }

  if (subscribedDeepLinkProviders.length > 0) {
    [trendingMovies, trendingSeries, popularWorldwide] = await Promise.all([
      attachDeepLinksForSubscriptions(trendingMovies, subscribedDeepLinkProviders),
      attachDeepLinksForSubscriptions(trendingSeries, subscribedDeepLinkProviders),
      attachDeepLinksForSubscriptions(popularWorldwide, subscribedDeepLinkProviders),
    ]);
  }

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Share StreamHub",
    url: siteUrl,
    inLanguage: "pt-BR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/busca`,
      "query-input": "required name=search_term_string",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Comparador de streaming e descoberta de conteudo",
    provider: {
      "@type": "Organization",
      name: "Share StreamHub",
      url: siteUrl,
    },
    areaServed: "BR",
    audience: {
      "@type": "Audience",
      audienceType: "Publico que busca onde assistir filmes e series",
    },
  };

  return (
    <main className="min-h-screen pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <NavBar />

      <section className="section-enter mx-auto max-w-6xl px-4">
        <div className="card overflow-hidden p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8aa8d2]">Painel de entretenimento</p>
          <h2
            className="mt-2 text-5xl leading-[0.95] md:text-7xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            MENOS CAOS.
            <br />
            MAIS STREAM.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-[var(--muted)] md:text-base">
            Descubra onde assistir, controle gastos e receba sugestoes de economia no mesmo lugar.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 section-enter stagger-1">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-2xl font-semibold">Seu fluxo no StreamHub</h3>
          <span className="rounded-full border border-[var(--line)] bg-[#0c1628] px-3 py-1 text-xs text-[var(--muted)]">
            Carrossel de experiencia
          </span>
        </div>

        <div className="feature-carousel">
          {experienceSlides.map((slide, index) => (
            <article key={slide.title} className="feature-card">
              <div className="feature-card-glow" style={{ backgroundColor: slide.accent }} aria-hidden="true" />
              <p className="feature-kicker">{slide.kicker}</p>
              <h4 className="feature-title">{slide.title}</h4>
              <p className="feature-text">{slide.text}</p>
              <div className="feature-footer">
                <span className="feature-index">0{index + 1}</span>
                <Link className="feature-link" href={slide.cta}>
                  {slide.ctaLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 section-enter stagger-2">
        {isPersonalizedCatalog ? (
          <p className="mb-3 text-sm text-[var(--muted)]">
            Catalogo personalizado para suas assinaturas: <span className="text-[#7be1ff]">{activeServices.join(", ")}</span>
          </p>
        ) : null}

        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-2xl font-semibold">
            {isPersonalizedCatalog ? "Filmes nos seus streamings" : "Trending week: filmes"}
          </h3>
          <span className="text-sm text-[var(--muted)]">
            {isPersonalizedCatalog ? "TMDB • filtrado por assinatura" : "TMDB • semana atual"}
          </span>
        </div>

        {trendingError ? (
          <article className="card p-4 text-sm text-[#ffb4b9]">
            Nao foi possivel carregar os filmes em alta desta semana. Detalhe: {trendingError}
          </article>
        ) : (
          <div className="poster-carousel">
            {trendingMovies.map((item) => (
              <article key={`movie-${item.id}`} className="poster-card">
                <DeepLinkAnchor
                  appUrl={item.deepLinkUrl}
                  webUrl={item.webFallbackUrl}
                  className="block h-full"
                  title={`Abrir em ${item.linkProvider ?? "streaming"}`}
                >
                  <img src={item.poster} alt={item.title} className="poster-image" loading="lazy" />
                  <div className="poster-overlay">
                    <p className="poster-tag">{item.tag}</p>
                    <h4>{item.title}</h4>
                  </div>
                </DeepLinkAnchor>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 section-enter stagger-2">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-2xl font-semibold">
            {isPersonalizedCatalog ? "Series nos seus streamings" : "Trending week: series"}
          </h3>
          <span className="text-sm text-[var(--muted)]">
            {isPersonalizedCatalog ? "TMDB • filtrado por assinatura" : "TMDB • semana atual"}
          </span>
        </div>

        {!trendingError ? (
          <div className="poster-carousel">
            {trendingSeries.map((item) => (
              <article key={`tv-${item.id}`} className="poster-card">
                <DeepLinkAnchor
                  appUrl={item.deepLinkUrl}
                  webUrl={item.webFallbackUrl}
                  className="block h-full"
                  title={`Abrir em ${item.linkProvider ?? "streaming"}`}
                >
                  <img src={item.poster} alt={item.title} className="poster-image" loading="lazy" />
                  <div className="poster-overlay">
                    <p className="poster-tag">{item.tag}</p>
                    <h4>{item.title}</h4>
                  </div>
                </DeepLinkAnchor>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 section-enter stagger-2">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-2xl font-semibold">
            {isPersonalizedCatalog ? "Mais populares entre seus streamings" : "Mais vistos no mundo"}
          </h3>
          <span className="text-sm text-[var(--muted)]">
            {isPersonalizedCatalog ? "TMDB • catalogo personalizado" : "TMDB • popularidade global"}
          </span>
        </div>

        {!popularError ? (
          <div className="poster-carousel">
            {popularWorldwide.map((item) => (
              <article key={`world-${item.id}`} className="poster-card">
                <DeepLinkAnchor
                  appUrl={item.deepLinkUrl}
                  webUrl={item.webFallbackUrl}
                  className="block h-full"
                  title={`Abrir em ${item.linkProvider ?? "streaming"}`}
                >
                  <img src={item.poster} alt={item.title} className="poster-image" loading="lazy" />
                  <div className="poster-overlay">
                    <p className="poster-tag">{item.tag}</p>
                    <h4>{item.title}</h4>
                  </div>
                </DeepLinkAnchor>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mx-auto mt-7 max-w-6xl px-4 section-enter stagger-3">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-2xl font-semibold">Streamings populares</h3>
            <p className="text-sm text-[var(--muted)]">Compare rapidamente preco, foco de catalogo e melhor opcao para seu perfil</p>
          </div>
          <span className="service-section-pill">Atualizado para Brasil</span>
        </div>
        <div className="service-showcase-grid">
          {streamingServices.map((service) => (
            <a
              key={service.name}
              href={service.href}
              target="_blank"
              rel="noreferrer noopener"
              className="service-showcase-card"
              style={{ "--service-accent": service.accent } as React.CSSProperties}
            >
              <div className="service-card-topline" aria-hidden="true" />
              <div className="service-logo-wrap service-logo-wrap--showcase">
                <img
                  src={service.logo}
                  alt={`Logo ${service.name}`}
                  className={`service-logo ${service.logoClass ?? ""}`}
                  loading="lazy"
                />
              </div>
              <div className="service-meta-row">
                <span className="service-meta-label">A partir de</span>
                <span className="service-tier-chip">{service.tier}</span>
              </div>
              <p className="service-price">{service.price}</p>
              <p className="service-description">{service.label}</p>
              <div style={{ marginTop: "auto" }}>
                <p className="service-cta">Ver planos e contratar</p>
              </div>
            </a>
          ))}
        </div>
      </section>

    </main>
  );
}
