import secrets
import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, UTCDateTime, utcnow


def new_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(100))
    # UI language; used for messages produced in the background (webhooks, schedules)
    lang: Mapped[str] = mapped_column(String(5), default="ky", server_default="ky")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    workflows: Mapped[list["Workflow"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    # React Flow graph: {"nodes": [...], "edges": [...]}
    graph: Mapped[dict] = mapped_column(JSON, default=lambda: {"nodes": [], "edges": []})
    # webhook and schedule triggers only fire while the workflow is active
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    webhook_token: Mapped[str] = mapped_column(
        String(43), unique=True, index=True, default=lambda: secrets.token_urlsafe(32)
    )
    # derived from the schedule trigger on save
    schedule_cron: Mapped[str | None] = mapped_column(String(100), nullable=True)
    schedule_timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    schedule_next_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)

    owner: Mapped[User] = relationship(back_populates="workflows")
    executions: Mapped[list["Execution"]] = relationship(back_populates="workflow", cascade="all, delete-orphan")


class Credential(Base):
    """A secret (bot token, API key) a node can use; stored encrypted."""

    __tablename__ = "credentials"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    type: Mapped[str] = mapped_column(String(40))  # telegram | openai | http_header
    data_encrypted: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)


class Execution(Base):
    __tablename__ = "executions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    workflow_id: Mapped[str] = mapped_column(ForeignKey("workflows.id", ondelete="CASCADE"), index=True)
    # queued | running | success | error
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    trigger: Mapped[str] = mapped_column(String(16))  # manual | webhook | schedule
    input: Mapped[dict] = mapped_column(JSON, default=dict)
    # snapshot of the graph that ran, so history survives later edits
    graph: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, index=True)
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    workflow: Mapped[Workflow] = relationship(back_populates="executions")
    steps: Mapped[list["ExecutionStep"]] = relationship(
        back_populates="execution", cascade="all, delete-orphan", order_by="ExecutionStep.position"
    )


class ExecutionStep(Base):
    __tablename__ = "execution_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    execution_id: Mapped[str] = mapped_column(ForeignKey("executions.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    node_id: Mapped[str] = mapped_column(String(64))
    node_type: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(16))  # success | error | skipped
    output: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    execution: Mapped[Execution] = relationship(back_populates="steps")
