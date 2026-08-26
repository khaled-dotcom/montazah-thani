# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# حي المنتزه الثانية — production image
#
# The app keeps nothing on disk. Bookings, contact messages and everything the
# dashboard publishes live in Postgres, so this container is disposable: rebuild
# it, replace it, run three of them behind nginx. What must survive is the
# database volume, not this image.
#
#   docker build -t montazah-thani .
#   docker run -p 3000:3000 \
#     -e DATABASE_URL=postgres://user:pass@host:5432/montazah_site \
#     -e NEXT_PUBLIC_SITE_URL=https://montazah2.alexandria.gov.eg \
#     -e ADMIN_USER=... -e ADMIN_PASSWORD=... \
#     montazah-thani
#
# In practice use docker-compose.yml, which wires this to the database, the
# assistant and nginx together.
# ---------------------------------------------------------------------------

# 22 is the current LTS line; package.json requires >=22.6.
ARG NODE_VERSION=22-alpine

# --- dependencies ----------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` needs the dev dependencies: the build runs TypeScript and Tailwind.
RUN npm ci

# --- build -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined at build time, so the real domain has to be
# present here rather than only at runtime.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# The preflight refuses to build while development placeholders remain. To build
# a staging image deliberately, pass --build-arg PREFLIGHT_ALLOW_PLACEHOLDERS=1.
#
# Only the *build* scope runs here — the content and the artefact. The runtime
# scope (credentials, database, API keys, CORS, cookies) is checked when the
# container starts, because satisfying it at build time would mean baking a
# password into an image layer.
ARG PREFLIGHT_ALLOW_PLACEHOLDERS
ENV PREFLIGHT_ALLOW_PLACEHOLDERS=${PREFLIGHT_ALLOW_PLACEHOLDERS}

# No DATABASE_URL is passed here on purpose. Prerendering reads published news
# and landmarks, and lib/cms.ts falls back to the curated content in content/*
# when there is no database to ask — so the image builds without one, and the
# published items appear on the first revalidation after it starts.
RUN npm run build:prod

# --- runtime ---------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user. There is no writable volume to own any more.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `standalone` emits a minimal server plus only the node_modules it traced;
# static assets and public/ are not included and must be copied alongside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The runtime half of the preflight, run before the server accepts a request.
# The content files it reads for the build scope are not here, which is why the
# scope matters: --scope=runtime touches only the environment.
COPY --from=builder --chown=nextjs:nodejs /app/scripts/preflight.mjs ./scripts/preflight.mjs

USER nextjs
EXPOSE 3000

# The health route writes to the database, so a server that cannot reach it —
# or reaches a replica that has gone read-only — shows up here rather than as a
# resident's lost booking.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Refuse to serve rather than come up half-configured. A dashboard with no
# password, or a site with no database behind its booking form, is the kind of
# fault that is invisible until a resident hits it — so it stops the container
# instead. PREFLIGHT_ALLOW_PLACEHOLDERS=1 downgrades it for a staging run.
CMD ["sh", "-c", "node scripts/preflight.mjs --scope=runtime && exec node server.js"]
