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

Requires Node 20+ and Python 3.12.

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

Phase 0 of the backlog. Layout, both Dockerfiles and the "prove the pipe"
path are in; Neon, Render and the first deploy are not.
