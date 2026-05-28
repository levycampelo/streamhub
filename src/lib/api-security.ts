import { NextRequest, NextResponse } from "next/server";

type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateLimitBucket>();

export function createTraceId(): string {
  return crypto.randomUUID();
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export function apiError(status: number, code: ApiErrorCode, message: string, traceId: string): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        traceId,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function ensureJsonRequest(request: NextRequest, traceId: string): NextResponse | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type deve ser application/json.", traceId);
  }

  return null;
}

export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
  traceId: string
): NextResponse | null {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${options.scope}:${ip}`;

  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    return apiError(429, "RATE_LIMITED", "Limite de requisicoes excedido. Tente novamente em instantes.", traceId);
  }

  return null;
}
