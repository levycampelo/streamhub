"use client";

import { FormEvent, useMemo, useState } from "react";
import { NavBar } from "@/components/nav-bar";
import {
  buildDeepLink,
  detectDevice,
  listSupportedProviders,
  type DeepLinkProvider,
} from "@/lib/deep-links";

export default function DeepLinksPage() {
  const providers = useMemo(() => listSupportedProviders(), []);
  const [provider, setProvider] = useState<DeepLinkProvider>("Netflix");
  const [title, setTitle] = useState("John Wick");
  const [externalId, setExternalId] = useState("603692");
  const [statusMessage, setStatusMessage] = useState("");
  const device = detectDevice();

  const links = useMemo(() => buildDeepLink(provider, externalId.trim() || "0000", title), [provider, externalId, title]);

  function attemptDeepLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startedAt = Date.now();
    let hidden = false;

    const onVisibilityChange = () => {
      hidden = document.visibilityState === "hidden";
    };

    document.addEventListener("visibilitychange", onVisibilityChange, { once: true });
    setStatusMessage(`Tentando abrir app em ${provider}...`);
    window.location.href = links.appUrl;

    window.setTimeout(() => {
      if (!hidden && Date.now() - startedAt >= 1100) {
        window.open(links.webUrl, "_blank", "noopener,noreferrer");
        setStatusMessage("App nao abriu. Fallback web executado em nova aba.");
      } else {
        setStatusMessage("App aberto com sucesso (ou usuario saiu da pagina). Fallback nao necessario.");
      }
    }, 1200);
  }

  return (
    <main className="min-h-screen pb-12">
      <NavBar />

      <section className="mx-auto max-w-6xl px-4 section-enter">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8aa8d2]">Deep Link Lab</p>
          <h2 className="mt-2 text-4xl leading-[0.95] md:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
            APP-FIRST COM FALLBACK.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] md:text-base">
            Ambiente visual para validar comportamento de abertura de app, fallback web e experiencia por dispositivo.
          </p>
          <p className="mt-2 inline-block rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
            Dispositivo detectado: {device}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-6xl gap-4 px-4 lg:grid-cols-2">
        <article className="card p-5 section-enter stagger-1">
          <h3 className="text-lg font-semibold">Simulador de abertura</h3>
          <form onSubmit={attemptDeepLink} className="mt-4 space-y-3">
            <label className="text-xs text-[var(--muted)]">
              Provider
              <select
                className="input mt-1"
                value={provider}
                onChange={(event) => setProvider(event.target.value as DeepLinkProvider)}
              >
                {providers.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-[var(--muted)]">
              Titulo
              <input
                className="input mt-1"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: The Last of Us"
              />
            </label>

            <label className="text-xs text-[var(--muted)]">
              ID externo
              <input
                className="input mt-1"
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                placeholder="Ex: 603692"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn">
                Testar app-first
              </button>
              <a className="btn-ghost" href={links.webUrl} target="_blank" rel="noreferrer noopener">
                Abrir fallback web
              </a>
            </div>
          </form>

          {statusMessage ? (
            <p className="mt-3 rounded-xl border border-[var(--line)] bg-[#0d1628] p-3 text-sm text-[var(--muted)]">
              {statusMessage}
            </p>
          ) : null}
        </article>

        <article className="card p-5 section-enter stagger-2">
          <h3 className="text-lg font-semibold">Payload de Deep Link</h3>
          <div className="mt-3 space-y-2 rounded-xl border border-[var(--line)] bg-[#0d1628] p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Provider</p>
            <p>{links.provider}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">App URL</p>
            <p className="break-all text-[#9ed9ff]">{links.appUrl}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Web Fallback</p>
            <p className="break-all text-[#ffd9a4]">{links.webUrl}</p>
          </div>

          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[#101d33] p-3 text-xs text-[var(--muted)]">
            Fluxo esperado: clique do usuario, tentativa de abrir app e fallback web automatico quando o app nao esta instalado.
          </div>
        </article>
      </section>
    </main>
  );
}
