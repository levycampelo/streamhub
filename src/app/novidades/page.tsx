import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/nav-bar";
import {
  MONITORED_PROVIDERS,
  fetchLatestStreamingNews,
  type NewsCategory,
  type ProviderKey,
} from "@/lib/streaming-news";

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

function parseProvider(value?: string): ProviderKey | undefined {
  if (!value) return undefined;
  const normalized = value as ProviderKey;
  return normalized in MONITORED_PROVIDERS ? normalized : undefined;
}

type NovidadesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NovidadesPage({ searchParams }: NovidadesPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const providerParam = Array.isArray(resolvedParams.provider)
    ? resolvedParams.provider[0]
    : resolvedParams.provider;

  const selectedProvider = parseProvider(providerParam);
  const feed = await fetchLatestStreamingNews(selectedProvider, 150);

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="card section-enter p-6">
          <h1 className="text-3xl font-semibold">Novidades dos Streamings</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Monitoramento diario por TMDb para BR sem baixar catalogo completo.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Snapshot atual: {feed.snapshotDate ?? "--"} | Snapshot anterior: {feed.previousSnapshotDate ?? "--"}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/novidades"
              className={
                "rounded-lg border px-3 py-1.5 text-sm font-semibold " +
                (!selectedProvider
                  ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                  : "border-[var(--line)] bg-[#0c1628] text-[var(--text)]")
              }
            >
              Todos
            </Link>
            {providers.map((provider) => (
              <Link
                key={provider.key}
                href={`/novidades?provider=${provider.key}`}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm font-semibold " +
                  (selectedProvider === provider.key
                    ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                    : "border-[var(--line)] bg-[#0c1628] text-[var(--text)]")
                }
              >
                {provider.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <article className="card p-4">
            <h2 className="text-lg font-semibold">Entradas e saidas (dia)</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Eventos detectados por comparacao entre snapshot atual e anterior.
            </p>
            <div className="mt-3 grid gap-2">
              {feed.events.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sem eventos para o filtro atual.</p>
              ) : (
                feed.events.map((event) => (
                  <div
                    key={`${event.eventDate}-${event.eventType}-${event.providerKey}-${event.mediaType}-${event.tmdbId}-${event.category}`}
                    className="rounded-lg border border-[var(--line)] bg-[#0b1424] p-3"
                  >
                    <p className="text-xs text-[var(--muted)]">
                      {event.providerName} • {categoryLabel[event.category]} • {event.mediaType === "movie" ? "Filme" : "Serie"}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs">
                      {event.eventType === "added" ? "Entrou no monitoramento" : "Saiu do monitoramento"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="card p-4">
            <h2 className="text-lg font-semibold">Catalogo monitorado (snapshot)</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Itens coletados em Trending, Popular e Lancamentos (12 meses).
            </p>
            <div className="mt-3 grid gap-2">
              {feed.items.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Nenhum item disponivel ainda. Execute o sync diario.</p>
              ) : (
                feed.items.map((item) => (
                  <div
                    key={`${item.providerKey}-${item.mediaType}-${item.tmdbId}-${item.category}`}
                    className="flex gap-3 rounded-lg border border-[var(--line)] bg-[#0b1424] p-3"
                  >
                    {item.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                        alt={item.title}
                        className="h-20 w-14 rounded border border-[var(--line)] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded border border-[var(--line)] text-[10px] text-[var(--muted)]">
                        Sem capa
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[var(--muted)]">
                        {item.providerName} • {categoryLabel[item.category]}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {item.mediaType === "movie" ? "Filme" : "Serie"} • Lancamento {item.releaseDate ?? "--"} • Nota {item.voteAverage?.toFixed(1) ?? "--"}
                      </p>
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
