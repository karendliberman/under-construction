# Nomostra

An AI drafting tool for litigators, sold to in-house legal teams. Paste in the
complaint filed against your client, add a short client-facts form, and get
back a motion to dismiss plus a report on every citation in it.

`CLAUDE.md` holds the invariants. `docs/` holds the plan in four files. Read
the relevant one before starting, not all of them at once. `docs/pipeline.md`
is the newest and supersedes the drafting design in the other three.

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
npm test                                  # 33 vitest tests, apps/web
npm run build
cd services/agent && .venv/bin/python -m pytest tests -q   # 28 tests
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

**Migrations are not applied automatically.** Nothing in `render.yaml` or
either Dockerfile runs `drizzle-kit migrate`, so a deploy ships code against
whatever schema production already has. When a change adds a table or a
column, run the migration against the Neon **production** branch *before*
pushing, or the new code queries a table that is not there yet.

```bash
DATABASE_URL='<neon production branch>' npm run db:migrate
```

The failure is quiet rather than loud: the worker's outer handler catches the
error, logs it and sleeps, so it looks alive while claiming nothing.
Automating this with a Render pre-deploy command is worth doing and has not
been done.

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

**Phase 3.0, spend controls, is done.** Three layers, because each one catches
something the others cannot:

| Layer | Where | What it bounds |
|---|---|---|
| `MAX_TURNS` per node | `services/agent/agent/budget.py` | One agent that will not stop |
| `SPEND_CAP_PER_GENERATION_USD` (default 50) | worker, between nodes | One motion that loops |
| `SPEND_CAP_WINDOW_USD` (default 300 / 30 days) | worker before claiming, web before queueing | Everything else |

The ledger is `generation_nodes.cost_usd`, not the rollup on `generations`,
because the rollup is only written when a run finishes and an in-flight
runaway is exactly the case the cap exists for. Both services read the same
environment variables and a test fails if their defaults drift.

The defaults are estimates from roughly 40 runs at $5/$25 per million tokens,
not measurements. **Recalibrate them against the first ten real runs.**

**Still to do before `ANTHROPIC_API_KEY` goes on `uc-agent`:**

- **Set the spend limit in the Anthropic console**, at Settings > Billing >
  Spend limits. This is a manual step nobody can do from the repo.

  Correcting the plan here: the console limit is a **hard stop**, not just an
  alert. Requests past it return HTTP 400 `invalid_request_error`, and each
  usage tier also carries an automatic monthly cap (Start $500, Build $1,000)
  that returns 429 with `enforced_spend_limit_reached`. `docs/implementation.md`
  and `docs/scope-and-backlog.md` both said the console only alerts. It does
  not, and both are corrected.

  That does not make the app-side cap redundant. Set the console limit *above*
  our window cap, so ours trips first and refuses a job cleanly at submit,
  while the console remains the backstop for the case where our code is the
  thing that broke. Hitting the console limit means jobs die mid-run with an
  API error and the work is lost.

**Then Phase 3 proper, in `docs/pipeline.md` §10 order.** It is depth-first on
one branch rather than layer by layer:

1. `fetch_case`, the domain allowlist, and the Research Gate. All three are
   model-free, so they are testable against CourtListener with no API key set.
2. The working-directory layout, and writing `generation_nodes` rows.
3. **One hardcoded vertical slice**: skip node 01, hand the pipeline one count
   topic and one issue, and get Researcher to Gate to Drafter producing a
   single paragraph with a real, verified citation. This is the gate on the
   whole project. If that paragraph is not clearly better than what Ben writes
   in twenty minutes, the shape of the rest does not matter.
4. Citation Verifier on that paragraph, closing the loop on one issue.
5. Onward per §10: Issue Spotter, Topic Identifier, fan-in, repair loop, UI.

The complaint-paste and client-facts form replaces the cause-of-action picker
at `/drafts/new`. That page still renders and posts nowhere, so it is not
broken, just superseded. Delete it when the new form lands.

## Open items

- **The playbooks are placeholders, and the pipeline needs more of them.**
  The existing `causes-of-action/*.md`, `procedural/*.md` and
  `jurisdictions/sdny.md` are `TODO (Ben)` skeletons. `docs/pipeline.md` §9
  adds a further set that does not exist at all yet: `analysis/read-complaint.md`,
  `analysis/threshold-defenses.md`, `defenses/<key>.md` per defense,
  `research/finding-authority.md` and `verification/cite-check.md`. The
  machinery works; there is no legal content in it. This is the critical path,
  not the code.
- **`playbooks/registry.yaml` is still the one-shot shape.** `docs/pipeline.md`
  §9 restructures it around nodes and defenses and drops the jurisdiction
  dimension. `apps/web/lib/registry.ts` and `agent/playbooks.py` both read the
  current shape, so changing it is a cross-cutting job rather than an edit.
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
- **The worker needs more RAM than previously budgeted.** `docs/pipeline.md` §8
  puts concurrency 3 to 4 at 4 GB or more, which is Render's $85 tier, not the
  $25 / 2 GB tier the one-shot design assumed. Anthropic's starting point is
  roughly 1 GiB RAM, 1 CPU and 5 GiB disk per concurrent agent, so check disk
  as well. `PIPELINE_CONCURRENCY` is an environment variable precisely so this
  can be tuned down instead of paying up. Re-verify Render's current tiers
  before buying one.
- **CourtListener's commercial position is unverified.** Its API membership
  terms read as personal, research and journalistic use rather than commercial
  products, and the MTD research memo advises contacting Free Law Project about
  a partnership first. Build step 1 leans on CourtListener, so a bad answer
  means rework there. Worth asking before that step, not after.
- **Ben still owes four answers**, all in `docs/pipeline.md` §11: whether the
  Rule 12 waiver rule is as described, which client-facts fields earn their
  place, the policy for a low-confidence precondition on a waivable defense,
  and whether weak issues get argued or only reported.

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
