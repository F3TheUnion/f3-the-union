# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Cloudflare Pages app for F3 The Union — a men's fitness group. Features:
- **Miles tracking**: members log running/walking/rucking/biking/swimming miles
- **Pre-blast/back-blast generator**: formats Slack workout announcements (`index.html` / `script.js`)
- **Never-Q tracker**: `never-q/index.html`
- **Q report**: `q/index.html`
- **KOG (King of the Gym)**: `kog/index.html`

Authentication is email-code-based, verified against Slack membership. Only members of the F3 The Union Slack workspace can log in.

## Commands

```bash
npm run dev                   # local dev server at localhost:4321 (Cloudflare Pages + D1)
npm run db:migrate            # apply migrations to local D1
npm run db:migrate:remote     # apply migrations to production D1
npm run people:sql            # generate people INSERT SQL from Slack CSV export
npm run miles:sheet:sql       # generate miles INSERT SQL from Google Sheet CSV
npm run db:refresh            # clone production D1 into the local dev D1
npm run generate:thumbs       # build 200px thumbnails of media/ into media/thumbs/
```

`scripts/wrangler.mjs` is a thin wrapper around the locally-installed wrangler binary that sets `XDG_CONFIG_HOME` to `.wrangler-config/` so wrangler config doesn't pollute the global home directory.

## Scripts and workers

Run from the repo root. Scripts that print SQL write it to `data/` (git-ignored) so you can review it before applying it with `wranglerF3 d1 execute f3_the_union --remote --file ...`.

| File | What it does | Run |
|---|---|---|
| `scripts/wrangler.mjs` | Runs the local wrangler with `XDG_CONFIG_HOME` set to `.wrangler-config/`. Every npm script that calls wrangler goes through it. | `node scripts/wrangler.mjs <wrangler args>` |
| `scripts/refresh-local-db.mjs` | Exports the production D1 (schema and data), wipes the local D1 state and imports the clone. Reads the Cloudflare credentials from `.dev.vars`. Repeatable. | `npm run db:refresh` |
| `scripts/people-csv-to-sql.mjs` | Turns a Slack member CSV export (needs `email` and `f3_name` or `displayname`; optional `is_admin`) into people INSERT SQL. | `npm run people:sql -- people.csv [out.sql]` |
| `scripts/miles-sheet-csv-to-sql.mjs` | Turns the Google Sheet export of Miles Challenge entries into INSERT SQL. Columns are matched by header name (timestamp, email, name, date, run, walk, ...). | `npm run miles:sheet:sql -- sheet.csv [out.sql]` |
| `scripts/fng-xlsx-to-sql.mjs` | One-time load of `data/FNG_History.xlsx` into `fng_entries`; prints a name-matching report. Output: `data/fng-history.sql`. | `node scripts/fng-xlsx-to-sql.mjs` |
| `scripts/fng-normalize-phones.mjs` | Rewrites every FNG phone number as `xxx-xxx-xxxx`; skips numbers that are not 10-digit US. Output: `data/fng-normalize-phones.sql`. | `node scripts/fng-normalize-phones.mjs` |
| `scripts/fng-slack-sync.mjs` | For FNG entries with `joined_slack = 0`, looks the person up in Slack by email, then by display name, and writes UPDATEs (also fixes a differing email). Needs `SLACK_BOT_TOKEN` in `.dev.vars`. Output: `data/fng-slack-sync.sql`. | `node scripts/fng-slack-sync.mjs` |
| `scripts/generate-thumbs.mjs` | Makes 200x200 cropped JPEG thumbnails of every image in `media/` into `media/thumbs/` using sharp. | `npm run generate:thumbs` |
| `workers/reminders.mjs` | Cron Worker. POSTs to `/api/reminders/run` with `REMINDER_RUN_SECRET`. Deployed separately (command in the comments of `wrangler.toml`); Pages Functions cannot have crons. | deployed, not run locally |
| `workers/fng-slack-recheck.mjs` | Cron Worker (daily 13:00 UTC, config in `wrangler.fng-slack-recheck.toml`). POSTs to `/api/fng/slack-recheck/run` with `FNG_SLACK_RECHECK_SECRET`. | deployed, not run locally |
| `.googleAppsScript` | Reference copy of the Apps Script bound to the Google Sheet. See `docs/apps-script.md`. | edited in the Apps Script editor |

## Architecture

**Backend**: Single Cloudflare Pages Function at `functions/api/[[path]].js`. All routes are handled in one file via path/method dispatch at the top of `onRequest`. No framework — just `fetch` + `Response.json`.

**Database**: Cloudflare D1 (SQLite), bound as `ctx.env.DB`. Migrations are in `migrations/`. All timestamps stored as ISO strings. Soft deletes via `deleted_at`.

**Frontend**: Vanilla HTML/CSS/JS. No build step, no bundler. Pages are static HTML files that call `/api/*` routes directly via `fetch`. Shared nav injected via `shared/top-nav.js`.

**Auth flow**: Email → 6-digit code (sent via Resend) → session cookie (`f3_union_session`). On first login, user is provisioned from Slack via `users.lookupByEmail`. Slack display name becomes `f3_name`. Session tokens are stored hashed (SHA-256).

## Key Data Model Notes

- `miles_entries` stores one row per activity category per submission. Bike miles are divided by 3 and swim miles multiplied by 4 when computing totals (in `milesSummary`).
- `same_day_activity_confirmed = 1` flags entries the user explicitly confirmed as a second same-day activity (not a duplicate).
- `source_row_number` tracks the original row from spreadsheet imports for traceability.
- People are identified by `f3_name` (their Slack display name) throughout the UI, not email.

## Environment Variables

Configured in `.dev.vars` locally (see `.dev.vars.example`):
- `RESEND_API_KEY` — for sending login emails
- `RESEND_FROM` — sender address
- `SLACK_BOT_TOKEN` — needs `users:read.email` scope
- `DEV_AUTH_BYPASS=1` — skips real email sending in dev; use code `000000` to log in

## Data Files (Read-Only)

`data/never-q.json` and `data/q_report_rolling.json` are generated by the Google Apps Script (`.googleAppsScript`) and committed to the repo. The Never-Q and Q report pages fetch them directly. Do not modify them from frontend code.

## Important Behaviors

- Ask before doing unspecified things — the preferred workflow is back-and-forth before implementing.
- The API file is intentionally a single flat file. Do not split it into modules without discussion.
- No npm build pipeline — if a change requires a bundler, reconsider the approach.

## Cloudflare Auth

This project uses a specific Cloudflare account that is NOT the default wrangler login. Credentials are stored in `.dev.vars` as `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

The PowerShell profile (`$PROFILE`) defines a `wranglerF3` function that sets these env vars and calls the local wrangler binary. Always use `wranglerF3` in the terminal for remote D1 operations.

For Node.js scripts that shell out to wrangler, pass the credentials via the `env` option to `execSync` — do NOT use the bash inline prefix syntax (`VAR=value cmd`) as it does not work on Windows.

## D1 SQL File Constraints

- **Never use `BEGIN`/`COMMIT`/`SAVEPOINT` in `.sql` files executed via `wrangler d1 execute`.** D1 rejects transaction statements in SQL files with an error about `state.storage.transaction()`. Just write bare `INSERT`/`CREATE` etc. statements with no transaction wrapper.
- Always pass `--remote` when targeting production: `npx wrangler d1 execute f3_the_union --remote --file "path/to/file.sql"`
