# حي المنتزه الثانية — El Montazah II District

---

## 🚀 Deploy on a Linux server

Run these in order on the server. Nothing here contains a credential: every
secret is generated on the machine or pasted in by you, and `.env` is
git-ignored so it never travels with the repository.

### 1 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

### 2 — Clone

```bash
git clone https://github.com/khaled-dotcom/montazah-thani.git /opt/montazah-thani
cd /opt/montazah-thani
```

### 3 — Create the two env files

Both templates ship with the repository. They carry the variable names and the
notes explaining each one, and no values at all — copy them and fill in:

```bash
cp .env.example .env
cp agent/.env.example agent/.env
```

**Generate the secrets on the server** rather than reusing any you have seen
written down anywhere:

```bash
# Flask session signing key — the same value goes in BOTH files
SECRET=$(openssl rand -hex 32)
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=$SECRET|" .env agent/.env

# Postgres password — the same value in both
PGPW=$(openssl rand -base64 24 | tr -d '/+=')
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PGPW|" .env agent/.env

# Staff dashboard password — 16 characters minimum, no lockout protects it
sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')|" .env
```

Then open `.env` and set the rest by hand:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The public `https://` address. **Baked into the image at build time** — changing it later needs a rebuild, not a restart. |
| `GROQ_API_KEY` | From <https://console.groq.com/keys>. Goes in **both** `.env` and `agent/.env`. |
| `ORG_NAME` | The district's name as citizens should see it in the assistant's replies. |
| `ALLOWED_ORIGINS` | The site's own origin. Never leave `*` in production. |
| `NGINX_CONF` | `http-only.conf` before TLS is issued, `default.conf` after. |
| `TS_AUTHKEY` | Only if you publish through Tailscale — generate a fresh key per host. |

`agent/.env` additionally takes the SMTP account used to notify departments and
citizens. Use an app password, never the mailbox's own password.

> Every value above is a credential. Keep them out of the repository, out of
> chat messages and out of screenshots — and if one is ever pasted somewhere
> public, rotate it rather than deleting the message.

### 4 — Build and start

```bash
docker compose up -d --build
```

The first run takes roughly 20 minutes: it downloads a 2.2 GB embeddings
model. Watch it with `watch docker compose ps` until `agent` is `healthy`.

The containers refuse to start on a half-configured deployment — a missing
database URL, a dashboard password under 16 characters, a site URL still on
`localhost`. That is deliberate; fix what it names. For a throwaway staging
box only, `PREFLIGHT_ALLOW_PLACEHOLDERS=1` in `.env` downgrades the check.

### 5 — Load the district's data

Once `agent` is healthy:

```bash
# The 11 Alexandria districts, names only
docker compose exec agent flask seed-districts

# This district's services, descriptions and search vectors, from content/
docker compose exec agent flask import-site-knowledge

# One department per complaint category, so complaints route themselves
docker compose exec agent flask seed-departments
```

`import-site-knowledge` prints the district's row id. The site has to be told
which district it speaks for, or complaints are filed with no district and
reach no department:

```bash
DISTRICT_ID=$(docker compose exec -T agent python -c \
  "from app import app; from models.models import District; \
   app.app_context().push(); \
   print(District.query.filter(District.name.like('%المنتزه الثانية%')).first().id)")

sed -i "s|^AGENT_DISTRICT_ID=.*|AGENT_DISTRICT_ID=$DISTRICT_ID|" .env
docker compose up -d web
```

### 6 — Create the dashboard account

The assistant's own dashboard — complaints, conversations, services — has no
user until you make one. It prompts for the password, so it is never written
to a file or a shell history:

```bash
docker compose exec agent flask create-admin --username admin --district $DISTRICT_ID
```

### 7 — Check it

```bash
docker compose ps
curl -s http://localhost/api/health
```

Expected:

```json
{"status":"ok","database":{"ok":true,"writable":true},
 "assistant":{"configured":true,"reachable":true},"search":{"docs":58,"ok":true}}
```

Then ask the assistant something a resident would, and confirm it answers from
the district's own record instead of asking who you are:

```bash
curl -s -X POST http://localhost/api/chat -H 'Content-Type: application/json' \
  -d '{"sessionId":"checkcheckcheck1","locale":"ar",
       "messages":[{"role":"user","content":"عايز اطلع رخصة محل، محتاج ايه ورق؟"}]}'
```

### Where things are

| URL | What |
|---|---|
| `/` | The public site |
| `/admin` | Staff dashboard — bookings and messages |
| `/api/health` | Health check, including a database write probe |

### When something is wrong

```bash
docker compose logs agent  --tail=100 -f
docker compose logs web    --tail=100
docker compose logs nginx  --tail=50
```

---

The official bilingual (Arabic-first, RTL) portal of **حي المنتزه الثانية**, the
El Montazah II District of Alexandria Governorate, Egypt — the city's
north-eastern shore: the royal Montazah Gardens and palaces, the Maamoura
bathing shores, the fishing village of Abu Qir and its historic bay.

It puts the district's real work in front of its residents: services and permits
with their documents and steps, counter-appointment booking, landmarks and
heritage, sourced news and seasonal events, a business directory, maps and
transport — and a citizen-service assistant that answers strictly from what the
district publishes, files complaints to the right department, and books
appointments.

Two services live in this one repository:

| | |
|---|---|
| **the site** (repository root) | Next.js 16 (App Router) + React 19 + Tailwind CSS v4. Every page statically rendered except the API routes, the staff dashboard and the filtered listings. |
| **the assistant** (`agent/`) | Flask + LangGraph over PostgreSQL/pgvector. Complaints, appointments, tracking, and the knowledge base the chat answers from. Its own dashboard for staff. |

`docker compose up` runs both. The site reaches the assistant over an internal
network only — it is never exposed to a browser.

---

## Table of contents

1. [Features](#features)
2. [Design & UI](#design--ui)
3. [Quick start](#quick-start)
4. [Scripts](#scripts)
5. [Environment variables](#environment-variables)
6. [Architecture](#architecture)
7. [Content management](#content-management)
8. [The district's data](#the-districts-data)
9. [Bilingual & RTL](#bilingual--rtl)
10. [Search](#search)
11. [The assistant](#the-assistant)
12. [Appointments & booking](#appointments--booking)
13. [Admin dashboard](#admin-dashboard)
14. [Photographs & credits](#photographs--credits)
15. [Testing](#testing)
16. [Security](#security)
17. [Backups](#backups)
18. [Deploying](#deploying)
19. [Production checklist](#production-checklist)

---

## Features

**For residents**

- 🧾 **Services & permits** — every service page shows who can apply, the
  documents needed, the steps, the fee, the timescale and where to apply; each
  carries a printable document checklist.
- 📅 **Counter appointment booking** — pick purpose → office → day → time in
  Africa/Cairo, get a reference number; double-booking is prevented by a partial
  unique index in PostgreSQL.
- 💬 **Citizen-service assistant** — three answering modes (agent / LLM /
  offline retrieval) so a chat panel is never blank; can file complaints and
  issue appointment cards in agent mode.
- 📣 **Sourced news & events** — items reported by the governorate portal's
  district page, each naming its source in the body; events carry the district's
  seasonal calendar (the beach season, garden evenings).
- 🏛️ **Landmarks** — seven entries from the island bridge to Nelson's Island,
  each with visiting information, coordinates, nearby suggestions and photo
  strips where photography exists.
- 🗺️ **Maps & transport** — OpenStreetMap embed spanning the gardens to Abu Qir,
  the Abu Qir railway line, tram and microbus guidance, walking trails and
  parking.
- 📇 **Business directory** — licence-checked listings across Toussoun, Abu Qir,
  Maamoura, Seyouf and Khourshid, with "verified" badges.
- 🔎 **Instant Arabic-aware search** — diacritic-insensitive, hamza/taa-marbuta
  normalisation, scored ranking.
- ☎️ **Verified hotlines** — 16528 complaints line, police, ambulance, fire,
  gas, electricity.

**For staff**

- `/admin` dashboard protected by HTTP Basic (fails closed): bookings, messages,
  news publishing, landmark publishing.

---

## Design & UI

The visual system is shared with the district-portal family this site belongs
to: Mediterranean harbour blue (*sea*), monument limestone (*sand*), opera-house
brass (*gold*), Roman brick (*terracotta*) and oxidised copper (*verdigris*) —
defined once as Tailwind v4 tokens in `app/globals.css`, with semantic tokens
swapped per theme so dark mode needs no second stylesheet.

- An eight-pointed-star (**khatam**) lattice laid at low contrast over banners,
  dark bands and the footer, fading through CSS masks; its stroke follows the
  theme via one custom property.
- Ambient **orb light**: blurred colour fields drifting behind the hero, bands
  and tinted banners (GPU transform only).
- A fixed **ambient canvas** on the home page: three vast colour fields breathing
  behind the whole page plus a whisper of film grain.
- The gilt tri-colour band that opens and closes every page flows slowly along
  its own length.
- `<Reveal>` scroll entrances, staggered, gated behind an `html.js` class set
  pre-paint so no-JS readers always see full content.
- Hero carousel and landmark **photo tour**: WAI-ARIA carousels with Ken Burns
  zooms; autoplay stops on interaction and never starts for reduced-motion users.
- Everything honours `prefers-reduced-motion`.

Typography is self-hosted via `next/font`: **Cairo** for display, **Tajawal**
for body, logical-property layout throughout so RTL mirrors perfectly.

---

## Quick start

```bash
npm install
npm run dev         # http://localhost:3000 → redirects to /ar
```

Node **22.6+** required (tests rely on Node stripping TypeScript types itself).

The booking store is PostgreSQL. For local development either run the compose
stack, or point `DATABASE_URL` at any Postgres — the schema creates itself on
first use. Without one the public pages still build and serve from the curated
content in `content/*.ts`; only bookings, messages and `/admin` need the
database.

```bash
npm run build       # development/staging build
npm start           # serve the build
npm run build:prod  # preflight, then build — refuses to ship placeholders
```

Full stack (site + assistant + PostgreSQL):

```bash
cp .env.example .env        # fill in the values it names
docker compose up -d --build

npm run knowledge:export                               # site  → JSON
docker compose exec agent flask import-site-knowledge  # JSON  → the assistant
docker compose exec agent flask seed-departments       # one department per complaint type
docker compose exec agent flask create-admin           # a login for the staff dashboard
```

The first `up` is slow: the assistant downloads a ~2.2 GB embedding model before
serving. It is cached in a volume, so every later start is quick.

`/` redirects to `/ar`. The other language lives at `/en`. Both are fully
translated — no fallback language, no untranslated string.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (staging-safe content allowed) |
| `npm run build:prod` | Preflight gate + production build |
| `npm start` | Serve a completed build |
| `npm run check` | lint + typecheck + unit tests, all three |
| `npm test` | Unit tests (`node:test`, zero test-runner dependency) |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preflight` | The go-live checklist |
| `npm run audit -- URL` | Crawl a running instance: dead links, alt text, lang/dir, placeholders |
| `npm run e2e -- URL` | API contracts, security headers, booking race, assistant flows |
| `node scripts/audit.mjs --self-test` | Prove the audit's checks still fire |
| `npm run knowledge:export` | Export `content/` → `agent/site_knowledge/montazah-thani.json` |
| `npm run backup -- DIR` | Backup + verify all three data stores |

---

## Environment variables

Copy `.env.example` to `.env.local`. For local development everything is optional.

| Variable | Required | Effect if unset |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **yes in prod** (inlined at build time) | sitemap falls back to a placeholder host; canonical URLs and hreflang derive from it. |
| `ADMIN_USER` / `ADMIN_PASSWORD` | **yes in prod** | `/admin` returns 503 rather than opening — it fails closed. |
| `DATABASE_URL` | **yes in prod** | Postgres for bookings, messages and published content. Unset, those fail and the public pages fall back to curated content. Compose builds this for the web container itself. |
| `SITE_POSTGRES_DB` | no | The site's own database, default `montazah_site`. Must **not** be the assistant's `districts_db` — see Architecture. |
| `TEST_DATABASE_URL` | no | A throwaway Postgres for `npm test`. The store tests truncate their tables, so never point this at anything real. Unset, they skip. |
| `ANTHROPIC_API_KEY` | no | Assistant falls back to answering directly from retrieved site content instead of Claude. |
| `AGENT_URL` | no | Points at the assistant service. Unset, the chat answers questions but cannot file complaints or book — and says so by offering different suggestions. |
| `AGENT_DISTRICT_ID` | no | Which district row the assistant speaks for (`flask import-site-knowledge` prints the id). Unset, it asks callers which district they are writing from. |

---

## Architecture

```
app/
  [locale]/            every page, locale = 'ar' | 'en'
    layout.tsx         root layout — <html lang dir>, fonts, header/footer/assistant
    page.tsx           home — hero slider + auto-rotating landmark photo tour
    about/ landmarks/ services/ news/ events/ map/ directory/
    gallery/ search/ contact/ accessibility/ privacy/ laws/ credits/ appointments/
  api/chat/            assistant endpoint — agent service, or Claude, or retrieval alone
  api/chat/form/       submits a booking or report form the assistant opened in the panel
  api/chat/ticket/     proxies the assistant's appointment card (same-origin)
  api/contact/         contact & issue-report intake → stored, shown at /admin/messages
  api/appointments/    counter booking + slot availability (+ /slots)
  api/health/          liveness incl. a database write probe
  admin/               staff dashboard: bookings, messages, news, landmarks
  globals.css          design tokens, background/motion systems, RTL corrections
  sitemap.ts robots.ts icon.svg
content/               ALL copy & data — every string is { ar, en }; edit here, not JSX
components/            header, footer, hero slider, landmark showcase, reveal, motifs…
lib/
  i18n.ts              locales, direction, date/number formatting, link helper
  search.ts            Arabic-aware normalisation + scoring (browser-safe)
  search-index.ts      corpus builder — server only
  assistant.ts         retrieval, system prompt, offline answering, input validation
  agent.ts             client for the assistant service
  sql.ts               the Postgres connection, schema and pooling
  db.ts                bookings and messages (Postgres)
  cms.ts               news/landmarks published from the dashboard, merged with content/
  slots.ts             bookable days/times, computed in Africa/Cairo (unit-tested)
scripts/               preflight, audit, e2e, export-knowledge, backup
agent/                 the citizen-service assistant (Flask + LangGraph)
docker/nginx/          TLS termination — http-only.conf (bootstrap), https.conf
docker/postgres-init/  creates the site's database alongside the assistant's
docker-compose.yml     nginx + site + assistant + database on one internal network
```

**Two databases, one server.** The assistant keeps its own `appointments` table
in `districts_db`. If the site shared that database its `CREATE TABLE IF NOT
EXISTS appointments` would find that table, conclude its schema was in place, and
then read and write the assistant's bookings as its own — silently, with
different columns. The site therefore gets `montazah_site`, created by
`docker/postgres-init/`, and the runtime preflight refuses to start if
`DATABASE_URL` points at the other one.

Pages are prerendered over both locales; pages fed by the dashboard use
`revalidate = 300` plus immediate `revalidatePath` on publish.

---

## Content management

Every word lives in a typed module under `content/`:

| File | Contents |
|---|---|
| `site.ts` | name, address, phone, hours, hotlines, stats, nav, gov links |
| `services.ts` | service catalogue: audience, documents, steps, fee, timescale |
| `landmarks.ts` | the seven landmarks with history, visiting info, coordinates |
| `news.ts` | district news with sources; `DEMO_CONTENT = false` |
| `events.ts` | the seasonal calendar: beach season, garden evenings |
| `directory.ts` | business listings (published after licence verification) |
| `appointments.ts` | offices (Toussoun HQ, Abu Qir, Maamoura), topics, holidays |
| `legal.ts` | statutes behind each service, verification status |
| `photos.ts` | photo registry: file, dimensions, alt, crop focus, provenance |
| `ui.ts` | every interface string, `{ ar, en }` |

TypeScript fails the build if any translation is missing.

### The district's data

Published facts come from official sources:

- Seat and phones — طوسون المستشارين بجوار فتح الله ماركت · 03 5621144 / 03 5617308 —
  as published on the governorate portal's district page
  (`alexandria.gov.eg/Government/districts/montazah2`) and the district's
  official Facebook page.
- News items are reported by that same portal page, each naming its source.
- Administrative boundaries between El Montazah I and II should be reconciled
  against the governorate's boundary PDF before publication claims are tightened;
  the landmarks file marks the Montazah Gardens as sitting on the district's
  western edge rather than quietly claiming them outright.
- Population figure is indicative and must be refreshed from CAPMAS statistics.

---

## Bilingual & RTL

Direction comes from the route (`<html lang dir>`); logical properties
everywhere so the interface mirrors without an RTL-specific stylesheet; Arabic
body copy slightly larger with looser leading; `.num` isolates signed figures
from the RTL run.

## Search

`lib/search.ts` normalises Arabic before matching — diacritics stripped,
أ/إ/آ → ا, ى → ي, ة → ه. The corpus ships to the browser and filters instantly
at `/search`.

---

## The assistant

`POST /api/chat` tries three modes in order; failure in one lands on the next:
`agent` (files complaints, books appointments, issues references),
`llm` (answers from these pages only), `local` (returns retrieved passages).
Grounding rule for every mode: facts come only from retrieved passages — a
portal that invents a fee does real damage.

In `agent` mode a turn can also come back with a **form** — the panel draws it
under the reply, and `POST /api/chat/form` submits it. Booking and reporting
each need seven fields, and collecting those by conversation was seven rounds
in which the assistant could ask again for something already given, or read a
stray "تمام" as consent to file a report under someone's name. The form shows
every field at once and the assistant re-validates all of them before it writes
a row, so no model decides whether a record is created. Everything else — asking
about a fee, the opening hours, where to go — is answered without asking the
resident who they are.

The knowledge base flows one way:

```
content/*.ts ──npm run knowledge:export──▶ agent/site_knowledge/montazah-thani.json
                                          ──flask import-site-knowledge──▶ pgvector
```

Re-run both after any content change.

---

## Appointments & booking

Residents book at `/[locale]/appointments`; staff review at `/admin/appointments`.
Policy lives in `content/appointments.ts` (offices, topics, durations, horizon,
holiday list); slot arithmetic in `lib/slots.ts` computed in **Africa/Cairo**;
double-booking prevented by a partial unique index in `lib/db.ts`.

---

## Admin dashboard

`/admin` — bookings, messages, news and landmark publishing. Gated by HTTP Basic
in `proxy.ts`, failing **closed**.

## Photographs & credits

`content/photos.ts` is the single registry. Current photographs come from
Wikimedia Commons under CC BY-SA licences (ASaber91, Jerrye & Roy Klotz MD,
Murat Özsoy, Dennis G. Jarvis, May Hachem93, TRJN, Aya Ibrahim) — attribution
required by the licences is published at `/[locale]/credits`.
Nelson's Island and Toussoun station have no photographs yet and render the
hand-drawn SVG motifs instead — an approximate photo of the wrong place would
misrepresent it. District-supplied photos without recorded provenance publish
with a visible "source pending" line until ownership is established.

## Testing

Three layers: `npm test` (85 unit tests over booking slots, double-booking,
CMS merge, Arabic search normalisation…), `npm run audit -- URL` (crawl: titles,
h1s, lang/dir, alt text, placeholders), `npm run e2e -- URL` (API contracts,
security headers, booking race, assistant branches).

## Security

Strict CSP (`default-src 'self'`; only external frame is the OSM embed), HSTS,
nosniff, frame-options, referrer-policy, COOP, restrictive permissions-policy;
`X-Powered-By` removed. In-process rate limiting on public API routes — put a
CDN/WAF limiter in front in production, run one instance, terminate TLS in
front. Fonts self-hosted; zero third-party requests beyond the map iframe.

## Backups

`npm run backup [destination]` dumps and verifies all three stores: both
databases with `pg_dump`, each checked with `pg_restore --list` *and* against the
tables it should contain (a dump of the wrong database is otherwise a perfectly
valid file), and the attachments with `tar`, listed back. Warns if the
destination sits inside a personal cloud-sync folder.

---

## Deploying

The containers hold no state on disk — everything durable is in Postgres — so
`web` can be rebuilt and replaced freely. What must survive is the `pgdata`
volume.

```bash
cp .env.example .env                  # fill it in
docker compose up -d --build          # nginx + site + assistant + database
```

nginx is the only service with a host port. It loads one config chosen by
`NGINX_CONF`: `http-only.conf` to bootstrap and let certbot answer its first
challenge, then `https.conf` for production. **Do not leave the public site on
`http-only.conf`** — `/admin` uses HTTP Basic and sends its password on every
request.

Site alone, against an existing Postgres:

```bash
docker build -t montazah-thani --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/montazah_site \
  -e ADMIN_USER=... -e ADMIN_PASSWORD=... \
  montazah-thani
```

Without Docker: `npm run build:prod`, deploy `.next/standalone` + `.next/static`
+ `public/` together, run `node server.js`.

### Split across two hosts

`docker compose` puts both services on one internal network. They can also live
apart — the site on a platform that builds it for you, the assistant on a host
that will run a container — which is how production runs today:

| | |
|---|---|
| the site | Vercel, at `montazah-thani.vercel.app`. `next.config.mjs` drops `output: 'standalone'` when `VERCEL` is set, because the platform traces the build itself. |
| the assistant | A Hugging Face Docker Space. `deploy/huggingface/` holds the Dockerfile, the Space card and `deploy.sh`, which stages `agent/` into a temp directory and pushes it. |
| both databases | One Neon project, two databases: `montazah_site` for the site, `districts_db` with pgvector for the assistant. |

```bash
# A Hugging Face write token for the Space — create one at
# https://huggingface.co/settings/tokens and export it in the shell
# that runs deploy.sh. Never commit it.
export HF_TOKEN=hf_...
```

The Space Dockerfile differs from `agent/Dockerfile` in two ways: it binds
7860, the port Spaces routes to, and it **downloads the embedding model at
build time** rather than at boot. Under compose the model lives in a volume and
is fetched once; a free Space has no persistent disk, so every restart would
otherwise re-fetch 2.2GB with a resident waiting. Keep the `EMBEDDING_MODEL`
build arg and the runtime variable equal, or the container fetches the other
one on first message and the point is lost.

**Set `AGENT_TOKEN` on both services whenever they are split this way.** On the
internal network the assistant has no host port and needs no credential. A
cloud ingress is public, `/api/chat` files complaints in residents' names, and
`ALLOWED_ORIGINS` does not stop that — CORS constrains browsers, and a `curl`
ignores it. With the secret set, the assistant answers 401 to anything that
does not present it, and preflight refuses a public `AGENT_URL` without one.

One thing is genuinely lost on a free Space: appointment-card PNGs in
`static/uploads/tickets/` do not survive a restart. The reference number is in
Postgres and stays valid — it is the image that goes.

Preflight scopes: `build` (content/artefact), `runtime` (container env), and
`operator` (secrets split across services — answered on the host). Staging with
known placeholders requires `PREFLIGHT_ALLOW_PLACEHOLDERS=1`.

---

## Production checklist

Run `npm run preflight` for live status. Items needing the district:

1. ✅ Contact details published on the governorate portal (Toussoun seat,
   5621144 / 5617308, governorate inbox).
2. ⚠️ Service fees/timescales remain *indicative* until checked against current
   executive regulations — service pages show that notice until confirmed.
3. ✅ News items sourced from the governorate portal's district page;
   `DEMO_CONTENT = false`.
4. ✅ Directory maintained by the commercial-registration office; contacts
   published only after owner confirmation.
5. ⚠️ Landmark hours/ticketing need confirming per site; coordinates reconciled
   against the district GIS layer; El Montazah I/II boundary confirmed for the
   gardens entry.
6. ✅ Messages persist with trackable references at `/admin/messages`.
7. ⚠️ Privacy page needs legal review against Egypt's personal-data law.
8. ⚠️ Accessibility statement describes true state; Arabic screen-reader
   testing outstanding.
9. ⚠️ Holiday list in `content/appointments.ts` maintained yearly.
10. ✅ All current photographs carry recorded Commons provenance; add
    `credit: PENDING` entries only when the district supplies its own material.
11. Assistant checklist in `agent/README.md`: geographic coverage (add the
    sections above), department phones, `ALLOWED_ORIGINS`, `SECURE_COOKIES=1`,
    paid Groq plan.
12. Re-run the knowledge export after settling content items.

## Notes

- Fonts self-hosted via `next/font`; print stylesheet drops chrome and spells
  out external URLs.
- Keep `data/` ignored so resident data never reaches git.
