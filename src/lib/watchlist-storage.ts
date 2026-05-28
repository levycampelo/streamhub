export type WatchStatus = "pending" | "watching" | "completed";

export type WatchlistItem = {
  key: string;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  overview: string;
  posterPath: string | null;
  platforms: string[];
  preferredProvider: string | null;
  preferredWatchUrl: string | null;
  status: WatchStatus;
  favorite: boolean;
  progress: number;
  addedAt: number;
};

const STORAGE_KEY = "streamhub-watchlist-v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): WatchlistItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as WatchlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: WatchlistItem[]): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getWatchlist(): WatchlistItem[] {
  return readAll().sort((a, b) => b.addedAt - a.addedAt);
}

export function buildWatchlistKey(mediaType: "movie" | "tv", id: number): string {
  return `${mediaType}-${id}`;
}

export function addToWatchlist(
  payload: Omit<WatchlistItem, "key" | "status" | "favorite" | "progress" | "addedAt">
): { added: boolean; item: WatchlistItem } {
  const current = readAll();
  const key = buildWatchlistKey(payload.mediaType, payload.id);
  const existing = current.find((item) => item.key === key);

  if (existing) {
    return { added: false, item: existing };
  }

  const created: WatchlistItem = {
    ...payload,
    key,
    status: "pending",
    favorite: false,
    progress: 0,
    addedAt: Date.now(),
  };

  writeAll([created, ...current]);
  return { added: true, item: created };
}

export function removeFromWatchlist(key: string): WatchlistItem[] {
  const next = readAll().filter((item) => item.key !== key);
  writeAll(next);
  return next;
}

export function updateWatchlistStatus(key: string, status: WatchStatus): WatchlistItem[] {
  const next = readAll().map((item) =>
    item.key === key
      ? {
          ...item,
          status,
          progress: status === "completed" ? 100 : item.progress,
        }
      : item
  );
  writeAll(next);
  return next;
}

export function toggleWatchlistFavorite(key: string): WatchlistItem[] {
  const next = readAll().map((item) =>
    item.key === key
      ? {
          ...item,
          favorite: !item.favorite,
        }
      : item
  );
  writeAll(next);
  return next;
}

export function updateWatchlistProgress(key: string, progress: number): WatchlistItem[] {
  const bounded = Math.max(0, Math.min(100, progress));
  const next = readAll().map((item) =>
    item.key === key
      ? (() => {
          const status: WatchStatus = bounded >= 100 ? "completed" : bounded > 0 ? "watching" : "pending";
          return {
            ...item,
            progress: bounded,
            status,
          };
        })()
      : item
  );
  writeAll(next);
  return next;
}
