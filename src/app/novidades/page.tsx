import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import {
  MONITORED_PROVIDERS,
  fetchLatestStreamingNews,
  type NewsCategory,
  type ProviderKey,
} from "@/lib/streaming-news";
import { getAuthenticatedUserId } from "@/lib/auth-user";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Novidades dos Streamings no Brasil",
  description:
    "Acompanhe novidades dos streamings no Brasil com base em trending, popular e lancamentos dos ultimos 12 meses filtrados por provedor.",
  alternates: {
    canonical: `${siteUrl}/novidades`,
  },
};

const providers = Object.entries(MONITORED_PROVIDERS).map(([key, value]) => ({
  key: key as ProviderKey,
  label: value.label,
}));

const categoryLabel: Record<NewsCategory, string> = {
  trending_movie: "Trending filmes",
  trending_tv: "Trending series",
  popular_movie: "Populares filmes",
  popular_tv: "Populares series",
  recent_movies_12m: "Lancamentos 12 meses",
};

const categoryAccent: Record<NewsCategory, string> = {
  trending_movie: "border-[#2f74d3] bg-[rgba(47,116,211,0.14)] text-[#b7d7ff]",
  trending_tv: "border-[#3f8ad7] bg-[rgba(63,138,215,0.14)] text-[#bfe4ff]",
  popular_movie: "border-[#5875b8] bg-[rgba(88,117,184,0.16)] text-[#d0ddff]",
  popular_tv: "border-[#4f7bcd] bg-[rgba(79,123,205,0.16)] text-[#cae0ff]",
  recent_movies_12m: "border-[#15a1a4] bg-[rgba(21,161,164,0.16)] text-[#bdf5ef]",
};

const categoryPriority: Record<NewsCategory, number> = {
  trending_movie: 1,
  trending_tv: 1,
  popular_movie: 2,
  popular_tv: 2,
  recent_movies_12m: 3,
};

function parseProvider(value?: string): ProviderKey | undefined {
  if (!value) return undefined;
  const normalized = value as ProviderKey;
  return normalized in MONITORED_PROVIDERS ? normalized : undefined;
}

type NovidadesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NovidadesPage({ searchParams }: NovidadesPageProps) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect("/login");
  }

  const resolvedParams = (await searchParams) ?? {};
  const providerParam = Array.isArray(resolvedParams.provider)
    ? resolvedParams.provider[0]
    : resolvedParams.provider;

  const selectedProvider = parseProvider(providerParam);
  const feed = await fetchLatestStreamingNews(selectedProvider, 150);
  const dedupedItemsMap = new Map<string, (typeof feed.items)[number]>();

  for (const item of feed.items) {
    const key = `${item.providerKey}|${item.mediaType}|${item.tmdbId}`;
    const existing = dedupedItemsMap.get(key);

    if (!existing) {
      dedupedItemsMap.set(key, item);
      continue;
    }

    const existingPriority = categoryPriority[existing.category];
    const nextPriority = categoryPriority[item.category];
    if (nextPriority < existingPriority) {
      dedupedItemsMap.set(key, item);
      continue;
    }

    if (nextPriority === existingPriority) {
      const existingScore = existing.voteAverage ?? 0;
      const nextScore = item.voteAverage ?? 0;
      if (nextScore > existingScore) {
        dedupedItemsMap.set(key, item);
      }
    }
  }

  const dedupedItems = [...dedupedItemsMap.values()];
  const addedCount = feed.events.filter((event) => event.eventType === "added").length;
  const removedCount = feed.events.filter((event) => event.eventType === "removed").length;

  const snapshotByCategory = feed.items.reduce<Record<NewsCategory, number>>(
    (acc, item) => {
      acc[item.category] += 1;
      return acc;
    },
    {
      trending_movie: 0,
      trending_tv: 0,
      popular_movie: 0,
      popular_tv: 0,
      recent_movies_12m: 0,
    }
  );

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="card section-enter overflow-hidden p-0">
          <div className="border-b border-[var(--line)] bg-[radial-gradient(1200px_400px_at_0%_-20%,rgba(32,110,220,0.28),transparent_55%),radial-gradient(900px_340px_at_100%_0%,rgba(11,179,190,0.22),transparent_52%),linear-gradient(145deg,#0a1730_0%,#091225_75%)] px-6 py-7">
            <p className="text-xs uppercase tracking-[0.22em] text-[#f5b544]">Radar URSUS StreamHub</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Novidades dos Streamings</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#b9cbe8] md:text-base">
              Painel diario para Brasil com entradas e saidas de catalogo em Netflix, Disney+, Prime Video e Max.
            </p>
            <p className="mt-3 text-xs text-[#9bb0d2]">
              Snapshot atual: {feed.snapshotDate ?? "--"} | Snapshot anterior: {feed.previousSnapshotDate ?? "--"}
            </p>
          </div>

          <div className="grid gap-3 border-b border-[var(--line)] bg-[#091224] p-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#1f3f6a] bg-[rgba(11,24,48,0.82)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#89ace0]">Entradas do dia</p>
              <p className="mt-1 text-2xl font-semibold text-[#bffce2]">{addedCount}</p>
            </div>
            <div className="rounded-xl border border-[#2f355f] bg-[rgba(15,20,44,0.85)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#9db0d7]">Saidas do dia</p>
              <p className="mt-1 text-2xl font-semibold text-[#ffd1d7]">{removedCount}</p>
            </div>
            <div className="rounded-xl border border-[#22436f] bg-[rgba(9,29,56,0.84)] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#9fc4f2]">Titulos monitorados</p>
              <p className="mt-1 text-2xl font-semibold text-[#f1f7ff]">{dedupedItems.length}</p>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/novidades"
                className={
                  "rounded-xl border px-3.5 py-2 text-sm font-semibold transition " +
                  (!selectedProvider
                    ? "border-[#3c8dff] bg-[#153056] text-[#edf4ff]"
                    : "border-[var(--line)] bg-[#0c1628] text-[var(--text)] hover:border-[#32507d]")
                }
              >
                Todos
              </Link>
              {providers.map((provider) => (
                <Link
                  key={provider.key}
                  href={`/novidades?provider=${provider.key}`}
                  className={
                    "rounded-xl border px-3.5 py-2 text-sm font-semibold transition " +
                    (selectedProvider === provider.key
                      ? "border-[#3c8dff] bg-[#153056] text-[#edf4ff]"
                      : "border-[var(--line)] bg-[#0c1628] text-[var(--text)] hover:border-[#32507d]")
                  }
                >
                  {provider.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.45fr]">
          <article className="card p-4">
            <h2 className="text-lg font-semibold">Timeline de mudancas</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Comparativo entre snapshot atual e snapshot anterior.</p>
            <div className="mt-3 grid max-h-[740px] gap-2 overflow-y-auto pr-1">
              {feed.events.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sem eventos para o filtro atual.</p>
              ) : (
                feed.events.map((event) => (
                  <div
                    key={`${event.eventDate}-${event.eventType}-${event.providerKey}-${event.mediaType}-${event.tmdbId}-${event.category}`}
                    className="rounded-xl border border-[var(--line)] bg-[#0b1424] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          "rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] " +
                          (event.eventType === "added"
                            ? "border-[#1f6f4f] bg-[rgba(27,130,88,0.18)] text-[#b8f4d5]"
                            : "border-[#7e2f44] bg-[rgba(167,47,82,0.18)] text-[#ffc1cf]")
                        }
                      >
                        {event.eventType === "added" ? "Entrou" : "Saiu"}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{event.providerName}</span>
                    </div>

                    <p className="mt-2 text-sm font-semibold leading-snug">{event.title}</p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md border border-[#2c4063] bg-[#0d1a2e] px-2 py-0.5 text-[11px] text-[#bed3f2]">
                        {event.mediaType === "movie" ? "Filme" : "Serie"}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${categoryAccent[event.category]}`}
                      >
                        {categoryLabel[event.category]}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="card p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Catalogo monitorado (snapshot)</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Itens coletados em Trending, Popular e Lancamentos (12 meses).
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(categoryLabel) as NewsCategory[]).map((category) => (
                  <span
                    key={category}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${categoryAccent[category]}`}
                  >
                    {categoryLabel[category]}: {snapshotByCategory[category]}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {feed.items.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum item disponivel ainda. Execute o sync diario.</p>
              ) : (
                dedupedItems.map((item) => (
                  <div
                    key={`${item.providerKey}-${item.mediaType}-${item.tmdbId}-${item.category}`}
                    className="group flex gap-3 rounded-xl border border-[var(--line)] bg-[#0b1424] p-3 transition hover:border-[#3a69a9] hover:bg-[#0d1a2f]"
                  >
                    {item.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                        alt={item.title}
                        className="h-24 w-16 rounded border border-[var(--line)] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-24 w-16 items-center justify-center rounded border border-[var(--line)] text-[10px] text-[var(--muted)]">
                        Sem capa
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[var(--muted)]">{item.providerName}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-md border border-[#2c4063] bg-[#0d1a2e] px-2 py-0.5 text-[11px] text-[#bed3f2]">
                          {item.mediaType === "movie" ? "Filme" : "Serie"}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${categoryAccent[item.category]}`}
                        >
                          {categoryLabel[item.category]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Lancamento {item.releaseDate ?? "--"} • Nota {item.voteAverage?.toFixed(1) ?? "--"}
                      </p>
                      <a
                        href={`https://www.themoviedb.org/${item.mediaType}/${item.tmdbId}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-block text-xs font-semibold text-[#8fc3ff] hover:text-[#b5d8ff]"
                      >
                        Ver no TMDb
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
