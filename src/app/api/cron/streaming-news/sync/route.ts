import { NextRequest, NextResponse } from "next/server";
import { runStreamingNewsSync } from "@/lib/streaming-news";

function isAuthorized(request: NextRequest): boolean {
  const expectedTokens = [
    process.env.STREAMING_NEWS_CRON_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter((token): token is string => Boolean(token));

  if (expectedTokens.length === 0) return false;

  const authHeader = request.headers.get("authorization") || "";
  return expectedTokens.some((token) => authHeader === `Bearer ${token}`);
}

async function handleSync(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runStreamingNewsSync();
    return NextResponse.json({ ok: true, summary });
  } catch (error: unknown) {
    console.error("streaming-news sync error", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    const isProd = process.env.NODE_ENV === "production";

    return NextResponse.json(
      {
        error: "sync_failed",
        reason: isProd ? undefined : message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
