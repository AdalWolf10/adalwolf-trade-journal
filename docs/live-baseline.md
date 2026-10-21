# Live baseline reference

Recorded: 2026-10-20

## Source of truth

The user explicitly identifies https://journal.shubhamtripathi.com as the
current feature/design baseline. Do not substitute the existing local checkout
or GitHub main without verifying deployment provenance.

GitHub main and the original local HEAD both resolve to:
365c026d5c7907040e591a0fb39ddce8701db7e2
(2026-08-11, Redesign screenshot viewer layout).

The user reports later feature/design changes on production. Matching visible
features is not proof that the deployed source matches this commit.

## Observed live interface

- Private Home with journal summary, page shortcuts and recent activity.
- Dashboard with month ribbon, month/year/all/custom report ranges,
  session/setup/tag/result/BE/PA filters, calendar and sortable trade log.
- Journal score, exit strategy ranking, weekday analysis and cumulative R.
- Standalone Quality page with setup, setup/session, session, breakeven-day,
  discipline, emotion, PA rating, tags/keywords, weekday and setup-rating analysis.
- Standalone Device Files with TV code controls and storage status.
- Data menu with JSON/Excel import, Excel template, AI analysis packet,
  full ZIP backup and merge/replace ZIP restore.
- Sidebar links for Home, Dashboard, Calendar, Trade Log, Analytics, Quality,
  Device Files and Trash, plus New Trade, Security and Logout.

This inventory is observational, not a complete behavioral test or source backup.
Private journal content and credentials are intentionally excluded.

## Preservation status

- Local UI work is uncommitted on codex/premium-journal-ui.
- No redesign was deployed or pushed.
- Production records were not changed during this inspection.
- Cloudflare authorization was renewed successfully on 2026-10-20.
- Latest deployment: be338687-ac8e-40c3-8abe-bfecd41392e3,
  created 2026-08-12T05:18:45.683331Z, with 100% assigned to version 28.
- Version 28: a8e2fef8-8b7f-4ff1-83cf-2903827d296f.
- Script etag: 84e4596da33ce0317c2e6ab0422822040c9737eae826f38fe9bc46eadd9205d2.
- Deployment source is Wrangler; metadata contains no Git commit annotation.
- This records a deployment reference, not a downloaded source or data backup.
  Corresponding original source remains unverified.

## Gate before resuming

### Frontend verification completed

Built commit 365c026 in an isolated temporary folder using installed dependencies.
Compared public production assets with that build:

- index-DV8JGg0f.css: byte-for-byte identical.
- JournalApp: identical after normalizing generated JS chunk import names.
- QualityPageClient: identical after the same normalization.
- DeviceFilesClient: identical after the same normalization.

This verifies the principal live UI source against that commit, not the backend,
database contents, secrets, deployment configuration, or every auxiliary asset.
Generated JS chunk names were normalized with the pattern
`(\./)?[A-Za-z_-]+-[\w-]{8}\.js`; no application statements were otherwise removed.

Saved source archive: outputs/baselines/live-frontend-365c026.zip.
Archive integrity checked with unzip -t. It contains committed source, not private
production data or uploaded screenshots. outputs is ignored by Git.

Use this verified frontend as the UI baseline. Preserve backend code and data;
independently verify deployed backend provenance before any production release.
Local redesign remains separate and uncommitted; no deployment or push performed.
