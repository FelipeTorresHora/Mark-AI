# Especificação Técnica - Agência de Marketing IA

## Stack
```
Backend: FastAPI (Python 3.11+) + SQLAlchemy + Alembic
Frontend: React 18 + TypeScript + Vite + Zustand
Database: PostgreSQL 15 (Neon)
LLM: Gemini 2.5 Flash-Lite
Deploy: Backend (Railway/Render) + Frontend (Vercel)
```

---

## ARQUITETURA

### Sistema Multi-Agente
3 agentes LLM (CMO, Writer X, Writer LinkedIn) com loop de avaliação iterativo até score ≥90/100.

### Fluxo
```
User → React → FastAPI → Gemini API → PostgreSQL
              ↓ SSE Stream → Real-time UI Update
```

---

## API SPECIFICATION (FASTAPI)

### Endpoints

**POST /api/v1/chat**
- SSE streaming conversação CMO | Timeout: 30s | Rate limit: 20/min/IP

**POST /api/v1/generate**
- Input: `{topic, conversation_id, brand_context}`
- Output: `{x_post, linkedin_post}`
- Paralelização: `asyncio.gather` | Timeout: 120s

**PATCH /api/v1/posts/{id}**
- Aprovação/rejeição manual | Validação transições status

### Modelos Pydantic

**Post**: platform (X|LINKEDIN), content, score (0-100), feedback, status (DRAFT|UNDER_REVIEW|APPROVED|REJECTED|FINAL), iterations, conversation_id

**GenerateRequest**: topic, target_audience="B2C", tone="Autêntico", brand_context

### Errors
- 400: Pydantic validation | 429: Rate limit (slowapi) | 500: Gemini retry 3x | 504: Timeout

---

## GEMINI INTEGRATION

### Config
- SDK: `google-generativeai` | Model: `Gemini 2.5 Flash-Lite`
- Safety: BLOCK_NONE | Params: temp=0.7, top_p=0.95, max_tokens=2048
- Rate: 60/min (free) | Backoff: 2^n × 1s | Timeout: 20s/call

### Prompt System
```
backend/prompts/
├── cmo.py          # Avaliação estruturada (NOTA: XX)
├── writer_x.py     # Tweets 280 chars
├── writer_linkedin.py
└── templates/      # Jinja2 dynamic
```

**Componentes**: System context, brand context, task spec, output format, examples, constraints

**Critérios CMO**: Conexão emocional (25), qualidade copy (25), engagement (25), adequação plataforma (25)

---

## LÓGICA DE NEGÓCIO

### Loop Avaliação
1. Generate → 2. Evaluate (CMO) → 3. Extract score
4. If ≥90: APPROVED | If <5 iterations: add feedback & regenerate
5. Max iterations: UNDER_REVIEW

**Implementação**: Async generator, 2 Gemini calls/iteration, paralelizar X+LinkedIn, store history

### Score Extraction
Regex: `NOTA:\s*(\d+)` | Fallback: número 0-100 | Default: 0 | Log failures

### Context
- Últimas 10 msgs | JSONB PostgreSQL | Max 30k tokens | Feedback loop: CMO → Writer

---

## FRONTEND (REACT)

### Estrutura
```
src/
├── pages/        # Chat, Generate, Review, Dashboard
├── components/   # chat/, posts/, common/
├── hooks/        # useSSE, usePosts, useChat
├── services/api.ts
└── types/
```

### State
**Zustand**: conversations, posts, currentConversationId, isGenerating, error  
**Alt**: React Query (cache API)

### Real-time
SSE hook (EventSource) | Auto-reconnect | Typing indicator | Buffer parciais

### Previews
**X**: Mock layout, 280 counter, hashtag highlight, thread  
**LinkedIn**: Mock feed, quebras linha, "Ver mais"

---

## DATABASE

### Schema

**conversations**: id UUID, messages JSONB, created_at, updated_at | INDEX (created_at DESC)

**posts**: id UUID, conversation_id REFERENCES, platform CHECK, content TEXT, score CHECK(0-100), feedback TEXT, status CHECK, iterations INT, created_at, updated_at | INDEX (status, created_at DESC), (conversation_id)

### Migrations
Alembic | Trigger updated_at | Seed data

---

## DEPLOY

### Backend (Railway/Render)
Gunicorn + Uvicorn | Workers: 2×CPU | Timeout: 180s | Env: DATABASE_URL, GEMINI_API_KEY | Health: /health | CORS: Vercel

### Frontend (Vercel)
Vite build | Code splitting | Lazy load | Env: VITE_API_URL

### Database (Neon)
Free: 0.5GB | Autosleep 5min (wake 1-2s) | Auto backup

---

## OBSERVABILITY

### Logging (loguru)
Structured: timestamp, level, request_id, action | Levels: DEBUG/INFO | Target: stdout

### Metrics
**API**: p50/p95/p99 response time, error rate, Gemini latency, iterations dist  
**Business**: Posts/dia, taxa aprovação 1ª, score médio, tempo aprovação

---

## SECURITY

- Pydantic validation | SQLAlchemy ORM | slowapi rate limit | CORS whitelist | React auto-escape | Vercel SSL

---

## ROADMAP

**Sprint 1 (5d)**: FastAPI + SQLAlchemy + Pydantic + React+Vite + chat UI  
**Sprint 2 (5d)**: Gemini + prompts + loop + /generate + previews  
**Sprint 3 (5d)**: SSE + Zustand + review + errors + UX  
**Sprint 4 (5d)**: Deploy (Railway+Vercel) + Neon + E2E + tuning

---

## TECHNICAL NOTES

### Optimizations
Redis cache | SQLAlchemy pool (max 10) | Async endpoints | Batch DB inserts

### Scalability (Fase 2)
Celery+Redis queue | Load balancer | Read replicas | Cloudflare CDN

### Testing
pytest + mocks | Vitest + RTL | Playwright E2E | Coverage: 70%

---

Modelos de Dados Completos
Tabela: conversations
sqlCREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    messages JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
Estrutura do JSONB messages:
json[
  {
    "role": "user",
    "content": "Preciso criar posts sobre produtividade",
    "timestamp": "2026-03-09T10:30:00Z"
  },
  {
    "role": "assistant",
    "content": "Ótimo tema! Vamos explorar...",
    "timestamp": "2026-03-09T10:30:15Z"
  }
]

Tabela: posts
sqlCREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('X', 'LINKEDIN')),
    content TEXT NOT NULL,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FINAL')),
    iterations INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX idx_posts_conversation_id ON posts(conversation_id);

Enums (CHECK Constraints)
Platform:

X - Twitter/X
LINKEDIN - LinkedIn

PostStatus:

DRAFT - Post sendo criado pelo Writer
UNDER_REVIEW - Sendo avaliado pelo CMO (ou não atingiu score ≥90)
APPROVED - Score ≥90, aguardando aprovação humana
REJECTED - Rejeitado pelo usuário
FINAL - Aprovado pelo usuário, pronto para publicação


Modelos Pydantic (Backend)
pythonfrom pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime

class Conversation(BaseModel):
    id: UUID
    messages: list[ConversationMessage]
    created_at: datetime
    updated_at: datetime

class Post(BaseModel):
    id: UUID
    conversation_id: Optional[UUID] = None
    platform: Literal["X", "LINKEDIN"]
    content: str
    score: Optional[int] = Field(None, ge=0, le=100)
    feedback: Optional[str] = None
    status: Literal["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "FINAL"]
    iterations: int = 0
    created_at: datetime
    updated_at: datetime

class GenerateRequest(BaseModel):
    topic: str
    conversation_id: Optional[UUID] = None
    target_audience: str = "Consumidores B2C"
    tone: str = "Autêntico e inspirador"
    brand_context: Optional[dict] = None

TypeScript Interfaces (Frontend)
typescriptexport type Platform = "X" | "LINKEDIN";

export type PostStatus = 
  | "DRAFT" 
  | "UNDER_REVIEW" 
  | "APPROVED" 
  | "REJECTED" 
  | "FINAL";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  conversation_id?: string;
  platform: Platform;
  content: string;
  score?: number;
  feedback?: string;
  status: PostStatus;
  iterations: number;
  created_at: string;
  updated_at: string;
}

export interface GenerateRequest {
  topic: string;
  conversation_id?: string;
  target_audience?: string;
  tone?: string;
  brand_context?: Record<string, any>;
}