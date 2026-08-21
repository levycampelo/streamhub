import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getAuthenticatedUserId } from "@/lib/auth-user";

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pega o token real das variáveis de ambiente na Vercel
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "TEST-Token-Simulado" });
    const preference = new Preference(client);

    // O corpo da requisição pode vir com qual plano ele escolheu (Mensal/Anual)
    const { planType } = await req.json();

    const price = planType === "annual" ? 99.90 : 9.90;
    const itemTitle = planType === "annual" ? "StreamHub Premium (Anual)" : "StreamHub Premium (Mensal)";

    const response = await preference.create({
      body: {
        items: [
          {
            id: planType,
            title: itemTitle,
            quantity: 1,
            unit_price: price,
            currency_id: "BRL",
          },
        ],
        payer: {
           // Em um cenário real, você buscaria o email do usuario via sessão/db
           email: "usuario@streamhub.com"
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/assinatura/sucesso`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/assinatura/falha`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/assinatura/pendente`,
        },
        auto_return: "approved",
        external_reference: userId, // Passamos o userId pra conciliar no Webhook dps
      },
    });

    return NextResponse.json({ init_point: response.init_point });
  } catch (error) {
    console.error("Erro criando preferencia no MP:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
