import { NavBar } from "@/components/nav-bar";

type Plan = {
  name: string;
  label: string;
  price: string;
  features: string[];
  checkoutUrl: string;
  highlight?: boolean;
};

const standardCheckout = process.env.NEXT_PUBLIC_MP_STANDARD_CHECKOUT_URL ?? "https://www.mercadopago.com.br/";
const fullCheckout = process.env.NEXT_PUBLIC_MP_FULL_CHECKOUT_URL ?? "https://www.mercadopago.com.br/";

const plans: Plan[] = [
  {
    name: "Básico",
    label: "BÁSICO",
    price: "R$ 4,90",
    checkoutUrl: standardCheckout,
    features: [
      "Controle Financeiro dos seus streaming",
      "Watchlist ilimitada",
      "Busca Inteligente",
    ],
  },
  {
    name: "Completo",
    label: "PREMIUM",
    price: "R$ 6,80",
    checkoutUrl: fullCheckout,
    highlight: true,
    features: [
      "Alertas de entrada e saída de catálogo",
      "Todas as Vantagens do Plano Básico",
      "IA Concierge",
      "Suporte prioritário",
    ],
  },
];

export default function AssinaturaPage() {
  return (
    <main className="min-h-screen pb-12 pt-2">
      <NavBar />

      <section className="mx-auto max-w-5xl px-4 pt-8">
        <div className="section-enter mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7f9bc4]">Planos SharingHub</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#eef4ff] md:text-5xl">Escolha sua assinatura</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)] md:text-base">
            Pagamento via Mercado Pago com checkout rápido e seguro.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                "section-enter relative flex h-full flex-col rounded-[24px] border p-5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] transition-transform duration-200 hover:-translate-y-1 " +
                (plan.highlight
                  ? "border-[#2f6fb3] bg-[linear-gradient(180deg,rgba(10,20,40,0.98)_0%,rgba(7,14,28,0.98)_100%)] shadow-[0_20px_52px_rgba(0,0,0,0.42)]"
                  : "border-[#20314f] bg-[linear-gradient(180deg,rgba(11,19,34,0.96)_0%,rgba(8,14,25,0.98)_100%)]")
              }
            >
              {plan.highlight ? (
                <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4a87f5] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(74,135,245,0.34)]">
                  Mais popular
                </span>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={"text-sm font-semibold tracking-[0.18em] uppercase " + (plan.highlight ? "text-[#9cc3ff]" : "text-[#4ef0a6]")}>{plan.label}</p>
                </div>
              </div>

              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold tracking-tight text-[#f3f7ff] md:text-[2.35rem]">{plan.price}</span>
                <span className="pb-2 text-sm text-[#91a4c3]">/mês</span>
              </div>

              <div className="my-5 h-px bg-[#20324f]" />

              <ul className="flex-1 space-y-3 text-sm text-[#c7d4e8]">
                {plan.features.map((feature) => (
                  <li key={feature} className="relative pl-4 leading-5 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#4d8fe0]">
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.checkoutUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={
                  "mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110 " +
                  (plan.highlight
                    ? "border border-[#5a8ef7] bg-[#3f79f0] shadow-[0_12px_28px_rgba(63,121,240,0.28)]"
                    : "border border-[#f26a5d] bg-[#d94c44] shadow-[0_12px_28px_rgba(217,76,68,0.16)]")
                }
              >
                Assinar com Mercado Pago
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
