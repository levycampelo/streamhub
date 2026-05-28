"use client";

import { NavBar } from "@/components/nav-bar";
import { FormEvent, useEffect, useState } from "react";

type Subscription = {
  id: string;
  service: string;
  monthlyPrice: number;
  lastUsedDays: number;
};

type Summary = {
  monthlyTotal: number;
  annualTotal: number;
  potentialSavings: number;
  lowUsageCount: number;
};

type EconomyAlert = {
  id: string;
  title: string;
  description: string;
  monthlyImpact: number;
  severity: "high" | "medium" | "low";
};

type RecommendationAction = "cancelar" | "pausar" | "trocar_plano" | "manter";

type SubscriptionRecommendation = {
  id: string;
  service: string;
  action: RecommendationAction;
  reason: string;
  estimatedMonthlySavings: number;
};

const STREAMING_OPTIONS: Array<{ name: string; suggestedPrice: number }> = [
  { name: "Netflix", suggestedPrice: 55.9 },
  { name: "Prime Video", suggestedPrice: 19.9 },
  { name: "Disney+", suggestedPrice: 43.9 },
  { name: "Max", suggestedPrice: 22.9 },
  { name: "Paramount+", suggestedPrice: 34.9 },
  { name: "Apple TV+", suggestedPrice: 21.9 },
  { name: "Globoplay", suggestedPrice: 22.9 },
];

function money(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildRecommendations(subscriptions: Subscription[]): SubscriptionRecommendation[] {
  const recommendations = subscriptions.map((sub) => {
    if (sub.lastUsedDays >= 45) {
      return {
        id: sub.id,
        service: sub.service,
        action: "cancelar" as const,
        reason: `${sub.lastUsedDays} dias sem uso.`,
        estimatedMonthlySavings: sub.monthlyPrice,
      };
    }

    if (sub.lastUsedDays >= 25) {
      return {
        id: sub.id,
        service: sub.service,
        action: "pausar" as const,
        reason: `${sub.lastUsedDays} dias sem uso; pausar por 30 dias pode reduzir custo imediato.`,
        estimatedMonthlySavings: sub.monthlyPrice,
      };
    }

    if (sub.monthlyPrice >= 40 && sub.lastUsedDays >= 14) {
      return {
        id: sub.id,
        service: sub.service,
        action: "trocar_plano" as const,
        reason: "Uso moderado com custo alto; avaliar plano mais barato.",
        estimatedMonthlySavings: Number((sub.monthlyPrice * 0.3).toFixed(2)),
      };
    }

    return {
      id: sub.id,
      service: sub.service,
      action: "manter" as const,
      reason: "Uso recente e custo coerente.",
      estimatedMonthlySavings: 0,
    };
  });

  return recommendations.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);
}

function actionLabel(action: RecommendationAction): string {
  if (action === "cancelar") return "Cancelar";
  if (action === "pausar") return "Pausar 30 dias";
  if (action === "trocar_plano") return "Trocar plano";
  return "Manter";
}

function actionClasses(action: RecommendationAction): string {
  if (action === "cancelar") return "border-[#9a2a33] bg-[#3a161a] text-[#ffb4b9]";
  if (action === "pausar") return "border-[#916b19] bg-[#3a2d13] text-[#ffd78a]";
  if (action === "trocar_plano") return "border-[#2a6e8d] bg-[#102c3a] text-[#8adfff]";
  return "border-[var(--line)] bg-[#0f1a2e] text-[var(--muted)]";
}

export default function AssinaturasPage() {
  const [service, setService] = useState("Netflix");
  const [monthlyPrice, setMonthlyPrice] = useState(39.9);
  const [lastUsedDays, setLastUsedDays] = useState(10);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary>({
    monthlyTotal: 0,
    annualTotal: 0,
    potentialSavings: 0,
    lowUsageCount: 0,
  });
  const [alerts, setAlerts] = useState<EconomyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState(120);
  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<string[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [subsRes, alertsRes] = await Promise.all([
        fetch("/api/subscriptions"),
        fetch("/api/alerts/economy"),
      ]);

      const subsData = await subsRes.json();
      const alertsData = await alertsRes.json();

      if (subsRes.ok) {
        setSubscriptions(subsData.subscriptions);
        setSummary(subsData.summary);
        setAppliedRecommendationIds([]);
      }

      if (alertsRes.ok) {
        setAlerts(alertsData.alerts);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service,
        monthlyPrice,
        lastUsedDays,
      }),
    });
    await loadData();
  }

  async function handleRemove(id: string) {
    await fetch("/api/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadData();
  }

  const topAlert = alerts[0];
  const recommendations = buildRecommendations(subscriptions);
  const appliedSavings = recommendations
    .filter((rec) => appliedRecommendationIds.includes(rec.id))
    .reduce((sum, rec) => sum + rec.estimatedMonthlySavings, 0);
  const simulatedMonthly = Math.max(summary.monthlyTotal - appliedSavings, 0);
  const goalGapCurrent = summary.monthlyTotal - monthlyGoal;
  const goalGapSimulated = simulatedMonthly - monthlyGoal;

  function handleServiceChange(nextService: string) {
    setService(nextService);
    const selected = STREAMING_OPTIONS.find((option) => option.name === nextService);
    if (selected) {
      setMonthlyPrice(selected.suggestedPrice);
    }
  }

  function toggleRecommendation(id: string) {
    setAppliedRecommendationIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="card section-enter p-5 md:col-span-2">
            <h2 className="text-xl font-semibold">Servicos ativos</h2>

            <form onSubmit={handleAdd} className="mt-4 grid gap-2 rounded-xl border border-[var(--line)] bg-[#0a1222] p-3 md:grid-cols-4">
              <label className="text-xs text-[var(--muted)]">
                Servico
                <select
                  className="input mt-1"
                  value={service}
                  onChange={(event) => handleServiceChange(event.target.value)}
                >
                  {STREAMING_OPTIONS.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[var(--muted)]">
                Preco mensal (R$)
                <input
                  className="input mt-1"
                  type="number"
                  step="0.1"
                  min="0"
                  value={monthlyPrice}
                  onChange={(event) => setMonthlyPrice(Number(event.target.value))}
                  placeholder="Ex: 39.90"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Dias sem uso
                <input
                  className="input mt-1"
                  type="number"
                  min="0"
                  value={lastUsedDays}
                  onChange={(event) => setLastUsedDays(Number(event.target.value))}
                  placeholder="Ex: 35"
                />
              </label>
              <button type="submit" className="btn">
                Adicionar
              </button>
            </form>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Exemplo: Netflix | 39.90 | 35 dias sem uso
            </p>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-xl border border-[var(--line)] bg-[#0a1222] p-3 text-sm text-[var(--muted)]">
                  Carregando assinaturas...
                </div>
              ) : null}

              {subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-[var(--line)] bg-[#0a1222] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{sub.service}</p>
                    <p className="text-sm font-semibold">{money(sub.monthlyPrice)}</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">Uso: {sub.lastUsedDays} dia(s) sem abrir</p>
                  <button className="btn-ghost mt-2" onClick={() => handleRemove(sub.id)}>
                    Remover
                  </button>
                </div>
              ))}

              {!loading && subscriptions.length === 0 ? (
                <div className="rounded-xl border border-[var(--line)] bg-[#0a1222] p-3 text-sm text-[var(--muted)]">
                  Nenhuma assinatura cadastrada.
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[#0a1222] p-4">
              <h3 className="text-sm font-semibold">Recomendacoes por assinatura</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Aplique recomendacoes no simulador para ver o impacto imediato no gasto mensal.
              </p>

              <div className="mt-3 space-y-2">
                {recommendations.map((rec) => {
                  const applied = appliedRecommendationIds.includes(rec.id);
                  return (
                    <div key={rec.id} className="rounded-lg border border-[var(--line)] bg-[#0d1528] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{rec.service}</p>
                        <span className={`rounded-full border px-2 py-1 text-xs ${actionClasses(rec.action)}`}>
                          {actionLabel(rec.action)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">{rec.reason}</p>
                      <p className="mt-1 text-xs text-[#7be1ff]">
                        Economia estimada: {money(rec.estimatedMonthlySavings)}/mes
                      </p>
                      {rec.action !== "manter" ? (
                        <button className="btn-ghost mt-2" onClick={() => toggleRecommendation(rec.id)}>
                          {applied ? "Remover da simulacao" : "Aplicar no simulador"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="card section-enter p-5 stagger-1">
            <h3 className="font-semibold">Resumo financeiro</h3>
            <div className="mt-3 rounded-xl border border-[var(--line)] bg-[#0a1222] p-3">
              <label className="text-xs text-[var(--muted)]">
                Meta mensal de gasto (R$)
                <input
                  className="input mt-1"
                  type="number"
                  min="0"
                  step="0.1"
                  value={monthlyGoal}
                  onChange={(event) => setMonthlyGoal(Number(event.target.value))}
                />
              </label>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Status atual: {goalGapCurrent <= 0 ? "Dentro da meta" : `Acima da meta em ${money(goalGapCurrent)}`}
              </p>
              <p className="mt-1 text-xs text-[#7be1ff]">
                Com simulacao: {goalGapSimulated <= 0 ? "Meta atingida" : `Falta reduzir ${money(goalGapSimulated)}`}
              </p>
            </div>

            <p className="mt-3 text-sm text-[var(--muted)]">Gasto mensal</p>
            <p className="text-2xl font-bold">{money(summary.monthlyTotal)}</p>
            <p className="mt-1 text-xs text-[#7be1ff]">
              Simulado apos recomendacoes: {money(simulatedMonthly)} ({money(appliedSavings)} de economia)
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">Gasto anual</p>
            <p className="text-xl font-semibold">{money(summary.annualTotal)}</p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Potencial de economia: <span className="font-semibold text-[#7be1ff]">{money(summary.potentialSavings)}/mensal</span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">Servicos com baixo uso: {summary.lowUsageCount}</p>

            <div className="mt-5 rounded-xl border border-[var(--line)] bg-[#0a1222] p-3">
              <p className="text-sm font-semibold">Alerta prioritario</p>
              {topAlert ? (
                <>
                  <p className="mt-1 text-sm">{topAlert.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{topAlert.description}</p>
                  <p className="mt-1 text-xs text-[#7be1ff]">Impacto estimado: {money(topAlert.monthlyImpact)}/mes</p>
                </>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">Sem alertas no momento.</p>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
