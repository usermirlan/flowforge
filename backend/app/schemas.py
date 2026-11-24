from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class Graph(BaseModel):
    nodes: list[dict[str, Any]] = Field(default_factory=list, max_length=200)
    edges: list[dict[str, Any]] = Field(default_factory=list, max_length=400)


class WorkflowIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    graph: Graph | None = None


class WorkflowSummary(BaseModel):
    id: str
    name: str
    description: str
    is_active: bool
    trigger_type: str | None
    last_status: str | None
    last_run_at: datetime | None
    updated_at: datetime


class WorkflowOut(BaseModel):
    id: str
    name: str
    description: str
    graph: Graph
    is_active: bool
    webhook_url: str
    schedule_cron: str | None
    schedule_next_at: datetime | None
    problems: list[str]
    updated_at: datetime


class ActivateIn(BaseModel):
    active: bool


class RunIn(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class StepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    node_id: str
    node_type: str
    status: str
    output: Any = None
    error: str | None
    duration_ms: int
    started_at: datetime


class ExecutionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workflow_id: str
    status: str
    trigger: str
    input: dict[str, Any]
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class ExecutionDetail(ExecutionOut):
    graph: dict[str, Any]
    steps: list[StepOut]


class CredentialIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: str
    data: dict[str, str]


class CredentialOut(BaseModel):
    id: int
    name: str
    type: str
    # non-secret fields only; secrets come back masked
    preview: dict[str, str]
    created_at: datetime
