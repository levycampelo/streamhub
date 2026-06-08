"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import {
  getWatchlist,
  removeFromWatchlist,
  toggleWatchlistFavorite,
  updateWatchlistProgress,
  updateWatchlistStatus,
  type WatchStatus,
} from "@/lib/watchlist-storage";

const STREAM_FILTERS = ["todos", "Netflix", "Prime Video", "Disney+", "Max"] as const;

type StreamFilter = (typeof STREAM_FILTERS)[number];

type Subscription = {
  id: string;
  service: string;
  monthlyPrice: number;
  lastUsedDays: number;
};

function normalizeProviderName(value: string): string {
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

  if (normalized.includes("netflix")) {
    return "netflix";
  }

  return normalized;
}

function hasProviderMatch(platforms: string[], subscribedServices: string[]): boolean {
  const subscribed = new Set(subscribedServices.map(normalizeProviderName));
  return platforms.some((platform) => subscribed.has(normalizeProviderName(platform)));
}

function statusLabel(status: WatchStatus): string {
  if (status === "pending") return "Pendente";
  if (status === "watching") return "Assistindo";
  return "Concluido";
}

function statusClasses(status: WatchStatus): string {
  if (status === "pending") return "border-[#394f72] bg-[#132238] text-[#b8d8ff]";
  if (status === "watching") return "border-[#7a5f1b] bg-[#312612] text-[#ffd67f]";
  return "border-[#2e6a4a] bg-[#153223] text-[#98efbe]";
}

export default function WatchlistPage() {
  const [items, setItems] = useState(getWatchlist());
  const [statusFilter, setStatusFilter] = useState<WatchStatus | "all">("all");
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("todos");
  const [subscribedServices, setSubscribedServices] = useState<string[]>([]);

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const response = await fetch("/api/subscriptions");
        if (!response.ok) return;

        const data = (await response.json()) as { subscriptions?: Subscription[] };
        setSubscribedServices((data.subscriptions ?? []).map((sub) => sub.service));
      } catch {
        setSubscribedServices([]);
      }
    }

    void loadSubscriptions();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusMatch = statusFilter === "all" ? true : item.status === statusFilter;
      const streamMatch =
        streamFilter === "todos"
          ? true
          : item.preferredProvider === streamFilter || item.platforms.includes(streamFilter);

      return statusMatch && streamMatch;
    });
  }, [items, statusFilter, streamFilter]);

  const summary = useMemo(() => {
    const pending = items.filter((item) => item.status === "pending").length;
    const watching = items.filter((item) => item.status === "watching").length;
    const completed = items.filter((item) => item.status === "completed").length;
    const favorites = items.filter((item) => item.favorite).length;

    return { pending, watching, completed, favorites };
  }, [items]);

  function handleStatusChange(key: string, nextStatus: WatchStatus) {
    setItems(updateWatchlistStatus(key, nextStatus));
  }

  function handleProgressChange(key: string, nextProgress: number) {
    setItems(updateWatchlistProgress(key, nextProgress));
  }

  function handleToggleFavorite(key: string) {
    setItems(toggleWatchlistFavorite(key));
  }

  function handleRemove(key: string) {
    setItems(removeFromWatchlist(key));
  }

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4 section-enter">
        <div className="card overflow-hidden p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8aa8d2]">Watchlist unificada</p>
          <h2 className="mt-2 text-4xl leading-[0.95] md:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
            CONTINUE DO PONTO CERTO.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] md:text-base">
            Tudo que voce quer assistir em um so lugar: favoritos, progresso, status e atalho para abrir no provedor.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn" href="/busca">
              Adicionar novos titulos
            </Link>
            <Link className="btn-ghost" href="/deep-links">
              Testar Deep Links
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="card p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Pendentes</p>
            <p className="mt-2 text-2xl font-bold">{summary.pending}</p>
          </article>
          <article className="card p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Assistindo</p>
            <p className="mt-2 text-2xl font-bold">{summary.watching}</p>
          </article>
          <article className="card p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Concluidos</p>
            <p className="mt-2 text-2xl font-bold">{summary.completed}</p>
          </article>
          <article className="card p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Favoritos</p>
            <p className="mt-2 text-2xl font-bold">{summary.favorites}</p>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4">
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-[var(--muted)]">Status:</p>
            {(["all", "pending", "watching", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusFilter === status
                    ? "border-[#4d8fff] bg-[#173360] text-[#e9f3ff]"
                    : "border-[var(--line)] bg-[#0d1628] text-[var(--muted)]"
                }`}
              >
                {status === "all" ? "Todos" : statusLabel(status)}
              </button>
            ))}

            <p className="ml-2 text-sm text-[var(--muted)]">Streaming:</p>
            <select
              className="input max-w-[180px]"
              value={streamFilter}
              onChange={(event) => setStreamFilter(event.target.value as StreamFilter)}
            >
              {STREAM_FILTERS.map((stream) => (
                <option key={stream} value={stream}>
                  {stream === "todos" ? "Todos" : stream}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4">
        {filteredItems.length === 0 ? (
          <article className="card p-5 text-sm text-[var(--muted)]">
            Sua watchlist esta vazia. Va para a busca e adicione alguns titulos para iniciar o teste.
          </article>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item, index) => (
              <article key={item.key} className={`card p-4 section-enter ${index < 3 ? "stagger-1" : "stagger-2"}`}>
                <div className="flex flex-col gap-4 md:flex-row">
                  {item.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                      alt={item.title}
                      className="h-36 w-24 rounded-md border border-[var(--line)] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-36 w-24 items-center justify-center rounded-md border border-[var(--line)] bg-[#0a1222] text-xs text-[var(--muted)]">
                      Sem capa
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.mediaType === "movie" ? "Filme" : "Serie"} • {item.year} • {item.preferredProvider ?? "Sem provider preferido"}
                    </p>

                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{item.overview}</p>

                    {subscribedServices.length > 0 && item.platforms.length > 0 && !hasProviderMatch(item.platforms, subscribedServices) ? (
                      <div className="mt-3 rounded-xl border border-[#6f5a1c] bg-[#2d250f] p-3 text-xs text-[#ffd67f]">
                        Este titulo nao esta nos streamings que voce cadastrou em Assinaturas.
                        <br />
                        Disponivel em: {item.platforms.join(", ")}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <label className="text-xs text-[var(--muted)]">Progresso: {item.progress}%</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={item.progress}
                        onChange={(event) => handleProgressChange(item.key, Number(event.target.value))}
                        className="mt-1 w-full"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-ghost" onClick={() => handleStatusChange(item.key, "pending")}>
                        Marcar pendente
                      </button>
                      <button className="btn-ghost" onClick={() => handleStatusChange(item.key, "watching")}>
                        Marcar assistindo
                      </button>
                      <button className="btn-ghost" onClick={() => handleStatusChange(item.key, "completed")}>
                        Marcar concluido
                      </button>
                      <button className="btn-ghost" onClick={() => handleToggleFavorite(item.key)}>
                        {item.favorite ? "Remover favorito" : "Favoritar"}
                      </button>
                      <button className="btn-ghost" onClick={() => handleRemove(item.key)}>
                        Remover
                      </button>
                      {item.preferredWatchUrl ? (
                        <a
                          href={item.preferredWatchUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn"
                        >
                          Abrir no web
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
