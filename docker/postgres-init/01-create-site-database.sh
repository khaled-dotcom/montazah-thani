#!/bin/bash
# ---------------------------------------------------------------------------
# Give the website its own database, separate from the assistant's.
#
# This matters more than it looks. The assistant (agent/) keeps its own
# `appointments` table in districts_db. If the site shared that database, its
# `CREATE TABLE IF NOT EXISTS appointments` would find the assistant's table
# already there, decide its schema was in place, and then read and write the
# assistant's bookings as though they were its own — with different columns.
# Nothing would error at startup. It would simply be wrong, quietly, until
# someone noticed a resident's appointment had turned into something else.
#
# Two databases on one server: one Postgres to run and back up, no shared
# tables, and either can be dumped and restored without the other.
#
# Postgres only runs this on the FIRST start of an empty data directory. On a
# stack that already has a pgdata volume, create it by hand instead:
#
#   docker compose exec db psql -U postgres -c 'CREATE DATABASE montazah_site'
# ---------------------------------------------------------------------------
set -euo pipefail

SITE_DB="${SITE_POSTGRES_DB:-montazah_site}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
	SELECT 'CREATE DATABASE ${SITE_DB}'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${SITE_DB}')\gexec
SQL

echo "postgres-init: ${SITE_DB} is ready for the website"
