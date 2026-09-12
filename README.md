# Nomostra

An AI drafting tool for litigators, sold to in-house legal teams. Upload a
complaint, add a few details, and get back a motion to dismiss drafted against
a playbook written for that cause of action in that court.

`CLAUDE.md` holds the invariants. `docs/` holds the plan. Read the relevant
section before starting, not all three at once.

> The product is **Nomostra**. The repository, npm packages, Python package and
> Render services are still named `under-construction` / `uc-*` from the
> working name. Nothing user-facing reads those, so they were left alone.

## Live

| | |
|---|---|
| Site | https://nomostra.com (301s to `www.nomostra.com`, which Render treats as primary) |
| Web service | `uc-web` on Render, free instance, spins down when idle |
| Worker | `uc-agent` on Render, starter instance |
| Database | Neon Postgres, `production` and `dev` branches, us-east-2 |

Local development uses the Neon **dev** branch; Render uses **production**.
Keeping them separate is what stops a local worker racing the deployed one for
the same queued job.

## Layout

```
apps/web/          Next.js + TypeScript      -> Render web service
services/agent/    Python agent worker       -> Render worker service
packages/db/       Drizzle schema (owns DDL)
playbooks/         Markdown + registry.yaml
evals/             Python fixtures; does not deploy
docs/              The plan
design_handoff_under_construction/   Design reference, not shipped
```

## Local setup

Node 20+ (images build on Node 24) and Python 3.12.

```bash
npm install
cp .env.example .env.local          # fill in DATABASE_URL (Neon dev branch)
npm run db:generate && npm run db:migrate
npm run dev
```

The worker, separately:

```bash
cd services/agent
python3.12 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
DATABASE_URL=... python -m agent.loop
```

Docker locally is colima, not Docker Desktop:

```bash
colima start          # colima stop when finished, it holds ~4GB
```

## Checks

```bash
npm run typecheck
npm test                                  # 24 vitest tests, apps/web
npm run build
cd services/agent && .venv/bin/python -m pytest tests -q   # 7 tests
```

Both suites run in CI on push, path-filtered so a playbook edit rebuilds only
the worker.

### Before deploying

Build from a **clean clone**, not the working tree. Git does not track empty
directories, and a local build will happily copy files Render never receives.
This exact mistake broke a deploy:

```bash
git clone . /tmp/clone-test && cd /tmp/clone-test
docker build --no-cache -f apps/web/Dockerfile -t uc-web:test .
```

## Where we are

**Phases 0, 1 and 2 are complete and deployed.**

- Both services run on Render and pass messages through Neon, with the
  database as the only interface between them
- Request access, admin approve/deny, set-password link, login, middleware
  gating on `/drafts/*` and `/admin/*`
- Playbook resolver, preview CLI, registry-driven picker
- The design handoff is implemented across all six screens that exist

Email is deliberately deferred: approving shows the set-password link for a
human to send. Same security properties as long as it goes to the address on
the request, and no Resend account or DNS work. It becomes load-bearing at the
pilot, when recipients are strangers.

**Next: Phase 3, the agent worker.** In order:

1. **3.0 spend controls, before the first API call.** A budget alert in the
   Anthropic console *and* an app-side cap computed from `generations` that
   refuses new jobs past a threshold. The console only alerts; the refusal has
   to live in code. `ANTHROPIC_API_KEY` is deliberately unset on `uc-agent`
   until this exists.
2. `matters` and `generations` tables
3. Case-facts form and `POST /api/generations`
4. The worker's real job loop, per-job working directory, the Agent SDK call
5. Draft viewer with the non-dismissible unverified-citations banner

The design handoff specs the four screens that do not exist yet (case facts,
generating, draft viewer, failed), so they should go quickly.

## Open items

- **The playbooks are placeholders.** `playbooks/causes-of-action/*.md`,
  `procedural/*.md` and `jurisdictions/sdny.md` are `TODO (Ben)` skeletons.
  The machinery works; there is no legal content in it yet. This is the
  critical path, not the code.
- **Rotate the Neon `neondb_owner` password.** It passed through a chat
  transcript, and there is real user data behind it now.
- **The marketing page claims citation checking, proofreading and local-rules
  compliance that do not exist yet.** Deliberate, on the understanding that
  production will have them. It contradicts the invariant that V0 output has
  unverified citations, and the draft viewer's non-dismissible banner will say
  so to anyone who buys on that promise.
- **Render treats `www` as primary**, so the bare domain redirects. Cosmetic;
  flip it in Render's Custom Domains if the apex should be what people see.
- `/api/admin/*` is not covered by the middleware matcher and checks
  admin-ness itself. Two places that must agree. Fold it in when Phase 3 adds
  `/api/generations/*`.
- **The worker moves to 1 CPU / 2 GB at Phase 3.** Anthropic's floor is ~1 GiB
  RAM per concurrent agent, above the starter instance. Roughly $25/month
  instead of $7.

## Checking a playbook

The resolver composes shared guardrails, the procedural standard, the cause of
action, then the jurisdictional gloss last so local practice overrides. To see
exactly what the worker would use, without calling the model:

```bash
cd services/agent
.venv/bin/python -m agent.preview --list
.venv/bin/python -m agent.preview employment-discrimination sdny
```

## Design

`design_handoff_under_construction/` is the design reference: a high-fidelity
HTML prototype of all ten screens plus a README with the tokens. It is a
reference, not code to copy. `support.js` is a prototype runtime and the bottom
"Screens" index bar is a prototype affordance; neither ships, and the directory
is excluded from both images.

Two rules from the handoff hold everywhere: **no border radius**, and **offset
hard shadows** rather than blurred ones.

Palette: plum `#8E4B57` primary, chocolate `#3C2A22` ink, apricot `#EFC3AC`
fills, dress blue `#2F3A4F` secondary, paper `#FCFBFA`. Instrument Serif for
display, IBM Plex Sans for interface, IBM Plex Mono for labels.

## Conventions picked up along the way

- **No em dashes** in user-facing copy. American spelling.
- Plain sentences over balanced clauses. If a line sounds like a line rather
  than a sentence, rewrite it.
- Say "pushed", not "deployed", until a live check confirms it.
