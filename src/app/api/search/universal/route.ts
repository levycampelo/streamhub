import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchUniversalContent } from "@/lib/universal-search";
import { registerSearch } from "@/lib/user-data";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { apiError, createTraceId, enforceRateLimit, ensureJsonRequest } from "@/lib/api-security";

const searchSchema = z.object({
  query: z.string().trim().min(2).max(120),
});

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const limited = enforceRateLimit(request, { scope: "search:post", limit: 60, windowMs: 60_000 }, traceId);
  if (limited) return limited;

  const invalidContentType = ensureJsonRequest(request, traceId);
  if (invalidContentType) return invalidContentType;

  try {
    const parseResult = searchSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return apiError(400, "BAD_REQUEST", "Query invalida para busca universal.", traceId);
    }

    const normalized = parseResult.data.query;

    const response = await searchUniversalContent(normalized);
    const userId = (await getAuthenticatedUserId()) ?? "demo-user";

    registerSearch(
      userId,
      normalized,
      response.items.map((item) => item.title)
    );

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Search API error", { traceId, error });
    return apiError(500, "INTERNAL_ERROR", "Erro interno ao executar a busca universal.", traceId);
  }
}
