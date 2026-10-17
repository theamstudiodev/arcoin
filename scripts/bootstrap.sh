#!/usr/bin/env bash
# Studesk — one-time setup of the project on this computer.
#
#   ./scripts/bootstrap.sh                 run from the unzipped studesk folder
#   STAGING_REF=abcd1234 ./scripts/bootstrap.sh    also connect the Supabase MCP to staging
#
# Every step checks whether it is already done, does it if not, then VERIFIES the result.
# If a check fails the script stops and tells you what to fix; re-run it and it resumes from
# where it stopped. Nothing is ever deleted.
#
# macOS and Linux. On Windows, run it inside WSL.
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# ---------------------------------------------------------------------------
G=$'\e[32m'; R=$'\e[31m'; Y=$'\e[33m'; B=$'\e[1m'; D=$'\e[2m'; N=$'\e[0m'
n=0
step()  { n=$((n+1)); printf "\n${B}%2d · %s${N}\n" "$n" "$1"; }
ok()    { printf "   ${G}✓${N} %s\n" "$1"; }
skip()  { printf "   ${D}· %s${N}\n" "$1"; }
warn()  { printf "   ${Y}!${N} %s\n" "$1"; }
fail()  { printf "   ${R}✗ %s${N}\n" "$1"; [ -n "${2:-}" ] && printf "     ${Y}→ %s${N}\n" "$2"; printf "\n${R}Stopped at step %d.${N} Fix the above and run ./scripts/bootstrap.sh again — it resumes here.\n" "$n"; exit 1; }
have()  { command -v "$1" >/dev/null 2>&1; }
run()   { printf "   ${D}\$ %s${N}\n" "$*"; "$@"; }

printf "${B}Studesk setup${N}  ${D}%s${N}\n" "$ROOT"
[ -f supabase/migrations/20261017000100_foundation.sql ] || fail "Run this from the unzipped studesk folder" "cd into the folder that contains supabase/ and scripts/"

# ===========================================================================
step "Prerequisites"
# ===========================================================================
missing=0
check() { # name, command, install hint, required(1/0)
  if have "$2"; then ok "$1  ${D}$("$2" --version 2>/dev/null | head -1)${N}";
  elif [ "$4" = 1 ]; then printf "   ${R}✗${N} %s missing → %s\n" "$1" "$3"; missing=1;
  else warn "$1 missing → $3 (needed later)"; fi
}
check "Node.js"      node     "install Node 22 LTS from nodejs.org"                       1
check "npm"          npm      "comes with Node"                                           1
check "Git"          git      "install from git-scm.com"                                  1
check "Docker"       docker   "install Docker Desktop and start it"                       1
check "Supabase CLI" supabase "brew install supabase/tap/supabase"                        1
check "Claude Code"  claude   "npm install -g @anthropic-ai/claude-code"                  1
check "psql"         psql     "macOS: brew install libpq && brew link --force libpq"      1
[ $missing = 0 ] || fail "Install the missing tools above"
node_major=$(node -p 'process.versions.node.split(".")[0]')
[ "$node_major" -ge 20 ] || fail "Node $node_major is too old" "install Node 22 LTS"
docker info >/dev/null 2>&1 || fail "Docker is installed but not running" "start Docker Desktop, wait for it to say Running"
ok "Docker is running"

# ===========================================================================
step "Git repository"
# ===========================================================================
if [ -d .git ]; then skip "already a git repository"; else run git init -q -b main && ok "initialised (branch main)"; fi

# ===========================================================================
step "Front end + back end: Next.js app in apps/web"
# ===========================================================================
if [ -f apps/web/package.json ]; then
  skip "apps/web already exists"
else
  run npx --yes create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir \
      --import-alias "@/*" --use-npm --skip-install --disable-git --yes \
    || fail "create-next-app failed" "check your internet connection, then re-run"
fi
[ -f apps/web/package.json ] && grep -q '"next"' apps/web/package.json || fail "apps/web is not a Next.js app"
ok "Next.js app at apps/web  ${D}next $(node -p "require('./apps/web/package.json').dependencies.next")${N}"

# Our additions to the app — idempotent
cat > apps/web/next.config.ts <<'EOF'
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // The scheduler is shipped as TypeScript source from the workspace.
  transpilePackages: ['@studesk/engine'],
  // Tailwind CSS v4 is compiled by its Turbopack loader in current Next.js apps.
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
EOF
( cd apps/web && npm pkg set name=@studesk/web 'dependencies.@studesk/engine=*' scripts.typecheck="tsc --noEmit" ) \
  || fail "could not update apps/web/package.json"
mkdir -p apps/web/src/lib/actions
ok "linked to @studesk/engine, typecheck script added, src/lib/actions/ created"

# ===========================================================================
step "Install dependencies (one install for the whole workspace)"
# ===========================================================================
if [ -d node_modules/@studesk/engine ] && [ -d node_modules/@supabase/ssr ]; then
  skip "already installed"
else
  run npm install -w apps/web @supabase/supabase-js @supabase/ssr zod @tanstack/react-query \
    || fail "npm install failed" "read the npm error above; re-run when fixed"
  run npm install || fail "npm install failed"
fi
[ -L node_modules/@studesk/engine ] || [ -d node_modules/@studesk/engine ] || fail "workspace link to @studesk/engine missing"
for p in next react @supabase/supabase-js @supabase/ssr zod @tanstack/react-query vitest; do
  [ -d "node_modules/$p" ] || fail "$p did not install"
done
ok "next, react, supabase-js, @supabase/ssr, zod, react-query, vitest — all present"

# ===========================================================================
step "Engine tests run"
# ===========================================================================
out=$(npm test -w packages/engine 2>&1) || { echo "$out" | tail -20; fail "engine test runner failed"; }
ok "vitest runs  ${D}$(echo "$out" | grep -Eo '[0-9]+ todo' | head -1) — the specification to write in week 1${N}"

# ===========================================================================
step "shadcn/ui"
# ===========================================================================
if [ -f apps/web/components.json ]; then
  skip "already initialised"
else
  ( cd apps/web && run npx --yes shadcn@latest init --defaults --yes ) \
    || warn "shadcn init needs input — run it yourself later:  cd apps/web && npx shadcn@latest init"
fi
[ -f apps/web/components.json ] && ok "components.json present" || warn "shadcn not initialised yet (not blocking)"

# ===========================================================================
step "Supabase: initialise and configure"
# ===========================================================================
if [ -f supabase/config.toml ]; then skip "supabase/config.toml exists"
else ( echo n; echo n ) | run supabase init >/dev/null || fail "supabase init failed"; fi
[ -f supabase/config.toml ] || fail "supabase/config.toml was not created"
run node scripts/configure-supabase.mjs supabase/config.toml || fail "could not configure config.toml"
grep -q 'otp_length = 6' supabase/config.toml && grep -q 'sign-in-code.html' supabase/config.toml \
  || fail "config.toml settings did not apply"
ok "6-digit sign-in codes, Studesk email template, Postgres 17, localhost:3000"

# ===========================================================================
step "Supabase: start the local stack (first run downloads images, a few minutes)"
# ===========================================================================
if supabase status >/dev/null 2>&1; then skip "already running"
else run supabase start || fail "supabase start failed" "is Docker running with enough memory (4 GB+)?"; fi
supabase status >/dev/null 2>&1 || fail "local Supabase is not running"
ok "local Supabase running — Studio http://127.0.0.1:54323 · Mailpit http://127.0.0.1:54324"

# ===========================================================================
step "Database: migrations + access rules"
# ===========================================================================
out=$(./scripts/test-db.sh 2>&1); echo "$out" | grep -E '^ok ' | sed 's/^/   /'
echo "$out" | grep -q 'all checks passed' || { echo "$out" | tail -15; fail "access tests failed"; }
ok "$(echo "$out" | grep -c '^ok ') access checks passed"

# ===========================================================================
step "Environment file and database types"
# ===========================================================================
if [ -f apps/web/.env.local ]; then skip "apps/web/.env.local exists — not overwritten"
else
  eval "$(supabase status -o env 2>/dev/null | sed 's/^/SB_/')"
  pub="${SB_PUBLISHABLE_KEY:-${SB_ANON_KEY:-}}"; sec="${SB_SECRET_KEY:-${SB_SERVICE_ROLE_KEY:-}}"
  [ -n "$pub" ] && [ -n "$sec" ] || fail "could not read keys from 'supabase status'" "copy them into apps/web/.env.local by hand from: supabase status"
  cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=${SB_API_URL:-http://127.0.0.1:54321}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$pub
SUPABASE_SECRET_KEY=$sec
SUPABASE_DB_URL=${SB_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}
ANTHROPIC_API_KEY=
EOF
fi
grep -q 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.\+' apps/web/.env.local || fail ".env.local has no publishable key"
ok "apps/web/.env.local written (git-ignored)"
printf "   ${D}\$ supabase gen types typescript --local > apps/web/src/lib/database.types.ts${N}\n"
supabase gen types typescript --local > apps/web/src/lib/database.types.ts || fail "type generation failed"
grep -q 'project_tier' apps/web/src/lib/database.types.ts || fail "generated types do not include the Studesk schema"
ok "apps/web/src/lib/database.types.ts generated from the schema"

# ===========================================================================
step "App builds"
# ===========================================================================
out=$(npm run build -w apps/web 2>&1) || { echo "$out" | tail -25; fail "the app does not build"; }
ok "apps/web production build succeeds"
out=$(npm run typecheck 2>&1) || { echo "$out" | tail -20; fail "typecheck failed"; }
ok "typecheck clean across the workspace (app + engine)"

# ===========================================================================
step "First commit"
# ===========================================================================
if git rev-parse --verify HEAD >/dev/null 2>&1; then skip "repository already has commits"
else
  git add -A && git commit -q -m "Studesk: project setup — app, engine, database, access tests, backups" \
    && ok "committed $(git ls-files | wc -l | tr -d ' ') files" || warn "commit skipped — set git user.name and user.email, then commit"
fi
git check-ignore -q apps/web/.env.local && ok ".env.local is ignored by git" || fail ".env.local is NOT git-ignored — do not commit it"

# ===========================================================================
# Claude Code: plugins and MCP servers, one at a time, each verified
# Project scope → recorded in .claude/settings.json and .mcp.json, shared with the repo.
# ===========================================================================
plugin_installed() { grep -q "\"$1\"" .claude/settings.json 2>/dev/null || claude plugin list 2>/dev/null | grep -q "${1%@*}"; }
mcp_installed()    { grep -q "\"$1\"" .mcp.json 2>/dev/null || claude mcp list 2>/dev/null | grep -q "^$1"; }

install_plugin() { # label, plugin@marketplace, marketplace-source
  step "Claude Code · $1"
  if plugin_installed "$2"; then skip "already installed"; else
    if [ -n "${3:-}" ]; then run claude plugin marketplace add "$3" >/dev/null 2>&1 || true; fi
    run claude plugin install "$2" --scope project || fail "could not install $2" "inside Claude Code run: /plugin install $2"
  fi
  plugin_installed "$2" && ok "$2 installed (project scope)" || fail "$2 not found after install" "check /plugin → Installed inside Claude Code"
}
install_mcp() { # label, name, add-command...
  local label="$1" name="$2"; shift 2
  step "Claude Code · $label"
  if mcp_installed "$name"; then skip "already configured"; else run "$@" || fail "could not add MCP server $name"; fi
  mcp_installed "$name" && ok "$name configured in .mcp.json" || fail "$name not found in .mcp.json"
}

install_plugin "1/10 Superpowers"        superpowers@superpowers-marketplace       obra/superpowers-marketplace
install_plugin "2/10 commit-commands"    commit-commands@claude-code-plugins       anthropics/claude-code
install_plugin "3/10 pr-review-toolkit"  pr-review-toolkit@claude-code-plugins     anthropics/claude-code

step "Claude Code · 4/10 typescript-lsp (language server first)"
if have typescript-language-server; then skip "typescript-language-server present"
else run npm install -g typescript typescript-language-server || fail "could not install typescript-language-server" "try with sudo, or use a Node version manager"; fi
have typescript-language-server && ok "typescript-language-server $(typescript-language-server --version)" || fail "typescript-language-server not on PATH"
n=$((n-1)); install_plugin "4/10 typescript-lsp" typescript-lsp@claude-plugins-official anthropics/claude-plugins-official

install_plugin "5/10 security-guidance"  security-guidance@claude-plugins-official anthropics/claude-plugins-official

install_mcp "6/10 Context7 (current library docs)" context7 \
  claude mcp add --scope project --transport http context7 https://mcp.context7.com/mcp

if [ -n "${STAGING_REF:-}" ]; then
  install_mcp "7/10 Supabase (read-only, staging)" supabase \
    claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?read_only=true&project_ref=$STAGING_REF"
else
  step "Claude Code · 7/10 Supabase MCP"
  warn "skipped — create the staging project first, then:  STAGING_REF=<ref> ./scripts/bootstrap.sh"
fi

install_mcp "8/10 Playwright (browser testing)" playwright \
  claude mcp add --scope project playwright -- npx @playwright/mcp@latest

step "Claude Code · 9/10 shadcn MCP"
if mcp_installed shadcn; then skip "already configured"; else run npx --yes shadcn@latest mcp init --client claude || warn "shadcn mcp init failed — run it later from the repo root"; fi
mcp_installed shadcn && ok "shadcn configured in .mcp.json" || warn "shadcn MCP not configured (not blocking)"

install_plugin "10/10 frontend-design"   frontend-design@claude-code-plugins       anthropics/claude-code

# ===========================================================================
step "Done"
# ===========================================================================
git add -A .claude .mcp.json 2>/dev/null && git commit -q -m "Claude Code: project plugins and MCP servers" 2>/dev/null && ok "plugin setup committed" || true
cat <<EOF

   ${G}${B}Studesk is set up.${N}

   ${B}npm run dev${N}          app on http://localhost:3000
   ${B}npm test${N}             engine tests
   ${B}npm run db:test${N}      access rules
   ${B}claude${N}               start Claude Code here — it reads CLAUDE.md

   Still to do by hand (docs/SETUP.md): staging project in Mumbai, Resend SMTP,
   GitHub repo + secrets for the nightly backup${STAGING_REF:+.}${STAGING_REF:-, then re-run with STAGING_REF=<ref> for the Supabase MCP.}
EOF
