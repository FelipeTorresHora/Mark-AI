from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from src.config import settings
from src.database import SessionLocal
from src.routers import generate, posts, campaigns, brand_profile, chat, x_posts, cron, dashboard
from src.routers import auth as auth_router
from src.routers import social as social_router
from src.routers import x_integration as x_integration_router
from src.workers import scheduler as email_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    email_scheduler.start()
    yield
    email_scheduler.stop()


app = FastAPI(title="Agência de Marketing IA API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_origin_regex=settings.allowed_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
# Auth router has its own prefix baked in (/api/v1/auth)
app.include_router(auth_router.router)
app.include_router(social_router.router)
app.include_router(x_integration_router.router)
app.include_router(generate.router, prefix=API_PREFIX)
app.include_router(posts.router, prefix=API_PREFIX)
app.include_router(x_posts.router, prefix=API_PREFIX)
app.include_router(cron.router, prefix=API_PREFIX)
app.include_router(cron.router)
app.include_router(campaigns.router, prefix=API_PREFIX)
app.include_router(brand_profile.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/health")
def healthcheck():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": str(e)}
