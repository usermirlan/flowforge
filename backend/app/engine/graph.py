"""Workflow graph helpers: validation and traversal."""

from collections import defaultdict
from ..i18n import t

TRIGGER_PREFIX = "trigger."


class GraphError(ValueError):
    pass


def nodes_by_id(graph: dict) -> dict[str, dict]:
    return {n["id"]: n for n in graph.get("nodes", [])}


def outgoing(graph: dict) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for e in graph.get("edges", []):
        out[e["source"]].append(e)
    return out


def find_trigger(graph: dict) -> dict:
    triggers = [n for n in graph.get("nodes", []) if n.get("type", "").startswith(TRIGGER_PREFIX)]
    if not triggers:
        raise GraphError(t("Workflow'до триггер жок"))
    if len(triggers) > 1:
        raise GraphError(t("Workflow'до бир гана триггер болушу керек"))
    return triggers[0]


def validate(graph: dict, known_types: set[str]) -> list[str]:
    """Return a list of problems (empty when the graph can run)."""
    problems: list[str] = []
    nodes = nodes_by_id(graph)
    for n in graph.get("nodes", []):
        if n.get("type") not in known_types:
            problems.append(t("Белгисиз блок: {type} ({id})", type=repr(n.get("type")), id=n.get("id")))
    for e in graph.get("edges", []):
        if e.get("source") not in nodes or e.get("target") not in nodes:
            problems.append(t("Туташуу жок блокко барат: {id}", id=e.get("id")))
        elif nodes[e["target"]]["type"].startswith(TRIGGER_PREFIX):
            problems.append(t("Триггерге эч нерсе туташпашы керек"))
    try:
        find_trigger(graph)
    except GraphError as e:
        problems.append(str(e))
    if _has_cycle(graph):
        problems.append(t("Workflow'до цикл бар (блоктор айланып бири-бирине кайтат)"))
    return problems


def _has_cycle(graph: dict) -> bool:
    out = outgoing(graph)
    state: dict[str, int] = {}  # 1 = visiting, 2 = done

    def visit(nid: str) -> bool:
        state[nid] = 1
        for e in out.get(nid, []):
            tgt = e["target"]
            if state.get(tgt) == 1 or (tgt not in state and visit(tgt)):
                return True
        state[nid] = 2
        return False

    return any(nid not in state and visit(nid) for nid in nodes_by_id(graph))
