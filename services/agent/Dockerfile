# Under Construction — agent worker service.
#
# Builds from the REPO ROOT, not from services/agent:
#   docker build -f services/agent/Dockerfile .
#
# No port, no HTTP server. This is a long-running process that talks to exactly
# two things: Postgres and the Anthropic API.

FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# The Claude Agent SDK drives the Claude Code CLI, which is a Node program.
RUN apt-get update \
 && apt-get install -y --no-install-recommends nodejs npm \
 && rm -rf /var/lib/apt/lists/*

# The source has to be present before pip install, because installing this
# project means building a wheel for the `agent` package itself. Ordering
# pyproject.toml first would cache the dependency layer, but only if we
# installed dependencies WITHOUT the project — not worth a second source of
# truth for pinned versions. Cost: editing a .py file reinstalls dependencies.
COPY services/agent/pyproject.toml ./
COPY services/agent/agent ./agent
RUN pip install --no-cache-dir .

# INVARIANT 2, the other half: the worker is the ONLY thing that composes
# playbooks, so it gets all of them. Compare the web Dockerfile, which copies
# registry.yaml alone.
COPY playbooks ./playbooks

ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

# Not root. The agent writes to a per-job temp directory and nothing else.
RUN useradd --create-home --uid 1001 worker && chown -R worker:worker /app
USER worker

CMD ["python", "-m", "agent.loop"]
