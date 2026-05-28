# StreamHub - README da Aplicacao Web

Data base: 2026-05-28
Escopo: este documento cobre somente a aplicacao web do StreamHub (Next.js), sem detalhar infraestrutura Terraform.

## 1. Visao Geral

O StreamHub e um hub de descoberta e gestao de streaming com:
- autenticacao social Google-only
- busca universal de titulos
- watchlist unificada
- deep links app-first com fallback web
- pagina de assinaturas com simulacao de economia
- concierge com IA para recomendacoes

Stack principal:
- Next.js 16 (App Router)
- TypeScript
- NextAuth (Google)
- Tailwind CSS v4

## 2. Estado Atual da Aplicacao

Entregue e funcional:
- login Google-only
- rotas protegidas para areas privadas
- APIs sensiveis com validacao server-side
- homepage com catalogo personalizado por assinaturas
- cards de catalogo clicaveis com escolha de provider por assinatura do usuario
- desempate de provider por ordem alfabetica quando houver sobreposicao
- fluxo app-first com fallback web nos links de conteudo

Limitacoes atuais:
- ainda sem PostgreSQL no fluxo principal
- parte do estado e persistida via cookie (assinaturas) para manter consistencia entre paginas e refresh

## 3. Estrutura Principal

Diretorio da aplicacao:
- streamhub/

Pastas relevantes:
- src/app: paginas e rotas de API
- src/components: componentes reutilizaveis
- src/lib: regras de negocio, seguranca e utilitarios
- scripts: smoke tests

Paginas principais:
- /
- /busca
- /assinaturas
- /watchlist
- /deep-links
- /concierge
- /login

APIs principais:
- /api/auth/[...nextauth]
- /api/search/universal
- /api/subscriptions
- /api/alerts/economy
- /api/concierge

## 4. Requisitos de Ambiente

Versoes sugeridas:
- Node.js 20+
- npm 10+

Variaveis obrigatorias:
- AUTH_GOOGLE_ID
- AUTH_GOOGLE_SECRET
- AUTH_SECRET
- NEXTAUTH_URL

Variaveis recomendadas:
- NEXT_PUBLIC_SITE_URL
- TMDB_API_KEY ou TMDB_API_READ_ACCESS_TOKEN
- GEMINI_API_KEY

Variavel opcional:
- OMDB_API_KEY

Observacoes:
- em producao, AUTH_SECRET deve estar configurado
- callback do Google deve incluir o dominio publicado + rota de callback do NextAuth

## 5. Rodando Localmente

Instalacao:
1. entrar na pasta streamhub
2. instalar dependencias: npm install
3. criar/ajustar .env.local
4. iniciar: npm run dev

Build de validacao:
- npm run build

Scripts disponiveis:
- npm run dev
- npm run build
- npm run start
- npm run lint
- npm run smoke:auth

## 6. Seguranca e Auth

Padrao atual:
- Google-only via NextAuth
- sessao JWT
- callback seguro com redirecionamento controlado
- logout com retorno para home

Rotas protegidas:
- /watchlist
- /deep-links
- /concierge
- /api/concierge
- /api/subscriptions
- /api/alerts/economy

Boas praticas aplicadas:
- validacao Zod em rotas principais
- bloqueio de identidade vinda do cliente para fluxos sensiveis
- rate limit basico por endpoint

## 7. Personalizacao por Assinaturas

Fluxo atual:
1. usuario atualiza assinaturas em /assinaturas
2. API persiste snapshot de assinaturas em cookie HTTP
3. home le assinaturas do usuario
4. carrosseis filtram titulos por providers compativeis

Regra de selecao do provider no clique da capa:
- usar somente providers presentes nas assinaturas do usuario
- se houver mais de um provider valido para o mesmo titulo, escolher alfabeticamente

## 8. Deep Links e Fallback

Comportamento dos cards de capa:
- mobile: tenta abrir app e, se nao houver troca de contexto, cai para fallback web
- desktop: abre direto URL web do provider

Importante:
- IDs internos de provedores podem divergir dos IDs TMDB
- por isso, o fluxo atual privilegia URLs de busca por titulo no provider para reduzir erros 404

## 9. SEO e Indexacao

Ja configurado:
- metadata base, title, description e keywords
- Open Graph e Twitter cards
- robots.txt dinamico
- sitemap.xml dinamico
- dados estruturados JSON-LD

## 10. Smoke e Verificacao

Smoke auth:
- script: npm run smoke:auth
- valida login publico, redirecionamento de rotas protegidas e providers de auth

Checklist rapido apos mudancas:
1. npm run build
2. validar login Google
3. validar rotas protegidas sem sessao
4. validar clique de capas na home
5. validar fallback web de deep links

## 11. Proximos Passos Recomendados

1. Migrar persistencia de assinatura/watchlist para PostgreSQL
2. Padronizar observabilidade (logs, metricas, alertas)
3. Ajustar pipeline de lint para comando compativel com Next 16
4. Publicar em staging AWS com custo minimo e rollback ensaiado

## 12. Licenciamento de Conteudo

Todos os conteudos externos (catalogos, imagens, marcas e paginas de providers) continuam sendo propriedade de seus respectivos titulares.
