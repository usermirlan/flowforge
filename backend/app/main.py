from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, credentials, executions, hooks, workflows
from .config import settings
from .i18n import lang_var, pick_lang

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



class LanguageMiddleware:
    """Sets the request language from Accept-Language (pure ASGI, so the context var reaches handlers)."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers") or [])
        token = lang_var.set(pick_lang(headers.get(b"accept-language", b"").decode("latin-1")))
        try:
            await self.app(scope, receive, send)
        finally:
            lang_var.reset(token)


app.add_middleware(LanguageMiddleware)

for r in (auth.router, workflows.router, credentials.router, executions.router, hooks.router):
    app.include_router(r)


@app.get("/api/health", tags=["meta"])
def health():
    return {"ok": True}
