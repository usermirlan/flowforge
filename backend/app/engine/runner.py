"""Execute a workflow graph node by node, recording each step and streaming events."""

from __future__ import annotations

import json
import time
from collections import deque
from typing import Any

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from ..db import utcnow
from ..models import Credential, Execution, ExecutionStep
from ..security import decrypt_json
from . import events
from .graph import find_trigger, nodes_by_id, outgoing
from .nodes import REGISTRY, NodeContext, NodeError
from .templating import TemplateRenderError, render_value
from ..i18n import lang_var, t

MAX_OUTPUT_BYTES = 64_000


def _trim(value: Any) -> Any:
    """Keep stored/streamed outputs small; huge API responses are cut."""
    raw = json.dumps(value, default=str, ensure_ascii=False)
    if len(raw) <= MAX_OUTPUT_BYTES:
        return json.loads(raw)
    return {"_truncated": True, "preview": raw[:MAX_OUTPUT_BYTES]}


def run_execution(
    db: Session,
    execution_id: str,
    publish: events.Publisher | None = None,
    http: httpx.Client | None = None,
) -> Execution:
    publish = publish or events.publish  # looked up at call time so tests can swap it
    ex = db.get(Execution, execution_id)
    if ex is None:
        raise LookupError(execution_id)
    if ex.status not in ("queued", "running"):
        return ex  # already finished (e.g. a duplicate task delivery)

    graph = ex.graph or {}
    nodes = nodes_by_id(graph)
    out_edges = outgoing(graph)
    user_id = ex.workflow.user_id
    lang_token = lang_var.set(ex.workflow.owner.lang or "ky")

    ex.status, ex.started_at = "running", utcnow()
    db.commit()
    publish(ex.id, {"type": "execution", "status": "running"})

    ctx_data: dict[str, Any] = {"trigger": {}, "nodes": {}, "input": None, "execution": {"id": ex.id}}
    position = 0
    try:
        trigger = find_trigger(graph)
        queue: deque[tuple[str, Any]] = deque([(trigger["id"], ex.input or {})])
        done: set[str] = set()
        while queue:
            node_id, node_input = queue.popleft()
            if node_id in done:
                continue
            done.add(node_id)
            if len(done) > settings.max_steps:
                raise NodeError(t("Кадамдар {max}дөн ашты", max=settings.max_steps))
            node = nodes[node_id]
            data = node.get("data") or {}
            position += 1
            ctx_data["input"] = node_input
            publish(ex.id, {"type": "step", "node_id": node_id, "status": "running"})
            started = time.perf_counter()
            branch = None
            try:
                impl = REGISTRY[node["type"]]
                params = render_value(data.get("params") or {}, ctx_data)
                creds = _credential(db, user_id, data.get("credentialId"))
                result = impl.run(NodeContext(params=params, input=node_input, credentials=creds, http=http))
                output, branch, status, error = _trim(result.output), result.branch, "success", None
            except (NodeError, TemplateRenderError, KeyError, ValueError) as e:
                if not data.get("continueOnError"):
                    _record(db, ex, position, node, "error", None, str(e), started, publish)
                    raise
                output, status, error = {"error": str(e)}, "error", str(e)
            _record(db, ex, position, node, status, output, error, started, publish)
            if node["type"].startswith("trigger."):
                ctx_data["trigger"] = output
            ctx_data["nodes"][node_id] = output
            for edge in out_edges.get(node_id, []):
                handle = edge.get("sourceHandle")
                if branch is None or handle in (None, branch):
                    queue.append((edge["target"], output))
        ex.status = "success"
    except Exception as e:  # noqa: BLE001 - any failure ends the run as an error
        ex.status, ex.error = "error", str(e) or e.__class__.__name__
    ex.finished_at = utcnow()
    db.commit()
    publish(ex.id, {"type": "execution", "status": ex.status, "error": ex.error})
    lang_var.reset(lang_token)
    return ex


def _credential(db: Session, user_id: int, credential_id: Any) -> dict:
    if not credential_id:
        return {}
    cred = db.get(Credential, int(credential_id))
    if cred is None or cred.user_id != user_id:
        raise NodeError(t("Тандалган credential табылган жок"))
    return decrypt_json(cred.data_encrypted)


def _record(db, ex, position, node, status, output, error, started, publish) -> None:
    ms = int((time.perf_counter() - started) * 1000)
    db.add(ExecutionStep(
        execution_id=ex.id, position=position, node_id=node["id"], node_type=node["type"],
        status=status, output=output, error=error, duration_ms=ms,
    ))
    db.commit()
    publish(ex.id, {"type": "step", "node_id": node["id"], "status": status, "output": output,
                    "error": error, "duration_ms": ms})
