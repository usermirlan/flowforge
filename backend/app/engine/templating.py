"""Template rendering for node parameters.

Parameters may reference earlier results with Jinja syntax, e.g.
``{{ trigger.body.email }}`` or ``{{ nodes.http_1.body.rates.USD }}``.
A sandboxed environment keeps user templates from touching Python internals.
"""

import json
from typing import Any

from jinja2 import ChainableUndefined, StrictUndefined, TemplateError
from jinja2.sandbox import SandboxedEnvironment


class TemplateRenderError(ValueError):
    pass


class _Lenient(ChainableUndefined):
    """Missing values render as empty strings instead of failing the whole run."""

    def __str__(self) -> str:  # pragma: no cover - trivial
        return ""


class _DataEnvironment(SandboxedEnvironment):
    """For JSON data `a.items` must mean the key "items", not the dict method."""

    def getattr(self, obj, attribute):
        if isinstance(obj, dict) and attribute in obj:
            return obj[attribute]
        return super().getattr(obj, attribute)


_env = _DataEnvironment(undefined=_Lenient, autoescape=False)
_env.filters["json"] = lambda v: json.dumps(v, ensure_ascii=False)
_strict = _DataEnvironment(undefined=StrictUndefined, autoescape=False)


def _is_template(s: str) -> bool:
    return "{{" in s or "{%" in s


def render_value(value: Any, ctx: dict) -> Any:
    """Render strings, lists and dicts recursively.

    A string that is exactly one expression (``"{{ nodes.a.items }}"``) returns the
    raw value, so lists and objects survive instead of becoming their repr.
    """
    if isinstance(value, str):
        if not _is_template(value):
            return value
        stripped = value.strip()
        if stripped.startswith("{{") and stripped.endswith("}}") and stripped.count("{{") == 1:
            expr = stripped[2:-2].strip()
            try:
                result = _env.compile_expression(expr, undefined_to_none=True)(**ctx)
            except TemplateError as e:
                raise TemplateRenderError(f"{value!r}: {e}") from e
            return "" if result is None else result
        try:
            return _env.from_string(value).render(**ctx)
        except TemplateError as e:
            raise TemplateRenderError(f"{value!r}: {e}") from e
    if isinstance(value, list):
        return [render_value(v, ctx) for v in value]
    if isinstance(value, dict):
        return {k: render_value(v, ctx) for k, v in value.items()}
    return value


def validate_template(value: str) -> str | None:
    """Syntax check for the editor; returns an error message or None."""
    try:
        _strict.parse(value)
    except TemplateError as e:
        return str(e)
    return None
