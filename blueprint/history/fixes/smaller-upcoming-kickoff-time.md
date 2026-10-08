# Fix: Smaller Upcoming Kickoff Time

**Type:** Fix
**Status:** verified
**Branch:** fix/smaller-upcoming-kickoff-time

## The problem

In the match detail's score header (`ScoreBlock` in
`src/components/matches/MatchDetail.tsx`), a match without a score shows its
kickoff time, for example "21:00", in the centre slot. That slot uses the same
`text-5xl` extra-bold style as a live or final score, so the time looks
oversized next to the crests and the day and countdown lines under it. This
covers upcoming matches, and also postponed or cancelled ones, which have no
score either.

The rows in the match lists already show the kickoff time small (`text-sm`).
They are not changed.

## The fix

- When `match.score` is missing, render the kickoff time at `text-xl` (bold,
  tabular figures) instead of `text-5xl font-extrabold`. When there is a score,
  keep it exactly as it is today.
- Keep the `leading-none`, `tracking-tight` and `tabular-nums` behaviour, so the
  centre column stays aligned.
- **Revision (user request):** for upcoming matches, move the day label and
  countdown (for example "Sat, Oct 10" and "Kicks off in 2d 03h 52m") out of the
  centre column into a centred footer row at the bottom of the score card. The
  footer is set off by a top border, like the scorers row. The centre column
  then holds only the kickoff time, nudged down (`pt-4`) to sit level with the
  crests.
- **Must not break:**
  - The live and finished score size.
  - The day label and countdown text and their live updating. They move to the
    bottom but their content doesn't change.
  - The status pill for live, halftime and finished matches.
  - The crest and team-name columns.

## Build steps

- [x] 1. **Smaller kickoff time.** Choose the size class from whether
  `match.score` exists, in the `ScoreBlock` time and score `<p>`.
  **Done when:** an upcoming match's header shows a visibly smaller kickoff time
  than a finished match's score, with the day and countdown in a footer row at
  the bottom of the card. Live and finished matches keep the status pill under
  the score.
  `npm run lint` and `npm run build` pass.

## Verify

- Run `npm test`, `npm run lint` and `npm run build`. This is a UI-only change,
  so it needs no new unit test.
- Build, reload the extension, and open an upcoming match. The kickoff time is
  smaller, and the day and countdown sit at the bottom of the card. Open a finished match: the score
  is still large. Check both themes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2472,"specSha256":"aaecfd121b14c77ec531dc1a767c9fb5e43021a19f6d188b88ff7896c05d26d5","branch":"refs/heads/fix/smaller-upcoming-kickoff-time","head":"f43ad7dcaa046731369740cc58e9b6261e3aeedb","baseRef":"refs/heads/main","baseCommit":"f43ad7dcaa046731369740cc58e9b6261e3aeedb","sourceTree":"e1fd3134e1813b4b8cd610c3a088e7d65b7493b0","absentOptional":[]} -->
