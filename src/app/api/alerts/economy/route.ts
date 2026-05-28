import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildEconomyAlerts,
  getFinancialSummary,
  parseSubscriptionsCookie,
  setSubscriptions,
  SUBSCRIPTIONS_COOKIE_NAME,
} from "@/lib/user-data";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { apiError, createTraceId, enforceRateLimit } from "@/lib/api-security";

const alertsQuerySchema = z.object({
  includeSummary: z.enum(["true", "false"]).optional(),
});

export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const limited = enforceRateLimit(request, { scope: "alerts:get", limit: 90, windowMs: 60_000 }, traceId);
  if (limited) return limited;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return apiError(401, "UNAUTHORIZED", "Sessao invalida ou expirada.", traceId);
  }

  const cookieValue = request.cookies.get(SUBSCRIPTIONS_COOKIE_NAME)?.value;
  const parsed = parseSubscriptionsCookie(cookieValue);
  if (parsed) {
    setSubscriptions(userId, parsed);
  }

  const parsedQuery = alertsQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries())
  );
  if (!parsedQuery.success) {
    return apiError(400, "BAD_REQUEST", "Query params invalidos para alertas.", traceId);
  }

  const alerts = buildEconomyAlerts(userId);

  if (parsedQuery.data.includeSummary === "false") {
    return NextResponse.json({ alerts });
  }

  const summary = getFinancialSummary(userId);

  return NextResponse.json({
    alerts,
    summary,
  });
}
