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

Phase 1 in progress. Done: the public marketing page and the request-access
flow (1.1, 1.5), with `users` and `access_requests` tables.

Next: login and session cookie (1.3), middleware gating `/drafts/*`,
`/admin/*` and `/api/generations/*` (1.4), and the admin approve/deny page
(1.6, 1.7).

Open question for 1.4: the middleware in implementation guide §2 does a
database lookup, but Next middleware runs on the Edge runtime by default,
where `postgres.js` cannot run. Resolve before building the gate.

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
