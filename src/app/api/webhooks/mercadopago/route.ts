import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
// import database update fn here

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("data.id") || url.searchParams.get("id");
    const topic = url.searchParams.get("type") || url.searchParams.get("topic");

    if (topic !== "payment" || !id) {
      return NextResponse.json({ received: true });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || "TEST-Token-Simulado" });
    const payment = new Payment(client);
    
    // Confirma no MercadoPago os dados daquele pagamento que o webhook avisou
    const paymentInfo = await payment.get({ id });

    if (paymentInfo.status === "approved") {
      const userId = paymentInfo.external_reference;
      console.log(`Pagamento Aprovado para o usuario: ${userId}`);
      
      // AQUI VOCÊ ATUALIZA O SEU BANCO DE DADOS:
      // await db.query("UPDATE users SET plan = premium WHERE id = ?", [userId])
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook MP error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}
