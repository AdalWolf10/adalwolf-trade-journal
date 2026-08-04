# Sample Journal Data

Files:
- `adalwolf-r-journal-6-month-sample.json`: import this from the website Data menu.
- `../public/sample-data/tradingview-sample.png`: screenshot used by the daily journal attachments.

The JSON includes six months of sample trades and daily journals from February 2026 through July 2026.
Daily journal entries include 1-5 references to the same sample screenshot so the attachment gallery can be tested.

Import behavior:
- Trades use the normal duplicate review flow.
- Daily journals are added only when that date does not already exist.
- Existing daily journals are skipped, not overwritten.
