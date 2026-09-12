"""Tests for the spend controls.

These run before any API key exists, which is the point: the cap has to be
provably working before the worker can spend anything.
"""

from decimal import Decimal

import pytest

from agent import budget


# --------------------------------------------------------------------------
# Layer 1: turn ceilings.
# --------------------------------------------------------------------------


def test_every_model_node_has_a_turn_ceiling():
    """The nine nodes of docs/pipeline.md §2, less the two without a model."""
    expected = {
        "topic_identifier",
        "issue_spotter",
        "issue_researcher",
        "issue_drafter",
        "draft_combiner",
        "background_writer",
        "citation_verifier",
    }
    assert set(budget.MAX_TURNS) == expected


def test_modelless_nodes_are_refused_a_ceiling():
    """Invariant 10: the Gate and the Assembler have no model. Asking for a
    turn ceiling means someone is about to give one of them a query()."""
    for node in ("research_gate", "assembler"):
        with pytest.raises(ValueError, match="no model"):
            budget.max_turns_for(node)


def test_unknown_node_raises_rather_than_defaulting():
    """A typo must not silently buy an unbounded agent."""
    with pytest.raises(ValueError):
        budget.max_turns_for("issue_reseacher")


def test_researcher_has_the_most_generous_ceiling():
    assert budget.MAX_TURNS["issue_researcher"] == max(budget.MAX_TURNS.values())


def test_ceilings_are_all_bounded():
    assert all(0 < n <= 100 for n in budget.MAX_TURNS.values())


# --------------------------------------------------------------------------
# Pricing.
# --------------------------------------------------------------------------


def test_cost_of_a_plain_million_tokens():
    assert budget.cost_usd(input_tokens=1_000_000) == Decimal("5.00")
    assert budget.cost_usd(output_tokens=1_000_000) == Decimal("25.00")


def test_cache_reads_are_a_tenth_of_input():
    assert budget.cost_usd(cache_read_tokens=1_000_000) == Decimal("0.50")


def test_cache_writes_are_a_premium_on_input():
    assert budget.cost_usd(cache_creation_tokens=1_000_000) == Decimal("6.25")


def test_cost_is_additive():
    assert budget.cost_usd(
        input_tokens=1_000_000,
        output_tokens=1_000_000,
        cache_creation_tokens=1_000_000,
        cache_read_tokens=1_000_000,
    ) == Decimal("36.75")


def test_zero_usage_costs_nothing():
    assert budget.cost_usd() == Decimal("0")


# --------------------------------------------------------------------------
# Layers 2 and 3: the dollar caps.
# --------------------------------------------------------------------------


def test_cap_defaults(monkeypatch):
    for name in (
        "SPEND_CAP_PER_GENERATION_USD",
        "SPEND_CAP_WINDOW_USD",
        "SPEND_WINDOW_DAYS",
    ):
        monkeypatch.delenv(name, raising=False)
    assert budget.per_generation_cap() == Decimal("50")
    assert budget.window_cap() == Decimal("300")
    assert budget.window_days() == 30


def test_caps_read_the_environment(monkeypatch):
    monkeypatch.setenv("SPEND_CAP_PER_GENERATION_USD", "12.50")
    monkeypatch.setenv("SPEND_CAP_WINDOW_USD", "999")
    monkeypatch.setenv("SPEND_WINDOW_DAYS", "7")
    assert budget.per_generation_cap() == Decimal("12.50")
    assert budget.window_cap() == Decimal("999")
    assert budget.window_days() == 7


def test_an_empty_env_var_falls_back_to_the_default(monkeypatch):
    """Render sets a variable to empty rather than unsetting it. That must not
    read as a cap of zero, which would refuse every job."""
    monkeypatch.setenv("SPEND_CAP_WINDOW_USD", "")
    assert budget.window_cap() == Decimal("300")


@pytest.mark.parametrize("bad", ["nonsense", "-5", "0"])
def test_a_bad_cap_is_a_startup_error_not_a_silent_default(monkeypatch, bad):
    """Failing closed on a misconfigured cap is right: the alternative is a
    worker that quietly runs uncapped because someone fat-fingered a value."""
    monkeypatch.setenv("SPEND_CAP_WINDOW_USD", bad)
    with pytest.raises(RuntimeError, match="SPEND_CAP_WINDOW_USD"):
        budget.window_cap()


class FakeCursor:
    def __init__(self, spent):
        self.spent = spent
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return {"spent": self.spent}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConn:
    """Stands in for psycopg. The queries are plain SQL, so the interesting
    behaviour is the comparison rather than the driver."""

    def __init__(self, spent="0"):
        self.cur = FakeCursor(Decimal(spent))

    def cursor(self):
        return self.cur


def test_window_check_passes_under_the_cap(monkeypatch):
    monkeypatch.setenv("SPEND_CAP_WINDOW_USD", "300")
    budget.check_window(FakeConn("299.99"))  # does not raise


def test_window_check_refuses_at_the_cap(monkeypatch):
    """At the cap, not past it. Spending the three-hundredth dollar to discover
    we are over is the wrong side of the boundary."""
    monkeypatch.setenv("SPEND_CAP_WINDOW_USD", "300")
    with pytest.raises(budget.SpendCapExceeded) as exc:
        budget.check_window(FakeConn("300"))
    assert exc.value.error_class == "spend_cap_window"


def test_generation_check_refuses_a_runaway(monkeypatch):
    monkeypatch.setenv("SPEND_CAP_PER_GENERATION_USD", "50")
    with pytest.raises(budget.SpendCapExceeded) as exc:
        budget.check_generation(FakeConn("51.20"), "some-uuid")
    assert exc.value.error_class == "spend_cap_generation"


def test_the_window_query_is_parameterised(monkeypatch):
    """The interval must never be built by string concatenation."""
    monkeypatch.setenv("SPEND_WINDOW_DAYS", "14")
    conn = FakeConn("0")
    budget.window_spend(conn)
    sql, params = conn.cur.executed[0]
    assert params == (14,)
    assert "14" not in sql


def test_the_exception_carries_no_case_facts():
    """It is logged and classified, so it must stay free of anything derived
    from the complaint."""
    exc = budget.SpendCapExceeded("window", Decimal("300"), Decimal("300"))
    assert str(exc) == "spend cap (window): $300.00 of $300.00"
