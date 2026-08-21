import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Verifica secret via Authorization header para proteger rotas cron no Vercel
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Exemplo Simulado:
    // 1. Fetch filmes da base de dados que entraram na Netflix hoje
    // 2. Compara com os usuários que possuem Watchlist ativa com esses filmes
    // 3. Envia os alertas

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const simulatedUserEmail = "teste@exemplo.com"; 
      
      // Dispara via Resend
      /*
      const { data, error } = await resend.emails.send({
        from: "StreamHub <avisos@streamhub.com.br>",
        to: [simulatedUserEmail],
        subject: "🚨 O filme da sua Watchlist chegou na Netflix!",
        html: "<p>O filme <strong>A Substância</strong> que estava na sua Watchlist agora está disponível no plano Base da Netflix que você assina!</p>",
      });
      */
    }

    return NextResponse.json({ status: "Alerts processed successfully" });
  } catch (error) {
    console.error("Alerts error:", error);
    return NextResponse.json({ error: "Alerts failed" }, { status: 500 });
  }
}
