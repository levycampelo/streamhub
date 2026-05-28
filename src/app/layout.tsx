import type { Metadata } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { AuthSessionProvider } from "@/components/auth-session-provider";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Share StreamHub | Onde assistir filmes e series",
    description:
      "Compare servicos de streaming, encontre filmes e series e economize nas assinaturas.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="pt-BR">
      <body className={`${headingFont.variable} ${uiFont.variable}`}>
        <AuthSessionProvider>
          {children}
          <footer className="mx-auto mt-8 w-full max-w-6xl border-t border-[var(--line)] px-4 py-6 text-center text-xs text-[var(--muted)]">
            &copy; {currentYear} StreamHub - Todos os conteudos externos continuam a ser propriedade do seu legitimo proprietario.
          </footer>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
