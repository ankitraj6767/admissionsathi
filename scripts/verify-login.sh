#!/usr/bin/env bash
# Verifies the credentials sign-in flow end to end against a running server.
# Usage: scripts/verify-login.sh [baseUrl]
set -u
BASE="${1:-http://localhost:3000}"

csrf_of() { # jar
    curl -s -c "$1" "$BASE/api/auth/csrf" \
        | python3 -c 'import sys,json; print(json.load(sys.stdin)["csrfToken"])' 2>/dev/null
}

login() { # email password jar -> prints redirect target (empty on success)
    local email="$1" password="$2" jar="$3" token
    rm -f "$jar"
    token=$(csrf_of "$jar")
    if [ -z "$token" ]; then echo "SERVER-UNREACHABLE"; return; fi
    curl -s -b "$jar" -c "$jar" -o /dev/null -w '%{redirect_url}' \
        -X POST "$BASE/api/auth/callback/credentials" \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        --data-urlencode "csrfToken=$token" \
        --data-urlencode "email=$email" \
        --data-urlencode "password=$password"
}

session_of() { # jar -> "roles=[...] perms=N" or "no session"
    curl -s -b "$1" "$BASE/api/auth/session" | python3 -c '
import sys, json
try:
    user = (json.load(sys.stdin) or {}).get("user") or {}
except Exception:
    print("no session"); sys.exit()
if not user:
    print("no session"); sys.exit()
print("roles=" + ",".join(user.get("roles") or []) + " perms=" + str(len(user.get("permissions") or [])))'
}

code() { curl -s -b "$2" -o /dev/null -w '%{http_code}' "$BASE$1"; }

echo "== sign-in outcomes (empty redirect = success) =="
printf '  %-24s %s\n' 'admin correct'    "$(login admin@admissionsathi.org   'Admin@12345'    /tmp/as-a.jar)"
printf '  %-24s %s\n' 'admin wrong pass' "$(login admin@admissionsathi.org   'WrongPass123'   /tmp/as-b.jar)"
printf '  %-24s %s\n' 'student correct'  "$(login student@admissionsathi.org 'Student@12345'  /tmp/as-s.jar)"
printf '  %-24s %s\n' 'staff correct'    "$(login content@admissionsathi.org 'Staff@12345'    /tmp/as-c.jar)"
printf '  %-24s %s\n' 'unknown email'    "$(login nobody@example.com         'Whatever123'    /tmp/as-n.jar)"

echo "== session contents =="
printf '  %-16s %s\n' admin       "$(session_of /tmp/as-a.jar)"
printf '  %-16s %s\n' student     "$(session_of /tmp/as-s.jar)"
printf '  %-16s %s\n' staff       "$(session_of /tmp/as-c.jar)"
printf '  %-16s %s\n' 'bad creds' "$(session_of /tmp/as-b.jar)"

echo "== route access =="
printf '  admin   /admin=%s /admin/pages=%s /dashboard=%s\n' \
    "$(code /admin /tmp/as-a.jar)" "$(code /admin/pages /tmp/as-a.jar)" "$(code /dashboard /tmp/as-a.jar)"
printf '  staff   /admin=%s /admin/pages=%s\n' \
    "$(code /admin /tmp/as-c.jar)" "$(code /admin/pages /tmp/as-c.jar)"
printf '  student /admin=%s /dashboard=%s\n' \
    "$(code /admin /tmp/as-s.jar)" "$(code /dashboard /tmp/as-s.jar)"
printf '  anon    /admin=%s /dashboard=%s\n' \
    "$(code /admin /tmp/as-empty.jar)" "$(code /dashboard /tmp/as-empty.jar)"
