export type SubscriptionItem = {
  id: string;
  service: string;
  monthlyPrice: number;
  lastUsedDays: number;
};

export const SUBSCRIPTIONS_COOKIE_NAME = "streamhub_subscriptions_v1";

type SearchSnapshot = {
  query: string;
  titles: string[];
  createdAt: number;
};

type UserState = {
  subscriptions: SubscriptionItem[];
  searches: SearchSnapshot[];
};

const DEFAULT_USER_ID = "demo-user";

const userStore = new Map<string, UserState>();

function createDefaultState(): UserState {
  return {
    subscriptions: [
      { id: "sub-1", service: "Netflix", monthlyPrice: 55.9, lastUsedDays: 45 },
      { id: "sub-2", service: "Prime Video", monthlyPrice: 19.9, lastUsedDays: 4 },
      { id: "sub-3", service: "Max", monthlyPrice: 22.9, lastUsedDays: 14 },
      { id: "sub-4", service: "Disney+", monthlyPrice: 43.9, lastUsedDays: 38 },
    ],
    searches: [],
  };
}

function getOrInitUserState(userId: string): UserState {
  const existing = userStore.get(userId);
  if (existing) {
    return existing;
  }

  const created = createDefaultState();
  userStore.set(userId, created);
  return created;
}

export function getUserId(raw?: string | null): string {
  const normalized = raw?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_USER_ID;
}

export function listSubscriptions(userId: string): SubscriptionItem[] {
  return [...getOrInitUserState(userId).subscriptions];
}

export function setSubscriptions(userId: string, subscriptions: SubscriptionItem[]): void {
  const state = getOrInitUserState(userId);
  state.subscriptions = subscriptions.map((item) => ({ ...item }));
}

function isValidSubscriptionItem(value: unknown): value is SubscriptionItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SubscriptionItem>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.service === "string" &&
    candidate.service.trim().length > 0 &&
    typeof candidate.monthlyPrice === "number" &&
    Number.isFinite(candidate.monthlyPrice) &&
    candidate.monthlyPrice >= 0 &&
    typeof candidate.lastUsedDays === "number" &&
    Number.isInteger(candidate.lastUsedDays) &&
    candidate.lastUsedDays >= 0
  );
}

export function parseSubscriptionsCookie(raw?: string | null): SubscriptionItem[] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned = parsed.filter(isValidSubscriptionItem).map((item) => ({
      id: item.id,
      service: item.service,
      monthlyPrice: item.monthlyPrice,
      lastUsedDays: item.lastUsedDays,
    }));

    return cleaned;
  } catch {
    return null;
  }
}

export function serializeSubscriptionsCookie(subscriptions: SubscriptionItem[]): string {
  return JSON.stringify(
    subscriptions.map((item) => ({
      id: item.id,
      service: item.service,
      monthlyPrice: item.monthlyPrice,
      lastUsedDays: item.lastUsedDays,
    }))
  );
}

export function addSubscription(
  userId: string,
  payload: { service: string; monthlyPrice: number; lastUsedDays: number }
): SubscriptionItem {
  const state = getOrInitUserState(userId);
  const item: SubscriptionItem = {
    id: `sub-${Date.now()}`,
    service: payload.service,
    monthlyPrice: payload.monthlyPrice,
    lastUsedDays: payload.lastUsedDays,
  };

  state.subscriptions.push(item);
  return item;
}

export function removeSubscription(userId: string, id: string): boolean {
  const state = getOrInitUserState(userId);
  const before = state.subscriptions.length;
  state.subscriptions = state.subscriptions.filter((sub) => sub.id !== id);
  return state.subscriptions.length < before;
}

export function registerSearch(userId: string, query: string, titles: string[]): void {
  const state = getOrInitUserState(userId);
  state.searches.unshift({
    query,
    titles: titles.slice(0, 3),
    createdAt: Date.now(),
  });
  state.searches = state.searches.slice(0, 5);
}

function getFinancialSummaryFromList(subs: SubscriptionItem[]): {
  monthlyTotal: number;
  annualTotal: number;
  potentialSavings: number;
  lowUsageCount: number;
} {
  const monthlyTotal = subs.reduce((sum, sub) => sum + sub.monthlyPrice, 0);
  const lowUsage = subs.filter((sub) => sub.lastUsedDays >= 30);
  const potentialSavings = lowUsage.reduce((sum, sub) => sum + sub.monthlyPrice, 0);

  return {
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    potentialSavings,
    lowUsageCount: lowUsage.length,
  };
}

export function getFinancialSummaryFromSubscriptions(subs: SubscriptionItem[]): {
  monthlyTotal: number;
  annualTotal: number;
  potentialSavings: number;
  lowUsageCount: number;
} {
  return getFinancialSummaryFromList(subs);
}

export function getFinancialSummary(userId: string): {
  monthlyTotal: number;
  annualTotal: number;
  potentialSavings: number;
  lowUsageCount: number;
} {
  const subs = getOrInitUserState(userId).subscriptions;
  return getFinancialSummaryFromList(subs);
}

export type EconomyAlert = {
  id: string;
  title: string;
  description: string;
  monthlyImpact: number;
  severity: "high" | "medium" | "low";
};

function buildEconomyAlertsFromList(subs: SubscriptionItem[]): EconomyAlert[] {
  const summary = getFinancialSummaryFromList(subs);
  const alerts: EconomyAlert[] = [];

  const inactive = subs.filter((sub) => sub.lastUsedDays >= 30);
  if (inactive.length > 0) {
    const impact = inactive.reduce((sum, sub) => sum + sub.monthlyPrice, 0);
    alerts.push({
      id: "pause-inactive",
      title: "Pausar servicos sem uso",
      description: `Voce tem ${inactive.length} servico(s) com mais de 30 dias sem uso.`,
      monthlyImpact: impact,
      severity: "high",
    });
  }

  if (summary.monthlyTotal > 120) {
    alerts.push({
      id: "high-monthly-spend",
      title: "Gasto mensal acima da meta",
      description: "Seu gasto mensal esta acima de R$120. Avalie manter no maximo 2-3 servicos ativos.",
      monthlyImpact: Math.max(summary.monthlyTotal - 120, 0),
      severity: "medium",
    });
  }

  const hasPrime = subs.some((sub) => sub.service.toLowerCase().includes("prime"));
  const hasNetflix = subs.some((sub) => sub.service.toLowerCase().includes("netflix"));
  const hasMax = subs.some((sub) => sub.service.toLowerCase().includes("max"));

  if (hasPrime && hasNetflix && hasMax) {
    alerts.push({
      id: "bundle-overlap",
      title: "Possivel sobreposicao de catalogo",
      description: "Prime, Netflix e Max ativos ao mesmo tempo podem gerar sobreposicao para uso casual.",
      monthlyImpact: 22.9,
      severity: "low",
    });
  }

  return alerts;
}

export function buildEconomyAlertsFromSubscriptions(subs: SubscriptionItem[]): EconomyAlert[] {
  return buildEconomyAlertsFromList(subs);
}

export function buildEconomyAlerts(userId: string): EconomyAlert[] {
  const subs = getOrInitUserState(userId).subscriptions;
  return buildEconomyAlertsFromList(subs);
}

export function getHybridRecommendationContext(userId: string): {
  subscriptions: SubscriptionItem[];
  financial: ReturnType<typeof getFinancialSummary>;
  alerts: EconomyAlert[];
  recentSearches: SearchSnapshot[];
} {
  const state = getOrInitUserState(userId);
  return {
    subscriptions: [...state.subscriptions],
    financial: getFinancialSummary(userId),
    alerts: buildEconomyAlerts(userId),
    recentSearches: [...state.searches],
  };
}

export function buildRuleBasedRecommendation(userId: string, userMessage: string): string {
  const context = getHybridRecommendationContext(userId);
  const text = userMessage.toLowerCase();

  if (text.includes("cancel") || text.includes("econom")) {
    if (context.alerts.length > 0) {
      const top = context.alerts[0];
      return `${top.title}: ${top.description} Economia estimada de R$${top.monthlyImpact.toFixed(2)}/mes.`;
    }

    return "No momento, nao encontrei alerta critico. Avalie reduzir para 2-3 servicos por ciclo mensal.";
  }

  if (text.includes("assinar") || text.includes("vale a pena")) {
    return "Para custo-beneficio no Brasil, Prime Video costuma ser entrada boa. Some apenas um segundo servico alinhado ao seu genero favorito.";
  }

  return "Com base no seu perfil, priorize manter so os servicos que voce usou nas ultimas 2 semanas.";
}
