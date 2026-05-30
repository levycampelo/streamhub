"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

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

  async function handleLogout() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <header className="mx-auto mb-8 max-w-6xl px-4 pt-6 section-enter">
      <nav className="card flex flex-wrap items-center justify-between gap-4 p-4 backdrop-blur-sm">
        <Link href="/" className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3c8dff]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#7f9bc4]">Share StreamHub</p>
          <h1 className="text-2xl leading-none flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            Seu hub de streaming
            <span className="text-base font-bold text-[#7f9bc4] tracking-wide" style={{letterSpacing: '0.08em'}}>BETA</span>
          </h1>
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm">
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
      </nav>
    </header>
  );
}
