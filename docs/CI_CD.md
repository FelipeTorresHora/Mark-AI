# CI/CD

## Gatilhos

- `pull_request` para `main`: roda CI completo e publica previews do backend e do frontend na Vercel.
- `push` para `main`: roda CI completo e publica produção do backend e do frontend na Vercel.

## Comandos oficiais

### Frontend

- `npm run lint`
- `npm run type-check`
- `npm run test`
- `npm run build`

### Backend

- `python -m ruff check src tests`
- `python -m mypy api/index.py src/config.py src/main.py`
- `python -m pytest`

## Segredos do GitHub

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_FRONTEND`
- `VERCEL_PROJECT_ID_BACKEND`

## Variáveis da Vercel

### Frontend

- `VITE_API_URL`

No workflow, o frontend recebe `VITE_API_URL` dinamicamente apontando para a URL publicada do backend.

### Backend

- `APP_ENV`
- `APP_BASE_URL`
- `FRONTEND_URL`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `SOCIAL_TOKEN_ENCRYPTION_KEY`
- `GEMINI_API_KEY`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_REDIRECT_URI`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `ALLOWED_ORIGINS`
- `ALLOWED_ORIGIN_REGEX`

## Notas de preview

- Para previews na Vercel, configure `ALLOWED_ORIGIN_REGEX` no backend para aceitar domínios preview do frontend, por exemplo `https://.*\\.vercel\\.app`.
- O fluxo de OAuth pode exigir callbacks exatos por ambiente; para isso, mantenha `X_REDIRECT_URI`, `LINKEDIN_REDIRECT_URI`, `APP_BASE_URL` e `FRONTEND_URL` configurados na Vercel conforme sua estratégia de preview e produção.
