import os

# configure before the app is imported
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ["CELERY_EAGER"] = "1"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import db as dbmod  # noqa: E402
from app.engine import events  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    dbmod.Base.metadata.drop_all(dbmod.engine)
    dbmod.Base.metadata.create_all(dbmod.engine)
    yield


@pytest.fixture(autouse=True)
def captured_events(monkeypatch):
    sent: list[tuple[str, dict]] = []
    monkeypatch.setattr(events, "publish", lambda eid, ev: sent.append((eid, ev)))
    return sent


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    with dbmod.SessionLocal() as s:
        yield s


def auth(client, email="a@test.kg"):
    r = client.post("/api/auth/register", json={"email": email, "name": "Test", "password": "secret123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def node(id, type, params=None, **data):
    return {"id": id, "type": type, "position": {"x": 0, "y": 0}, "data": {"params": params or {}, **data}}


def edge(source, target, handle=None):
    e = {"id": f"{source}-{target}", "source": source, "target": target}
    if handle:
        e["sourceHandle"] = handle
    return e
