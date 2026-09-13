"""Print the composed playbook without calling the model.

    python -m agent.preview breach-of-contract sdny
    python -m agent.preview --list

This is how Ben checks his own work and how you debug bad output — nine times
in ten the answer is visible in the composed text. A script rather than an
admin page, both because it is simpler and because it keeps prompt text out of
the web tier.
"""

from __future__ import annotations

import argparse
import sys

from .playbooks import (
    PlaybookError,
    available_combinations,
    load_registry,
    resolve_playbook,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="agent.preview", description=__doc__)
    parser.add_argument("cause_of_action", nargs="?", help="e.g. breach-of-contract")
    parser.add_argument("jurisdiction", nargs="?", help="e.g. sdny")
    parser.add_argument("--list", action="store_true", help="list valid combinations")
    args = parser.parse_args(argv)

    registry = load_registry()

    if args.list or not (args.cause_of_action and args.jurisdiction):
        causes = registry.get("causes_of_action", {})
        jurisdictions = registry.get("jurisdictions", {})
        print("Available combinations:\n")
        for cause, jurisdiction in available_combinations():
            print(
                f"  {cause} {jurisdiction}"
                f"    # {causes[cause]['label']} / {jurisdictions[jurisdiction]['label']}"
            )
        print("\nUsage: python -m agent.preview <cause_of_action> <jurisdiction>")
        return 0 if args.list else 1

    try:
        print(resolve_playbook(args.cause_of_action, args.jurisdiction), end="")
    except PlaybookError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
