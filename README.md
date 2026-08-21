# StreamHub Web App

Data de referencia: 2026-07-08
Escopo: documentacao da aplicacao web em streamhub/ (Next.js). Nao cobre IaC/Terraform.

## 1) Resumo do Produto

O StreamHub e um hub para descobrir onde assistir conteudo, organizar watchlist e otimizar custo de assinatura.

Funcionalidades implementadas hoje:
- Home com carrosseis de catalogo (TMDB) e personalizacao por assinaturas do usuario.
- Busca universal com enriquecimento por plataformas e nota IMDb (quando OMDB_API_KEY existe).
- Watchlist local com status, progresso e favoritos.
- Laboratorio de deep links (app-first + fallback web).
- Painel de assinaturas com simuladores de economia, cobertura minima e modo maratona.
- IA Concierge com Gemini + fallback local por regras.
- Pagina de novidades de streaming com snapshot diario e eventos de entrada/saida (via Supabase).
- Login social Google-only com NextAuth.
- Controle de acesso por plano (basico/premium) no menu.

Stack:
- Next.js 16 (App Router)
- React 19 + TypeScript
- NextAuth v4
- Tailwind CSS v4
- Zod
- Supabase REST (service role) para dados de usuario e novidades
- Gemini (Google Generative AI)

## 2) Arquitetura e Estrutura

Diretorio principal:
- streamhub/

Pastas:
- src/app: paginas, layouts e routes de API.
- src/components: navbar, deep links, carrosseis, ads, error boundary e skeletons.
- src/lib: regras de negocio (auth, seguranca API, busca, deep links, watchlist, user store, streaming news).
- scripts: smoke test e automacoes operacionais.
- scripts/sql: schema e migrations SQL para Supabase/Postgres.

Persistencia atual:
- app_users e tabelas de novidades: Supabase (REST com service role).
- assinaturas e contexto de recomendacao: memoria no servidor + cookie HTTP de snapshot.
- watchlist: localStorage no browser.

## 3) Rotas de Pagina

- /: home com hero, carrosseis, badges de provider, ads e JSON-LD.
- /busca: busca universal com add na watchlist.
- /assinaturas: gestao de assinatura + simuladores financeiros.
- /watchlist: acompanhamento de titulos salvos.
- /deep-links: simulador de app-first e fallback web.
- /concierge: chat com IA para recomendacao e economia.
- /novidades: feed de catalogo monitorado por provider/categoria.
- /login: autenticacao Google.
- /assinatura: planos/comercial (links Mercado Pago).

Loading states implementados:
- /loading (home)
- /busca/loading
- /assinaturas/loading
- /concierge/loading

## 4) APIs Implementadas

Autenticacao:
- GET/POST /api/auth/[...nextauth]

Busca:
- POST /api/search/universal
	- body: { query }
	- valida zod, rate limit, chama TMDB, providers, IMDb e registra historico.

Assinaturas:
- GET /api/subscriptions
- POST /api/subscriptions
- DELETE /api/subscriptions
	- usa cookie streamhub_subscriptions_v1 para hidratar e sincronizar snapshot.
	- calcula resumo financeiro.

Alertas financeiros:
- GET /api/alerts/economy?includeSummary=true|false

Concierge:
- POST /api/concierge
	- requer sessao.
	- usa gemini-2.5-flash com contexto real do usuario.
	- fallback por regra local quando quota/429.

Novidades de streaming:
- GET /api/streaming-news?provider=<key>&limit=<1..200>
- GET/POST /api/cron/streaming-news/sync
	- protegido por Authorization: Bearer <secret>

## 5) Auth, Plano e Controle de Acesso

Auth:
- NextAuth com GoogleProvider.
- Sessao JWT.
- Redirecionamento seguro (somente baseUrl ou caminhos relativos).
- Persistencia do usuario autenticado em app_users via upsert.

Plano:
- Campo plan em app_users (null, basico, premium).
- JWT callback injeta token.plan no login.
- Session callback expoe session.user.plan.

Comportamento de menu por plano (nav-bar):
- Sem login: sem links de produto no menu.
- Logado sem plano: sem links de features.
- basico: libera busca.
- premium: libera busca, novidades, watchlist, deep-links e concierge.

Observacao importante:
- src/proxy.ts esta em modo fallback e nao bloqueia rotas no edge hoje.
- Protecao hard de API sensivel continua no server (getAuthenticatedUserId + validacoes).

## 6) Busca, Catalogo e Deep Links

Busca universal (lib/universal-search.ts):
- TMDB movie + tv.
- Enriquecimento de providers BR.
- Preferencia de provider para watch URL.
- IMDb rating via OMDB (opcional).
- Cache em memoria (TTL 5 min).

Home personalizada:
- Se houver assinaturas do usuario, filtra catalogo via discover TMDB com providers ativos.
- Se nao houver, usa trending/popular global.
- Deep links nos cards usam provider compativel com assinatura.
- Fallback para web search URL do provider para reduzir erro de ID direto.

Deep link strategy:
- Mobile: tenta app URL e aplica fallback web apos timeout.
- Desktop: navega em web URL.

## 7) Modulo Assinaturas e Economia

Implementado em /assinaturas:
- CRUD de assinaturas (via API).
- Resumo mensal/anual e potencial de economia.
- Alertas de baixo uso e sobreposicao.
- Recomendacoes por acao: cancelar, pausar, trocar_plano, manter.
- Simulador de meta mensal e impacto por recomendacao aplicada.
- Otimizador de catalogo por menor custo (forca bruta de combinacoes).
- Modo maratona por meses com alocacao de servicos por cobertura.
- Integracao opcional com titulos da watchlist para enriquecer otimizador.

## 8) Watchlist

Storage:
- localStorage (streamhub-watchlist-v1).

Recursos:
- adicionar/remover item.
- status: pending, watching, completed.
- progresso 0..100 com transicao automatica de status.
- favorito.
- filtro por status e provider.
- alerta visual quando item nao casa com assinaturas cadastradas.

## 9) Modulo Novidades (Streaming News)

Coleta:
- Categorias: trending_movie, trending_tv, popular_movie, popular_tv, recent_movies_12m.
- Providers monitorados: netflix, disney_plus, prime_video, max.

Pipeline:
- runStreamingNewsSync() coleta snapshot do dia, compara com snapshot anterior, gera eventos added/removed, faz upsert em Supabase.

Feed:
- fetchLatestStreamingNews() retorna snapshot atual + eventos.
- /novidades deduplica por provider/media/tmdb priorizando categorias mais relevantes.

Agendamento:
- vercel.json: cron semanal quarta 05:00 UTC em /api/cron/streaming-news/sync.

## 10) Seguranca

Headers globais (next.config.ts):
- Content-Security-Policy
- Referrer-Policy
- X-Content-Type-Options
- X-Frame-Options
- Permissions-Policy
- Strict-Transport-Security

API hardening (lib/api-security.ts):
- traceId por requisicao
- padrao de erro consistente
- validacao Content-Type JSON
- rate limit em memoria por IP/escopo

Validacao de payload:
- zod nas rotas principais.

## 11) SEO, Analytics e Ads

SEO implementado:
- metadata completa (title/description/keywords).
- Open Graph + Twitter cards.
- robots dinamico e sitemap dinamico.
- JSON-LD (WebSite + Service) na home.

Performance/observabilidade:
- @vercel/speed-insights
- @vercel/analytics (dependencia instalada)

Monetizacao:
- Google AdSense script global no layout.
- componentes GoogleAdUnit em home, busca e footer.

## 12) Variaveis de Ambiente

Obrigatorias para auth:
- AUTH_GOOGLE_ID
- AUTH_GOOGLE_SECRET
- AUTH_SECRET (obrigatoria em producao)
- NEXTAUTH_URL

Obrigatorias para dados Supabase (features com persistencia):
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL

Obrigatorias para busca/catalogo TMDB:
- TMDB_API_KEY ou TMDB_API_READ_ACCESS_TOKEN

Obrigatoria para IA:
- GEMINI_API_KEY

Opcional:
- OMDB_API_KEY (nota IMDb)
- NEXT_PUBLIC_SITE_URL (canonical/SEO)
- NEXT_PUBLIC_ADSENSE_SLOT_FOOTER
- NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
- NEXT_PUBLIC_ADSENSE_SLOT_BANNER_1
- NEXT_PUBLIC_ADSENSE_SLOT_BANNER_2
- STREAMING_NEWS_CRON_SECRET (ou CRON_SECRET)
- APP_URL (script sync-streaming-news)
- NEXT_PUBLIC_MP_STANDARD_CHECKOUT_URL
- NEXT_PUBLIC_MP_FULL_CHECKOUT_URL

## 13) Setup Local

Requisitos:
- Node 20+
- npm 10+

Passos:
1. cd streamhub
2. npm install
3. configurar .env.local
4. npm run dev

Build:
- npm run build
- npm run start

## 14) Scripts Disponiveis

- npm run dev
- npm run build
- npm run start
- npm run lint
- npm run smoke:auth
- npm run sync:streaming-news
- npm run plan:set -- <email> <basico|premium>

Detalhes:
- smoke-auth.mjs valida pagina de login, comportamento de rotas privadas e providers de auth.
- sync-streaming-news.mjs chama endpoint cron com bearer secret.
- set-user-plan.mjs atualiza plan do usuario no app_users via Supabase REST.

## 15) SQL de Banco (scripts/sql)

Arquivos:
- app-users.sql: cria app_users, coluna/constraint plan, indice, RLS e policy service_role.
- add-plan-column.sql: migration isolada para coluna/constraint de plan.
- streaming-news.sql: cria tabelas streaming_catalog_items e streaming_catalog_events, indices, RLS e policies de leitura publica.

## 16) Limitacoes Atuais (Reais)

- Rate limit, cache de busca e store de assinaturas/alertas sao em memoria do processo (nao distribuido).
- Watchlist fica no browser (nao sincroniza entre dispositivos/contas).
- proxy.ts nao esta aplicando bloqueio edge neste momento.
- Algumas regras de smoke auth podem divergir do comportamento atual caso middleware edge continue desativado.
- Integracao de plano existe no menu/sessao, mas depende da manutencao correta do campo plan no app_users.

## 17) Checklist Operacional

Antes de deploy:
1. Validar AUTH_* e NEXTAUTH_URL.
2. Validar TMDB e GEMINI_API_KEY.
3. Validar SUPABASE_* e existencia das tabelas SQL.
4. Rodar npm run build.
5. Rodar npm run smoke:auth.
6. Testar login Google, busca, concierge e novidades.

## 18) Licenciamento de Conteudo

Catalogos, posters, logos, marcas e paginas de terceiros pertencem aos respectivos titulares.
