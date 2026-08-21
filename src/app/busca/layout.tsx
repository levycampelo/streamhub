import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Busca universal — encontre onde assistir qualquer titulo",
  description:
    "Busque filmes, series, animes e documentarios e descubra em qual streaming assistir agora. Comparador com ratings do IMDb e TMDB para o Brasil.",
  keywords: [
    "buscar filme online",
    "buscar serie online",
    "onde assistir filme",
    "onde assistir serie",
    "comparar catalogo streaming",
    "IMDb rating",
    "busca streaming brasil",
    "filmes disponiveis netflix",
    "series prime video",
    "anime crunchyroll",
  ],
  alternates: {
    canonical: `${siteUrl}/busca`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: `${siteUrl}/busca`,
    siteName: "URSUS StreamHub",
    title: "Busca universal — encontre onde assistir qualquer titulo",
    description:
      "Busque filmes, series e animes e descubra em qual streaming assistir, com IMDb rating e link direto para a plataforma.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "URSUS StreamHub — Busca universal de streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Busca universal — encontre onde assistir qualquer titulo",
    description:
      "Descubra onde assistir filmes e series com IMDb rating, comparacao de plataformas e link direto.",
    images: ["/og-image.png"],
  },
};

export default function BuscaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
