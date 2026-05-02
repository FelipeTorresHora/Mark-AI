# Plano de Implementação da Fundação do Backend (Sprint 1)

> **Para Claude:** SUB-HABILIDADE OBRIGATÓRIA: Use superpowers:executing-plans para implementar este plano tarefa por tarefa.

**Objetivo:** Configurar a fundação do backend da Agência de Marketing IA, incluindo FastAPI, ORM base (SQLAlchemy), versionamento do banco de dados (Alembic) e validações iniciais (Pydantic).

**Arquitetura:** Aplicação modular em Python usando FastAPI para servir a API, SQLAlchemy para comunicação com o PostgreSQL e Pydantic para validação robusta de I/O em formato JSON.

**Stack Tecnológica:** FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic, PostgreSQL (asyncpg/psycopg2), pytest, httpx.

---

### Tarefa 1: Setup Inicial do Backend e Database Config

**Arquivos:**
- Criar: `backend/requirements.txt`
- Criar: `backend/src/config.py`
- Criar: `backend/src/database.py`
- Criar: `backend/src/__init__.py` e `backend/tests/__init__.py`
- Testar: `backend/tests/test_database.py`

**Passo 1: Escreva o teste com falha**
```python
# backend/tests/test_database.py
import pytest
import os
from src.database import get_db_url

def test_get_db_url_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost/db")
    assert get_db_url() == "postgresql://user:pass@localhost/db"
```

**Passo 2: Execute o teste para verificar se falha**
Executar: `cd backend && pytest tests/test_database.py -v`
Esperado: FALHA com `ModuleNotFoundError: No module named 'src'`

**Passo 3: Escreva a implementação mínima**
```python
# backend/requirements.txt
fastapi
uvicorn
sqlalchemy
psycopg2-binary
pydantic
pydantic-settings
pytest
httpx

# backend/src/__init__.py
# (arquivo vazio)

# backend/tests/__init__.py
# (arquivo vazio)

# backend/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/marketing_db"
    
    class Config:
        env_file = ".env"

settings = Settings()

# backend/src/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.config import settings

def get_db_url():
    return settings.database_url

engine = create_engine(get_db_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Passo 4: Execute o teste para verificar se passa**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_database.py -v`
Esperado: PASSOU

**Passo 5: Commit**
```bash
git add backend/requirements.txt backend/src/ backend/tests/
git commit -m "chore: initial backend structure and database config"
```

---

### Tarefa 2: Implementação dos Modelos de Entidade (SQLAlchemy)

**Arquivos:**
- Criar: `backend/src/models/conversation.py`
- Criar: `backend/src/models/post.py`
- Criar: `backend/src/models/__init__.py`
- Testar: `backend/tests/test_models.py`

**Passo 1: Escreva o teste com falha**
```python
# backend/tests/test_models.py
from src.models import Conversation, Post
from src.database import Base

def test_models_exist():
    assert issubclass(Conversation, Base)
    assert issubclass(Post, Base)
    assert Conversation.__tablename__ == "conversations"
    assert Post.__tablename__ == "posts"
```

**Passo 2: Execute o teste para verificar se falha**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_models.py -v`
Esperado: FALHA com `ImportError: cannot import name 'Conversation'`

**Passo 3: Escreva a implementação mínima**
```python
# backend/src/models/conversation.py
import uuid
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    messages = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

# backend/src/models/post.py
import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))
    platform = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    score = Column(Integer)
    feedback = Column(Text)
    status = Column(String(20), nullable=False)
    iterations = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

# backend/src/models/__init__.py
from src.models.conversation import Conversation
from src.models.post import Post
```

**Passo 4: Execute o teste para verificar se passa**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_models.py -v`
Esperado: PASSOU

**Passo 5: Commit**
```bash
git add backend/src/models/ backend/tests/test_models.py
git commit -m "feat: setup sqlalchemy models for conversation and post"
```

---

### Tarefa 3: Inicialização do Alembic

**Arquivos:**
- Criar/Modificar: `backend/alembic.ini` e `backend/alembic/env.py` (via CLI)

**Passo 1: Escreva o teste com falha (Script para verificar se alembic existe)**
```python
# backend/tests/test_alembic.py
import os

def test_alembic_initialized():
    assert os.path.exists("alembic.ini")
    assert os.path.isdir("alembic")
```

**Passo 2: Execute o teste para verificar se falha**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_alembic.py -v`
Esperado: FALHA (alembic.ini not found)

**Passo 3: Escreva a implementação mínima**
Executar no terminal:
```bash
cd backend
alembic init alembic
```

Modificar `backend/alembic/env.py` (adicionar imports):
```python
# Adicionar no topo do backend/alembic/env.py:
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database import Base
from src.config import settings
from src.models import *

# Substituir target_metadata:
target_metadata = Base.metadata

# Adicionar no run_migrations_offline e run_migrations_online (substituir sqlalchemy.url):
config.set_main_option("sqlalchemy.url", settings.database_url)
```

**Passo 4: Execute o teste para verificar se passa**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_alembic.py -v`
Esperado: PASSOU

**Passo 5: Commit**
```bash
git add backend/alembic/ backend/alembic.ini backend/tests/test_alembic.py
git commit -m "chore: initialize alembic migrations"
```

---

### Tarefa 4: Definição de Schemas (Pydantic)

**Arquivos:**
- Criar: `backend/src/schemas/post.py`
- Criar: `backend/src/schemas/conversation.py`
- Criar: `backend/src/schemas/__init__.py`
- Testar: `backend/tests/test_schemas.py`

**Passo 1: Escreva o teste com falha**
```python
# backend/tests/test_schemas.py
from datetime import datetime
from uuid import uuid4
from src.schemas.post import PostResponse

def test_post_response_validation():
    post_data = {
        "id": uuid4(),
        "platform": "X",
        "content": "Hello World",
        "status": "DRAFT",
        "iterations": 0,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    schema = PostResponse(**post_data)
    assert schema.platform == "X"
```

**Passo 2: Execute o teste para verificar se falha**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_schemas.py -v`
Esperado: FALHA com `ModuleNotFoundError: No module named 'src.schemas'`

**Passo 3: Escreva a implementação mínima**
```python
# backend/src/schemas/conversation.py
from pydantic import BaseModel
from datetime import datetime
from typing import Literal
from uuid import UUID

class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime

class ConversationResponse(BaseModel):
    id: UUID
    messages: list[ConversationMessage]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# backend/src/schemas/post.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

class PostResponse(BaseModel):
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
    
    class Config:
        from_attributes = True

# backend/src/schemas/__init__.py
from src.schemas.conversation import ConversationResponse, ConversationMessage
from src.schemas.post import PostResponse
```

**Passo 4: Execute o teste para verificar se passa**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_schemas.py -v`
Esperado: PASSOU

**Passo 5: Commit**
```bash
git add backend/src/schemas/ backend/tests/test_schemas.py
git commit -m "feat: define pydantic schemas for responses"
```

---

### Tarefa 5: Inicialização do FastAPI e Rota Healthcheck

**Arquivos:**
- Criar: `backend/src/main.py`
- Testar: `backend/tests/test_main.py`

**Passo 1: Escreva o teste com falha**
```python
# backend/tests/test_main.py
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_healthcheck():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Passo 2: Execute o teste para verificar se falha**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_main.py -v`
Esperado: FALHA com `ModuleNotFoundError: No module named 'src.main'`

**Passo 3: Escreva a implementação mínima**
```python
# backend/src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Agência de Marketing IA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def healthcheck():
    return {"status": "ok"}
```

**Passo 4: Execute o teste para verificar se passa**
Executar: `cd backend && PYTHONPATH=. pytest tests/test_main.py -v`
Esperado: PASSOU