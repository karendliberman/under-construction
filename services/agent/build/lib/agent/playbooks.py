"""The playbook resolver — the ONLY code that reads playbook prose.

The web service reads `registry.yaml` for labels and filenames and nothing
else, so playbook text never reaches the browser, an API response, the
database, or the web container's image. It exists in git and in this service's
image (invariant 2).

`resolve_playbook` is deterministic: same inputs, same bytes, forever. No
timestamps, no randomness, fixed layer ordering. That is what makes the git SHA
sufficient as a version record, which is what lets us keep prompt text and
prompt hashes out of the database entirely (invariants 5 and 6).
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml

# Deliberate: guardrails frame everything, the general procedural standard
# comes before the specific cause of action, and the jurisdictional gloss goes
# last so local practice overrides general guidance.
LAYER_ORDER = ("shared", "procedural", "substantive", "jurisdiction")


class PlaybookError(ValueError):
    """A combination that does not exist, or a file the registry promised."""


def playbooks_dir() -> Path:
    """Works from the repo (services/agent/agent/) and from the image (/app)."""
    override = os.environ.get("PLAYBOOKS_DIR")
    if override:
        return Path(override)
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "playbooks"
        if (candidate / "registry.yaml").is_file():
            return candidate
    raise PlaybookError("could not locate playbooks/registry.yaml")


@lru_cache(maxsize=1)
def load_registry() -> dict:
    with (playbooks_dir() / "registry.yaml").open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def available_combinations() -> list[tuple[str, str]]:
    """Every (cause_of_action, jurisdiction) the registry declares. Sorted, so
    callers get a stable order."""
    registry = load_registry()
    out = [
        (cause, jurisdiction)
        for cause, spec in registry.get("causes_of_action", {}).items()
        for jurisdiction in spec.get("jurisdictions", [])
    ]
    return sorted(out)


def _read(relative: str) -> str:
    path = playbooks_dir() / relative
    if not path.is_file():
        raise PlaybookError(f"registry names {relative}, which does not exist")
    # Normalise trailing whitespace so an editor's stray newline cannot change
    # the composed bytes. Determinism is the whole point.
    return path.read_text(encoding="utf-8").rstrip()


def resolve_playbook(cause_of_action: str, jurisdiction: str) -> str:
    """Compose the layers into one document.

    Deterministic: same inputs, same bytes, forever.
    """
    registry = load_registry()

    causes = registry.get("causes_of_action", {})
    if cause_of_action not in causes:
        raise PlaybookError(f"unknown cause of action: {cause_of_action!r}")
    cause = causes[cause_of_action]

    if jurisdiction not in cause.get("jurisdictions", []):
        raise PlaybookError(
            f"no playbook for {cause_of_action!r} in {jurisdiction!r}"
        )

    jurisdictions = registry.get("jurisdictions", {})
    if jurisdiction not in jurisdictions:
        raise PlaybookError(f"unknown jurisdiction: {jurisdiction!r}")

    layers: dict[str, list[str]] = {
        "shared": [_read(p) for p in registry.get("shared", [])],
        "procedural": [_read(cause["procedural"])],
        "substantive": [_read(cause["substantive"])],
        "jurisdiction": [_read(jurisdictions[jurisdiction]["file"])],
    }

    parts: list[str] = []
    for layer in LAYER_ORDER:
        parts.extend(layers[layer])
    return "\n\n---\n\n".join(parts) + "\n"
