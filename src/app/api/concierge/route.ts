import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import {
  buildRuleBasedRecommendation,
  getHybridRecommendationContext,
} from "@/lib/user-data";
import { getAuthenticatedUserId } from "@/lib/auth-user";
import { apiError, createTraceId, enforceRateLimit, ensureJsonRequest } from "@/lib/api-security";

const apiKey = process.env.GEMINI_API_KEY;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const conciergeSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

const SYSTEM_PROMPT = `Você é o IA Concierge do Share StreamHub, um assistente especializado em streaming.
Seu papel é ajudar o usuário a:
- Decidir quais serviços de streaming assinar ou cancelar
- Recomendar filmes e séries com base no perfil do usuário
- Sugerir formas de economizar nas assinaturas
- Comparar catálogos entre plataformas (Netflix, Prime Video, Disney+, Max, Globoplay, etc.)

Responda de forma concisa, objetiva e em português brasileiro.
Use dados reais quando possível e seja transparente quando estiver estimando.`;

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const limited = enforceRateLimit(request, { scope: "concierge:post", limit: 15, windowMs: 60_000 }, traceId);
  if (limited) return limited;

  const invalidContentType = ensureJsonRequest(request, traceId);
  if (invalidContentType) return invalidContentType;

  try {
    if (!apiKey) {
      return apiError(500, "INTERNAL_ERROR", "Configuracao de IA indisponivel no servidor.", traceId);
    }

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return apiError(401, "UNAUTHORIZED", "Sessao invalida ou expirada.", traceId);
    }

    const parseResult = conciergeSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return apiError(400, "BAD_REQUEST", "Payload invalido para concierge.", traceId);
    }

    const { messages } = parseResult.data;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const context = getHybridRecommendationContext(userId);

    const transcript = messages
      .map((m: { role: string; content: string }) => {
        const role = m.role === "assistant" ? "IA" : "Usuário";
        return `${role}: ${m.content}`;
      })
      .join("\n");

    const prompt = `${SYSTEM_PROMPT}\n\nContexto real do usuario:\n${JSON.stringify(
      context,
      null,
      2
    )}\n\nHistorico da conversa:\n${transcript}\n\nPriorize recomendacoes praticas com impacto financeiro estimado quando possivel.`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text() ?? "";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Concierge API error", { traceId, error });

    const message = error instanceof Error ? error.message : "";

    if (message.includes("429") || message.includes("quota")) {
      const userId = (await getAuthenticatedUserId()) ?? "unknown";
      const ruleReply = buildRuleBasedRecommendation(userId, "economizar");

      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Limite de requisicoes atingido. Aguarde alguns segundos e tente novamente.",
            traceId,
            timestamp: new Date().toISOString(),
          },
          fallback: ruleReply,
        },
        { status: 429 }
      );
    }

    return apiError(500, "INTERNAL_ERROR", "Erro interno do servidor.", traceId);
  }
}
