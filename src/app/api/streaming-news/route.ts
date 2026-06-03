import { NextRequest, NextResponse } from "next/server";
import { fetchLatestStreamingNews, MONITORED_PROVIDERS, type ProviderKey } from "@/lib/streaming-news";

function parseProvider(value: string | null): ProviderKey | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase() as ProviderKey;
  if (normalized in MONITORED_PROVIDERS) {
    return normalized;
  }
  return undefined;
}

function parseLimit(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.max(1, Math.min(200, Math.floor(n)));
}

export async function GET(request: NextRequest) {
  try {
    const provider = parseProvider(request.nextUrl.searchParams.get("provider"));
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    const feed = await fetchLatestStreamingNews(provider, limit);
    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error: unknown) {
    console.error("streaming-news read error", error);
    return NextResponse.json({ error: "failed_to_read_streaming_news" }, { status: 500 });
  }
}
