# Under Construction

An AI drafting tool for litigators. A lawyer pastes in the **complaint** filed against their
client plus a short client-facts form; a pipeline of agents identifies the topics worth
pursuing — pleaded counts and threshold defenses whose preconditions hold — researches
authority, drafts the argument, and verifies every citation, producing a **motion to
dismiss** plus a verification report.

V0 users are two people (internal). A pilot with outside lawyers is roughly three months out.

## Stack

| | |
|---|---|
| Web | Next.js (App Router) + TypeScript, Drizzle, Tailwind + shadcn/ui, Zod |
| Worker | Python 3.12, `claude-agent-sdk`, `psycopg`, plain SQL |
| Database | Neon Postgres |
| Hosting | Render — one web service, one worker service, both from this repo |

## Layout

```
apps/web/          Next.js web app          -> Render web service
services/agent/    Python agent worker      -> Render worker service
packages/db/       Drizzle schema + migrations (the ONLY owner of DDL)
playbooks/         Markdown playbooks + registry.yaml
evals/             Python eval fixtures and scripts (does not deploy)
docs/              The plan — see below
```

## Invariants

These are load-bearing. A change that breaks one of them needs a conversation, not a refactor.

1. **The database is the only interface between the two services.** No internal HTTP API,
   no shared types, no direct calls. The web app writes a `generations` row with
   `status = 'queued'`; the worker claims it with `SELECT … FOR UPDATE SKIP LOCKED`.
2. **Only the worker reads playbook prose.** The web app reads `playbooks/registry.yaml`
   and nothing else from that directory. Playbook text must never reach the browser,
   an API response, or the database.
3. **Tool allowlists are deny-by-default and scoped PER NODE**, not per job. See
   `docs/pipeline.md` §5 for the table. Two rules inside it never bend:
   - **`Bash` is never granted to any node.** Nothing in the pipeline needs a shell, and
     it is the one tool that turns prompt injection into code execution.
   - **Web access reaches exactly one node** — the Issue Researcher — and is pinned by
     `allowed_domains` on `WebSearch` plus a hard domain allowlist inside `fetch_case`.
     No other node gets it. `WebFetch` is not used anywhere: it returns an extraction
     model's summary rather than page text, which breaks citation verification.
   Adding a tool to a node is a deliberate decision with a stated reason, never a
   convenience.
4. **The per-job working directory is deleted in `finally`** — success or failure, always.
   It holds client-confidential case facts. This is a security control, not housekeeping.
5. **No prompt text and no prompt hash in the database.** `generations.playbook_version`
   holds the git SHA, and that is sufficient because of invariant 6.
6. **`resolve_playbook` is deterministic** — fixed layer ordering, no timestamps, no
   randomness. Invariant 5 depends on this.
7. **`generations` rows are immutable once `status = 'complete'`**, except the `outcome`
   fields. A re-run is a new row, never an overwrite.
8. **Drizzle owns DDL.** The Python worker reads and writes rows; it never issues schema
   changes. Two migration tools against one database is a nasty failure mode.
9. **Never retrieve Westlaw or Lexis content.** Raw opinions and statutes are public domain;
   headnotes and editorial content are not. *Thomson Reuters v. ROSS Intelligence* killed a
   legal-AI company over exactly this. Enforced by the domain allowlist in code, not by an
   instruction in a playbook.
10. **Two pipeline nodes have no model** — the Research Gate and the Assembler. Keep them
   deterministic. A verifier that can hallucinate is not a verifier, and boilerplate should
   be templated rather than generated.

## Conventions

- **Work in vertical slices**, not layers. "Request-access form + endpoint + table + admin
  approval, working end to end" is a better session than "all the database tables."
- **Say which service you're in** at the start of a session — `apps/web` or `services/agent`.
  Call out cross-cutting changes (a new column both sides use) explicitly.
- **Deploy every session.** A preview URL beats a longer local branch, and it stops either
  deploy path from rotting.
- **Configuration lives in environment variables and Dockerfiles**, never in Render's
  dashboard. That portability is deliberate — it is what makes leaving Render cheap.
- `ANTHROPIC_API_KEY` belongs to the worker only. The web service never needs it.

## The plan

`docs/` holds the design. Read the relevant section before starting a task; don't read all
four at once.

| Doc | Read it when |
|---|---|
| `docs/scope-and-backlog.md` | Deciding what to build next, or whether something is in V0 |
| `docs/architecture.md` | A decision feels arbitrary — this says what the alternative was and why we didn't take it |
| `docs/implementation.md` | Building a specific feature — schema, endpoints, the worker, build order |
| `docs/pipeline.md` | Building any part of the drafting pipeline — node contracts, JSON schemas, tool scoping, orchestration |

The plan is a plan, not scripture. When building reveals it was wrong, change it — and
update the doc in the same commit, or it rots and stops being worth reading.

## The pipeline

Drafting is a nine-node graph with two levels of fan-out — Topic Identifier → Issue Spotter
(per topic) → Issue Researcher → Research Gate → Issue Drafter (per issue) → Draft Combiner
→ Background Writer → Assembler → Citation Verifier. Roughly 40 agent runs per motion,
45–90 minutes end to end, no human anywhere in it.

**A "topic" is one of two things, and `topics.json` records which with a `kind` field:**

- `count` — a cause of action the plaintiff pleaded. The work is element analysis under
  Rule 12(b)(6).
- `threshold` — a defense available regardless of what was pleaded (personal jurisdiction,
  venue, limitations, exhaustion, arbitration). Each has its own framework, its own Rule
  12(b) subsection, and a **precondition** that decides whether it's worth pursuing at all.
  If the client is headquartered in the forum state there is no personal-jurisdiction
  argument, and the pipeline should record that and move on.

`kind` selects the playbook layers for nodes 02 and 05. Threshold defenses are run as an
**exhaustive checklist** rather than a creative scan, because several of them are waived if
omitted from the first Rule 12(b) motion — missing one costs the defense permanently, not
just an argument.

Three more things that are structural, not incidental:

- **The graph lives in Python, not in a prompt.** Each node is genuinely agentic inside its
  own box; the topology between nodes is fixed. That is what gives us auditability, per-node
  cost attribution, resumability, and bounded retries.
- **Two nodes have no model at all** — the Research Gate and the Assembler. Keep them that
  way. A verifier that can hallucinate is not a verifier, and boilerplate should be
  templated rather than generated.
- **Partial failure is not total failure.** One failed issue out of nine is skipped,
  recorded and reported. The run only fails outright if the complaint can't be read or if
  no issue survives.

## Two things that are easy to get wrong

**Cost is variable, and the pipeline made it more so.** Roughly forty agent runs per motion,
each deciding its own turn count. `max_turns` is set **per node** (the Researcher's is
deliberately generous) and the app-side spend cap is not optional — both go in before the
first API call. "Cost per motion doesn't matter" is not "cost doesn't matter": a runaway
loop is still a runaway loop.

**Citations are verified but not guaranteed.** The Research Gate catches invented cases and
invented quotes mechanically; the Citation Verifier judges whether real cases support the
propositions drafted, and may answer `uncertain`. Anything not cleanly `supported` is
flagged in the UI, never silently fixed. The draft still carries a banner saying the filing
attorney must verify — that is not decoration, and it is not dismissible.
