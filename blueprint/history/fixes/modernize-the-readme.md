# Fix: Modernize the README

**Type:** Fix
**Status:** verified
**Branch:** fix/modernize-the-readme

## The problem

`README.md` is 37 plain lines: a short description, then the dev and release
commands. It doesn't show what the extension looks like, it lists none of the
features shipped since (Home competition browser, match center tabs, lineups on
a pitch, alerts, themes), and it doesn't say how the project was built. The user
wants:

- an image at the top;
- a more modern layout;
- a credit saying Footly was built with a spec-driven development (SDD)
  workflow using [AI Blueprint](https://ai-blueprint.dev/).

## The fix

Rewrite `README.md` only. All facts come from the repository.

- **Screenshots are a prerequisite, supplied by the user.** The user captures 2
  or 3 popup screenshots and saves them as `docs/screenshots/home.png`,
  `docs/screenshots/match.png` and `docs/screenshots/lineups.png`, all three or
  any two. `/implement` checks that they exist first, and stops to ask if fewer
  than two are present. It never adds placeholder or broken image links, and
  never generates fake screenshots.
- **Header** (centred HTML block, which GitHub renders):
  - the 128px icon (`public/icons/icon-128.png`), the "Footly" title and a
    one-line tagline;
  - static shields.io badges for Manifest V3, React 19, TypeScript, Tailwind
    CSS 4 and Vitest, with versions from `package.json`;
  - the screenshots in a row, each about 260px wide with alt text that
    describes it.
- **Features:** short emoji-led bullets for what ships today:
  - every competition on Home, with live counts;
  - the match center: Summary, Stats and Lineups tabs, a split timeline, stat
    bars, lineups on a pitch, substitutes, and player photos where ESPN has them;
  - favorite teams' matches;
  - kickoff, goal, card and result alerts;
  - search, dark and light themes, offline and error states.
- **Privacy and permissions:** no account and no tracking. A small table of the
  3 permissions, with reasons copied word for word from `PERMISSION_EXPLANATIONS`
  in `src/lib/privacy.ts`. Data comes from ESPN's public endpoints. Link to
  `PRIVACY.md`.
- **Getting started:** the existing install, dev, test and lint commands, and the
  3-step "Load unpacked" guide, unchanged in substance.
- **Release:** `npm run package`, plus the `STORE_LISTING.md` and icon-script
  notes.
- **How it was built** (new): *"Footly was built with a spec-driven development
  (SDD) workflow using [AI Blueprint](https://ai-blueprint.dev/)."*
  - A small diagram of the loop: plan → spec → build in reviewed steps →
    verify (tests, lint, build) → archive and merge.
  - Where to see it: `blueprint/build-plan.md` (the plan) and
    `blueprint/history/features/` and `fixes/` (one archived spec per shipped
    item).
  - Describe AI Blueprint only by its name, the link, and what this repository
    shows. No other claims about the tool.
- **Must not break:**
  - Every command shown must match `package.json` scripts.
  - No claim that the code doesn't support, for example "no host permissions"
    stays true only because the manifest declares none.
  - Relative links (`PRIVACY.md`, `STORE_LISTING.md`, image paths) must resolve
    from the repository root.
- **Out of scope:**
  - `STORE_LISTING.md`, which stays as it is, by the user's choice.
  - App code.
  - `PRIVACY.md`.
  - The privacy text in `src/lib/privacy.ts`.

## Build steps

- [x] 1. **Rewrite the README.** Confirm the screenshots exist, then rewrite
  `README.md` as above.
  **Done when:**
  - The README opens with the icon, title, tagline, badges and the user's
    screenshots.
  - It has the Features, Privacy, Getting started, Release and How it was built
    sections.
  - Every command matches `package.json`, and every relative link and image path
    exists in the repo.

## Verify

- Check that every linked file exists (`PRIVACY.md`, `STORE_LISTING.md`,
  `public/icons/icon-128.png`, `docs/screenshots/*`), and that the commands
  match `package.json`.
- Run `npm test`, `npm run lint` and `npm run build` to confirm nothing else
  changed. This is a docs-only change, so it needs no new test.
- Preview `README.md` with the editor's Markdown preview, or on GitHub after
  pushing. Check that the header is centred, the screenshots show in a row, and
  the badges render.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4357,"specSha256":"f26996d9a8bb38ed3d5dd6ca7650c4c76b815e4fc49511e8decd757a403877f6","branch":"refs/heads/fix/modernize-the-readme","head":"64853accfe4dc1d2434b22f575d1f4b8cb8a304c","baseRef":"refs/heads/main","baseCommit":"64853accfe4dc1d2434b22f575d1f4b8cb8a304c","sourceTree":"77a981521ca6255cdb33a3b228b5fc747f292253","absentOptional":[]} -->
