#!/usr/bin/env bash
# Quick regression check against a locally running HireSphere backend.
# Usage: start the server first (npm run dev), then run this script.
set -uo pipefail

PORT="${PORT:-3001}"
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

check() {
  local desc="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  OK   $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $desc (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

extract_token() {
  node -e "process.stdin.on('data', d => { try { console.log(JSON.parse(d).token || '') } catch { console.log('') } })"
}

echo "== HireSphere API regression check ($BASE) =="

check "health check" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health")" "200"

ADMIN_LOGIN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@iitb.ac.in","password":"secret123"}')
STUDENT_LOGIN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"student@iitb.ac.in","password":"secret123"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | extract_token)
STUDENT_TOKEN=$(echo "$STUDENT_LOGIN" | extract_token)

check "admin login" "$([ -n "$ADMIN_TOKEN" ] && echo yes)" "yes"
check "student login" "$([ -n "$STUDENT_TOKEN" ] && echo yes)" "yes"
check "wrong password rejected" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@iitb.ac.in","password":"wrong"}')" "401"

check "GET /me (authenticated)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN")" "200"
check "GET /me (unauthenticated)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/auth/me")" "401"

check "GET /api/companies (student can read)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/companies" -H "Authorization: Bearer $STUDENT_TOKEN")" "200"
check "POST /api/companies (student forbidden)" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/companies" -H "Content-Type: application/json" -H "Authorization: Bearer $STUDENT_TOKEN" -d '{"name":"x"}')" "403"

check "GET /api/drives (scoped list)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/drives" -H "Authorization: Bearer $ADMIN_TOKEN")" "200"

check "GET /api/applications/me (student)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/applications/me" -H "Authorization: Bearer $STUDENT_TOKEN")" "200"
check "GET /api/applications/me (admin forbidden)" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/applications/me" -H "Authorization: Bearer $ADMIN_TOKEN")" "403"

echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
