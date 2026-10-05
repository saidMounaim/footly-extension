# Feature: Dark & Light Themes

**From build-plan:** feature 14
**Build attempt:** 1
**Branch:** feature/dark-light-themes
**Status:** verified

## Goal

Users can pick the popup's theme in Settings: System (default), Light, or Dark.
The choice is saved locally and applied before the popup first paints, so there is
no flash of the wrong theme. Both themes get a polished pass: native controls and
scrollbars match the theme, and every text and indicator color pair meets
contrast requirements, guarded by an automated test.

## In scope

- **Appearance section** at the top of the Settings view: a radio group "Theme"
  with System, Light, and Dark. System follows the OS setting live, as today.
  It uses the same native radio pattern as "Live match refresh".
- **Applying the theme:**
  - Light and Dark set `data-theme="light"` or `data-theme="dark"` on `<html>`.
  - System removes the attribute.
  - `color-scheme` follows the effective theme, so native radios, scrollbars, and
    the search input match it.
- **No flash on open:**
  - The chosen theme is mirrored to `localStorage` (key `footly-theme`) and
    applied synchronously in `main.tsx` before React renders.
  - `chrome.storage.local` stays the source of truth: once it loads, its value is
    applied and re-mirrored.
  - If `localStorage` is unavailable or throws, nothing breaks. The popup just
    shows the system theme until storage loads.
- **Contrast guard:** a Vitest test reads the light and dark tokens from
  `src/index.css` and checks these WCAG contrast pairs in both themes:
  - `foreground`, `muted`, `accent`, and `warning` on `background` and `surface`,
    each at least 4.5:1.
  - `background` on `accent` (the switch knob) at least 3:1.
  - `border` stays decorative and is not checked.

  The test fails if a token is missing or if the two dark token blocks differ.
- **Polish pass:** check each view in both themes in Chrome: Home, Upcoming,
  Results, Favorites, Search, match detail, and Settings.
  - Fix only problems found in tokens or existing Tailwind classes: invisible
    skeletons, focus rings, the sticky tab bar edge, pill borders, and radio
    accent color.
  - List each fix in the review packet.
- **Errors:** loading and saving use the existing settings pattern. Controls are
  disabled until the value is read. A section shows "Couldn't load this setting."
  if it can't be read. A failed save rolls back and shows the shared "Couldn't save
  your changes. Try again." alert.

## Out of scope

- Themed toolbar or notification icons.
- New colors, a palette redesign, or more than three theme options.
- Theming the background service worker (it has no UI).

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then present one review
packet for the whole feature. `workflow.checkpointCommits` is `disabled`.
`/complete` creates the feature commit.

## Build steps

- [x] **1. Theme setting logic.**
  - In `src/lib/settings.ts`, add:
    - `THEME_KEY = 'theme'` and `THEME_OPTIONS = ['system', 'light', 'dark']`;
    - `parseTheme`, where anything else gives `'system'`;
    - load and save functions on the existing storage helpers.
  - Add `src/lib/theme.ts` with:
    - `applyTheme(root: HTMLElement, theme)`, which sets or removes `data-theme`;
    - `readCachedTheme(storage)` and `cacheTheme(storage, theme)`, which take a
      `Pick<Storage, 'getItem' | 'setItem'>` and swallow any error. A
      `readCachedTheme` failure gives `'system'`.
  - Extend `src/lib/settings.test.ts` and add `src/lib/theme.test.ts`.

  **Done when:** `npm test` passes, with cases for:
  - `parseTheme` with valid values, invalid values, and `undefined`;
  - save and load round trips;
  - `applyTheme` setting and removing the attribute on an element stub;
  - the cache reading invalid values as `'system'`;
  - the cache swallowing thrown `getItem`/`setItem` errors.

- [x] **2. Theme-aware tokens and contrast guard.** Restructure `src/index.css`:
  - Light tokens and `color-scheme: light dark` stay on `:root`.
  - Dark tokens move to `:root[data-theme='dark']`, with `color-scheme: dark`.
  - The same dark tokens go in
    `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }`.
  - `:root[data-theme='light']` gets `color-scheme: light`.

  Add `src/lib/contrast.test.ts` with the pairs above. Adjust a token value only if
  the test proves a pair fails, and record the before and after values.
  **Done when:** `npm test` and `npm run build` pass. Setting `data-theme` by hand in
  the popup's DevTools switches the theme regardless of the OS setting, and
  removing it follows the OS again.

- [x] **3. Appearance setting and no-flash startup.**
  - Add `src/hooks/useThemeSetting.ts` on `useSavedValue`. On every value it has
    read or saved, it calls `applyTheme(document.documentElement, …)` and
    `cacheTheme(localStorage, …)`.
  - In `src/main.tsx`, apply `readCachedTheme(localStorage)` before `createRoot`.
  - Add the Appearance section to `SettingsPanel` and include the setting's
    `saveError` in the App alert.

  **Done when:** `npm run build` and `npm run lint` pass. In the loaded extension:
  - choosing Light or Dark switches immediately and survives reopening the popup
    with no visible flash;
  - System follows the OS when you toggle it in OS settings;
  - the radio group works with the arrow keys.

- [x] **4. Polish pass.** Review every view listed in scope in both themes in
  Chrome. Fix any visibility, focus, or border issue with token or class changes
  only.
  **Done when:** `npm run build`, `npm run lint`, and `npm test` pass. The review
  packet lists each view checked per theme and each fix made, or states that none
  were needed. Record whether this was observed in Chrome or not run.

## Files / areas

- New: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/lib/contrast.test.ts`,
  `src/hooks/useThemeSetting.ts`
- Changed: `src/index.css`, `src/main.tsx`, `src/lib/settings.ts`,
  `src/lib/settings.test.ts`, `src/components/settings/SettingsPanel.tsx`,
  `src/App.tsx`, plus class-only fixes from step 4
- Reused: `useSavedValue`, `readStoredKey`/`writeStoredKey`, the existing token
  names (`background`, `surface`, `foreground`, `muted`, `border`, `accent`,
  `warning`)

## Data / contracts

| Store | Key | Value | Default / invalid |
|---|---|---|---|
| `chrome.storage.local` (source of truth) | `theme` | `"system" \| "light" \| "dark"` | `"system"` |
| `localStorage` (startup mirror only) | `footly-theme` | same strings | `"system"` |

- No permissions change: the `storage` permission already exists, and
  `localStorage` needs none.
- `<html data-theme>` is `"light"` or `"dark"`, or absent for System. The CSS is
  the only consumer.

## Testing

- Vitest: theme parsing and storage, `applyTheme`, cache error handling, and
  token contrast parsed from `src/index.css` (steps 1–2). UI is not
  unit-tested, per coding standards.
- No browser test command exists. Steps 3–4 are checked manually in Chrome; record
  what was actually observed.

## Notes for the AI

- The contrast test computes WCAG relative luminance from 6-digit hex tokens with
  the standard formula. It reads the file with `node:fs` relative to the test file.
- `useThemeSetting` must not apply the default `'system'` before the stored value
  loads. Doing so would undo the cached theme `main.tsx` applied, causing a flash.
  Apply only once `ready` is true or after a change.
- Keep the Appearance radio group's `name` and IDs prefixed with `settings-`.
- Do not add a theme context or provider.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7599,"specSha256":"484fd26edc28e5a0302d8b5b89d26ac2f6732fafae75ce65fa13121474bbf9c8","branch":"refs/heads/feature/dark-light-themes","head":"229e2c330ced83eab074f7548a70b6be2ee53f0b","baseRef":"refs/heads/main","baseCommit":"229e2c330ced83eab074f7548a70b6be2ee53f0b","sourceTree":"df6571d2f36b84fcdc56f5a4d29130001f229e6e","absentOptional":[]} -->
