# Apps Script cleanup backlog

Working list for `.googleAppsScript`. Kept as ONE file by choice — no splitting.

Status: `[ ]` todo · `[x]` done · `[-]` declined

## Bugs

- [-] **1. `nightlyKoGRun` calls a function that doesn't exist.** DECLINED —
  KoG was a 2026 season thing and is over. If it runs again it starts fresh.
  All KoG code in this file is dormant; ignore it.

- [ ] **2. Kotter block is dead code.**
  `readKotterData` (~492) uses `url`, `Database_username`, `Database_password` —
  none are defined anywhere in the file. `pushKotter` cannot run. Fix or delete.

## Secrets

- [ ] **3. Revoke 3 live Slack webhooks exposed in a PUBLIC repo.**
  github.com/F3TheUnion/f3-the-union is public, so these are readable by anyone
  and let a stranger post into the F3 Slack:
  - `:614` Kotter committee room (active code)
  - `:615` debugging room (commented out)
  - `:951` KoG (dormant code, live webhook)

  Not a KoG issue — dead code still leaks a working credential. Revoke all three
  in Slack; re-issue only the Kotter one, into Script Properties.

- [x] **4. `GITHUB_REPO` updated** to `F3TheUnion/f3-the-union` after the repo moved.
  Still verify `GITHUB_TOKEN` has write access under the new org.

## Dead code

- [ ] **5. Delete duplicate helper definitions.**
  `getSlackUserId`, `normalizeName`, `getCachedUserId`, `saveUserIdToCache`,
  `lookupSlackUserIdFromApi`, `testLookup` are each defined twice (~76–162 and
  ~197–323) from the merge. Identical bodies; the second silently wins.

- [ ] **6. Delete test leftover globals** (~629–633): `kinevil`, `floppy`,
  `uniball`, `slackToken`, `userId`.

- [ ] **7. Delete scratch functions:** `sendSlackTest`, `sendSlackDM`,
  `debugOpenDM`, both `testLookup`s.

## Organization

- [ ] **8. Add `const` to `KOG_START_DATE`** (~958) — currently an implicit global.

- [ ] **9. Hoist all constants into one config block at the top.**
  They currently sit in 9 places: lines 2, 166, 484, 629, 706, 951, 1638, 2111, 2258.
  This is most of the "disorganized" feeling.

- [ ] **10. Add section banners and reorder** into:
  Config → shared utils (Slack / GitHub / BigQuery) → jobs (Charts, KoG, Metrics,
  Kotter, Open Q). Today the Slack helpers are split apart by an unrelated
  `AO_SITEQ` block.

## Pending this session

- [ ] Flip `DEBUG_ON` back to `false` before the trigger fires for real.
- [ ] Commit the site-Q DM change (`DEBUG_ON`, `GITHUB_REPO`, `sendSiteQDM_`).
