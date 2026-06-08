
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Manrope } from "next/font/google";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAdUnit } from "@/components/google-ad-unit";
import { LOCALE_COOKIE_NAME, normalizeLocale, toHtmlLang } from "@/lib/locale";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const headingFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
});

const uiFont = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Share StreamHub | Onde assistir filmes e series",
    template: "%s | Share StreamHub",
  },
  description:
    "Compare streamings, descubra onde assistir filmes e series e organize watchlist com recomendacoes para economizar.",
  keywords: [
    "onde assistir",
    "streaming",
    "filmes e series",
    "melhor streaming",
    "comparar streamings",
    "watchlist",
    "deep links streaming",
    "economizar streaming",
    "Netflix",
    "Prime Video",
    "Disney Plus",
    "Max",
    "onde assistir online",
    "streaming brasil",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Share StreamHub",
    title: "Share StreamHub | Onde assistir filmes e series",
    description:
      "Descubra onde assistir, compare streamings e organize sua watchlist em um unico hub.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Share StreamHub — Onde assistir filmes e series",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Share StreamHub | Onde assistir filmes e series",
    description:
      "Compare servicos de streaming, encontre filmes e series e economize nas assinaturas.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#060e1c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const currentYear = new Date().getFullYear();

  return (
    <html lang={toHtmlLang(locale)}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9694036490209505"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${headingFont.variable} ${uiFont.variable}`}>
        <ErrorBoundary>
          <AuthSessionProvider>
            {children}
            <div className="mx-auto mt-6 max-w-6xl px-4">
              <GoogleAdUnit
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER ?? ""}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-[#060e1c] py-2 text-center text-xs text-[var(--muted)]"
              />
            </div>
            <footer className="mx-auto mt-8 w-full max-w-6xl border-t border-[var(--line)] px-4 py-6 text-center text-xs text-[var(--muted)]">
              &copy; {currentYear} StreamHub - Todos os conteudos externos continuam a ser propriedade do seu legitimo proprietario.
            </footer>
          </AuthSessionProvider>
          <SpeedInsights />
        </ErrorBoundary>
      </body>
    </html>
  );
}
