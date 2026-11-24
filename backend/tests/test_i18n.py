from app.i18n import pick_lang

from .conftest import auth, edge, node

RU = {"Accept-Language": "ru"}


def test_pick_lang():
    assert pick_lang("ru-RU,ru;q=0.9,en;q=0.8") == "ru"
    assert pick_lang("en-US,ky;q=0.5") == "ky"
    assert pick_lang(None) == "ky"


def test_errors_follow_accept_language(client):
    bad = {"email": "nobody@test.kg", "password": "secret123"}
    assert client.post("/api/auth/login", json=bad).json()["detail"] == "Email же сырсөз туура эмес"
    assert client.post("/api/auth/login", json=bad, headers=RU).json()["detail"] == "Неверный email или пароль"


def test_catalog_in_russian(client):
    nodes = {n["type"]: n for n in client.get("/api/nodes", headers=RU).json()["nodes"]}
    assert nodes["http.request"]["label"] == "HTTP-запрос"
    params = {p["name"]: p for p in nodes["logic.if"]["params"]}
    assert params["right"]["label"] == "Сравнить с"
    assert params["operator"]["options"]  # untranslated keys survive
    ky = {n["type"]: n for n in client.get("/api/nodes").json()["nodes"]}
    assert ky["http.request"]["label"] == "HTTP суроо"


def test_background_run_uses_owner_language(client):
    h = {**auth(client), **RU}
    graph = {"nodes": [node("t", "trigger.manual"), node("x", "logic.if", {"left": "abc", "operator": "gt", "right": "1"})],
             "edges": [edge("t", "x")]}
    wf = client.post("/api/workflows", json={"name": "w", "graph": graph}, headers=h).json()
    ex = client.post(f"/api/workflows/{wf['id']}/run", json={"payload": {}}, headers=h).json()
    detail = client.get(f"/api/executions/{ex['id']}", headers=h).json()
    assert detail["status"] == "error"
    assert detail["error"].startswith("Не число")
