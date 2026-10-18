# Studesk

AM Studio's project and capacity system. Phase 1 of 6.

| Read | For |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | Accounts, local setup, staging, backups — **start here** |
| [`CLAUDE.md`](CLAUDE.md) | Rules, domain language and conventions — read by Claude Code every session |
| [`docs/PHASE-1-SCOPE.md`](docs/PHASE-1-SCOPE.md) | What Phase 1 builds, and what it explicitly doesn't |
| [`docs/STITCH-PROMPTS.md`](docs/STITCH-PROMPTS.md) | Design prompts for the 13 Phase 1 screens |

## Layout — front end and back end in one folder

```
apps/web/          Next.js app — created by scripts/bootstrap.sh
packages/engine/   @studesk/engine — scheduler types and its test specification
supabase/
  migrations/      schema, rules, access policies, audit log — the source of truth
  seed.sql         local-only sample studio: 7 people, 6 projects, 11 tasks
  templates/       the 6-digit sign-in code email
  tests/           access test suite (26 checks) + a Supabase stand-in for plain Postgres
scripts/
  bootstrap.sh     one-time setup on your computer: app, installs, database, Claude Code plugins
  configure-supabase.mjs   applies Studesk's settings to supabase/config.toml
  test-db.sh       build a throwaway DB, run the access tests, drop it
  backup.sh        nightly dump → Google Drive (30 daily + monthly forever)
  restore.sh       load a backup into an empty, migrated database
.github/workflows/
  ci.yml           access tests on every push and pull request
  backup.yml       the nightly backup at 03:00 IST
```



## Quick start

```bash
./scripts/bootstrap.sh        # sets up everything, verifying each step; safe to re-run
npm run dev                   # http://localhost:3000
npm run test:e2e              # browser tests against local Supabase + Mailpit (supabase start first)
```
