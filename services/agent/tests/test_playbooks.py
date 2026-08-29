"""Tests for the resolver.

Invariant 6 (`resolve_playbook` is deterministic) is load-bearing: invariant 5
says the database stores no prompt text and no prompt hash, and that is only
safe because checking out the recorded git SHA and re-running the resolver
reproduces exactly what was used. If determinism breaks, the version record
silently stops meaning anything.
"""

import hashlib

import pytest

from agent.playbooks import (
    LAYER_ORDER,
    PlaybookError,
    available_combinations,
    load_registry,
    resolve_playbook,
)


def test_deterministic_across_calls():
    digests = {
        hashlib.sha256(resolve_playbook("breach-of-contract", "sdny").encode()).hexdigest()
        for _ in range(10)
    }
    assert len(digests) == 1


def test_layer_order_is_shared_procedural_substantive_jurisdiction():
    composed = resolve_playbook("breach-of-contract", "sdny")
    positions = [
        composed.index("# Guardrails"),
        composed.index("# House style"),
        composed.index("# Rule 12(b)(6)"),
        composed.index("# Breach of contract"),
        composed.index("# S.D.N.Y."),
    ]
    assert positions == sorted(positions), "jurisdiction must come last so it overrides"


def test_every_declared_combination_resolves():
    """Catches a registry entry pointing at a file nobody created."""
    for cause, jurisdiction in available_combinations():
        assert resolve_playbook(cause, jurisdiction).strip()


def test_unknown_cause_rejected():
    with pytest.raises(PlaybookError):
        resolve_playbook("no-such-cause", "sdny")


def test_combination_not_declared_is_rejected():
    """breach-of-contract exists and nd-cal may exist, but the pair does not."""
    with pytest.raises(PlaybookError):
        resolve_playbook("breach-of-contract", "nd-cal")


def test_registry_files_all_exist():
    registry = load_registry()
    referenced = list(registry.get("shared", []))
    for spec in registry.get("causes_of_action", {}).values():
        referenced += [spec["procedural"], spec["substantive"]]
    for spec in registry.get("jurisdictions", {}).values():
        referenced.append(spec["file"])

    from agent.playbooks import playbooks_dir

    missing = [r for r in referenced if not (playbooks_dir() / r).is_file()]
    assert not missing, f"registry names files that do not exist: {missing}"


def test_layer_order_constant_is_complete():
    assert LAYER_ORDER == ("shared", "procedural", "substantive", "jurisdiction")
