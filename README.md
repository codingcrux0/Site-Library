# Site Library (working name)

A free, tested, ranked library of useful websites. Every entry is tried by hand, dated, scored, and comes with "the catch".
Version 1 has one category: Frontend Components. The landing page is built; there is no database and no real sign-in yet.

Built with Astro 7 (static pages) + React (small interactive pieces) + Tailwind 4.

## Host it on Cloudflare (free)

The site is plain files, so Cloudflare just serves them. No server, no secrets, no settings to fill in.
Everything it needs is already in this repo: `wrangler.jsonc` (what to upload) and `public/_headers` (safe response headers).

**Option A, from your own computer (simplest, about 3 minutes):**
```bash
npm ci                          # install the exact versions (first time only)
npx wrangler login              # opens your browser once; log in to Cloudflare
npm run build && npx wrangler deploy
```
The last command prints your address, like `https://site-library.<your-name>.workers.dev`. To update the live site later, run the last command again.
To change the address, edit `"name"` in `wrangler.jsonc` before the first deploy.

**Option B, automatic on every push (set up once in the Cloudflare dashboard):**
1. Workers & Pages, Create application, import a Git repository, and choose this repo.
   When it asks which repos Cloudflare may read, choose **Only select repositories** and pick only this one.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`. Root directory: leave empty.
3. Save. From then on, every push to `main` goes live by itself.

**Good to know:**
- **The "Page views" counter works online** (`worker/index.mjs`, a tiny Worker plus one stored number in a Cloudflare Durable Object). It has **no cookie** and stores nothing about visitors. A refresh counts again, which is why it says "page views", not "people". It starts at 0 online. If its free daily allowance runs out, only the counter disappears; pages keep working. Details: `docs/DECISIONS.md` D22.
- Sign-in is a design only. It is connected to nothing and says "Accounts are not open yet".
- Free plan: requests for plain files are free and unlimited per Cloudflare's docs (checked 2026-10-29). Details in `docs/DECISIONS.md`.

## Secrets and safety rules

- **This site needs no secrets today.** `.env.example` shows the pattern for later.
- **Never commit a `.env` file.** `.gitignore` blocks `.env`, `.env.*`, `.dev.vars`, `*.pem`, `*.key`, `*.p12`.
- A local `gitleaks` check runs before every commit and every push and stops secrets (set up in `.git/hooks/`; it lives on one computer and is not part of the repo).
- GitHub Actions (`.github/workflows/ci.yml`) re-runs the type-check, the build and the dependency audit on every push. It uses no secrets.
- Real keys go in environment variables (a local `.env`, or Cloudflare's dashboard), never in code, logs or screenshots.

## Run it on your computer

You need Node.js 22.23.4 or newer (`node -v` to check), then `npm ci` once.

| Task | Command |
|---|---|
| Dev server (live reload while editing) | `npm run dev`, then open the address it prints. Stop it with `npx astro dev stop` |
| **Run the real site locally (with the counter)** | `npm run local`, then open http://localhost:4321. It builds first, then serves the site and `/api/visits`. Stop with Ctrl+C. The count is kept in `.data/visits.json` (delete the file to reset it to 0) |
| Run the finished build without the counter | `npm run build && npm run preview -- --port 4321`. Stop with `npx astro preview stop` |
| Type-check | `npm run check` |
| Counter tests | `npm test` |
| Production build (makes `dist/`) | `npm run build` |
| Vulnerability audit | `npm audit` |

Dev shows changes instantly but adds a small toolbar. Preview and `npm run local` serve exactly what visitors get; re-run the build after changing code.

## Where things are

```
site-library/
├── README.md              you are here
├── wrangler.jsonc         Cloudflare hosting settings
├── package.json           commands and dependencies
├── docs/                  all the project notes (see "Docs" below)
├── public/                files served as they are: images, favicon, _headers
├── worker/                the online page-view counter (index.mjs) and its rules + tests
├── scripts/               local-server.mjs (the same counter, on your computer only)
├── .github/workflows/     ci.yml (automatic checks)
└── src/
    ├── pages/             one file per page: index, sign-in, websites
    ├── layouts/           main.astro (shared page shell)
    ├── components/        ui/ (supplied components), landing/, auth/, scenes/, SiteHeader, VisitCounter
    ├── config/            the words: site.ts, categories.ts (home boxes), showcase.ts (sign-in cards)
    ├── styles/            global.css (colours, Tailwind), hero.css, reveal.css, scenes.css
    ├── scripts/           small browser scripts (box entrance, sign-in form)
    └── lib/               utils.ts (class-name helper)
```

| To change... | Edit |
|---|---|
| Site name and links | `src/config/site.ts` |
| The words and picture of each home box | `src/config/categories.ts` |
| The feature cards on the sign-in page | `src/config/showcase.ts` |
| The animated mini screens | `src/components/scenes/scene.tsx` and `src/styles/scenes.css` |
| Colours and design tokens | `src/styles/global.css` |

## Docs

| File | What's in it |
|---|---|
| `docs/CONTEXT.md` | Current state, always-do checklist, hard gates, next steps. **Read first.** |
| `docs/project_spec.md` | The product spec |
| `docs/ARCHITECTURE.md` | How the pieces fit |
| `docs/SECURITY.md` | Threat model, permission table, controls |
| `docs/DECISIONS.md` | What we chose and why (D1 to D20) |
| `docs/TESTING.md` | What has been verified, with real results |
| `docs/INCIDENT.md` | What to do when something goes wrong |
| `docs/COMPONENTS.md` | Component inventory and design tokens |
| `docs/research_template.csv` | Columns for your research sheet |

Hard gates before launch (see `docs/CONTEXT.md`): a lawyer must review the privacy policy and the 18+ rule before real accounts, and must review the privacy policy. (The old unique-visitor cookie was removed on 2026-10-29; if it ever comes back, a lawyer must say whether it needs a consent notice.)
