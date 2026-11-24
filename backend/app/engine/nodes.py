"""Node types. Each node gets its rendered params and returns a JSON-able output.

Adding a node type = one class with `type`, `meta` (for the editor palette) and `run`.
"""

from __future__ import annotations

import ipaddress
import json
import socket
from dataclasses import dataclass, field
from typing import Any, ClassVar
from urllib.parse import urlsplit

import httpx

from ..config import settings
from ..i18n import t, localize_node


class NodeError(Exception):
    """A node failed; the message is shown in the execution log."""


@dataclass
class NodeContext:
    params: dict                    # already rendered
    input: Any                      # output of the previous node
    credentials: dict = field(default_factory=dict)  # decrypted credential for this node, if any
    http: httpx.Client | None = None


@dataclass
class NodeResult:
    output: Any
    # for branching nodes: which source handle to follow ("true"/"false"); None = all
    branch: str | None = None


class Node:
    type: ClassVar[str]
    meta: ClassVar[dict]  # label, group, description, params schema, credential type, handles

    def run(self, ctx: NodeContext) -> NodeResult:  # pragma: no cover - interface
        raise NotImplementedError


REGISTRY: dict[str, Node] = {}


def register(cls: type[Node]) -> type[Node]:
    REGISTRY[cls.type] = cls()
    return cls


def catalog() -> list[dict]:
    return [{"type": typ, **localize_node(n.meta, typ)} for typ, n in REGISTRY.items()]


# ---------------------------------------------------------------- triggers

@register
class ManualTrigger(Node):
    type = "trigger.manual"
    meta = {
        "label": "Кол менен иштетүү",
        "group": "trigger",
        "description": "«Иштетүү» баскычы басылганда башталат. Киргизилген JSON кийинки блокторго берилет.",
        "params": [],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        return NodeResult(ctx.input or {})


@register
class WebhookTrigger(Node):
    type = "trigger.webhook"
    meta = {
        "label": "Webhook",
        "group": "trigger",
        "description": "Workflow'дун өзгөчө дарегине POST суроо келгенде башталат.",
        "params": [],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        return NodeResult(ctx.input or {})


@register
class ScheduleTrigger(Node):
    type = "trigger.schedule"
    meta = {
        "label": "Убакыт боюнча",
        "group": "trigger",
        "description": "Cron боюнча өзү иштейт, мисалы ар күнү саат 9да.",
        "params": [
            {"name": "cron", "label": "Cron", "kind": "text", "default": "0 9 * * *",
             "help": "мүнөт саат күн ай апта күнү · «0 9 * * *» = ар күнү 09:00"},
            {"name": "timezone", "label": "Убакыт алкагы", "kind": "text", "default": "Asia/Bishkek"},
        ],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        return NodeResult(ctx.input or {})


# ---------------------------------------------------------------- actions

def check_public_url(url: str) -> None:
    """SSRF guard: user workflows must not reach the server's own network."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise NodeError(t("URL http:// же https:// менен башталышы керек"))
    if settings.allow_private_urls:
        return
    try:
        infos = socket.getaddrinfo(parts.hostname, parts.port or (443 if parts.scheme == "https" else 80))
    except socket.gaierror as e:
        raise NodeError(t("Хост табылган жок: {host}", host=parts.hostname)) from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise NodeError(t("Ички тармактагы дарекке суроо жиберүүгө болбойт: {host}", host=parts.hostname))


def _parse_body(resp: httpx.Response) -> Any:
    if "json" in resp.headers.get("content-type", ""):
        try:
            return resp.json()
        except ValueError:
            pass
    text = resp.text
    return text if len(text) <= 100_000 else text[:100_000] + "…"


@register
class HttpRequest(Node):
    type = "http.request"
    meta = {
        "label": "HTTP суроо",
        "group": "action",
        "description": "Каалаган API'ге GET/POST суроо жиберет. Жооп JSON болсо, объект катары келет.",
        "params": [
            {"name": "method", "label": "Метод", "kind": "select", "options": ["GET", "POST", "PUT", "PATCH", "DELETE"], "default": "GET"},
            {"name": "url", "label": "URL", "kind": "text", "default": "https://api.example.com"},
            {"name": "headers", "label": "Headers (JSON)", "kind": "json", "default": {}},
            {"name": "body", "label": "Body (JSON)", "kind": "json", "default": None},
            {"name": "fail_on_error", "label": "4xx/5xx болсо токтот", "kind": "bool", "default": True},
        ],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        p = ctx.params
        url = str(p.get("url", "")).strip()
        check_public_url(url)
        method = str(p.get("method") or "GET").upper()
        headers = p.get("headers") or {}
        if not isinstance(headers, dict):
            raise NodeError(t("Headers JSON объект болушу керек"))
        body = p.get("body")
        kwargs: dict[str, Any] = {"headers": {str(k): str(v) for k, v in headers.items()}}
        if body not in (None, "") and method != "GET":
            if isinstance(body, (dict, list)):
                kwargs["json"] = body
            else:
                kwargs["content"] = str(body)
        client = ctx.http or httpx.Client(timeout=20, follow_redirects=False)
        try:
            resp = client.request(method, url, **kwargs)
        except httpx.HTTPError as e:
            raise NodeError(t("Суроо ишке ашкан жок: {error}", error=e)) from e
        out = {"status": resp.status_code, "headers": dict(resp.headers), "body": _parse_body(resp)}
        if p.get("fail_on_error", True) and resp.status_code >= 400:
            raise NodeError(f"HTTP {resp.status_code}: {str(out['body'])[:300]}")
        return NodeResult(out)


OPERATORS = {
    "equals": lambda a, b: str(a) == str(b),
    "not_equals": lambda a, b: str(a) != str(b),
    "contains": lambda a, b: str(b) in str(a),
    "gt": lambda a, b: _num(a) > _num(b),
    "lt": lambda a, b: _num(a) < _num(b),
    "is_empty": lambda a, b: a in (None, "", [], {}),
    "is_not_empty": lambda a, b: a not in (None, "", [], {}),
}


def _num(v: Any) -> float:
    try:
        return float(v)
    except (TypeError, ValueError) as e:
        raise NodeError(t("Сан эмес: {value}", value=repr(v))) from e


@register
class IfCondition(Node):
    type = "logic.if"
    meta = {
        "label": "Шарт (if)",
        "group": "logic",
        "description": "Шарт аткарылса «true», болбосо «false» жолу менен улантат.",
        "handles": ["true", "false"],
        "params": [
            {"name": "left", "label": "Маани", "kind": "text", "default": "{{ input.status }}"},
            {"name": "operator", "label": "Шарт", "kind": "select", "options": list(OPERATORS), "default": "equals"},
            {"name": "right", "label": "Салыштыруу", "kind": "text", "default": "200"},
        ],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        op = ctx.params.get("operator", "equals")
        if op not in OPERATORS:
            raise NodeError(t("Белгисиз шарт: {op}", op=op))
        ok = bool(OPERATORS[op](ctx.params.get("left"), ctx.params.get("right")))
        return NodeResult({"result": ok, "input": ctx.input}, branch="true" if ok else "false")


def _coerce(v: Any) -> Any:
    """"42" → 42, "true" → True, '{"a":1}' → dict; anything else stays as is."""
    if not isinstance(v, str):
        return v
    s = v.strip()
    if s in ("true", "false", "null") or (s[:1] in "[{-0123456789" and s):
        try:
            return json.loads(s)
        except ValueError:
            return v
    return v


@register
class SetFields(Node):
    type = "data.set"
    meta = {
        "label": "Маалымат түзүү",
        "group": "data",
        "description": "Мурунку блоктордун натыйжасынан жаңы объект курат.",
        "params": [
            {"name": "fields", "label": "Талаалар", "kind": "fields",
             "default": [{"key": "message", "value": "Салам, {{ trigger.name }}!"}]},
        ],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        fields = ctx.params.get("fields") or []
        if not isinstance(fields, list):
            raise NodeError(t("Талаалар тизме болушу керек"))
        return NodeResult({str(f.get("key")): _coerce(f.get("value")) for f in fields if f.get("key")})


@register
class TelegramSend(Node):
    type = "telegram.send"
    meta = {
        "label": "Telegram билдирүү",
        "group": "action",
        "description": "Бот аркылуу чатка билдирүү жиберет (@BotFather'дан бекер бот алынат).",
        "credential": "telegram",
        "params": [
            {"name": "chat_id", "label": "Chat ID", "kind": "text", "default": ""},
            {"name": "text", "label": "Текст", "kind": "textarea", "default": "{{ input.message }}"},
        ],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        token = ctx.credentials.get("bot_token")
        if not token:
            raise NodeError(t("Telegram бот токени тандалган жок (Credentials)"))
        text = str(ctx.params.get("text") or "").strip()
        if not text:
            raise NodeError(t("Билдирүүнүн тексти бош"))
        client = ctx.http or httpx.Client(timeout=20)
        try:
            resp = client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": ctx.params.get("chat_id"), "text": text[:4096]},
            )
            data = resp.json()
        except (httpx.HTTPError, ValueError) as e:
            raise NodeError(t("Telegram'га жетүү мүмкүн болгон жок: {error}", error=e)) from e
        if not data.get("ok"):
            raise NodeError(t("Telegram: {error}", error=data.get("description") or t("ката")))
        return NodeResult({"message_id": data["result"]["message_id"], "chat_id": data["result"]["chat"]["id"]})


@register
class AiPrompt(Node):
    type = "ai.prompt"
    meta = {
        "label": "AI",
        "group": "ai",
        "description": "Текстти LLM менен иштетет: кыскартуу, котормо, классификация, жооп жазуу.",
        "credential": "openai",
        "credential_optional": True,
        "params": [
            {"name": "system", "label": "Нускама (system)", "kind": "textarea", "default": "Сен кыска жана так жооп бересиң."},
            {"name": "prompt", "label": "Суроо", "kind": "textarea", "default": "Кыскача түшүндүр: {{ input | json }}"},
            {"name": "json_output", "label": "JSON жооп күтүү", "kind": "bool", "default": False},
        ],
    }

    def run(self, ctx: NodeContext) -> NodeResult:
        key = ctx.credentials.get("api_key") or settings.llm_api_key
        if not key:
            raise NodeError(t("AI ачкычы жок: Credentials'ке кошуңуз же серверде LLM_API_KEY коюңуз"))
        base = (ctx.credentials.get("base_url") or settings.llm_base_url).rstrip("/")
        model = ctx.credentials.get("model") or settings.llm_model
        body: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": str(ctx.params.get("system") or "")},
                {"role": "user", "content": str(ctx.params.get("prompt") or "")},
            ],
        }
        if ctx.params.get("json_output"):
            body["response_format"] = {"type": "json_object"}
        client = ctx.http or httpx.Client(timeout=60)
        try:
            resp = client.post(f"{base}/chat/completions", json=body, headers={"Authorization": f"Bearer {key}"})
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"] or ""
        except (httpx.HTTPError, KeyError, ValueError) as e:
            raise NodeError(t("AI кызматы жооп берген жок: {error}", error=e)) from e
        out: dict[str, Any] = {"text": text, "model": model}
        if ctx.params.get("json_output"):
            try:
                out["json"] = json.loads(text)
            except ValueError as e:
                raise NodeError(t("AI JSON эмес жооп кайтарды")) from e
        return NodeResult(out)


CREDENTIAL_TYPES = {
    "telegram": {"label": "Telegram бот", "fields": [{"name": "bot_token", "label": "Bot token", "secret": True}]},
    "openai": {
        "label": "AI (OpenAI-шайкеш API)",
        "fields": [
            {"name": "api_key", "label": "API key", "secret": True},
            {"name": "base_url", "label": "Base URL", "secret": False, "default": "https://api.groq.com/openai/v1"},
            {"name": "model", "label": "Model", "secret": False, "default": "openai/gpt-oss-120b"},
        ],
    },
}
