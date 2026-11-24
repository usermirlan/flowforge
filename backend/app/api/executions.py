import asyncio
import json
from datetime import timedelta

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from ..config import settings
from ..db import SessionLocal, get_db
from ..deps import current_user
from ..engine.events import channel
from ..engine.nodes import CREDENTIAL_TYPES, catalog
from ..models import Execution, User
from ..schemas import ExecutionDetail
from ..security import create_token, decode_token
from ..i18n import localize_credentials, t

router = APIRouter(prefix="/api", tags=["executions"])

FINISHED = ("success", "error")


@router.get("/nodes")
def nodes():
    """Palette for the editor: node types and the credential forms they need."""
    return {"nodes": catalog(), "credential_types": localize_credentials(CREDENTIAL_TYPES)}


def _own_execution(execution_id: str, user: User, db: Session) -> Execution:
    ex = db.get(Execution, execution_id)
    if ex is None or ex.workflow.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, t("Табылган жок"))
    return ex


@router.get("/executions/{execution_id}", response_model=ExecutionDetail)
def execution_detail(execution_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _own_execution(execution_id, user, db)


@router.post("/executions/{execution_id}/ticket")
def ws_ticket(execution_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Short-lived token so the browser can open the WebSocket without the session token."""
    _own_execution(execution_id, user, db)
    ticket = create_token(user.id, scope="ws", ttl=timedelta(seconds=60), exe=execution_id)
    return {"ticket": ticket}


def _snapshot(execution_id: str) -> dict | None:
    with SessionLocal() as db:
        ex = db.get(Execution, execution_id)
        if ex is None:
            return None
        return {
            "type": "snapshot",
            "status": ex.status,
            "error": ex.error,
            "steps": [
                {"node_id": s.node_id, "status": s.status, "output": s.output, "error": s.error,
                 "duration_ms": s.duration_ms}
                for s in ex.steps
            ],
        }


@router.websocket("/executions/{execution_id}/ws")
async def execution_ws(websocket: WebSocket, execution_id: str, ticket: str = ""):
    claims = decode_token(ticket, scope="ws")
    if not claims or claims.get("exe") != execution_id:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    client = aioredis.from_url(settings.redis_url)
    pubsub = client.pubsub()
    try:
        # subscribe first, then send the DB snapshot, so no event falls in between
        await pubsub.subscribe(channel(execution_id))
        snap = await asyncio.to_thread(_snapshot, execution_id)
        if snap is None:
            await websocket.close(code=4404)
            return
        await websocket.send_json(snap)
        if snap["status"] in FINISHED:
            await websocket.close()
            return
        while True:
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=30)
            if msg is None:
                await websocket.send_json({"type": "ping"})
                continue
            event = json.loads(msg["data"])
            await websocket.send_json(event)
            if event.get("type") == "execution" and event.get("status") in FINISHED:
                await websocket.close()
                return
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.aclose()
        await client.aclose()
