# Feature: Extension Shell

**From build-plan:** feature 1a
**Build attempt:** 1
**Branch:** feature/extension-shell
**Status:** verified

## Goal

Turn the plain Vite + React page into a Manifest V3 Chrome extension whose
toolbar popup renders a minimal Footly shell, styled with Tailwind CSS and
light/dark tokens that follow the system theme. This is the foundation that
1b (Upcoming Matches) builds on. No data, no Chrome APIs, no permissions.

## In scope

- `@crxjs/vite-plugin` (3.x, peer supports Vite 8) wired into `vite.config.ts`.
- A typed manifest in `manifest.config.ts` (`defineManifest`): `manifest_version: 3`,
  `name: "Footly"`, short `description`, `version` from `package.json` (`0.0.0`
  is not a valid Chrome version, so bump `package.json` to `0.1.0`),
  `action.default_popup: "index.html"`, `action.default_title: "Footly"`.
  No `permissions`, no `host_permissions`, no `background`, no `content_scripts`.
- Tailwind CSS v4 via `@tailwindcss/vite`, imported from `src/index.css`.
- Design tokens as CSS custom properties exposed through Tailwind `@theme`
  (background, surface, text, muted text, border, accent), with dark values under
  `@media (prefers-color-scheme: dark)`. Light and dark both meet WCAG AA text
  contrast.
- Popup layout: fixed width 360px, min-height 480px, system font stack, an app
  header reading "Footly" (`<header>` with `<h1>`), and a `<main>` area with a
  short friendly placeholder line ("Upcoming matches will appear here.").
- Remove the unused scaffold styles and assets: Vite demo tokens in
  `src/index.css`, empty `src/App.css`, `src/assets/*`, `public/icons.svg`.
- Enable `"strict": true` in `tsconfig.app.json` (required by coding standards;
  the current code compiles under it).

## Out of scope

- ESPN fetching, `Team`/`Competition`/`Match` types, match list (feature 1b).
- Bottom navigation, Favorites/Search/Settings screens (later features).
- User-selectable theme toggle (feature 14); this shell only follows the system.
- Service worker, `storage`/`alarms`/`notifications` permissions, `@types/chrome`.
- Extension PNG icons, store metadata (feature 18). Chrome's default icon is fine.
- Test runner, CI, Verify command.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet at the end. `workflow.checkpointCommits` is `disabled`: no per-step
commits. `/complete` creates the single feature commit.

## Build steps

- [x] **1. Tailwind and theme tokens.** Install `tailwindcss` and
  `@tailwindcss/vite` as dev dependencies, add the plugin to `vite.config.ts`,
  replace `src/index.css` with `@import "tailwindcss";` plus the token `@theme`
  and dark-mode overrides, delete `src/App.css`, `src/assets/`, and
  `public/icons.svg`. Rebuild `src/App.tsx` as the header + main shell with
  Tailwind classes using the tokens. Enable `strict`.
  **Done when:** `npm run build` and `npm run lint` pass, and `npm run dev` in a
  normal browser tab shows the Footly header and placeholder at 360px width,
  switching colors when the OS/devtools color scheme flips.

- [x] **2. Manifest V3 packaging.** Install `@crxjs/vite-plugin` as a dev
  dependency, add `manifest.config.ts`, register `crx({ manifest })` in
  `vite.config.ts`, add `manifest.config.ts` to `tsconfig.node.json` `include`,
  set `package.json` version to `0.1.0`, and drop the now-irrelevant favicon
  `<link>` and set `<title>Footly</title>` in `index.html`. Check during the step
  that `@crxjs/vite-plugin` 3.x needs no extra config for Vite 8 / plugin-react 6;
  if it does, follow its documented setup rather than adding workarounds.
  **Done when:** `npm run build` and `npm run lint` pass; `dist/manifest.json`
  exists with `manifest_version: 3`, `action.default_popup` pointing at the
  built popup HTML, version `0.1.0`, and no `permissions`/`host_permissions`/
  `background`/`content_scripts` keys; loading `dist/` via
  `chrome://extensions` → Load unpacked shows no errors, and clicking the
  toolbar icon opens the 360px Footly popup with no console errors.

## Files / areas

- `package.json`, `package-lock.json` - dev deps, version `0.1.0`
- `vite.config.ts` - `tailwindcss()` and `crx({ manifest })` plugins
- `manifest.config.ts` (new) - typed MV3 manifest
- `tsconfig.node.json` - include `manifest.config.ts`
- `tsconfig.app.json` - `strict: true`
- `index.html` - title, remove favicon link (stays the popup entry)
- `src/index.css` - Tailwind import, tokens, dark overrides
- `src/App.tsx` - popup shell
- Deleted: `src/App.css`, `src/assets/`, `public/icons.svg`
- `public/favicon.svg` stays untouched (icons are feature 18)

## Data / contracts

- Manifest contract: MV3, zero permissions, popup only. Any permission added
  later must come from a feature that needs it.
- Token names (CSS custom properties, also Tailwind theme colors): `background`,
  `surface`, `foreground`, `muted`, `border`, `accent`. 1b and later UI use these
  instead of raw colors.
- No persisted data, no network, no external input.

## Testing

- No test runner is configured, so no automated tests are added.
- Gates: `npm run build` (typecheck + bundle) and `npm run lint`.
- Manual Chrome check (Load unpacked from `dist/`, open popup, check the
  extension's error panel and popup devtools console) is for the user or `/check`;
  do not claim it unless it was actually performed.
- Inspect `dist/manifest.json` to confirm the permission contract.

## Notes for the AI

- Keep `index.html` at the project root as the popup entry; crxjs resolves
  `default_popup` against the project root and emits it into `dist/`.
- Popup width belongs on `body` or the root container so Chrome sizes the
  popup correctly; do not rely on `100vw`.
- Use semantic landmarks (`header`, `h1`, `main`); the placeholder is plain
  text, not a status region.
- Do not add a service worker, Chrome API calls, or `@types/chrome` "for later".
- Merging this plan edit makes the overview's plan hash stale; that is expected
  until the next `/overview` run and does not block this feature.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6065,"specSha256":"ec7cd8215386667d1732a77205b6a5ccd56ae4b17d8499d82aa596ab8ad8464f","branch":"refs/heads/feature/extension-shell","head":"491a07f2ee1634de8c2935b0b33a8d1c51522606","baseRef":"refs/heads/main","baseCommit":"491a07f2ee1634de8c2935b0b33a8d1c51522606","sourceTree":"6cc730a57684fd26c311f1e73475c09054e51c9b","absentOptional":[]} -->
