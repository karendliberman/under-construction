# Under Construction — Implementation Guide

**Date:** August 2026 · **Revision 2** — rewritten for the agentic worker and the two-service architecture
**Companion docs:** `under-construction-v0-scope-and-backlog.md`, `under-construction-architecture.md`

Feature by feature: what it needs, how to build it, and how you know it works. Each section is roughly one Claude Code session. Code is illustrative rather than final — treat the shapes and the reasoning as the spec, not the syntax.

---

## 0. Project setup

**Web service:** Next.js (App Router) + TypeScript · Drizzle · Tailwind + shadcn/ui · Zod
**Worker service:** Python 3.12 · `claude-agent-sdk` · `psycopg` · plain SQL
**Shared:** Neon Postgres · both services deployed as containers on Render

Drizzle over Prisma because the migrations are readable SQL and the Python side has to live alongside the same schema — a schema you can read as SQL is easier to mirror than one expressed in a proprietary DSL.

```
under-construction/
  apps/web/                      # Next.js + TypeScript
    app/
      (public)/                  # marketing, request access
      (app)/drafts/new/ , drafts/[id]/
      (admin)/requests/
      api/access-requests/route.ts
      api/generations/route.ts
      api/generations/[id]/route.ts
      api/admin/requests/[id]/route.ts
    lib/auth.ts
    middleware.ts
    Dockerfile
  services/agent/                # Python worker
    agent/
      loop.py                    # claim a job, run it, write back
      playbooks.py               # THE resolver — see §3
      run.py                     # the Agent SDK call
      preview.py                 # CLI: print a composed playbook
    Dockerfile
  packages/db/
    schema.ts                    # Drizzle — the single owner of DDL
    migrations/
  playbooks/                     # markdown + registry.yaml
  evals/                         # Python fixtures and scripts; does not deploy
  CLAUDE.md
```

**Do first, in order:** repo and layout → a working Dockerfile for each service → Neon provisioned (dev and prod) → both services deploying on Render from this one repo → env vars set in local, preview and production → **prove the pipe**: the web app writes a row, the worker picks it up and writes back, in production.

That last step feels like a wasted session and isn't. It exercises both Dockerfiles, both deploys, the database connection from two directions, and the job-claiming query — before any feature depends on any of it.

**The two Dockerfiles are the migration insurance.** Everything in the architecture doc about being able to leave Render without a rewrite rests on them being real and authoritative. Keep build logic in the Dockerfile, not in Render's dashboard, and keep all configuration in environment variables.

One detail that matters: **the worker's image must include all of `playbooks/`**, since it is the only thing that composes them. The web image needs **`playbooks/registry.yaml` only** — enough to render the picker and validate a submitted combination, and no playbook prose. Both Dockerfiles build from the repo root; they just copy different amounts of that directory.

**Env vars:** `DATABASE_URL` (both services), `ANTHROPIC_API_KEY` (worker only — the web service never needs it), `SESSION_SECRET`, `RESEND_API_KEY`, and the git SHA for `playbook_version` (Render exposes the deploy's commit; bake it in as a build arg if you want it stable inside the image).

**CI needs path filters** so a playbook edit rebuilds only the worker, and a CSS change rebuilds only the web app.

### Phase 0, as built (August 2026)

Three things this section did not anticipate, recorded so the next person does
not rediscover them.

**Verify deploys by building from a clean clone, not the working tree.** Git
does not track empty directories. `apps/web/public/` existed locally, so the
local `docker build` copied it and passed; Render clones from git, received no
such directory, and the `COPY` failed. Every empty directory now holds a
`.gitkeep`. Before a deploy:

```bash
git clone . /tmp/clone-test && cd /tmp/clone-test
docker build --no-cache -f apps/web/Dockerfile -t uc-web:test .
```

**The worker image needs no Node and no separate CLI install.** An earlier
revision of this section claimed the opposite; it was wrong, and the Dockerfile
carried ~300MB of `nodejs`/`npm` because of it.

`claude-agent-sdk` ships the Claude Code CLI as a **bundled native
executable** at `claude_agent_sdk/_bundled/claude`, and the wheel is
platform-specific, so pip installs the Linux build inside the image.
`SubprocessCLITransport._find_cli()` checks that bundled path before falling
back to `shutil.which("claude")`, so nothing needs to be on `PATH`.

Verified inside the built image: the binary is ELF, ~214MB, reports
`2.1.251 (Claude Code)`, and the SDK's own resolver returns its path. Removing
Node took the worker image from 1.02GB to 609MB.

**Actual versions**, since this section names no numbers and the ecosystem
moved: Next 16, React 19, Tailwind 4 (CSS-first — there is no
`tailwind.config.ts`), Zod 4, drizzle-orm 0.45, TypeScript 5.9 (not 7.0, whose
Next type-plugin support is unproven), Node 24 in the image, Python 3.12.

**Sequencing note:** build-order step 1 ("Monorepo layout, both Dockerfiles,
Neon, Render, env vars") and step 2 ("prove the pipe") were one long session,
not two. Most of the time went to environment setup and two Dockerfile bugs,
not to the code.

---

## 1. Database schema

The whole V0 schema. Drizzle owns it; the Python worker reads and writes but never issues DDL.

```sql
create table access_requests (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  full_name     text not null,
  firm          text,
  bar_number    text,
  jurisdiction  text,
  use_case      text,
  status        text not null default 'pending',   -- pending | approved | denied
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index on access_requests (status, created_at desc);

create table users (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  password_hash  text,                              -- null until they set one
  full_name      text not null,
  firm           text,
  role           text not null default 'member',    -- member | admin
  status         text not null default 'approved',  -- approved | suspended
  created_at     timestamptz not null default now()
);

create table matters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id),
  label       text not null,
  created_at  timestamptz not null default now()
);
create index on matters (user_id, created_at desc);

create table generations (
  id                 uuid primary key default gen_random_uuid(),
  matter_id          uuid references matters(id),
  user_id            uuid not null references users(id),

  cause_of_action    text not null,
  jurisdiction       text not null,
  input_facts        jsonb not null,

  playbook_version   text,          -- git SHA. NO prompt text, NO prompt hash.
  model              text,
  turns_used         integer,

  output_text        text,
  input_tokens       integer,
  output_tokens      integer,
  cost_usd           numeric(10,4),
  latency_ms         integer,

  status             text not null default 'queued',  -- queued|running|complete|failed
  claimed_at         timestamptz,                     -- for the stale-job sweeper
  error_message      text,
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),

  outcome            text,          -- granted|denied|granted_in_part|withdrawn|unknown
  outcome_notes      text,
  outcome_recorded_at timestamptz
);
create index on generations (user_id, created_at desc);
create index on generations (status, created_at) where status in ('queued','running');

create table audit_log (
  id          bigserial primary key,
  user_id     uuid references users(id),
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_log (created_at desc);
```

**Three notes.**

`playbook_version` is a git SHA and there is deliberately no prompt text or hash. Because the resolver is deterministic and history is never rewritten, checking out that commit and running the resolver reconstructs exactly what was used. Full traceability, no prompt material in the database.

`status` doubles as the queue. That partial index on `('queued','running')` is what keeps the claim query fast as the table grows.

`outcome` exists before anything writes to it. The first time Ben knows a motion was granted there has to be somewhere to put it, and adding the column later is easy while reconstructing the history is impossible.

---

## 2. Auth and the approval flow

**What it needs:** `bcrypt` (or `argon2`), a session library, an email sender (Resend), and the two tables.

**Request (public).** `POST /api/access-requests` — Zod-validate, rate-limit by IP, insert with `status = 'pending'`, email yourself. Return a neutral success message regardless of whether the email already exists; don't leak who has an account.

**Approve (admin).** A page listing pending requests with Approve and Deny. On approve, in one transaction: mark the request approved, insert a `users` row with `status = 'approved'` and a null `password_hash`, and generate a single-use, short-lived set-password token. Email the link.

**Set password.** They follow the link, choose a password, and you store only the hash:

```ts
const passwordHash = await bcrypt.hash(password, 12);
```

**Login.**

```ts
const ok = user.passwordHash && await bcrypt.compare(input, user.passwordHash);
```

That's the entirety of the hashing work. Everything expensive — self-serve reset, lockout, MFA — is deliberately absent in V0; a forgotten password is an email to Karen.

**Session cookie:** httpOnly, secure, sameSite lax, and a real expiry of a couple of weeks. Not forever — a stolen laptop shouldn't be permanent access.

**Gating.** One choke point:

```ts
// apps/web/middleware.ts
export async function middleware(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const user = await getUser(session.userId);
  if (!user || user.status !== 'approved') {
    return NextResponse.redirect(new URL('/pending', req.url));
  }
  if (req.nextUrl.pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/drafts', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/drafts/:path*', '/admin/:path*', '/api/generations/:path*'] };
```

Two checks, because they answer different questions: *is this session valid* and *is this person still allowed in*. Suspending someone should take effect on their next request even though their password still works.

**How you know it works:** request an account in an incognito window, approve it, follow the email, set a password, log in. Then set your own status to `suspended` in the database and confirm you're bounced immediately.

---

## 3. The playbook layer — and a useful split

```yaml
# playbooks/registry.yaml
shared:
  - _shared/guardrails.md
  - _shared/house-style.md

causes_of_action:
  breach-of-contract:
    label: "Breach of Contract"
    procedural: procedural/rule-12b6-federal.md
    substantive: causes-of-action/breach-of-contract.md
    jurisdictions: [sdny, nd-cal]
  fraud:
    label: "Fraud"
    procedural: procedural/rule-12b6-federal.md
    substantive: causes-of-action/fraud.md
    jurisdictions: [sdny]

jurisdictions:
  sdny:   { label: "S.D.N.Y.",  file: jurisdictions/sdny.md }
  nd-cal: { label: "N.D. Cal.", file: jurisdictions/nd-cal.md }
```

**The split worth being deliberate about:** two services could both need playbook logic, and duplicating a resolver in two languages is a drift risk waiting to happen. So they get different jobs:

- **The web app reads `registry.yaml` only** — for the dropdown options and to validate that a submitted combination exists. `registry.yaml` contains labels and filenames, no playbook prose.
- **The worker owns composition.** `services/agent/playbooks.py` is the only code that opens a playbook markdown file.

The nice consequence: **playbook text never enters the web service at all.** It isn't in the browser, isn't in an API response, isn't in the database, and isn't in the web container's image. It exists in git and in the worker's image. That's the smallest surface this can have while remaining files.

```python
# services/agent/playbooks.py — the only code that reads playbook prose
LAYER_ORDER = ("shared", "procedural", "substantive", "jurisdiction")

def resolve_playbook(cause_of_action: str, jurisdiction: str) -> str:
    """Compose the layers into one document. Deterministic: same inputs,
    same bytes, forever. No timestamps, no randomness, fixed ordering —
    this is what makes the git SHA sufficient as a version record."""
```

Order is deliberate: shared guardrails first so they frame everything, then the general procedural standard, then the specific cause of action, then the jurisdictional gloss last so local rules override general guidance.

**The preview tool is a CLI, not a web page:**

```
python -m agent.preview breach-of-contract sdny
```

Prints the composed document. This is how Ben checks his own work and how you debug bad output — nine times in ten the answer is visible in the composed text. Keeping it a script rather than an admin page is both simpler and consistent with keeping prompt text out of the web tier.

**What goes in `_shared/guardrails.md`** — the cheapest quality lever you have: never invent a citation; if unsure whether a case supports a proposition, say so rather than asserting it; flag where a fact needed for an element seems to be missing from what was provided; don't overstate an argument's strength. The strategy memo notes that a meaningful share of top legal tools' benchmark accuracy comes from *abstention* — a model permitted to say "I'm not sure" outperforms one that always answers. Write that permission in explicitly.

---

## 4. The worker

The heart of V0. A single always-on Python process.

### The job loop

```python
# services/agent/loop.py
CLAIM = """
  update generations
     set status = 'running', claimed_at = now(), started_at = now()
   where id = (
     select id from generations
      where status = 'queued'
      order by created_at
      for update skip locked
      limit 1
   )
  returning *;
"""

async def main():
    while True:
        job = await claim_one()          # runs CLAIM in a transaction
        if job is None:
            await sweep_stale_jobs()     # running + claimed_at older than the limit -> failed
            await asyncio.sleep(3)
            continue
        await run_job(job)
```

`FOR UPDATE SKIP LOCKED` is the standard Postgres job-queue idiom: two workers running this concurrently never claim the same row, so adding a second worker later is a scaling change, not a redesign. No Redis, no broker — Postgres is the queue.

Polling rather than `LISTEN`/`NOTIFY` because polling has no interaction with connection pooling and no caveats. For a job that takes minutes, three seconds of latency is invisible.

### Running one job

```python
# services/agent/run.py
async def run_job(job):
    started = time.monotonic()
    workdir = Path(tempfile.mkdtemp(prefix=f"gen-{job['id']}-"))
    try:
        # 1. Materialise the inputs as files the agent can read.
        (workdir / "playbook.md").write_text(
            resolve_playbook(job["cause_of_action"], job["jurisdiction"])
        )
        (workdir / "facts.md").write_text(render_facts(job["input_facts"]))

        # 2. Run the agent.
        options = ClaudeAgentOptions(
            cwd=str(workdir),
            system_prompt=TASK_INSTRUCTIONS,      # how to work; NOT the facts
            allowed_tools=["Read", "Write", "Grep", "Glob"],   # no Bash, no web
            permission_mode="acceptEdits",
            max_turns=MAX_TURNS,
            setting_sources=[],                   # ignore user/project settings
            env={
                "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1",
                "CLAUDE_CONFIG_DIR": str(workdir / ".claude"),
            },
        )

        turns, usage = 0, None
        async for message in query(prompt=KICKOFF, options=options):
            turns += 1
            log_message(job["id"], message)
            usage = capture_usage(message) or usage

        # 3. Collect the output the agent wrote.
        motion = workdir / "motion.md"
        if not motion.exists():
            raise AgentProducedNothing("agent finished without writing motion.md")

        await complete(job, motion.read_text(), turns, usage,
                       latency_ms=int((time.monotonic() - started) * 1000))

    except Exception as err:
        await fail(job, to_user_message(err))
        log_error(err, generation_id=job["id"])
    finally:
        shutil.rmtree(workdir, ignore_errors=True)   # ALWAYS — see below
```

**Five things in there that are load-bearing:**

**The working directory is created per job and destroyed in `finally`.** Success or failure, it goes. Client facts must not accumulate on a container's disk. This is a security control, not housekeeping — it is the single most important line in the file.

**`allowed_tools` is a deny-by-default allowlist.** The agent needs to read its inputs and write a document. It does not need `Bash`, `WebSearch`, `WebFetch`, or any MCP server. Case facts are untrusted input — potentially drafted by opposing counsel — and an agent takes *actions* based on what it reads. When case-law retrieval arrives in V1, that is a deliberate decision to add one tool with a known scope, not a general loosening. Write that reasoning as a comment above the list.

**`cwd` is the job's own directory**, so the agent's entire filesystem view is one matter's scratch space. It cannot see another job, or the source code.

**`setting_sources=[]`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` and a per-job `CLAUDE_CONFIG_DIR`** are Anthropic's documented multi-tenant isolation settings. They stop one job's context leaking into another's. Configuration, not code — set them now, even with two users.

**`max_turns` is not optional.** The SDK has no built-in session timeout, so this is what bounds both a stuck loop and the cost of one. Start conservative and raise it when a real draft legitimately needs more.

**`render_facts` should be dumb** — label the fields and lay them out. No instructions in it. Instructions belong in the playbook or in `TASK_INSTRUCTIONS`, where they're versioned and reviewable.

### Sizing and concurrency

Anthropic's stated floor is roughly 1 GiB RAM, 1 CPU and 5 GiB disk per concurrent agent, and they're explicit that it's a floor. One job at a time is the right V0 setting. Set an explicit concurrency limit in the loop rather than letting it be implicit, so that raising it is a decision rather than an accident.

**How you know it works:** submit a generation, close the browser, reopen a few minutes later, find a finished draft. Then check the container's disk and confirm no `gen-*` directories are left behind.

---

## 5. The web endpoints and the draft viewer

```ts
// POST /api/generations
const user = await requireUser(req);
const input = GenerationInput.parse(await req.json());
assertCombinationExists(input.causeOfAction, input.jurisdiction);  // registry.yaml
await checkRateLimit(user.id);

const [gen] = await db.insert(generations).values({
  userId: user.id,
  matterId: input.matterId,
  causeOfAction: input.causeOfAction,
  jurisdiction: input.jurisdiction,
  inputFacts: input.facts,
  status: 'queued',
}).returning();

return Response.json({ id: gen.id, status: 'queued' });
```

That's the whole handoff. The web service never calls the worker, never holds an Anthropic key, and never sees playbook text.

```ts
// GET /api/generations/[id]  ->  { status, output?, error?, elapsedMs }
```

Return `output` only when `status === 'complete'`, and check ownership on every read — nobody should fetch a generation by guessing an id.

**Client:** poll every 3 seconds while `queued` or `running`, showing elapsed time — a silent multi-minute wait feels broken. Stop after a sane limit and offer retry.

**Cheap and worth doing now:** set the tab title to `⏳ Drafting…` while running and back on completion. Twenty lines, and it's what people actually notice once they've switched tabs.

**The draft viewer:**

- Render the output as formatted text — the agent will write structured markdown; render it rather than dumping a `<pre>`. What they copy has to paste into Word looking like a document.
- **Copy button** — `navigator.clipboard.writeText()`, with visible confirmation. This is the deliverable.
- **The unverified-citations banner**, above the draft, not dismissible:

  > **Citations in this draft have not been verified.** This model may cite cases that do not exist or that do not stand for the stated proposition. Every citation must be independently checked before this is filed. You are the filing attorney.

  Not decoration. Damien Charlotin's AI Hallucination Cases database listed 1,922 cases as of 16 August 2026, growing at roughly five a day and now including filings produced with commercial legal tools rather than just chatbots. The strategy memo also notes that sanctions tend to fall not on the error itself but on lawyers who didn't own it. Design for graceful failure and easy verification rather than the illusion of perfection.
- **Metadata line:** playbook version, model, turns used, elapsed time. Useful to you, and it builds the habit of treating a draft as an artifact with provenance.
- **Outcome capture:** a small "How did this motion turn out?" control writing to `generations.outcome`. Nobody will use it in V0. Put it there anyway so the field is exercised and the habit starts.

---

## 6. Guardrails before anyone else sees it

**Spend controls, first.** Two distinct things, and it matters which is which: the Anthropic console gives you a **budget alert**, which tells you after the fact; the **hard cap** has to live in your code, computing running cost from the `generations` table and refusing new jobs above a threshold. Set both *before the first API call*. This matters more with an agent than it did with a single call: an agent that decides to re-read the facts four times costs several times as much, and the variance is the point of using one. A retry loop overnight is a genuinely expensive and entirely avoidable mistake.

**Rate limiting.** Per-user cap on generations (start around 20/day) and IP-based limiting on the public request-access endpoint. Postgres counting is fine at this scale.

**Logging.** Per run: turns used, which tools were called, tokens, cost, latency. Errors to Sentry with an alert that reaches your phone — you will not be watching a dashboard when the first failure happens. Logging the tool sequence is also how you'd notice an agent behaving strangely on a particular input, which is the practical early-warning signal for prompt injection.

**The eval script** (`evals/`, Python, doesn't deploy):

```
evals/
  fixtures/breach-of-contract/{case-01.json, ...}
  run.py        # resolve playbook -> run the agent -> save output to a timestamped dir
  compare.py    # diff the last two runs
```

Deliberately not a framework. Save realistic fact patterns, run them after a playbook edit, read the diff. **Expect run-to-run variance** — the agent is non-deterministic by design, so two runs on identical input will differ, and the eval is looking for a change in *quality*, not in bytes. Ben's judgment is the scoring function in V0; there's nothing to automate yet. Formalise into a scored harness in V1, when reading every diff stops being practical.

---

## 7. Build order

Each line is roughly a session.

1. Monorepo layout, both Dockerfiles, Neon, Render, env vars
2. Prove the pipe — web writes a row, worker reads it and writes back, in production
3. Schema and migrations (Drizzle owns DDL)
4. Password auth, sessions, `users.status`, middleware gating
5. Marketing page and request-access form
6. Admin approvals and the set-password email
7. `registry.yaml`, the Python resolver, the preview CLI
8. **Ben writes two playbooks end to end** — parallel from week one, not blocked on any of the above
9. Case-facts form and the picker driven by the registry
10. `POST /api/generations` and the status endpoint
11. **Spend controls — before the first API call.** Budget alert in the Anthropic console, plus the app-side cap
12. The worker: job loop, working directory, Agent SDK call, output collection, cleanup, stale-job sweeper
13. Draft viewer, copy button, banner
14. Rate limits, structured logging, error alerting
15. Generation history
16. Eval fixtures and scripts

**Steps 1–7 and 9–16 are the software. Step 8 is the product.** If they compete for time, step 8 wins. A perfect application around a mediocre playbook is worth nothing; a rough application around a great playbook is a business.

---

## 8. Notes for building this with Claude Code

**Write `CLAUDE.md` before the first real feature.** What the product is, the two-service layout, the invariants below, and the directory conventions. It's read at the start of every session and it's the cheapest way to stop drift.

**The invariants worth stating explicitly**, because these are what a well-meaning refactor breaks:

1. **The database is the only interface between the two services.** No internal HTTP API, no shared types, no direct calls. The web app writes a queued row; the worker claims it.
2. **Only the worker reads playbook prose.** The web app reads `registry.yaml` and nothing else from `playbooks/`.
3. **The agent's tool allowlist is deny-by-default.** Adding a tool is a deliberate decision with a stated reason, never a convenience.
4. **The per-job working directory is deleted in `finally`.** Success or failure, always.
5. **No prompt text and no prompt hash in the database.** `playbook_version` is the git SHA and that is sufficient.
6. **`resolve_playbook` is deterministic** — fixed ordering, no timestamps, no randomness. Invariant 5 depends on it.
7. **`generations` rows are immutable once `complete`**, except the `outcome` fields. A re-run is a new row.
8. **Drizzle owns DDL.** Python never issues schema changes.

**Work in vertical slices, not layers.** "Request-access form, endpoint, table and admin approval, working end to end" is a better session than "all the database tables." Slices deploy, get tested, and surface design mistakes early.

**Be explicit about which service you're in.** With two languages in one repo, tell Claude Code at the start of a session whether you're working in `apps/web` or `services/agent`. Cross-cutting changes — a new column both sides use — are worth calling out as such.

**Deploy every session.** A preview URL you can send Sam and Ben is worth more than a longer local branch, and it keeps both deploy paths from rotting.
