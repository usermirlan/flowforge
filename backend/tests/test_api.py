from datetime import timedelta

import fakeredis
import pytest

from app.db import utcnow
from app.models import Credential, Workflow
from app.scheduler import claim_due

from .conftest import auth, edge, node

GRAPH = {
    "nodes": [
        node("t", "trigger.manual"),
        node("greet", "data.set", {"fields": [{"key": "msg", "value": "Салам, {{ trigger.name }}!"}]}),
    ],
    "edges": [edge("t", "greet")],
}


def make_wf(client, h, graph=GRAPH, name="Демо"):
    r = client.post("/api/workflows", json={"name": name, "graph": graph}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


def test_auth_flow(client):
    h = auth(client)
    assert client.get("/api/auth/me", headers=h).json()["email"] == "a@test.kg"
    assert client.post("/api/auth/register", json={"email": "A@test.kg", "name": "x", "password": "secret123"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "a@test.kg", "password": "wrong-pass"}).status_code == 401
    assert client.get("/api/workflows").status_code == 401


def test_new_workflow_starts_with_a_manual_trigger(client):
    h = auth(client)
    wf = client.post("/api/workflows", json={"name": "Бош"}, headers=h).json()
    assert [n["type"] for n in wf["graph"]["nodes"]] == ["trigger.manual"]
    assert wf["problems"] == [] and wf["webhook_url"].startswith("http")


def test_run_and_history(client):
    h = auth(client)
    wf = make_wf(client, h)
    r = client.post(f"/api/workflows/{wf['id']}/run", json={"payload": {"name": "Айгерим"}}, headers=h)
    assert r.status_code == 202
    ex = client.get(f"/api/executions/{r.json()['id']}", headers=h).json()
    assert ex["status"] == "success"
    assert ex["steps"][-1]["output"] == {"msg": "Салам, Айгерим!"}
    listing = client.get("/api/workflows", headers=h).json()
    assert listing[0]["last_status"] == "success" and listing[0]["trigger_type"] == "trigger.manual"
    assert len(client.get(f"/api/workflows/{wf['id']}/executions", headers=h).json()) == 1


def test_invalid_graph_cannot_run(client):
    h = auth(client)
    wf = make_wf(client, h, graph={"nodes": [], "edges": []})
    assert wf["problems"]
    assert client.post(f"/api/workflows/{wf['id']}/run", json={}, headers=h).status_code == 422


def test_users_cannot_see_each_other(client):
    wf = make_wf(client, auth(client))
    other = auth(client, "b@test.kg")
    assert client.get(f"/api/workflows/{wf['id']}", headers=other).status_code == 404
    assert client.get("/api/workflows", headers=other).json() == []


def test_webhook_trigger(client):
    h = auth(client)
    graph = {"nodes": [node("t", "trigger.webhook"),
                       node("s", "data.set", {"fields": [{"key": "order", "value": "{{ trigger.body.id }}"}]})],
             "edges": [edge("t", "s")]}
    wf = make_wf(client, h, graph)
    token = wf["webhook_url"].rsplit("/", 1)[1]
    assert client.post(f"/api/hooks/{token}", json={"id": 7}).status_code == 404  # not active yet
    assert client.post(f"/api/workflows/{wf['id']}/activate", json={"active": True}, headers=h).status_code == 200
    r = client.post(f"/api/hooks/{token}?src=shop", json={"id": 7})
    assert r.status_code == 202
    ex = client.get(f"/api/executions/{r.json()['execution_id']}", headers=h).json()
    assert ex["trigger"] == "webhook" and ex["input"]["query"] == {"src": "shop"}
    assert ex["steps"][-1]["output"] == {"order": 7}


def test_schedule_is_claimed_when_due(client, db):
    h = auth(client)
    graph = {"nodes": [node("t", "trigger.schedule", {"cron": "*/5 * * * *", "timezone": "Asia/Bishkek"}),
                       node("s", "data.set", {"fields": [{"key": "a", "value": "1"}]})],
             "edges": [edge("t", "s")]}
    wf = make_wf(client, h, graph)
    out = client.post(f"/api/workflows/{wf['id']}/activate", json={"active": True}, headers=h).json()
    assert out["schedule_cron"] == "*/5 * * * *" and out["schedule_next_at"]
    row = db.get(Workflow, wf["id"])
    assert claim_due(db, now=utcnow()) == []
    due = claim_due(db, now=row.schedule_next_at + timedelta(seconds=1))
    assert [w.id for w in due] == [wf["id"]]
    db.refresh(row)
    assert row.schedule_next_at > utcnow()


def test_bad_cron_is_rejected(client):
    h = auth(client)
    graph = {"nodes": [node("t", "trigger.schedule", {"cron": "every day", "timezone": "UTC"})], "edges": []}
    wf = make_wf(client, h, {"nodes": [], "edges": []})
    r = client.put(f"/api/workflows/{wf['id']}", json={"name": "x", "graph": graph}, headers=h)
    assert r.status_code == 422 and "Cron" in r.json()["detail"]


def test_credentials_are_encrypted_and_masked(client, db):
    h = auth(client)
    r = client.post("/api/credentials", json={"name": "Бот", "type": "telegram", "data": {"bot_token": "123:ABCDEF"}}, headers=h)
    assert r.status_code == 201
    assert r.json()["preview"]["bot_token"] == "••••••CDEF"
    stored = db.get(Credential, r.json()["id"]).data_encrypted
    assert "ABCDEF" not in stored
    assert client.post("/api/credentials", json={"name": "x", "type": "nope", "data": {}}, headers=h).status_code == 422


def test_node_catalog(client):
    data = client.get("/api/nodes").json()
    types = {n["type"] for n in data["nodes"]}
    assert {"trigger.webhook", "http.request", "logic.if", "telegram.send", "ai.prompt"} <= types
    assert "telegram" in data["credential_types"]


def test_websocket_streams_a_finished_execution(client, monkeypatch):
    monkeypatch.setattr("app.api.executions.aioredis.from_url", lambda url: fakeredis.FakeAsyncRedis())
    h = auth(client)
    wf = make_wf(client, h)
    ex_id = client.post(f"/api/workflows/{wf['id']}/run", json={"payload": {"name": "X"}}, headers=h).json()["id"]
    with pytest.raises(Exception):  # no ticket → refused
        with client.websocket_connect(f"/api/executions/{ex_id}/ws") as ws:
            ws.receive_json()
    ticket = client.post(f"/api/executions/{ex_id}/ticket", headers=h).json()["ticket"]
    with client.websocket_connect(f"/api/executions/{ex_id}/ws?ticket={ticket}") as ws:
        snap = ws.receive_json()
    assert snap["type"] == "snapshot" and snap["status"] == "success"
    assert [s["node_id"] for s in snap["steps"]] == ["t", "greet"]
