"""Starting executions (shared by the API, webhooks and the scheduler)."""

from sqlalchemy.orm import Session

from .models import Execution, Workflow


def start_execution(db: Session, wf: Workflow, trigger: str, payload: dict | None = None) -> Execution:
    ex = Execution(workflow_id=wf.id, trigger=trigger, input=payload or {}, graph=wf.graph)
    db.add(ex)
    db.commit()
    from .worker import run_execution_task  # late import: worker imports the app

    run_execution_task.delay(ex.id)
    return ex
