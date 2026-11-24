from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, credentials, executions, hooks, workflows
from .config import settings

if settings.secret_key == "dev-only-change-me" and settings.public_api_url.startswith("https"):
    raise RuntimeError("Set SECRET_KEY in production")

app = FastAPI(
    title="FlowForge API",
    version="1.0.0",
    description="Visual workflow automation: triggers, nodes, background execution, live status.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, workflows.router, credentials.router, executions.router, hooks.router):
    app.include_router(r)


@app.get("/api/health", tags=["meta"])
def health():
    return {"ok": True}
