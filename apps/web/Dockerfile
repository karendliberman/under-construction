# Under Construction — web service.
#
# Builds from the REPO ROOT, not from apps/web:
#   docker build -f apps/web/Dockerfile .
#
# This file is authoritative. Build logic lives here and configuration lives in
# environment variables — never in Render's dashboard. That is what makes
# leaving Render cheap.

# ---- deps ----------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN npm ci

# ---- build ---------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY packages/db ./packages/db
COPY apps/web ./apps/web

# INVARIANT 2: the web image gets registry.yaml and NOTHING ELSE from
# playbooks/. Playbook prose must never reach the browser, an API response or
# the database — so it must not be in this image in the first place.
COPY playbooks/registry.yaml ./playbooks/registry.yaml

# Baked in so generations.playbook_version is stable inside the image even if
# the deploy's env changes underneath it.
ARG GIT_SHA=unknown
ENV NEXT_PUBLIC_GIT_SHA=$GIT_SHA

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@uc/web

# ---- runtime -------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Next's standalone output carries its own minimal node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/playbooks/registry.yaml ./playbooks/registry.yaml

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
