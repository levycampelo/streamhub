"use client";

import { NavBar } from "@/components/nav-bar";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getWatchlist } from "@/lib/watchlist-storage";

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

type DesiredTitle = {
  id: string;
  title: string;
  services: string[];
};

type CheapestCoverage = {
  services: string[];
  cost: number;
};

type MarathonMonthPlan = {
  month: number;
  service: string;
  titles: string[];
  cost: number;
};

type MarathonPlan = {
  months: MarathonMonthPlan[];
  remainingTitles: string[];
  totalCost: number;
};

const DEFAULT_DESIRED_TITLES: DesiredTitle[] = [
  { id: "demo-the-boys", title: "The Boys", services: ["Prime Video"] },
  { id: "demo-fallout", title: "Fallout", services: ["Prime Video"] },
  { id: "demo-the-last-of-us", title: "The Last of Us", services: ["Max"] },
  { id: "demo-house-dragon", title: "House of the Dragon", services: ["Max"] },
  { id: "demo-loki", title: "Loki", services: ["Disney+"] },
  { id: "demo-interstellar", title: "Interstellar", services: ["Netflix", "Max"] },
];

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

function normalizeServiceList(raw: string): string[] {
  return [...new Set(raw.split(",").map((entry) => entry.trim()).filter(Boolean))];
}

function mergeDesiredTitles(titles: DesiredTitle[]): DesiredTitle[] {
  const merged = new Map<string, DesiredTitle>();

  for (const item of titles) {
    const key = item.title.trim().toLowerCase();
    if (!key) {
      continue;
    }

    const cleanedServices = [...new Set(item.services.map((service) => service.trim()).filter(Boolean))];
    if (cleanedServices.length === 0) {
      continue;
    }

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        id: item.id,
        title: item.title.trim(),
        services: cleanedServices,
      });
      continue;
    }

    merged.set(key, {
      ...existing,
      services: [...new Set([...existing.services, ...cleanedServices])],
    });
  }

  return [...merged.values()];
}

function buildPriceByService(subscriptions: Subscription[]): Record<string, number> {
  const prices = Object.fromEntries(STREAMING_OPTIONS.map((item) => [item.name, item.suggestedPrice])) as Record<string, number>;

  for (const sub of subscriptions) {
    prices[sub.service] = sub.monthlyPrice;
  }

  return prices;
}

function findCheapestCoverage(titles: DesiredTitle[], prices: Record<string, number>): CheapestCoverage | null {
  const serviceSet = new Set<string>();
  for (const item of titles) {
    for (const service of item.services) {
      if (typeof prices[service] === "number") {
        serviceSet.add(service);
      }
    }
  }

  const services = [...serviceSet];
  if (services.length === 0) {
    return null;
  }

  if (services.length > 20) {
    return null;
  }

  const serviceIndex = new Map(services.map((service, index) => [service, index]));
  const titleServiceIndexes = titles.map((item) =>
    item.services
      .map((service) => serviceIndex.get(service))
      .filter((index): index is number => typeof index === "number")
  );

  if (titleServiceIndexes.some((indexes) => indexes.length === 0)) {
    return null;
  }

  const maxMask = 1 << services.length;
  let best: CheapestCoverage | null = null;

  for (let mask = 1; mask < maxMask; mask += 1) {
    let cost = 0;
    let selectedCount = 0;

    for (let index = 0; index < services.length; index += 1) {
      if (mask & (1 << index)) {
        selectedCount += 1;
        cost += prices[services[index]];
      }
    }

    if (best && cost > best.cost) {
      continue;
    }

    let coversAll = true;
    for (const indexes of titleServiceIndexes) {
      const covered = indexes.some((index) => (mask & (1 << index)) !== 0);
      if (!covered) {
        coversAll = false;
        break;
      }
    }

    if (!coversAll) {
      continue;
    }

    const selectedServices = services.filter((_, index) => (mask & (1 << index)) !== 0);

    if (!best || cost < best.cost || (cost === best.cost && selectedCount < best.services.length)) {
      best = {
        services: selectedServices,
        cost,
      };
    }
  }

  return best;
}

function buildMarathonPlan(titles: DesiredTitle[], prices: Record<string, number>, months: number): MarathonPlan {
  const cappedMonths = Math.max(1, Math.min(24, Math.trunc(months) || 1));
  const remaining = new Set(titles.map((item) => item.id));
  const usedServices = new Set<string>();
  const plan: MarathonMonthPlan[] = [];

  for (let month = 1; month <= cappedMonths && remaining.size > 0; month += 1) {
    let bestService = "";
    let bestTitles: DesiredTitle[] = [];
    let bestPrice = 0;

    const candidateServices = new Set<string>();
    for (const item of titles) {
      for (const service of item.services) {
        if (!usedServices.has(service) && typeof prices[service] === "number") {
          candidateServices.add(service);
        }
      }
    }

    for (const service of candidateServices) {
      const serviceTitles = titles.filter((item) => remaining.has(item.id) && item.services.includes(service));
      if (serviceTitles.length === 0) {
        continue;
      }

      const servicePrice = prices[service];
      const shouldReplace =
        serviceTitles.length > bestTitles.length ||
        (serviceTitles.length === bestTitles.length && (bestService === "" || servicePrice < bestPrice));

      if (shouldReplace) {
        bestService = service;
        bestTitles = serviceTitles;
        bestPrice = servicePrice;
      }
    }

    if (!bestService) {
      break;
    }

    usedServices.add(bestService);
    for (const title of bestTitles) {
      remaining.delete(title.id);
    }

    plan.push({
      month,
      service: bestService,
      titles: bestTitles.map((item) => item.title),
      cost: bestPrice,
    });
  }

  const totalCost = plan.reduce((sum, item) => sum + item.cost, 0);
  const remainingTitles = titles.filter((item) => remaining.has(item.id)).map((item) => item.title);

  return {
    months: plan,
    remainingTitles,
    totalCost,
  };
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
  const [desiredTitles, setDesiredTitles] = useState<DesiredTitle[]>(DEFAULT_DESIRED_TITLES);
  const [newDesiredTitle, setNewDesiredTitle] = useState("");
  const [newDesiredServices, setNewDesiredServices] = useState("");
  const [watchlistTitles, setWatchlistTitles] = useState<DesiredTitle[]>([]);
  const [includeWatchlist, setIncludeWatchlist] = useState(true);
  const [marathonMonths, setMarathonMonths] = useState(3);

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

  useEffect(() => {
    const watchlist = getWatchlist();
    const parsed = watchlist
      .map((item) => {
        const services = [...new Set([...(item.platforms ?? []), ...(item.preferredProvider ? [item.preferredProvider] : [])])]
          .map((service) => service.trim())
          .filter(Boolean);

        return {
          id: `watchlist-${item.key}`,
          title: item.title,
          services,
        } satisfies DesiredTitle;
      })
      .filter((item) => item.services.length > 0);

    setWatchlistTitles(parsed);
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

  function handleAddDesiredTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newDesiredTitle.trim();
    const services = normalizeServiceList(newDesiredServices);

    if (!title || services.length === 0) {
      return;
    }

    setDesiredTitles((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        title,
        services,
      },
    ]);
    setNewDesiredTitle("");
    setNewDesiredServices("");
  }

  function handleRemoveDesiredTitle(id: string) {
    setDesiredTitles((current) => current.filter((item) => item.id !== id));
  }

  const effectiveDesiredTitles = useMemo(
    () => mergeDesiredTitles(includeWatchlist ? [...desiredTitles, ...watchlistTitles] : desiredTitles),
    [desiredTitles, includeWatchlist, watchlistTitles]
  );

  const pricesByService = useMemo(() => buildPriceByService(subscriptions), [subscriptions]);

  const coverageByService = useMemo(() => {
    return effectiveDesiredTitles.reduce<Record<string, number>>((acc, item) => {
      for (const service of item.services) {
        acc[service] = (acc[service] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [effectiveDesiredTitles]);

  const relevantServices = useMemo(() => Object.keys(coverageByService), [coverageByService]);
  const pricedRelevantServices = useMemo(
    () => relevantServices.filter((service) => typeof pricesByService[service] === "number"),
    [relevantServices, pricesByService]
  );
  const unpricedRelevantServices = useMemo(
    () => relevantServices.filter((service) => typeof pricesByService[service] !== "number"),
    [relevantServices, pricesByService]
  );
  const allServicesMonthly = useMemo(
    () => pricedRelevantServices.reduce((sum, service) => sum + pricesByService[service], 0),
    [pricedRelevantServices, pricesByService]
  );
  const cheapestCoverage = useMemo(
    () => findCheapestCoverage(effectiveDesiredTitles, pricesByService),
    [effectiveDesiredTitles, pricesByService]
  );
  const optimizerSavings = cheapestCoverage ? Math.max(allServicesMonthly - cheapestCoverage.cost, 0) : 0;
  const optimizerSavingsPercent = allServicesMonthly > 0 ? (optimizerSavings / allServicesMonthly) * 100 : 0;
  const marathonPlan = useMemo(
    () => buildMarathonPlan(effectiveDesiredTitles, pricesByService, marathonMonths),
    [effectiveDesiredTitles, pricesByService, marathonMonths]
  );
  const marathonKeepAllCost = allServicesMonthly * Math.max(1, Math.min(24, Math.trunc(marathonMonths) || 1));
  const marathonSavings = Math.max(marathonKeepAllCost - marathonPlan.totalCost, 0);

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

            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[#0a1222] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Otimizador de catalogo por menor custo</h3>
                <span className="rounded-full border border-[var(--line)] bg-[#0f1a2e] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  cobertura minima + menor preco
                </span>
              </div>

              <p className="mt-1 text-xs text-[var(--muted)]">
                O sistema testa combinacoes de streaming (forca bruta) e retorna a menor que cobre todos os titulos desejados.
              </p>

              <form onSubmit={handleAddDesiredTitle} className="mt-3 grid gap-2 rounded-xl border border-[var(--line)] bg-[#0d1528] p-3 md:grid-cols-3">
                <label className="text-xs text-[var(--muted)]">
                  Titulo
                  <input
                    className="input mt-1"
                    value={newDesiredTitle}
                    onChange={(event) => setNewDesiredTitle(event.target.value)}
                    placeholder="Ex: The Last of Us"
                  />
                </label>
                <label className="text-xs text-[var(--muted)] md:col-span-2">
                  Streamings (separados por virgula)
                  <input
                    className="input mt-1"
                    value={newDesiredServices}
                    onChange={(event) => setNewDesiredServices(event.target.value)}
                    placeholder="Ex: Max, Prime Video"
                  />
                </label>
                <button type="submit" className="btn md:col-span-3">
                  Adicionar titulo ao otimizador
                </button>
              </form>

              <label className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={includeWatchlist}
                  onChange={(event) => setIncludeWatchlist(event.target.checked)}
                />
                Incluir titulos da watchlist automaticamente ({watchlistTitles.length})
              </label>

              <div className="mt-3 space-y-2">
                {effectiveDesiredTitles.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[var(--line)] bg-[#0d1528] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      {item.id.startsWith("manual-") || item.id.startsWith("demo-") ? (
                        <button className="btn-ghost" onClick={() => handleRemoveDesiredTitle(item.id)}>
                          Remover
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">Disponivel em: {item.services.join(", ")}</p>
                  </div>
                ))}

                {effectiveDesiredTitles.length === 0 ? (
                  <div className="rounded-lg border border-[var(--line)] bg-[#0d1528] p-3 text-xs text-[var(--muted)]">
                    Nenhum titulo informado para otimizar.
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[#0d1528] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Cobertura por streaming</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {Object.entries(coverageByService)
                    .sort((a, b) => b[1] - a[1])
                    .map(([service, count]) => (
                      <div key={service} className="rounded-lg border border-[var(--line)] bg-[#0a1222] p-2 text-xs">
                        <span className="font-semibold">{service}</span> cobre {count} titulo(s)
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[#0d1528] p-3">
                <p className="text-sm font-semibold">Melhor combinacao mensal</p>
                {cheapestCoverage ? (
                  <>
                    <p className="mt-1 text-xs text-[var(--muted)]">{cheapestCoverage.services.join(" + ")}</p>
                    <p className="mt-1 text-lg font-semibold text-[#7be1ff]">{money(cheapestCoverage.cost)}/mes</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Se assinar todos os streamings relevantes: {money(allServicesMonthly)}/mes
                    </p>
                    <p className="mt-1 text-xs text-[#7be1ff]">
                      Economia: {money(optimizerSavings)}/mes ({optimizerSavingsPercent.toFixed(0)}%)
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-[#ffb4b9]">
                    Nao foi possivel cobrir todos os titulos com os precos disponiveis.
                  </p>
                )}

                {unpricedRelevantServices.length > 0 ? (
                  <p className="mt-2 text-xs text-[#ffd78a]">
                    Streamings sem preco cadastrado: {unpricedRelevantServices.join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[#0d1528] p-3">
                <p className="text-sm font-semibold">Modo maratona</p>
                <label className="mt-2 block text-xs text-[var(--muted)]">
                  Em quantos meses voce pretende assistir?
                  <input
                    className="input mt-1"
                    type="number"
                    min="1"
                    max="24"
                    value={marathonMonths}
                    onChange={(event) => setMarathonMonths(Number(event.target.value))}
                  />
                </label>

                <div className="mt-3 space-y-2">
                  {marathonPlan.months.map((monthPlan) => (
                    <div key={`${monthPlan.month}-${monthPlan.service}`} className="rounded-lg border border-[var(--line)] bg-[#0a1222] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Mes {monthPlan.month}</p>
                      <p className="mt-1 font-medium">{monthPlan.service}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Assista: {monthPlan.titles.join(" | ")}</p>
                      <p className="mt-1 text-xs text-[#7be1ff]">Custo: {money(monthPlan.cost)}</p>
                    </div>
                  ))}
                </div>

                {marathonPlan.remainingTitles.length > 0 ? (
                  <p className="mt-2 text-xs text-[#ffd78a]">
                    Titulos pendentes dentro desse prazo: {marathonPlan.remainingTitles.join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">Todos os titulos foram alocados no plano.</p>
                )}

                <p className="mt-2 text-xs text-[var(--muted)]">Total maratona: {money(marathonPlan.totalCost)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Mantendo todos ativos por {Math.max(1, Math.min(24, Math.trunc(marathonMonths) || 1))} mes(es): {money(marathonKeepAllCost)}
                </p>
                <p className="mt-1 text-xs text-[#7be1ff]">Economia no periodo: {money(marathonSavings)}</p>
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
