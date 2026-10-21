# Journal UI refresh

Implementation of the user's UI/UX brief. Preserve trade calculations,
authentication, import/export, backups, storage, and all record mutations.

- [x] Shared sidebar and restrained theme tokens across all private pages.
- [x] Compact month/range/filter controls and clearer dashboard hierarchy.
- [x] Comfortable daily reading and editing, consistent dialogs and attachments.
- [x] Balanced Quality, Device Files, Home, and Trash layouts.
- [x] Build, lint and existing source checks; desktop/mobile visual spot checks.
- [x] Full build, source-test, authentication, and session-revocation regression.

Use existing handlers and components. Lucide supplies navigation/control icons.
Keep sample data local. Do not deploy, push, or change production data.
Check long labels, empty states, active filters, custom ranges, draft retention,
scrollable tables, image fitting, and keyboard focus during browser verification.

Preview verification: both themes, dashboard with July sample data, shared
navigation, filters disclosure, New Trade opening, outside-click draft retention,
daily journal, screenshot fitting at desktop/wide/mobile sizes, Quality,
Device Files and Trash empty state. No production records modified.

Import/export and backup/restore retain their existing application tests and were
manually exercised during this feature cycle. Authentication, logout, and revoked
session behavior were verified against the local D1 database. The production
release still requires the generated D1 migration before deployment.
