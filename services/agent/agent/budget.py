"""Spend controls. These go in BEFORE the first API call, not after the first
surprising bill.

Three layers, because each one catches something the others cannot:

  1. `MAX_TURNS`         — per node. Bounds a single agent that will not stop.
  2. `PER_GENERATION_CAP` — one motion. Bounds a pipeline that loops.
  3. `WINDOW_CAP`         — a rolling window across every generation. Bounds
                            everything else, including us pushing a bad build.

WHY BOTH THIS AND THE CONSOLE LIMIT. The Anthropic console's spend limit is a
real hard stop (Settings > Billing; requests past it return HTTP 400), so this
module is not the only thing standing between us and a runaway. It is still
worth having, because the console limit is monthly, org-wide, and blunt:
hitting it means every job fails mid-run with an API error, forty minutes in,
with the work lost. These caps are a rolling window and a per-job breaker, and
they refuse *before* claiming rather than failing partway through.

Set the console limit ABOVE the window cap here, so this one trips first and
gracefully, and the console stays the backstop for the case where this code is
the thing that is broken.

WHERE THE LEDGER IS. Cost is summed from `generation_nodes`, not from
`generations.cost_usd`. The rollup on `generations` is written when a run
finishes, so a runaway that is still running contributes nothing to it — which
is exactly the case the cap exists for. `generation_nodes` rows land as each of
the ~40 nodes completes.

The known gap: a node's cost is recorded at completion, so the window total can
overshoot by roughly (concurrency x one node's cost) before the cap trips.
Layer 1 is what bounds that overshoot, which is why all three are needed.
"""

from __future__ import annotations

import os
from decimal import Decimal

# --------------------------------------------------------------------------
# Layer 1: per-node turn ceilings.
# --------------------------------------------------------------------------

# The SDK has no session timeout, so `max_turns` is what bounds both a stuck
# loop and the cost of one. Per node rather than global, because the nodes are
# not alike: the Researcher legitimately needs many turns to search, read and
# decide it has enough, while the Verifier looks at one citation and answers.
#
# These are starting values. Raise one when a real run legitimately needs more,
# and say so in the commit — a ceiling raised out of irritation is how a cost
# control stops being one.
#
# `research_gate` and `assembler` are absent on purpose: they have no model
# (invariant 10).
MAX_TURNS: dict[str, int] = {
    "topic_identifier": 30,   # runs the threshold checklist, not a single pass
    "issue_spotter": 20,
    "issue_researcher": 60,   # deliberately generous — searching is its job
    "issue_drafter": 20,
    "draft_combiner": 25,     # reads every per-issue draft
    "background_writer": 15,
    "citation_verifier": 8,   # one citation, read-only, no reason to wander
}

MODELLESS_NODES = frozenset({"research_gate", "assembler"})


def max_turns_for(node: str) -> int:
    """The turn ceiling for a node. Unknown node names are an error rather than
    a default, so a typo cannot silently buy an unbounded agent."""
    if node in MODELLESS_NODES:
        raise ValueError(f"{node} has no model, so it has no turn ceiling")
    try:
        return MAX_TURNS[node]
    except KeyError:
        raise ValueError(f"no max_turns configured for node {node!r}") from None


# --------------------------------------------------------------------------
# Pricing.
# --------------------------------------------------------------------------

# claude-opus-5, US dollars per million tokens, as of September 2026.
# Cache writes cost ~1.25x the input rate and cache reads ~0.1x, which matters
# here rather than being a rounding detail: an agentic loop resends its history
# every turn, so most input tokens on a 60-turn Researcher run are cache reads.
# Costing them at the full input rate would overstate a motion several times
# over and trip the cap on healthy runs.
INPUT_PER_MTOK = Decimal("5.00")
OUTPUT_PER_MTOK = Decimal("25.00")
CACHE_WRITE_MULTIPLIER = Decimal("1.25")
CACHE_READ_MULTIPLIER = Decimal("0.10")

_MILLION = Decimal(1_000_000)


def cost_usd(
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> Decimal:
    """What one node run cost, from the SDK's reported token usage."""
    return (
        Decimal(input_tokens) * INPUT_PER_MTOK
        + Decimal(output_tokens) * OUTPUT_PER_MTOK
        + Decimal(cache_creation_tokens) * INPUT_PER_MTOK * CACHE_WRITE_MULTIPLIER
        + Decimal(cache_read_tokens) * INPUT_PER_MTOK * CACHE_READ_MULTIPLIER
    ) / _MILLION


# --------------------------------------------------------------------------
# Layers 2 and 3: the dollar caps.
# --------------------------------------------------------------------------

# Defaults are estimates, not measurements. Working from ~40 agent runs at
# $5/$25 per MTok, a heavy Researcher run lands around $3 and a whole motion
# somewhere in the $20-40 range, with real variance on a long complaint.
#
# So $50 per generation is a circuit breaker rather than a budget: comfortably
# above a normal run, low enough that a loop is caught in minutes. $300 over 30
# days suits two internal users; it needs raising before the pilot, on evidence.
#
# RECALIBRATE THESE against the first ten real runs. An estimate that survives
# contact with production untouched was probably never checked.
def _decimal_env(name: str, default: str) -> Decimal:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return Decimal(default)
    try:
        value = Decimal(raw)
    except Exception:
        raise RuntimeError(f"{name} is not a number: {raw!r}") from None
    if value <= 0:
        raise RuntimeError(f"{name} must be positive, got {value}")
    return value


def per_generation_cap() -> Decimal:
    return _decimal_env("SPEND_CAP_PER_GENERATION_USD", "50")


def window_cap() -> Decimal:
    return _decimal_env("SPEND_CAP_WINDOW_USD", "300")


def window_days() -> int:
    raw = os.environ.get("SPEND_WINDOW_DAYS", "30")
    try:
        days = int(raw)
    except ValueError:
        raise RuntimeError(f"SPEND_WINDOW_DAYS is not an integer: {raw!r}") from None
    if days <= 0:
        raise RuntimeError(f"SPEND_WINDOW_DAYS must be positive, got {days}")
    return days


class SpendCapExceeded(RuntimeError):
    """Raised instead of spending money. Carries no case facts — the message
    goes into logs, and `error_class` is what reaches the database."""

    def __init__(self, scope: str, spent: Decimal, cap: Decimal):
        self.scope = scope
        self.spent = spent
        self.cap = cap
        self.error_class = f"spend_cap_{scope}"
        super().__init__(f"spend cap ({scope}): ${spent:.2f} of ${cap:.2f}")


# Interval is interpolated as an integer count of days, never as user input.
WINDOW_SPEND = """
  select coalesce(sum(cost_usd), 0) as spent
    from generation_nodes
   where started_at >= now() - make_interval(days => %s);
"""

GENERATION_SPEND = """
  select coalesce(sum(cost_usd), 0) as spent
    from generation_nodes
   where generation_id = %s;
"""


def window_spend(conn) -> Decimal:
    """Total spend over the rolling window, across every generation."""
    with conn.cursor() as cur:
        cur.execute(WINDOW_SPEND, (window_days(),))
        return Decimal(cur.fetchone()["spent"])


def generation_spend(conn, generation_id) -> Decimal:
    """Total spend on one motion so far."""
    with conn.cursor() as cur:
        cur.execute(GENERATION_SPEND, (generation_id,))
        return Decimal(cur.fetchone()["spent"])


def check_window(conn) -> None:
    """Call BEFORE claiming a job. Refuses to start new work when the rolling
    window is spent."""
    spent, cap = window_spend(conn), window_cap()
    if spent >= cap:
        raise SpendCapExceeded("window", spent, cap)


def check_generation(conn, generation_id) -> None:
    """Call between nodes. Stops one motion that is running away without
    stopping the whole worker."""
    spent, cap = generation_spend(conn, generation_id), per_generation_cap()
    if spent >= cap:
        raise SpendCapExceeded("generation", spent, cap)
