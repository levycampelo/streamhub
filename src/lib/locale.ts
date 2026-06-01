export const LOCALE_COOKIE_NAME = "streamhub_locale";

export const SUPPORTED_LOCALES = ["pt", "en", "es"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const htmlLangByLocale: Record<AppLocale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
};

export function normalizeLocale(value: string | null | undefined): AppLocale {
  if (!value) return "pt";

  const normalized = value.toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized as AppLocale)) {
    return normalized as AppLocale;
  }

  return "pt";
}

export function toHtmlLang(locale: AppLocale): string {
  return htmlLangByLocale[locale];
}
