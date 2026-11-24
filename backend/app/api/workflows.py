from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import current_user, own_workflow
from ..engine.graph import GraphError, find_trigger, validate
from ..engine.nodes import REGISTRY
from ..models import Execution, User, Workflow
from ..scheduler import ScheduleError, sync_schedule
from ..schemas import ActivateIn, ExecutionOut, RunIn, WorkflowIn, WorkflowOut, WorkflowSummary
from ..services import start_execution
from ..i18n import t

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

STARTER_GRAPH = {
    "nodes": [
        {"id": "trigger", "type": "trigger.manual", "position": {"x": 80, "y": 160},
         "data": {"label": "Кол менен иштетүү", "params": {}}},
    ],
    "edges": [],
}


def trigger_type(graph: dict) -> str | None:
    try:
        return find_trigger(graph)["type"]
    except GraphError:
        return None


def to_out(wf: Workflow) -> dict:
    return {
        "id": wf.id, "name": wf.name, "description": wf.description, "graph": wf.graph,
        "is_active": wf.is_active, "schedule_cron": wf.schedule_cron, "schedule_next_at": wf.schedule_next_at,
        "webhook_url": f"{settings.public_api_url.rstrip('/')}/api/hooks/{wf.webhook_token}",
        "problems": validate(wf.graph or {}, set(REGISTRY)), "updated_at": wf.updated_at,
    }


@router.get("", response_model=list[WorkflowSummary])
def list_workflows(user: User = Depends(current_user), db: Session = Depends(get_db)):
    last = (
        select(Execution.workflow_id, func.max(Execution.created_at).label("at"))
        .group_by(Execution.workflow_id).subquery()
    )
    rows = db.execute(
        select(Workflow, Execution.status, last.c.at)
        .outerjoin(last, last.c.workflow_id == Workflow.id)
        .outerjoin(Execution, (Execution.workflow_id == Workflow.id) & (Execution.created_at == last.c.at))
        .where(Workflow.user_id == user.id)
        .order_by(Workflow.updated_at.desc())
    ).all()
    return [
        {"id": wf.id, "name": wf.name, "description": wf.description, "is_active": wf.is_active,
         "trigger_type": trigger_type(wf.graph or {}), "last_status": st, "last_run_at": at,
         "updated_at": wf.updated_at}
        for wf, st, at in rows
    ]


@router.post("", response_model=WorkflowOut, status_code=201)
def create_workflow(data: WorkflowIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    graph = data.graph.model_dump() if data.graph else STARTER_GRAPH
    wf = Workflow(user_id=user.id, name=data.name, description=data.description, graph=graph)
    db.add(wf)
    db.commit()
    return to_out(wf)


@router.get("/{workflow_id}", response_model=WorkflowOut)
def get_workflow(wf: Workflow = Depends(own_workflow)):
    return to_out(wf)


@router.put("/{workflow_id}", response_model=WorkflowOut)
def update_workflow(data: WorkflowIn, wf: Workflow = Depends(own_workflow), db: Session = Depends(get_db)):
    wf.name, wf.description = data.name, data.description
    if data.graph is not None:
        wf.graph = data.graph.model_dump()
    try:
        sync_schedule(wf)
    except ScheduleError as e:
        raise HTTPException(422, str(e)) from e
    db.commit()
    return to_out(wf)


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(wf: Workflow = Depends(own_workflow), db: Session = Depends(get_db)):
    db.delete(wf)
    db.commit()


@router.post("/{workflow_id}/activate", response_model=WorkflowOut)
def activate(data: ActivateIn, wf: Workflow = Depends(own_workflow), db: Session = Depends(get_db)):
    if data.active:
        problems = validate(wf.graph or {}, set(REGISTRY))
        if problems:
            raise HTTPException(422, problems[0])
        if trigger_type(wf.graph) == "trigger.manual":
            raise HTTPException(422,
                                t("Кол менен иштетилүүчү workflow'ду активдештирүүнүн кереги жок"))
    wf.is_active = data.active
    try:
        sync_schedule(wf)
    except ScheduleError as e:
        raise HTTPException(422, str(e)) from e
    db.commit()
    return to_out(wf)


@router.post("/{workflow_id}/run", response_model=ExecutionOut, status_code=202)
def run(data: RunIn, wf: Workflow = Depends(own_workflow), db: Session = Depends(get_db)):
    problems = validate(wf.graph or {}, set(REGISTRY))
    if problems:
        raise HTTPException(422, problems[0])
    return start_execution(db, wf, "manual", data.payload)


@router.get("/{workflow_id}/executions", response_model=list[ExecutionOut])
def executions(wf: Workflow = Depends(own_workflow), db: Session = Depends(get_db)):
    return db.scalars(
        select(Execution).where(Execution.workflow_id == wf.id).order_by(Execution.created_at.desc()).limit(50)
    ).all()
