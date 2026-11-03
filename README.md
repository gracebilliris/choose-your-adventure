# Storyloom · Choose Your Adventure

A branching story editor and reader, built with React, TypeScript and Vite. No accounts, API, external assets or server.

**Live:** https://gracebilliris.github.io/choose-your-adventure/

## Run

Node 22:

```sh
npm ci
npm run dev -- --port 5195
npm test
npm run build
npm run preview -- --port 5195
```

## Create and play

- Begin with either original adventure in **Sample stories**, or choose **New story**.
- Edit the story title and description. **Add passage**, write its text, and **Add choice** to link to another passage. Self-links and cycles are supported.
- Set a **Starting passage** and mark your conclusions **Ending passage**. Marking an ending removes its outgoing choices. **Undo** restores the last 30 edits.
- Switch between **List** and **Story map** to inspect connections. Story notes identify unreachable passages and invalid links. Deleting a passage removes incoming links and assigns a new start if necessary.
- **Play** previews the story immediately. Follow choices, inspect **Your journey**, go **Back**, or **Restart**. History keeps the latest 500 passages; cycles do not recurse.
- Empty stories and unfinished paths have explicit previews; invalid choices cannot navigate.

## Save, import, export and share

Edits, including incomplete drafts, auto-save in this browser’s localStorage under `choose-your-adventure.draft.v1`; the portable-story storage helper uses `choose-your-adventure.story.v1`. Only one current draft is stored. Starting a new story replaces only this app’s draft; other apps’ keys are never cleared. Storage can be unavailable or cleared: use **Export JSON** for durable backups. New story/sample/import replacement asks first and supports Undo. Shared stories open in Play without overwriting your saved draft until edited.

**Export JSON** creates a portable version-1 story file. **Import JSON** validates its exact schema, field lengths, IDs and graph before replacing anything. Fix errors before exporting or sharing; unreachable passages and unfinished paths are warnings and are allowed.

**Share story** copies a self-contained snapshot URL, with manual copy fallback. The `#story=` fragment contains base64url UTF-8 JSON. No story upload is involved. It is not encrypted: anyone holding the link can read or remix it. Link previews and messaging services may impose smaller URL limits. Subsequent edits do not update previously shared snapshots.

Limits: 200 KiB JSON; 200 passages; 20 choices per passage; 200-character titles; 2,000-character description; 20,000-character passage text; 500-character choice labels; 100-character IDs. Share fragments are limited to 16,000 characters; use JSON for larger stories. Malformed imports, oversized links, unknown fields and invalid graph references are rejected without replacing the current draft. All text is rendered as text, never HTML or executable code.

Two included original adventures: **The Lighthouse That Forgot the Sea** and **The Last Orchard in the Sky**, each with multiple distinct endings.

## Checks

`npm test` covers graph validation, traversal, cycles, deletion, malformed input, size limits, storage and Unicode sharing. Browser smoke coverage is in `tests/browser.cjs`; it uses the shared Playwright installation at `../brick-by-brick/node_modules/@playwright/test`:

```sh
node tests/browser.cjs http://127.0.0.1:5195
```

The browser check creates/edits a branch, plays to its ending, checks back/restart/history, exports/imports, reloads drafts, tests sharing and malformed input, and checks mobile layout. Evidence is written to ignored `artifacts/`.

## Deploy

The public repository publishes through `.github/workflows/deploy.yml`. Node 22 runs `npm ci`, tests and a production build, then uploads `dist` and deploys to GitHub Pages. In repository Settings → Pages, select **GitHub Actions**. Vite uses `base: './'` for project Pages paths. Push to `main` or run the workflow manually. No secrets are required.
