# Agência de Marketing IA

Projeto full stack para geração e avaliação de posts para **X** e **LinkedIn** com apoio de agentes de IA.

## Visão Geral

A proposta do sistema é usar um fluxo multi-agente (CMO + Writers) para gerar conteúdo, avaliar qualidade e iterar até atingir um score alvo.

Fluxo esperado:

`Frontend (React) -> Backend (FastAPI) -> LLM -> PostgreSQL`

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic
- Frontend: React + TypeScript + Vite + Zustand
- Banco: PostgreSQL
- Deploy (planejado): Backend em Railway/Render e Frontend em Vercel

## Estrutura do Repositório

```text
.
|- backend/
|- frontend/
`- docs/
```

- `docs/PROJECT.md`: especificação técnica completa do produto.
- `backend/`: API FastAPI, modelos e migrações.
- `frontend/`: aplicação React.

## Status Atual

Implementado no backend:

- `GET /health` retorna status da API.

Planejado (especificação em `docs/PROJECT.md`):

- `POST /api/v1/chat` (SSE)
- `POST /api/v1/generate`
- `PATCH /api/v1/posts/{id}`
- loop iterativo de avaliação CMO/Writers

## Como Rodar Localmente

### 1) Backend

Pré-requisitos:

- Python 3.11+
- PostgreSQL (para etapas com banco)

Comandos (PowerShell):

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --reload
```

API disponível em `http://127.0.0.1:8000`.

Teste rápido:

- `GET http://127.0.0.1:8000/health`

### 2) Frontend

Pré-requisitos:

- Node.js 20+

Comandos:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em `http://127.0.0.1:5173`.

## Testes

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pytest
```

Frontend (scripts atuais):

- `npm run lint`
- `npm run build`

## Próximos Passos

- Implementar endpoints de negócio descritos em `docs/PROJECT.md`
- Integrar LLM com prompts por papel (CMO, Writer X, Writer LinkedIn)
- Persistência completa de conversas/posts no PostgreSQL
- Streaming SSE para atualização em tempo real no frontend
