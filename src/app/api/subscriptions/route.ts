import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addSubscription,
  getFinancialSummary,
  listSubscriptions,
  parseSubscriptionsCookie,
  removeSubscription,
  serializeSubscriptionsCookie,
  setSubscriptions,
  SUBSCRIPTIONS_COOKIE_NAME,
} from "@/lib/user-data";
import { apiError, createTraceId, enforceRateLimit, ensureJsonRequest } from "@/lib/api-security";
import { getAuthenticatedUserId } from "@/lib/auth-user";

const createSubscriptionSchema = z.object({
  service: z.string().trim().min(2).max(80),
  monthlyPrice: z.number().min(0).max(9999),
  lastUsedDays: z.number().int().min(0).max(3650),
});

const removeSubscriptionSchema = z.object({
  id: z.string().trim().min(1),
});

function hydrateSubscriptionsFromCookie(request: NextRequest, userId: string): void {
  const cookieValue = request.cookies.get(SUBSCRIPTIONS_COOKIE_NAME)?.value;
  const parsed = parseSubscriptionsCookie(cookieValue);

  if (parsed) {
    setSubscriptions(userId, parsed);
  }
}

function attachSubscriptionsCookie(response: NextResponse, userId: string): NextResponse {
  const subscriptions = listSubscriptions(userId);
  response.cookies.set({
    name: SUBSCRIPTIONS_COOKIE_NAME,
    value: serializeSubscriptionsCookie(subscriptions),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const limited = enforceRateLimit(request, { scope: "subscriptions:get", limit: 120, windowMs: 60_000 }, traceId);
  if (limited) return limited;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError(401, "UNAUTHORIZED", "Sessao invalida ou expirada.", traceId);
  }

  hydrateSubscriptionsFromCookie(request, userId);

  const subscriptions = listSubscriptions(userId);
  const summary = getFinancialSummary(userId);

  const response = NextResponse.json({ subscriptions, summary });
  return attachSubscriptionsCookie(response, userId);
}

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const limited = enforceRateLimit(request, { scope: "subscriptions:post", limit: 40, windowMs: 60_000 }, traceId);
  if (limited) return limited;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError(401, "UNAUTHORIZED", "Sessao invalida ou expirada.", traceId);
  }

  hydrateSubscriptionsFromCookie(request, userId);

  const invalidContentType = ensureJsonRequest(request, traceId);
  if (invalidContentType) return invalidContentType;

  const parseResult = createSubscriptionSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return apiError(400, "BAD_REQUEST", "Payload invalido para criacao de assinatura.", traceId);
  }

  const body = parseResult.data;

  const created = addSubscription(userId, {
    service: body.service,
    monthlyPrice: body.monthlyPrice,
    lastUsedDays: body.lastUsedDays,
  });

  const response = NextResponse.json({ subscription: created }, { status: 201 });
  return attachSubscriptionsCookie(response, userId);
}

export async function DELETE(request: NextRequest) {
  const traceId = createTraceId();
  const limited = enforceRateLimit(request, { scope: "subscriptions:delete", limit: 30, windowMs: 60_000 }, traceId);
  if (limited) return limited;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError(401, "UNAUTHORIZED", "Sessao invalida ou expirada.", traceId);
  }

  hydrateSubscriptionsFromCookie(request, userId);

  const invalidContentType = ensureJsonRequest(request, traceId);
  if (invalidContentType) return invalidContentType;

  const parseResult = removeSubscriptionSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return apiError(400, "BAD_REQUEST", "Payload invalido para remocao de assinatura.", traceId);
  }

  const body = parseResult.data;

  const removed = removeSubscription(userId, body.id);
  const response = NextResponse.json({ removed });
  return attachSubscriptionsCookie(response, userId);
}
