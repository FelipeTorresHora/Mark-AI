# Agência de Marketing IA — AGENTS.md

## Stack

```
Backend:  FastAPI + SQLAlchemy + Alembic + pydantic-settings
Frontend: React 19 + TypeScript + Vite 7 + Zustand 5 + TanStack Query 5 + React Router
Database: PostgreSQL 15 (Neon)
LLM:      Gemini 2.0 Flash-Lite (google-generativeai)
Auth:     JWT (python-jose) + bcrypt (passlib) + cookie HttpOnly
OAuth:    X API v2 (PKCE) + LinkedIn API v2 (ugcPosts)
E-mail:   Resend SDK + APScheduler (daily alert + weekly digest)
Testes:   pytest (backend) | Vitest + Testing Library (frontend)
Deploy:   Backend → Vercel Serverless Python | Frontend → Vercel
```

## Estrutura do projeto

```
marketing/
├── AGENTS.md                 ← este arquivo
├── backend/
│   ├── AGENTS.md             ← contexto detalhado do backend
│   ├── src/
│   │   ├── main.py           # FastAPI app, 6 routers, CORS restrito
│   │   ├── config.py         # Settings (DB, Gemini, JWT, OAuth, CORS)
│   │   ├── database.py       # engine, SessionLocal, Base, get_db()
│   │   ├── models/           # ORM: User (+timezone), SocialAccount, Campaign, BrandProfile, Post, ChatSession, NotificationLog
│   │   ├── schemas/          # Pydantic: auth, social_account, publish, generate, campaign, post, chat, brand_profile
│   │   ├── routers/          # auth, social, generate, posts, campaigns, brand_profile, chat
│   │   ├── dependencies/     # auth.py: get_current_user(), get_user_from_token_query()
│   │   ├── services/         # auth_service, oauth_x, oauth_linkedin, oauth_state, social_crypto, gemini, sse, chat_cmo, resend_service, email_templates/
│   │   └── workers/          # scheduler.py (APScheduler lifespan), jobs/daily_alert.py, jobs/weekly_digest.py
│   ├── alembic/
│   │   └── versions/
│   │       ├── 001_initial_schema.py
│   │       ├── 002_add_scheduled_at_to_posts.py
│   │       ├── 003_auth_and_social.py
│   │       ├── 004_social_security.py     # last_refreshed_at/publish_at/error em social_accounts
│   │       ├── 004_chat_sessions.py       # chat_sessions (⚠️ branch paralelo — revision='004_chat_sessions')
│   │       └── 005_notifications.py       # timezone em users + email_notification_logs
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── AGENTS.md             ← contexto detalhado do frontend
    └── src/
        ├── App.tsx           # Entry point: ErrorBoundary + AppProvider + RouterProvider
        ├── AppRoutes.tsx     # createBrowserRouter, ProtectedLayout, AppProvider (silentRefresh + QueryClient)
        ├── pages/            # Login, Register, OAuthCallback, Dashboard, NewCampaign, Review, Posts, Calendar, Templates, Cmo
        ├── data/             # postTemplates.ts — 12 templates estáticos (5 launch + 3 testimonial + 4 educational)
        ├── hooks/            # useAuth, useSocialAccounts, useSSE, usePosts, useCampaigns, useBrandProfile, useChatBriefing, usePostActions, useEditPost
        ├── store/            # Zustand: PostSlice + AuthSlice + ThemeSlice
        ├── components/       # auth/ProtectedRoute, cmo/ (ChatPanel+SettingsPanel+...), common, layout (Sidebar), previews, posts, dashboard, templates, ui
        ├── lib/              # api.ts (withCredentials + interceptors), schemas.ts, queryClient, toast, utils
        └── types/index.ts
```

## Fluxo do usuário

```
/register ou /login  → autentica, recebe JWT em memória + refresh cookie HttpOnly
/cmo                 → chat com CMO IA (coleta brand context via conversa)
                       painel lateral: salva brand context + conecta contas X/LinkedIn (OAuth)
/templates           → escolhe template por nicho → preenche placeholders → injeta no tópico
/nova-campanha       → digita (ou recebe) tópico → POST /api/v1/generate
/campanhas/:id       → revisão: aprovar/rejeitar/editar cada post
                       posts APPROVED → botão "Publicar" → publica direto na plataforma
/posts               → hub global de posts com filtros de status, plataforma e data
/calendario          → visualização mensal e semanal de posts agendados (scheduled_at)
/                    → dashboard com histórico de campanhas (apenas do usuário logado)
```

## Endpoints da API

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | /health | — | Status da API + conexão DB |
| POST | /api/v1/auth/register | — | Cadastro email+senha |
| POST | /api/v1/auth/login | — | Login → access_token + cookie refresh |
| POST | /api/v1/auth/refresh | cookie | Renova access_token silenciosamente |
| POST | /api/v1/auth/logout | — | Limpa cookie refresh |
| GET | /api/v1/auth/me | Bearer | Dados do usuário logado |
| GET | /api/v1/social/accounts | Bearer | Contas sociais conectadas |
| GET | /api/v1/social/connect/x | Bearer | Inicia OAuth X (redirect) |
| GET | /api/v1/social/callback/x | — | Callback OAuth X |
| GET | /api/v1/social/connect/linkedin | Bearer | Inicia OAuth LinkedIn (redirect) |
| GET | /api/v1/social/callback/linkedin | — | Callback OAuth LinkedIn |
| DELETE | /api/v1/social/accounts/{platform} | Bearer | Desconecta conta social |
| POST | /api/v1/social/posts/{id}/publish | Bearer | Publica post APPROVED na plataforma |
| POST | /api/v1/generate | Bearer | Cria campanha + posts, inicia geração |
| GET | /api/v1/generate/{id}/stream | ?token= | SSE — progresso da geração em tempo real |
| GET | /api/v1/campaigns | Bearer | Lista campanhas do usuário |
| GET | /api/v1/campaigns/{id} | Bearer | Detalhe de uma campanha |
| GET | /api/v1/posts | Bearer | Lista posts do usuário (filtros: `?campaign_id=&status=`) |
| GET | /api/v1/posts/{id} | Bearer | Detalhe de um post |
| PATCH | /api/v1/posts/{id} | Bearer | Atualiza status, conteúdo e/ou agendamento |
| GET | /api/v1/brand-profile | Bearer | Retorna brand context do usuário |
| PUT | /api/v1/brand-profile | Bearer | Salva/atualiza brand context |
| POST | /api/v1/chat/briefing | Bearer | Envia mensagem ao CMO IA; retorna resposta + brand_profile detectado |
| GET | /api/v1/chat/briefing/{id} | Bearer | Histórico de uma sessão de chat |
| GET | /api/v1/chat/briefing | Bearer | Lista todas as sessões de chat do usuário |
| GET | /api/v1/social/connect/x/url | Bearer | Retorna URL OAuth X sem redirect (para SPA) |
| GET | /api/v1/social/connect/linkedin/url | Bearer | Retorna URL OAuth LinkedIn sem redirect (para SPA) |

## SSE packet format

```json
{ "event": "writer_start",       "platform": "X",       "data": {} }
{ "event": "writer_done",        "platform": "X",       "data": { "post_id": "uuid", "content": "..." } }
{ "event": "writer_start",       "platform": "LINKEDIN", "data": {} }
{ "event": "writer_done",        "platform": "LINKEDIN", "data": { "post_id": "uuid", "content": "..." } }
{ "event": "generation_complete","platform": null,       "data": { "campaign_id": "uuid" } }
{ "event": "error",              "platform": "X",        "data": { "message": "..." } }
```

**SSE Auth:** EventSource não suporta headers → token passado como `?token=<access_token>` na URL.

## Variáveis de ambiente

```bash
# backend/.env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash-lite        # opcional

JWT_SECRET_KEY=gerar_com_python_secrets   # OBRIGATÓRIO
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:5173

X_CLIENT_ID=                              # developer.twitter.com
X_CLIENT_SECRET=
X_REDIRECT_URI=http://localhost:5173/oauth/callback/x

LINKEDIN_CLIENT_ID=                       # linkedin.com/developers/apps
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:5173/oauth/callback/linkedin

RESEND_API_KEY=re_...                     # resend.com
RESEND_FROM_EMAIL=notificacoes@seudominio.com
DEFAULT_USER_TIMEZONE=America/Sao_Paulo   # opcional
MORNING_ALERT_HOUR=8                      # opcional

# frontend/.env
VITE_API_URL=http://localhost:8000
```

## Deploy

Tanto backend quanto frontend são deployados na **Vercel** via CI/CD automatizado (`.github/workflows/ci-cd.yml`).

### Backend (Vercel Serverless Python)
- Entry point: `backend/api/index.py` → `from src.main import app`
- Config: `backend/vercel.json` — `@vercel/python` buildpack, todas as rotas apontam para `api/index.py`
- Projeto Vercel separado com secret `VERCEL_PROJECT_ID_BACKEND`

### Frontend (Vercel + Vite)
- Config: `frontend/vercel.json` — framework `vite`, output `dist`
- `VITE_API_URL` injetado em build time com a URL de deploy do backend (passada via `needs.deploy-backend.outputs.deployment_url`)
- Projeto Vercel separado com secret `VERCEL_PROJECT_ID_FRONTEND`

### Secrets obrigatórios no GitHub
```
VERCEL_TOKEN              # token de acesso pessoal da Vercel
VERCEL_ORG_ID             # ID da org/conta Vercel
VERCEL_PROJECT_ID_BACKEND # ID do projeto Vercel do backend
VERCEL_PROJECT_ID_FRONTEND# ID do projeto Vercel do frontend
```

## CI/CD — `.github/workflows/ci-cd.yml`

Acionado em `push` e `pull_request` na branch `main`. Quatro jobs em sequência:

```
frontend-ci ──┐
               ├──→ deploy-backend ──→ deploy-frontend
backend-ci  ──┘
```

| Job | O que faz |
|-----|-----------|
| `frontend-ci` | `npm ci` → lint → `tsc --noEmit` → `vitest run` → `vite build` |
| `backend-ci` | Sobe Postgres 16 como service → instala `requirements-dev.txt` → `ruff check` → `mypy` → `pytest` |
| `deploy-backend` | `vercel pull` → `vercel build` → `vercel deploy` → expõe `deployment_url` como output |
| `deploy-frontend` | Recebe `VITE_API_URL` do job anterior → `vercel build` → `vercel deploy` |

- **PR** → preview deploy (sem `--prod`)
- **Push para `main`** → production deploy (com `--prod`)

## Comandos

```bash
# Backend (rodar sempre de backend/)
cd backend
venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head                # cria tabelas (rodar após cada nova migration)
uvicorn src.main:app --reload

# Backend — qualidade (mesmos checks do CI)
pip install -r requirements-dev.txt
ruff check src tests
mypy api/index.py src/config.py src/main.py
pytest tests/

# Frontend
cd frontend
npm install
npm run dev
npm run type-check                  # tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
```

## Estado atual (2026-04-07)

**Sprint 1 concluída** — pipeline end-to-end funcionando.

**Sprint 2 parcial concluída (2026-04-04):**
- Edição e agendamento de posts (`scheduled_at`, `EditPostModal`, `PostsPage`)
- `GET /api/v1/posts/{id}` e `PATCH` expandido

**Sprint 3 concluída (2026-04-05):**
- Autenticação JWT (email + senha, access token 15 min, refresh cookie HttpOnly 7 dias)
- Isolamento multi-tenant: todos os endpoints filtrados por `user_id`
- OAuth X (PKCE) + LinkedIn → publicação automática de posts APPROVED
- Frontend: login/register, rotas protegidas, silentRefresh, contas sociais em Configurações, botão Publicar na revisão

**CI/CD + Deploy concluídos (2026-04-07):**
- `.github/workflows/ci-cd.yml`: 4 jobs (frontend-ci → backend-ci → deploy-backend → deploy-frontend)
- Backend na Vercel via `@vercel/python` (`backend/api/index.py` como ASGI entry)
- Frontend na Vercel via Vite (`frontend/vercel.json`); `VITE_API_URL` injetado dinamicamente do deploy do backend
- `backend/requirements-dev.txt`: ruff, mypy, types-python-jose

**Sprint 4 concluída (2026-04-07) — Frontend features + CMO IA:**
- `CalendarPage` (`/calendario`): visualização mensal e semanal de posts com `scheduled_at`; navega entre períodos; abre `EditPostModal` ao clicar num post
- `TemplatesPage` (`/templates`): biblioteca de 12 templates estáticos (5 Lançamento + 3 Depoimento + 4 Dica Educativa); layout Master-Detail com sidebar de categorias
- `TemplateCustomizeModal`: drawer com inputs por placeholder `{{chave}}`; preview ao vivo; navega para `/nova-campanha` com `location.state.topic` pré-preenchido
- `AppRoutes.tsx`: refatorado para `createBrowserRouter` + `Outlet` (React Router v7 data API)
- Dep `date-fns` adicionada ao frontend
- **CMO IA (`/cmo`):** `CmoPage` com `ChatPanel` (chat de briefing via Gemini) + `SettingsPanel` (brand profile + social accounts)
  - `SettingsPage` e rota `/configuracoes` **substituídas** pela `CmoPage`
  - Backend: `routers/chat.py`, `services/chat_cmo.py`, `models/chat_session.py`, `schemas/chat.py`, migration `004_chat_sessions`
  - Frontend: `useChatBriefing`, componentes `cmo/ChatPanel`, `cmo/SettingsPanel`, `cmo/ChatMessage`, `cmo/TypingIndicator`
  - OAuth callbacks redirecionam para `/cmo` (não mais `/configuracoes`)

**Serviço de e-mail concluído (2026-04-07):**
- `services/resend_service.py`: wrapper Resend com exponential backoff (3 retries; 429 → ≥60s de espera)
- `services/email_templates/`: `render()` + `daily_alert.html` + `weekly_digest.html`
- `workers/scheduler.py`: `BackgroundScheduler` UTC; `start()`/`stop()` via lifespan do FastAPI
- `workers/jobs/daily_alert.py`: alerta matinal respeitando timezone do usuário; omite se sem posts
- `workers/jobs/weekly_digest.py`: resumo toda sexta às 14h local; métricas com fallback se query falhar
- `models/notification_log.py` + migration `005`: tabela `email_notification_logs` com `UNIQUE(user_id, type, ref_date)` para idempotência
- `User.timezone` adicionado (default `America/Sao_Paulo`); exposto em `UserResponse`

**Pendente:**
- Testes de integração backend
- Logging com loguru
- FK `user_id → users.id` (ainda nullable por compatibilidade com dados antigos)
- Templates: persistência/customização de templates no backend (atualmente apenas mock estático)
- Configurar secrets Vercel no repositório GitHub para ativar deploy automático
- **Atenção Vercel Serverless:** `BackgroundScheduler` não persiste entre invocações serverless — para produção, migrar jobs para um worker dedicado (Railway, Render) ou usar cron externo (GitHub Actions cron + endpoint `/api/v1/notifications/trigger`)

## Regras gerais

- Novos endpoints: criar em `backend/src/routers/`, registrar em `main.py`
  - Auth/Social (prefixo próprio): `app.include_router(router)` sem `prefix=API_PREFIX`
  - Demais: `app.include_router(router, prefix="/api/v1")`
- Novas páginas protegidas: criar em `frontend/src/pages/`, adicionar ao array `protectedRoutes` em `AppRoutes.tsx` e ao `navItems` em `Sidebar.tsx`
- **Configurações de marca/social vivem em `/cmo` (SettingsPanel)** — não há rota `/configuracoes`
- Novas páginas públicas: adicionar ao array raiz do `createBrowserRouter` em `AppRoutes.tsx`, sem `<MainLayout>`
- Auth futura (multi-tenant completo): adicionar FK `user_id → users.id NOT NULL` em nova migration após limpar dados legados
- Encoding `.env`: `utf-8-sig` configurado no `config.py` para suportar Windows
