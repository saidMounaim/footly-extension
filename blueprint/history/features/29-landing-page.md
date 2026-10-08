# Feature: Landing Page

**From build-plan:** feature 29
**Build attempt:** 1
**Branch:** feature/landing-page
**Status:** verified

## Goal

Give Footly a modern, lightly animated one-page website that sells the extension and
hosts its privacy policy at `/privacy`. It is a static site in its own `site/` folder,
deployed to Vercel, and kept completely separate from the extension build.

## Design reference

There is no mockup. Use the extension's own look:

- Screenshots from `docs/screenshots/`: `home.png` (708x1212), `match.png` (708x962), and
  `lineups.png` (708x1216). All three show the dark theme.
- The icon `public/icons/icon-128.png`.
- The dark tokens from `src/index.css`: background `#0b0f14`, surface `#151b23`, border
  `#273140`, foreground `#f3f4f6`, muted `#9ca3af`, accent `#4ade80`, pitch `#14532d` and
  `#166534`, card red `#ef4444`.

## In scope

- **`site/index.html`**, a landing page with four sections:
  1. **Hero.** A headline, a subline, and an "Add to Chrome" button. Under the button,
     the line "Free · No account · No ads". Beside the text, a framed popup mockup
     (`home.png`) that floats gently. A goal-alert card ("⚽ GOAL" with a sample score)
     slides in over the mockup on a loop. A pulsing **LIVE** dot. A slow marquee of
     competition names (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions
     League, World Cup, Euro, Copa América, Africa Cup of Nations). A soft green glow
     sits behind the hero.
  2. **Feature grid.** Four tiles in a bento layout that reveal on scroll:
     - Match center, using `lineups.png` or `match.png`.
     - Live alerts.
     - Favorites first.
     - Dark and light themes.

     Copy comes from `STORE_LISTING.md` and the README features list.
  3. **Privacy strip.** "No account, no tracking, no ads", plus the three permissions
     (Storage, Alarms, Notifications) with the exact reasons from
     `PERMISSION_EXPLANATIONS` in `src/lib/privacy.ts`.
  4. **Final call-to-action and footer.** A closing "Add to Chrome" button. The footer
     has links to Privacy (`/privacy/`) and GitHub
     (`https://github.com/saidMounaim/footly-extension`), and the copyright line
     "© Footly".
- **`site/privacy/index.html`**, the content of `PRIVACY.md` as a readable HTML page in
  the same style, with a link back home. Vercel serves it at `/privacy`.
- **`site/style.css`**, one shared stylesheet for both pages:
  - Plain CSS with the tokens above defined on `:root`.
  - System font stack, so the site makes no third-party requests, in line with the
    privacy pitch.
  - Mobile-first and responsive: one column under 768px, a 16px side gutter, and no
    horizontal scroll at 360px width.
- **`site/main.js`**, the one place the store link lives: `const STORE_URL = ''`.
  - When the value is non-empty, every `[data-store-link]` gets it as its `href`.
  - While it is empty, those links keep `href="#"` and clicks call `preventDefault`,
    so the page neither jumps nor reloads.
  - The button always reads "Add to Chrome", never "Coming soon".
- **Animation, CSS-first:**
  - Hero float, toast slide-in, LIVE pulse, and marquee use `@keyframes`.
  - Scroll reveal uses `animation-timeline: view()` inside
    `@supports (animation-timeline: view())`. Browsers without it simply show the
    content, with no JS fallback.
  - Everything is disabled under `@media (prefers-reduced-motion: reduce)`, and the
    content stays visible.
- **`site/assets/`**: copies of the three screenshots and `icon-128.png`. Vercel deploys
  only `site/`, so files outside it can't be referenced.
- **Favicon, title, and meta:** each page has a `<title>`, a `meta description`, Open
  Graph title, description, and image (the icon), and a favicon. The image `alt` text
  comes from the README's screenshot alt text.
- **Drift test** `site/site.test.ts`. The site copies text from the extension, and this
  test fails when they diverge.
- **README:** a short "Website" section covering local preview, Vercel setup, and where
  to set `STORE_URL`.

## Out of scope

- Deploying, creating the Vercel project, a custom domain, or pushing. The README
  documents the steps; the user does them.
- A build step, framework, Tailwind, npm dependency, or `vercel.json`. Vercel's
  zero-config static hosting already serves `privacy/index.html` at `/privacy`.
- Light theme for the site, Arabic or any other language, analytics, cookies, forms,
  newsletter, and web fonts.
- Any change to the extension in `src/`, `manifest.config.ts`, or `PRIVACY.md`.
- Filling in the real Web Store URL. That happens when the listing is live.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`. Implement all
steps in order, then present one review packet for the whole feature. There are no
per-step commits; `/complete` creates the single feature commit.

## Build steps

- [x] **1. Site skeleton and hero**
  - Create `site/index.html`, `site/style.css`, `site/main.js`, and `site/assets/`
    (copied images).
  - Build the hero with all its animation (float, toast loop, LIVE pulse, marquee,
    glow) and the `STORE_URL` link handling.
  - Add the reduced-motion block.
  - *Done when:*
    - `python3 -m http.server 4173 -d site` serves `/` with the hero and moving parts.
    - "Add to Chrome" does nothing visible on click while `STORE_URL` is empty.
    - With reduced motion emulated, everything is static and visible.
    - At 360px wide there is no horizontal scroll.
    - `npm run build` still passes and `dist/` contains no `site/` files.
- [x] **2. Feature grid, privacy strip, final CTA and footer**
  - Add the remaining three sections and the scroll reveal under `@supports`.
  - *Done when:*
    - Scrolling in Chrome fades the tiles in.
    - The layout is one column under 768px and the bento grid above it.
    - The privacy strip shows the three permission reasons exactly as
      `PERMISSION_EXPLANATIONS` words them.
    - Footer links go to `/privacy/` and the GitHub repo.
- [x] **3. Privacy page and drift test**
  - Port `PRIVACY.md` into `site/privacy/index.html`, keeping its tables as HTML tables
    with header cells.
  - Add `site/site.test.ts` and add it to `tsconfig.node.json` `include`.
  - *Done when:*
    - `/privacy/` renders the whole policy in the site style, with a link home.
    - `npm test` passes, including the new test.
    - Changing one permission reason in a site page makes the test fail.
- [x] **4. README Website section**
  - Document local preview (the `python3` command above).
  - Document Vercel setup: import the repo, Root Directory `site`, Framework Preset
    "Other", no build command.
  - Say that `STORE_URL` in `site/main.js` is the one value to fill in once the listing
    is live.
  - *Done when:* the section exists, and `npm run lint`, `npm test`, and `npm run build`
    all pass.

## Files / areas

- New: `site/index.html`, `site/privacy/index.html`, `site/style.css`, `site/main.js`,
  `site/site.test.ts`, `site/assets/{home,match,lineups}.png`, `site/assets/icon-128.png`.
- Changed: `tsconfig.node.json` (include `site/site.test.ts`), `README.md` (Website
  section).
- Read only: `src/lib/privacy.ts` (`PERMISSION_EXPLANATIONS`, `CONTACTED_HOSTS`),
  `PRIVACY.md`, `STORE_LISTING.md`, `src/index.css`.

## Data / contracts

- **Routes on Vercel:** `/` comes from `site/index.html` and `/privacy` from
  `site/privacy/index.html`. Internal links are root-absolute (`/`, `/privacy/`) and
  assets are referenced as `/assets/...` and `/style.css`, so both pages resolve the
  same way on the Python preview and on Vercel.
- **Store link:**
  - Every install button is `<a data-store-link href="#">Add to Chrome</a>`.
  - `STORE_URL` in `site/main.js` is the single source of the link.
  - The script loads with `defer` and has no other behavior.
- **Drift test assertions:**
  - Both `site/index.html` and `site/privacy/index.html` contain every
    `PERMISSION_EXPLANATIONS` reason.
  - `site/privacy/index.html` contains every `CONTACTED_HOSTS` host and purpose, and
    every `## ` heading text from `PRIVACY.md`.
  - Both pages have at least one `[data-store-link]`, and `site/main.js` declares
    `STORE_URL`.
- **No external requests:** no external scripts, stylesheets, fonts, or images. The only
  outbound links are GitHub and, later, the Web Store.

## Testing

- **Automated:** `site/site.test.ts` runs under the existing Vitest config. The default
  include already matches `site/*.test.ts`; adding it to `tsconfig.node.json` lets
  `npm run build` typecheck it.
- **Manual:** check in Chrome through the local preview at desktop width and at 360px,
  with reduced motion emulated in DevTools, and with the keyboard (visible focus on the
  buttons and links). Only claim checks that were actually run.
- **Unchanged gates:** `npm run lint`, `npm test`, and `npm run build`. ESLint only lints
  `*.{ts,tsx}`, so `site/main.js` is not linted; keep it a few lines long.

## Notes for the AI

- The site is dark only, unlike the popup, as a deliberate design choice (dark-first).
  Still set `color-scheme: dark` and give `body` an explicit background. Text must meet
  WCAG AA contrast on `#0b0f14` and `#151b23`.
- **Accessibility:**
  - Use semantic landmarks (`header`, `main`, `section` with headings, `footer`).
  - Give images real `alt` text.
  - Make the marquee and toast decorative (`aria-hidden="true"`), with the competitions
    also listed in readable text elsewhere or omitted from the accessible tree as pure
    decoration.
  - Animation must never hide content: the reveal starts from a visible state when
    unsupported or under reduced motion.
- Crop the thin artifact at the top edge of `home.png` with the frame (`object-fit` or
  overflow) instead of editing the image.
- Copy rules from the coding standards: no em dashes, en dashes, or ellipsis characters
  in page text or comments. Keep comments to the why.
- Don't add `site/` to the crxjs build, ESLint config, or `tsconfig.app.json`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10027,"specSha256":"a967c27d76e701b2899320150e2182eff0b1f650574705e0a6757b7ffa82eee1","branch":"refs/heads/feature/landing-page","head":"d89c4925bf4e742db7347a2609cd802d3387800b","baseRef":"refs/heads/main","baseCommit":"d89c4925bf4e742db7347a2609cd802d3387800b","sourceTree":"d21e8e6cfe08c673f9ce2975a5d33d5df0505097","absentOptional":[]} -->
