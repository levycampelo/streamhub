import { NavBar } from "@/components/nav-bar";

type Plan = {
  name: string;
  price: string;
  features: string[];
  checkoutUrl: string;
  highlight?: boolean;
};

const standardCheckout = process.env.NEXT_PUBLIC_MP_STANDARD_CHECKOUT_URL ?? "https://www.mercadopago.com.br/";
const fullCheckout = process.env.NEXT_PUBLIC_MP_FULL_CHECKOUT_URL ?? "https://www.mercadopago.com.br/";

const plans: Plan[] = [
  {
    name: "Standard",
    price: "R$ 4,90",
    checkoutUrl: standardCheckout,
    features: [
      "Alertas de entrada e saida de catalogo",
      "Analise das suas assinaturas",
      "Watchlist ilimitada",
      "Historico de precos",
    ],
  },
  {
    name: "Full",
    price: "R$ 6,80",
    checkoutUrl: fullCheckout,
    highlight: true,
    features: [
      "Alertas de entrada e saida de catalogo",
      "Analise das suas assinaturas",
      "Watchlist ilimitada",
      "Historico de precos",
      "IA Concierge",
    ],
  },
];

export default function AssinaturaPage() {
  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="card section-enter p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7f9bc4]">Planos SharingHub</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Escolha sua assinatura</h1>
          <p className="mt-2 text-sm text-[var(--muted)] md:text-base">
            Pagamento via Mercado Pago com checkout rapido e seguro.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                "card section-enter flex h-full flex-col p-5 " +
                (plan.highlight ? "border-[#2c5d95] shadow-[0_14px_34px_rgba(0,0,0,0.34)]" : "")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Plano {plan.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Acesso mensal</p>
                </div>
                {plan.highlight ? (
                  <span className="rounded-full border border-[#2c5d95] bg-[#10223d] px-3 py-1 text-xs font-semibold text-[#a8d7ff]">
                    Mais completo
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-4xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                {plan.price}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--muted)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-lg border border-[var(--line)] bg-[#0a1325] px-3 py-2">
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.checkoutUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[#ff6b61] bg-[#e04a42] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ef5a52]"
              >
                Pagar com Mercado Pago
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
