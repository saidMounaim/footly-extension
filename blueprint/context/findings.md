# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] open - Live/HT status text has no separator before the score

**File:** src/components/matches/MatchRow.tsx:14
**Found:** 2026-10-03 by /audit independent (scope: current; lens: quality)
**Why it matters:** The visual gap between "Live"/"HT" and the score comes only
from the `ml-1` margin (lines 14 and 20). The text content is `Live2–1` /
`HT1–0`, so screen readers and copy/paste get the words run together. The spec
asks for status as text, not only visual presentation.
**Suggested fix:** Render a real space before the score (for example `{' '}`
before the score span) and drop `ml-1`. No current requirement is lost.
**Resolution:**
