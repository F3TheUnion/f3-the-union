# Apps Script cleanup backlog

Working list for `.googleAppsScript`. Kept as ONE file by choice — no splitting.

Status: `[ ]` todo · `[x]` done · `[-]` declined

## Bugs

- [-] **1. `nightlyKoGRun` calls a function that doesn't exist.** DECLINED —
  KoG was a 2026 season thing and is over. If it runs again it starts fresh.
  All KoG code in this file is dormant; ignore it.

- [x] **2. Kotter block removed.** Confirmed leftover from a dropped MySQL/JDBC
  setup. Deleted `SHEET_NAME`, `readKotterData`, `pushKotter`, `pushKotterData`,
  `sendKotterAlert` (140 lines). `KOTTER_WEBHOOK_URL` is no longer needed as a
  Script Property.

## Secrets

- [x] **3. Slack webhooks removed from the file.**
  All three now read from Script Properties: `KOTTER_WEBHOOK_URL`,
  `DEBUGGING_WEBHOOK_URL`, `KOG_WEBHOOK_URL`. The file was never pushed, and the
  two local commits containing the URLs were squashed away, so the webhooks never
  reached the public repo and did not need rotating.

- [x] **4. `GITHUB_REPO` updated** to `F3TheUnion/f3-the-union` after the repo moved.
  Still verify `GITHUB_TOKEN` has write access under the new org.

## Dead code

- [x] **5. Duplicate helper definitions removed.** Verified the 5 real helpers
  had byte-identical bodies before deleting the first copy (97 lines). The two
  `testLookup`s differed only in the test name; kept the `DUFRESNE` one. No
  duplicate function names remain in the file.

- [x] **6. Test leftover globals removed:** `kinevil`, `floppy`, `uniball`,
  `slackToken`, `userId`. Nothing in production referenced them — the real code
  declares its own local `slackToken` and `userId`.

- [x] **7. Scratch functions removed:** `sendSlackTest`, `sendSlackDM`,
  `debugOpenDM` (82 lines with the globals above). Verified zero callers —
  reachable only from the editor's Run dropdown — and `sendSlackDMByUsername_`
  supersedes all three. `testLookup` was KEPT: it is the quickest way to check a
  site Q name still resolves in Slack.

## Organization

- [-] **8. Add `const` to `KOG_START_DATE`.** DECLINED — KoG code, ignored.

- [ ] **9. Hoist all constants into one config block at the top.**
  They currently sit in 9 places: lines 2, 166, 484, 629, 706, 951, 1638, 2111, 2258.
  This is most of the "disorganized" feeling.

- [ ] **10. Add section banners and reorder** into:
  Config → shared utils (Slack / GitHub / BigQuery) → jobs (Charts, KoG, Metrics,
  Kotter, Open Q). Today the Slack helpers are split apart by an unrelated
  `AO_SITEQ` block.

## Pending this session

- [x] Committed as `dbfe7cc` (unpushed).
- [ ] Flip `DEBUG_ON` back to `false` before the trigger fires for real.
- [ ] Add the 3 webhook Script Properties in the Apps Script editor.
