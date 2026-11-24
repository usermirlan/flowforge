"""Celery worker and beat schedule.

    celery -A app.worker worker --loglevel=info
    celery -A app.worker beat --loglevel=info
"""

from celery import Celery

from .config import settings
from .db import SessionLocal

celery_app = Celery("flowforge", broker=settings.redis_url)
celery_app.conf.update(
    task_always_eager=settings.celery_eager,
    task_acks_late=True,           # a crashed worker hands the run to another one
    worker_prefetch_multiplier=1,
    task_ignore_result=True,
    beat_schedule={"schedule-tick": {"task": "flowforge.scheduler_tick", "schedule": 30.0}},
    timezone="UTC",
)


@celery_app.task(name="flowforge.run_execution")
def run_execution_task(execution_id: str) -> str:
    from .engine.runner import run_execution

    with SessionLocal() as db:
        return run_execution(db, execution_id).status


@celery_app.task(name="flowforge.scheduler_tick")
def scheduler_tick() -> int:
    from .scheduler import claim_due
    from .services import start_execution

    with SessionLocal() as db:
        due = claim_due(db)
        for wf in due:
            start_execution(db, wf, "schedule", {"scheduled": True})
        return len(due)
