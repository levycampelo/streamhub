export type DeepLinkProvider =
  | "Netflix"
  | "Disney+"
  | "Max"
  | "Prime Video"
  | "Spotify"
  | "Crunchyroll"
  | "Globoplay"
  | "Paramount+"
  | "Apple TV+"
  | "YouTube";

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
  "Spotify",
  "Crunchyroll",
  "Globoplay",
  "Paramount+",
  "Apple TV+",
  "YouTube",
];

export function listSupportedProviders(): DeepLinkProvider[] {
  return providerCatalog;
}

export function normalizeProviderName(name: string | null): DeepLinkProvider | null {
  if (!name) return null;

  const normalized = name.trim().toLowerCase();

  if (normalized.includes("netflix")) return "Netflix";
  if (normalized.includes("disney")) return "Disney+";
  if (normalized.includes("max") || normalized.includes("hbo")) return "Max";
  if (normalized.includes("prime")) return "Prime Video";
  if (normalized.includes("spotify")) return "Spotify";
  if (normalized.includes("crunchy")) return "Crunchyroll";
  if (normalized.includes("globo")) return "Globoplay";
  if (normalized.includes("paramount")) return "Paramount+";
  if (normalized.includes("apple")) return "Apple TV+";
  if (normalized.includes("youtube")) return "YouTube";

  return null;
}

function encodeTerm(term: string): string {
  return encodeURIComponent(term.trim());
}

export function buildDeepLink(provider: DeepLinkProvider, contentId: string, title: string): DeepLinkResult {
  const query = encodeTerm(title);

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
        webUrl: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`,
      };
    case "Spotify":
      return {
        provider,
        appUrl: `spotify:show:${contentId}`,
        webUrl: `https://open.spotify.com/search/${query}`,
      };
    case "Crunchyroll":
      return {
        provider,
        appUrl: `crunchyroll://media/${contentId}`,
        webUrl: `https://www.crunchyroll.com/search?q=${query}`,
      };
    case "Globoplay":
      return {
        provider,
        appUrl: `globoplay://content/${contentId}`,
        webUrl: `https://globoplay.globo.com/busca/?q=${query}`,
      };
    case "Paramount+":
      return {
        provider,
        appUrl: `paramountplus://video/${contentId}`,
        webUrl: `https://www.paramountplus.com/br/search/?q=${query}`,
      };
    case "Apple TV+":
      return {
        provider,
        appUrl: `com.apple.tv://title/${contentId}`,
        webUrl: `https://tv.apple.com/br/search?term=${query}`,
      };
    case "YouTube":
      return {
        provider,
        appUrl: `vnd.youtube://results?search_query=${query}`,
        webUrl: `https://www.youtube.com/results?search_query=${query}`,
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
