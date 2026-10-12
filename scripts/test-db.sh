#!/usr/bin/env bash
# Runs setup + flow test on a throwaway local Postgres database.
set -euo pipefail
cd "$(dirname "$0")/../supabase"
DB=xs_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
for f in tests/auth_stub.sql setup.sql tests/flow_test.sql; do psql -q -v ON_ERROR_STOP=1 -d $DB -f "$f" >/dev/null; done
psql -q -d postgres -c "drop database $DB"
echo "ALL DATABASE CHECKS PASSED"
