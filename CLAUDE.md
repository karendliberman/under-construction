# Under Construction

An AI drafting tool for litigators. A lawyer logs in, picks a **cause of action** and a
**jurisdiction**, enters the facts of a case, and an agent drafts a **motion to dismiss**
under a playbook specific to that combination.

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
3. **The agent's tool allowlist is deny-by-default:** `Read`, `Write`, `Grep`, `Glob`.
   No `Bash`, no `WebSearch`/`WebFetch`, no MCP servers. Case facts are untrusted input —
   potentially drafted by opposing counsel — and the agent acts on what it reads.
   Adding a tool is a deliberate decision with a stated reason, never a convenience.
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
three at once.

| Doc | Read it when |
|---|---|
| `docs/scope-and-backlog.md` | Deciding what to build next, or whether something is in V0 |
| `docs/architecture.md` | A decision feels arbitrary — this says what the alternative was and why we didn't take it |
| `docs/implementation.md` | Building a specific feature — schema, endpoints, the worker, build order |

The plan is a plan, not scripture. When building reveals it was wrong, change it — and
update the doc in the same commit, or it rots and stops being worth reading.

## Two things that are easy to get wrong

**Cost is variable.** The agent decides how many turns it takes, so a draft can cost several
times what a typical one does. `maxTurns` and the app-side spend cap are not optional, and
they go in before the first API call.

**V0 output has unverified citations.** There is no retrieval and no cite-checker, so the
model may cite cases that don't exist. The banner in the draft viewer is not decoration and
is not dismissible.
