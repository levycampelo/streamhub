"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLocale, LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/locale";

type NavLinkKey = "home" | "search" | "news" | "watchlist" | "deepLinks" | "concierge";

type NavLink = {
  href: string;
  key: NavLinkKey;
};

const links: ReadonlyArray<NavLink> = [
  { href: "/", key: "home" },
  { href: "/busca", key: "search" },
  { href: "/novidades", key: "news" },
];

const protectedLinks: ReadonlyArray<NavLink> = [
  { href: "/watchlist", key: "watchlist" },
  { href: "/deep-links", key: "deepLinks" },
  { href: "/concierge", key: "concierge" },
];

const navLabels: Record<
  AppLocale,
  {
    home: string;
    search: string;
    news: string;
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
    news: "Novidades",
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
    news: "News",
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
    news: "Novedades",
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
    .find((entry) => entry.startsWith(LOCALE_COOKIE_NAME + "="));

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

  const menuLinks = isAuthenticated
    ? [...links.filter((link) => link.key !== "home"), ...protectedLinks]
    : links.filter((link) => link.key !== "home" && link.key !== "news");

  const t = navLabels[locale];

  return (
    <header className="relative z-40 mx-auto mb-3 max-w-6xl px-3 pt-2.5 section-enter md:mb-5 md:px-4 md:pt-4">
      <nav className="card relative z-40 px-2.5 py-2 backdrop-blur-sm md:px-4 md:py-3">
        <div className="flex items-center justify-between gap-2.5 md:gap-3">
          <Link href="/" className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3c8dff]">
            {/* <p className="text-[10px] uppercase tracking-[0.22em] text-[#7f9bc4] md:text-xs md:tracking-[0.28em]">Share StreamHub</p> */}
            <div className="mt-0.5 flex items-end gap-1.5">
              <img
                src="/logos/teste_logo.PNG"
                alt="SharingHub"
                className="h-10 w-auto md:h-11"
              />
              <span className="pb-0.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#7f9bc4] md:text-[0.72rem]">
                BETA
              </span>
            </div>
          </Link>

          <div className="relative flex items-center gap-1.5">
            <Link
              href="/assinatura"
              className={
                "inline-flex !h-[24px] !w-auto items-center justify-center rounded-[7px] border !px-2 text-[10px] !leading-none font-semibold tracking-[0.01em] text-white transition sm:!h-[26px] sm:text-[11px] md:!h-[28px] md:text-[11px] " +
                (pathname === "/assinatura"
                  ? "border-[#ff6b61] bg-[#d93d35] shadow-[0_8px_22px_rgba(217,61,53,0.3)]"
                  : "border-[#ff6b61] bg-[#e04a42] hover:bg-[#ef5a52] hover:shadow-[0_8px_22px_rgba(224,74,66,0.28)]")
              }
            >
              Assinatura
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex !h-[24px] !w-auto items-center justify-center rounded-[7px] border border-[#2a3f63] bg-[#0c1628] !px-2 text-[10px] !leading-none font-semibold tracking-[0.01em] text-[#d7e5ff] transition hover:border-[#3e5f93] hover:bg-[#101d33] hover:text-[#f2f7ff] sm:!h-[26px] sm:text-[11px] md:!h-[28px] md:text-[11px]"
              aria-expanded={menuOpen}
              aria-label="Abrir menu de navegacao"
            >
              {menuOpen ? t.close : t.menu}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-[160px] max-w-[calc(100vw-0.75rem)] rounded-[10px] border border-[#2a4066] bg-[linear-gradient(180deg,rgba(12,23,40,0.98)_0%,rgba(9,18,33,0.98)_100%)] p-1 shadow-[0_14px_30px_rgba(0,0,0,0.5)] backdrop-blur-md sm:w-[172px] md:w-[184px]">
                <div className="flex flex-col gap-0.5">
                  {menuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={
                        "inline-flex !h-[24px] w-full items-center justify-start rounded-[7px] border !px-2 text-[10px] !leading-none font-medium tracking-[0.01em] transition sm:!h-[26px] sm:text-[11px] md:!h-[28px] md:text-[11px] " +
                        (pathname === link.href
                          ? "border-[#4b87e8] bg-[#17315b] text-[#f3f8ff]"
                          : "border-[#263d62] bg-[#0e1a2e] text-[#b8c9e6] hover:border-[#3f6297] hover:bg-[#12233d] hover:text-[#edf4ff]")
                      }
                    >
                      <span className="mr-1.5 h-1 w-1 rounded-full bg-current opacity-70" aria-hidden />
                      <span className="truncate">{t[link.key]}</span>
                    </Link>
                  ))}
                </div>

                <div className="mt-1 border-t border-[#2a4066] pt-1">
                  {isAuthenticated ? (
                    <div className="space-y-1">
                      <span className="block truncate rounded-[7px] border border-[#2a4066] bg-[#0f1d33] px-2 py-1 text-[10px] !leading-none text-[#93a9cc] sm:text-[10px] md:text-[11px]">
                        {session?.user?.name ?? session?.user?.email ?? t.connected}
                      </span>
                      <button
                        className="inline-flex !h-[24px] w-full items-center justify-center rounded-[7px] border border-[#365989] bg-[#132742] px-2 text-[10px] !leading-none font-semibold text-[#edf4ff] transition hover:border-[#4a75ad] hover:bg-[#183058] sm:!h-[26px] sm:text-[11px] md:!h-[28px] md:text-[11px]"
                        onClick={handleLogout}
                      >
                        {t.logout}
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className={
                        "inline-flex !h-[24px] w-full items-center justify-center rounded-[7px] border px-2 text-[10px] !leading-none font-semibold tracking-[0.01em] transition sm:!h-[26px] sm:text-[11px] md:!h-[28px] md:text-[11px] " +
                        (pathname === "/login"
                          ? "border-[#4b87e8] bg-[#17315b] text-[#f3f8ff]"
                          : "border-[#263d62] bg-[#0e1a2e] text-[#b8c9e6] hover:border-[#3f6297] hover:bg-[#12233d] hover:text-[#edf4ff]")
                      }
                    >
                      {t.login}
                    </Link>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
