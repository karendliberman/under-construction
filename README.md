# Under Construction

An AI drafting tool for litigators. See `CLAUDE.md` for the invariants and
`docs/` for the plan.

## Layout

```
apps/web/          Next.js + TypeScript      -> Render web service
services/agent/    Python agent worker       -> Render worker service
packages/db/       Drizzle schema (owns DDL)
playbooks/         Markdown + registry.yaml
evals/             Python fixtures; does not deploy
docs/              The plan
```

## Local setup

Requires Node 20+ (the images build on Node 24 LTS) and Python 3.12.

```bash
npm install
cp .env.example .env.local          # fill in DATABASE_URL
npm run db:generate && npm run db:migrate
npm run dev
```

The worker, separately:

```bash
cd services/agent
python3.12 -m venv .venv && . .venv/bin/activate
pip install -e .
DATABASE_URL=... python -m agent.loop
```

## Building the images

Both build from the repo root — the contexts differ only in how much of
`playbooks/` they copy.

```bash
docker build -f apps/web/Dockerfile -t uc-web .
docker build -f services/agent/Dockerfile -t uc-agent .
```

## Where we are

**Phase 0 complete.** Both services are deployed on Render and pass messages
through Neon Postgres, with the database as the only interface between them.

- https://uc-web.onrender.com  (web, free tier — spins down when idle)
- uc-agent (background worker, starter)

Verified in production: a row posted to the web service is claimed by the
worker with `FOR UPDATE SKIP LOCKED` and completed in ~3 seconds.

**Phases 0, 1 and 2 complete.**

- Both services deployed, passing messages through Neon
- Request access, admin approve/deny, set-password link, login, middleware
  gating. Email is deliberately deferred: approval shows the link for you to
  send by hand, which has the same security properties as long as it goes to
  the address on the request.
- Playbook resolver, preview CLI, and the registry-driven picker

Next: **Phase 3**, the agent worker — spend controls first (3.0, before the
first API call), then `matters`/`generations`, the case-facts form, and the
Agent SDK call.

### Checking a playbook

The resolver composes shared guardrails, the procedural standard, the cause of
action, then the jurisdictional gloss last so local practice overrides. To see
exactly what the worker would use, without calling the model:

```bash
cd services/agent
.venv/bin/python -m agent.preview --list
.venv/bin/python -m agent.preview breach-of-contract sdny
```

The doctrinal layers in `playbooks/` are **placeholders**. They are Ben's to
write (backlog 2.3), and until he does, the composed document has structure but
no legal content.

### Cost note

Phases 1 and 2 do not touch the worker. Suspend `uc-agent` in Render while
working on them and resume when needed. The worker moves to a 1 CPU / 2 GB
instance at Phase 3, when the Agent SDK actually runs — Anthropic's floor is
~1 GiB per concurrent agent, above what the starter instance provides.

### Before deploying

Build from a clean clone, not the working tree — git does not track empty
directories, and a local build will happily copy files Render never receives:

```bash
git clone . /tmp/clone-test && cd /tmp/clone-test
docker build --no-cache -f apps/web/Dockerfile -t uc-web:test .
```
