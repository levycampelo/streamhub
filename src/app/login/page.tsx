"use client";

import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/nav-bar";

type OAuthProviders = {
  google?: { id: string; name: string };
};

function sanitizeCallbackUrl(raw: string | null): string {
  if (!raw) return "/";

  const normalized = raw.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return "/";
  }

  return normalized;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [providers, setProviders] = useState<OAuthProviders>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProviders() {
      const resolved = await getProviders();
      if (!mounted) return;

      if (!resolved) {
        setErrorMessage("Nao foi possivel carregar os providers de login.");
        return;
      }

      setProviders({
        google: resolved.google as OAuthProviders["google"],
      });

      if (!resolved.google) {
        setErrorMessage(
          "Login social indisponivel. Configure AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET no .env.local."
        );
      }
    }

    void loadProviders();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleGoogleLogin() {
    if (!providers.google) {
      setErrorMessage("Google OAuth nao esta configurado no servidor.");
      return;
    }
    await signIn("google", { callbackUrl });
  }

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-3xl px-4 section-enter">
        <div className="card p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8aa8d2]">Acesso protegido</p>
          <h2 className="mt-2 text-4xl leading-[0.95] md:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
            ENTRE COM SUA CONTA GOOGLE.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-[var(--muted)] md:text-base">
            Watchlist, Deep Links e IA Concierge exigem autenticacao social. Entre com sua conta Google para continuar.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-1">
            <button className="btn" onClick={handleGoogleLogin} disabled={!providers.google}>
              Continuar com Google
            </button>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-xl border border-[#7f3d46] bg-[#2a1317] p-3 text-sm text-[#ffb8c0]">{errorMessage}</p>
          ) : null}

          <p className="mt-5 text-xs text-[var(--muted)]">
            Callback atual: {callbackUrl}
          </p>
          <div className="mt-3">
            <Link className="text-sm font-semibold text-[#7be1ff] hover:underline" href="/">
              Voltar para home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
