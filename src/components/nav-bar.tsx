"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLocale, LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

type NavLinkKey = "home" | "search" | "watchlist" | "deepLinks" | "concierge";

type NavLink = {
  href: string;
  key: NavLinkKey;
};

const links: ReadonlyArray<NavLink> = [
  { href: "/", key: "home" },
  { href: "/busca", key: "search" },
];

const protectedLinks: ReadonlyArray<NavLink> = [
  { href: "/watchlist", key: "watchlist" },
  { href: "/deep-links", key: "deepLinks" },
  { href: "/concierge", key: "concierge" },
];

const localeOptions: Array<{ code: AppLocale; label: string; flag: string }> = [
  { code: "pt", label: "PT", flag: "BR" },
  { code: "en", label: "EN", flag: "US" },
  { code: "es", label: "ES", flag: "ES" },
];

const navLabels: Record<
  AppLocale,
  {
    home: string;
    search: string;
    watchlist: string;
    deepLinks: string;
    concierge: string;
    menu: string;
    close: string;
    login: string;
    logout: string;
    connected: string;
    languageAria: string;
  }
> = {
  pt: {
    home: "Home",
    search: "Busca",
    watchlist: "Watchlist",
    deepLinks: "Deep Links",
    concierge: "IA Concierge",
    menu: "Menu",
    close: "Fechar",
    login: "Entrar",
    logout: "Sair",
    connected: "Conectado",
    languageAria: "Trocar idioma",
  },
  en: {
    home: "Home",
    search: "Search",
    watchlist: "Watchlist",
    deepLinks: "Deep Links",
    concierge: "AI Concierge",
    menu: "Menu",
    close: "Close",
    login: "Sign in",
    logout: "Sign out",
    connected: "Connected",
    languageAria: "Switch language",
  },
  es: {
    home: "Inicio",
    search: "Buscar",
    watchlist: "Watchlist",
    deepLinks: "Deep Links",
    concierge: "IA Concierge",
    menu: "Menu",
    close: "Cerrar",
    login: "Entrar",
    logout: "Salir",
    connected: "Conectado",
    languageAria: "Cambiar idioma",
  },
};

function readLocaleFromCookie(): AppLocale {
  if (typeof document === "undefined") return "pt";

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(${LOCALE_COOKIE_NAME}=));

  return normalizeLocale(cookie?.split("=")[1]);
}

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("pt");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setLocale(readLocaleFromCookie());
  }, []);

  async function handleLogout() {
    await signOut({ callbackUrl: "/" });
  }

  function setLanguage(nextLocale: AppLocale) {
    setLocale(nextLocale);
    document.cookie = ${LOCALE_COOKIE_NAME}=; path=/; max-age=31536000; samesite=lax;
  }

  const menuLinks = isAuthenticated
    ? [...links.filter((link) => link.key !== "home"), ...protectedLinks]
    : links.filter((link) => link.key !== "home");

  const t = navLabels[locale];

  return (
    <header className="mx-auto mb-6 max-w-6xl px-4 pt-4 section-enter md:mb-8 md:pt-6">
      <nav className="card p-3 backdrop-blur-sm md:p-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3c8dff]">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#7f9bc4] md:text-xs md:tracking-[0.28em]">Share StreamHub</p>
            <h1 className="text-[1.25rem] leading-none flex items-center gap-2 md:text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
              Seu hub de streaming
              <span className="text-[0.72rem] font-bold text-[#7f9bc4] tracking-wide md:text-base" style={{ letterSpacing: "0.08em" }}>
                BETA
              </span>
            </h1>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-xl border border-[var(--line)] bg-[#0c1628] px-3 py-2 text-xs font-semibold text-[#c9dbf5] transition hover:border-[#2a436a] hover:text-[#e8f1ff]"
            aria-expanded={menuOpen}
            aria-label="Abrir menu de navegacao"
          >
            {menuOpen ? t.close : t.menu}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <div
            className="inline-flex items-center gap-1 rounded-full border border-[#2a436a] bg-[#0c1628] p-1"
            aria-label={t.languageAria}
          >
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setLanguage(option.code)}
                className={inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition }
              >
                <span>{option.flag}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          <Link
            href="/"
            className={ounded-xl border px-3 py-2 font-semibold transition }
          >
            {t.home}
          </Link>
        </div>

        {menuOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-[var(--line)] bg-[#0b1424] p-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={ounded-xl border px-3 py-3 text-center text-sm font-semibold transition }
                >
                  {t[link.key]}
                </Link>
              ))}
            </div>

            <div className="border-t border-[var(--line)] pt-3">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate rounded-xl border border-[var(--line)] bg-[#0c1628] px-3 py-2 text-xs text-[var(--muted)]">
                    {session?.user?.name ?? session?.user?.email ?? t.connected}
                  </span>
                  <button className="btn-ghost px-3 py-2 text-sm" onClick={handleLogout}>
                    {t.logout}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className={lock rounded-xl border px-3 py-3 text-center text-sm font-semibold transition }
                >
                  {t.login}
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
