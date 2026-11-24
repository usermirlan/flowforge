import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Workflow
from ..services import start_execution
from .workflows import trigger_type

router = APIRouter(prefix="/api/hooks", tags=["webhooks"])

MAX_BODY = 256_000
FORWARDED_HEADERS = ("content-type", "user-agent", "x-request-id", "x-github-event")


@router.post("/{token}", status_code=202)
async def webhook(token: str, request: Request, db: Session = Depends(get_db)):
    wf = db.scalar(select(Workflow).where(Workflow.webhook_token == token))
    if wf is None or not wf.is_active or trigger_type(wf.graph or {}) != "trigger.webhook":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webhook табылган жок же өчүк")
    raw = await request.body()
    if len(raw) > MAX_BODY:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Body өтө чоң")
    try:
        body = json.loads(raw) if raw else {}
    except ValueError:
        body = raw.decode("utf-8", "replace")
    payload = {
        "body": body,
        "query": dict(request.query_params),
        "headers": {h: request.headers[h] for h in FORWARDED_HEADERS if h in request.headers},
    }
    ex = start_execution(db, wf, "webhook", payload)
    return {"execution_id": ex.id}
