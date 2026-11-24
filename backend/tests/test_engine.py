"""Engine unit tests: templating, graph checks, nodes, runner (no network)."""

import httpx
import pytest

from app.engine.graph import validate
from app.engine.nodes import REGISTRY, NodeContext, NodeError, check_public_url
from app.engine.runner import run_execution
from app.engine.templating import render_value
from app.models import Execution, User, Workflow

from .conftest import edge, node

KNOWN = set(REGISTRY)


def test_render_keeps_raw_values_for_single_expressions():
    ctx = {"nodes": {"a": {"items": [1, 2], "n": 5}}, "trigger": {"name": "Айбек"}}
    assert render_value("{{ nodes.a.items }}", ctx) == [1, 2]
    assert render_value("Салам, {{ trigger.name }}! n={{ nodes.a.n }}", ctx) == "Салам, Айбек! n=5"
    assert render_value({"x": ["{{ nodes.a.n }}"]}, ctx) == {"x": [5]}
    assert render_value("{{ nodes.missing.field }}", ctx) == ""


def test_render_is_sandboxed():
    with pytest.raises(Exception):
        render_value("{{ ''.__class__.__mro__[1].__subclasses__() }}", {})


def test_validate_reports_problems():
    assert validate({"nodes": [], "edges": []}, KNOWN) == ["Workflow'до триггер жок"]
    g = {"nodes": [node("t", "trigger.manual"), node("a", "data.set"), node("b", "data.set")],
         "edges": [edge("t", "a"), edge("a", "b"), edge("b", "a")]}
    assert any("цикл" in p for p in validate(g, KNOWN))
    g2 = {"nodes": [node("t", "trigger.manual"), node("x", "nope.node")], "edges": [edge("t", "x")]}
    assert any("Белгисиз" in p for p in validate(g2, KNOWN))


@pytest.mark.parametrize("op,left,right,expected", [
    ("equals", "200", "200", True), ("gt", "5", "3", True), ("lt", "5", "3", False),
    ("contains", "hello world", "world", True), ("is_empty", "", "", True),
])
def test_if_node(op, left, right, expected):
    r = REGISTRY["logic.if"].run(NodeContext(params={"left": left, "operator": op, "right": right}, input={}))
    assert r.output["result"] is expected and r.branch == ("true" if expected else "false")


def test_set_node_coerces_types():
    r = REGISTRY["data.set"].run(NodeContext(
        params={"fields": [{"key": "n", "value": "42"}, {"key": "ok", "value": "true"}, {"key": "s", "value": "hi"}]},
        input={}))
    assert r.output == {"n": 42, "ok": True, "s": "hi"}


def test_ssrf_guard_blocks_private_addresses():
    for url in ("http://127.0.0.1:6379", "http://localhost/admin", "http://10.0.0.5/", "ftp://example.com"):
        with pytest.raises(NodeError):
            check_public_url(url)


def test_http_node_with_mock_transport(monkeypatch):
    monkeypatch.setattr("app.engine.nodes.check_public_url", lambda url: None)
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json={"usd": 87.5, "method": req.method}))
    with httpx.Client(transport=transport) as http:
        r = REGISTRY["http.request"].run(NodeContext(
            params={"method": "POST", "url": "https://api.test/rates", "body": {"a": 1}}, input={}, http=http))
    assert r.output["status"] == 200 and r.output["body"] == {"usd": 87.5, "method": "POST"}


def test_telegram_node_needs_token():
    with pytest.raises(NodeError, match="токен"):
        REGISTRY["telegram.send"].run(NodeContext(params={"chat_id": "1", "text": "hi"}, input={}))


def _execution(db, graph, payload=None):
    user = User(email="u@test.kg", name="U", password_hash="x")
    db.add(user)
    db.flush()
    wf = Workflow(user_id=user.id, name="wf", graph=graph)
    db.add(wf)
    db.flush()
    ex = Execution(workflow_id=wf.id, trigger="manual", input=payload or {}, graph=graph)
    db.add(ex)
    db.commit()
    return ex


def test_runner_follows_the_matching_branch(db, captured_events):
    graph = {
        "nodes": [
            node("t", "trigger.manual"),
            node("check", "logic.if", {"left": "{{ trigger.amount }}", "operator": "gt", "right": "100"}),
            node("big", "data.set", {"fields": [{"key": "msg", "value": "Чоң: {{ trigger.amount }}"}]}),
            node("small", "data.set", {"fields": [{"key": "msg", "value": "Кичине"}]}),
        ],
        "edges": [edge("t", "check"), edge("check", "big", "true"), edge("check", "small", "false")],
    }
    ex = run_execution(db, _execution(db, graph, {"amount": 250}).id)
    assert ex.status == "success"
    assert [s.node_id for s in ex.steps] == ["t", "check", "big"]
    assert ex.steps[-1].output == {"msg": "Чоң: 250"}
    kinds = [(e["type"], e.get("status")) for _, e in captured_events]
    assert kinds[0] == ("execution", "running") and kinds[-1] == ("execution", "success")


def test_runner_stops_on_error_unless_continue(db):
    graph = {
        "nodes": [node("t", "trigger.manual"),
                  node("bad", "logic.if", {"left": "abc", "operator": "gt", "right": "1"}),
                  node("after", "data.set", {"fields": [{"key": "x", "value": "1"}]})],
        "edges": [edge("t", "bad"), edge("bad", "after")],
    }
    ex = run_execution(db, _execution(db, graph).id)
    assert ex.status == "error" and "Сан эмес" in ex.error
    assert [s.status for s in ex.steps] == ["success", "error"]


def test_continue_on_error_keeps_going(db):
    graph = {
        "nodes": [node("t", "trigger.manual"),
                  node("bad", "logic.if", {"left": "abc", "operator": "gt", "right": "1"}, continueOnError=True),
                  node("after", "data.set", {"fields": [{"key": "seen", "value": "{{ input.error }}"}]})],
        "edges": [edge("t", "bad"), edge("bad", "after")],
    }
    ex = run_execution(db, _execution(db, graph).id)
    assert ex.status == "success"
    assert "Сан эмес" in ex.steps[-1].output["seen"]
