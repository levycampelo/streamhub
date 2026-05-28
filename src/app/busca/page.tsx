"use client";

import Link from "next/link";
import { NavBar } from "@/components/nav-bar";
import { addToWatchlist, buildWatchlistKey, getWatchlist } from "@/lib/watchlist-storage";
import { FormEvent, useEffect, useState } from "react";

type SearchItem = {
  id: number;
  mediaType: "movie" | "tv";
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

type SearchResponse = {
  items: SearchItem[];
  cacheHit: boolean;
  error?: string;
};

function formatType(item: SearchItem): string {
  return item.mediaType === "movie" ? "Filme" : "Serie";
}

function buildWatchLabel(provider: string | null): string {
  if (!provider) {
    return "Ver onde assistir";
  }

  const normalized = provider.toLowerCase();
  if (normalized === "netflix") {
    return "Ver na Netflix";
  }

  if (normalized === "prime video") {
    return "Ver no Prime Video";
  }

  if (normalized === "apple tv" || normalized === "apple tv+" || normalized === "apple tv plus") {
    return "Ver no Apple TV";
  }

  if (normalized === "disney+") {
    return "Ver no Disney+";
  }

  if (normalized === "max") {
    return "Ver na Max";
  }

  if (normalized === "paramount+") {
    return "Ver no Paramount+";
  }

  return `Ver em ${provider}`;
}

export default function BuscaPage() {
  const [query, setQuery] = useState("John Wick");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cacheHit, setCacheHit] = useState(false);
  const [watchlistKeys, setWatchlistKeys] = useState<string[]>([]);
  const [watchlistFeedback, setWatchlistFeedback] = useState("");

  useEffect(() => {
    setWatchlistKeys(getWatchlist().map((item) => item.key));
  }, []);

  async function runSearch(nextQuery: string) {
    const normalized = nextQuery.trim();
    if (!normalized) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/search/universal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: normalized }),
      });

      const data = (await response.json()) as SearchResponse;
      if (!response.ok) {
        setErrorMessage(data.error ?? "Erro ao buscar conteudo.");
        setResults([]);
        return;
      }

      setResults(data.items);
      setCacheHit(data.cacheHit);
    } catch {
      setErrorMessage("Falha de conexao com a API de busca.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  function handleAddToWatchlist(item: SearchItem) {
    const response = addToWatchlist({
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      overview: item.overview,
      posterPath: item.posterPath,
      platforms: item.platforms,
      preferredProvider: item.preferredProvider,
      preferredWatchUrl: item.preferredWatchUrl,
    });

    setWatchlistKeys(getWatchlist().map((watchItem) => watchItem.key));
    setWatchlistFeedback(
      response.added ? `${item.title} adicionado na watchlist.` : `${item.title} ja estava na watchlist.`
    );
  }

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="card section-enter p-6">
          <h2 className="text-2xl font-semibold">Busca universal</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Encontre onde assistir com menos cliques e cache de consultas frequentes.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap gap-2">
            <input
              className="input min-w-[240px] flex-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar filme, serie, anime, documentario..."
            />
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn-ghost" href="/watchlist">
              Ir para watchlist
            </Link>
            <Link className="btn-ghost" href="/deep-links">
              Abrir deep links lab
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
          <p>
            Resultado para: <span className="font-semibold text-[var(--text)]">{query}</span>
          </p>
          <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
            Cache: {cacheHit ? "hit" : "miss"}
          </span>
        </div>

        {errorMessage ? (
          <article className="card mt-3 p-4 text-sm text-[#ffb4b9]">
            Nao foi possivel buscar no TMDB. Detalhe: {errorMessage}
          </article>
        ) : null}

        {watchlistFeedback ? (
          <article className="card mt-3 p-3 text-sm text-[#bfe7ff]">{watchlistFeedback}</article>
        ) : null}

        <div className="mt-3 grid gap-3">
          {results.length === 0 && !errorMessage ? (
            <article className="card p-4 text-sm text-[var(--muted)]">
              Nenhum conteudo encontrado ainda. Faça uma busca para iniciar.
            </article>
          ) : (
            results.map((item, index) => (
              <article
                key={`${item.mediaType}-${item.id}`}
                className={`card p-4 section-enter ${index < 3 ? "stagger-1" : "stagger-2"}`}
              >
                <div className="flex gap-4">
                  {item.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                      alt={item.title}
                      className="h-24 w-16 rounded-md border border-[var(--line)] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-24 w-16 items-center justify-center rounded-md border border-[var(--line)] bg-[#0a1222] text-[10px] text-[var(--muted)]">
                      Sem capa
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatType(item)} • {item.year} • IMDb {item.imdbRating?.toFixed(1) ?? "-"} • TMDB {item.voteAverage.toFixed(1)}
                    </p>
                    {item.imdbUrl ? (
                      <a
                        href={item.imdbUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-block text-xs font-semibold text-[#7be1ff] hover:underline"
                      >
                        Ver criticas no IMDb
                      </a>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                      {item.overview}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Plataformas: {item.platforms.length > 0 ? item.platforms.join(", ") : "Sem dados no momento"}
                    </p>
                    {item.preferredWatchUrl ? (
                      <a
                        href={item.preferredWatchUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-block text-sm font-semibold text-[#7be1ff] hover:underline"
                      >
                        {buildWatchLabel(item.preferredProvider)}
                      </a>
                    ) : null}
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => handleAddToWatchlist(item)}
                        disabled={watchlistKeys.includes(buildWatchlistKey(item.mediaType, item.id))}
                      >
                        {watchlistKeys.includes(buildWatchlistKey(item.mediaType, item.id))
                          ? "Ja na watchlist"
                          : "Adicionar na watchlist"}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Assinatura: {item.offers.flatrate.length} | Aluguel: {item.offers.rent.length} | Compra: {item.offers.buy.length}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
