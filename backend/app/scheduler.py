"""Schedule triggers: keep `schedule_next_at` in sync and find workflows that are due."""

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from croniter import croniter
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import utcnow
from .engine.graph import GraphError, find_trigger
from .models import Workflow
from .i18n import t


class ScheduleError(ValueError):
    pass


def next_run(cron: str, tz: str, after: datetime) -> datetime:
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError) as e:
        raise ScheduleError(t("Белгисиз убакыт алкагы: {tz}", tz=tz)) from e
    if not croniter.is_valid(cron):
        raise ScheduleError(t("Cron туура эмес: {cron}", cron=repr(cron)))
    return croniter(cron, after.astimezone(zone)).get_next(datetime)


def sync_schedule(wf: Workflow, now: datetime | None = None) -> None:
    """Derive the schedule fields from the graph's trigger (call on every save/toggle)."""
    wf.schedule_cron, wf.schedule_next_at = None, None
    try:
        trigger = find_trigger(wf.graph or {})
    except GraphError:
        return
    if trigger.get("type") != "trigger.schedule":
        return
    params = (trigger.get("data") or {}).get("params") or {}
    cron = str(params.get("cron") or "").strip()
    tz = str(params.get("timezone") or "UTC").strip()
    nxt = next_run(cron, tz, now or utcnow())  # raises ScheduleError for bad input
    wf.schedule_cron, wf.schedule_timezone = cron, tz
    if wf.is_active:
        wf.schedule_next_at = nxt


def claim_due(db: Session, now: datetime | None = None) -> list[Workflow]:
    """Workflows whose time has come; their next run is advanced before returning."""
    now = now or utcnow()
    stmt = select(Workflow).where(
        Workflow.is_active.is_(True),
        Workflow.schedule_next_at.is_not(None),
        Workflow.schedule_next_at <= now,
    ).with_for_update(skip_locked=True)
    due = list(db.scalars(stmt))
    for wf in due:
        wf.schedule_next_at = next_run(wf.schedule_cron, wf.schedule_timezone, now)
    db.commit()
    return due
