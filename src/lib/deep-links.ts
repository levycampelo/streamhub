export type DeepLinkProvider =
  | "Netflix"
  | "Disney+"
  | "Max"
  | "Prime Video";

export type DeepLinkResult = {
  provider: DeepLinkProvider;
  appUrl: string;
  webUrl: string;
};

const providerCatalog: DeepLinkProvider[] = [
  "Netflix",
  "Disney+",
  "Max",
  "Prime Video",
];

export function listSupportedProviders(): DeepLinkProvider[] {
  return providerCatalog;
}

export function normalizeProviderName(name: string | null): DeepLinkProvider | null {
  if (!name) return null;

  const normalized = name.trim().toLowerCase();

  if (normalized.includes("netflix")) return "Netflix";
  if (normalized.includes("disney") || normalized.includes("disney plus") || normalized.includes("disney+")) return "Disney+";
  if (normalized.includes("max") || normalized.includes("hbo")) return "Max";
  if (
    normalized.includes("prime") ||
    normalized.includes("amazon") ||
    normalized.includes("prime video") ||
    normalized.includes("primevideo")
  ) {
    return "Prime Video";
  }

  return null;
}

function encodeTerm(term: string): string {
  return encodeURIComponent(term.trim());
}

export function buildDeepLink(provider: DeepLinkProvider, contentId: string, title: string): DeepLinkResult {
  const query = encodeTerm(title);

  // Implementação de Deep-Links V2 (Programa de Afiliados)
  // Utilizando parâmetros de tracking de programas como Impact ou Rakuten
  const impactTrackParams = "?irclickid=STREAMHUB_AFFILIATE_ID&irgwc=1";
  
  switch (provider) {
    case "Netflix":
      return {
        provider,
        appUrl: `netflix://title/${contentId}`,
        webUrl: `https://www.netflix.com/title/${contentId}`,
      };
    case "Disney+":
      return {
        provider,
        appUrl: `disneyplus://entity/${contentId}`,
        webUrl: `https://www.disneyplus.com/search?q=${query}`,
      };
    case "Max":
      return {
        provider,
        appUrl: `max://title/${contentId}`,
        webUrl: `https://play.max.com/search?q=${query}`,
      };
    case "Prime Video":
      return {
        provider,
        appUrl: `primevideo://detail/${contentId}`,
        // Injetando rastreamento de parceiros/afiliados.
        webUrl: `https://www.primevideo.com/search/ref=atv_nb_sr${impactTrackParams}&phrase=${query}`,
      };
    default:
      return {
        provider,
        appUrl: `https://www.google.com/search?q=${query}`,
        webUrl: `https://www.google.com/search?q=${query}`,
      };
  }
}

export function detectDevice(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}
