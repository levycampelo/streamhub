"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/busca", label: "Busca" },
];

const protectedLinks = [
  { href: "/watchlist", label: "Watchlist" },
  { href: "/deep-links", label: "Deep Links" },
  { href: "/concierge", label: "IA Concierge" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await signOut({ callbackUrl: "/" });
  }

  const allLinks = isAuthenticated ? [...links, ...protectedLinks] : links;

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
            className="rounded-xl border border-[var(--line)] bg-[#0c1628] px-3 py-2 text-xs font-semibold text-[#c9dbf5] transition hover:border-[#2a436a] hover:text-[#e8f1ff] md:hidden"
            aria-expanded={menuOpen}
            aria-label="Abrir menu de navegacao"
          >
            {menuOpen ? "Fechar" : "Menu"}
          </button>
        </div>

        <div className="mt-3 hidden items-center gap-2 text-sm md:flex md:flex-wrap">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl border px-3 py-2 font-semibold transition ${
                pathname === link.href
                  ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                  : "border-[var(--line)] bg-[#0c1628] text-[#9fb4d5] hover:border-[#2a436a] hover:text-[#e8f1ff]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated
            ? protectedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl border px-3 py-2 font-semibold transition ${
                    pathname === link.href
                      ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                      : "border-[var(--line)] bg-[#0c1628] text-[#9fb4d5] hover:border-[#2a436a] hover:text-[#e8f1ff]"
                  }`}
                >
                  {link.label}
                </Link>
              ))
            : null}

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="rounded-xl border border-[var(--line)] bg-[#0c1628] px-3 py-2 text-xs text-[var(--muted)]">
                  {session?.user?.name ?? session?.user?.email ?? "Conectado"}
                </span>
                <button className="btn-ghost px-3 py-2 text-sm" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`rounded-xl border px-3 py-2 font-semibold transition ${
                  pathname === "/login"
                    ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                    : "border-[var(--line)] bg-[#0c1628] text-[#9fb4d5] hover:border-[#2a436a] hover:text-[#e8f1ff]"
                }`}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>

        {menuOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-[var(--line)] bg-[#0b1424] p-3 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {allLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                    pathname === link.href
                      ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                      : "border-[var(--line)] bg-[#0c1628] text-[#9fb4d5] hover:border-[#2a436a] hover:text-[#e8f1ff]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-[var(--line)] pt-3">
              {isAuthenticated ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate rounded-xl border border-[var(--line)] bg-[#0c1628] px-3 py-2 text-xs text-[var(--muted)]">
                    {session?.user?.name ?? session?.user?.email ?? "Conectado"}
                  </span>
                  <button className="btn-ghost px-3 py-2 text-sm" onClick={handleLogout}>
                    Sair
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className={`block rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${
                    pathname === "/login"
                      ? "border-[#3c8dff] bg-[#142746] text-[#edf4ff]"
                      : "border-[var(--line)] bg-[#0c1628] text-[#9fb4d5] hover:border-[#2a436a] hover:text-[#e8f1ff]"
                  }`}
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
