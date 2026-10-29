# Site Library (working name): a tested, ranked library of useful websites

Status: **M2 started early: the landing page is built.** No database or accounts yet.

## How to run
You need Node.js 22.23.4 or newer (`node -v` to check).

```bash
npm ci          # install exact versions from package-lock.json
```

The project lives in `Documents/Anmol/Product-projects/site-library/` (renamed from `Product:projects` on 2026-10-29, because the `:` broke `npm run` and the dev server; see DECISIONS.md D5).

| Task | Command |
|---|---|
| Dev server (live reload while editing) | `npm run dev`, then open the address it prints. It runs in the background; stop it with `npx astro dev stop` |
| **Run the real site locally (with the page-view counter)** | `npm run local`, then open http://localhost:4321. It builds first, then serves the site and `/api/visits`. Stop with Ctrl+C. It counts unique browsers with a small cookie (named `visited`). The count is kept in `.data/visits.json`; delete that file to reset it to 0. To count yourself again, clear this site's cookies |
| Run the site locally without the counter | `npm run build && npm run preview -- --port 4321`. Stop with `npx astro preview stop`. No counter shows, because this server has no `/api/visits` |
| Type-check | `npm run check` |
| Production build | `npm run build` |
| Vulnerability audit | `npm audit` |

**Dev vs preview:** dev rebuilds instantly when you save a file, and shows a small Astro toolbar at the bottom (dev only). Preview serves the finished build, exactly what visitors will get. After changing code, re-run the build to see it in preview.

## Where things are
| Path | What |
|---|---|
| `src/pages/index.astro` | The landing page |
| `src/layouts/main.astro` | Shared `<head>` and page shell |
| `src/components/ui/` | Owner-provided components (shadcn convention) |
| `src/components/landing/` | Our page-specific pieces (e.g. hero content) |
| `src/styles/global.css` | Design tokens + Tailwind setup |
| `src/styles/hero.css` | Styles for the hero and buttons |
| `src/config/site.ts` | Site name and links (one place to change them) |
| `src/pages/websites.astro`, `sign-in.astro` | The list page (empty for now) and the sign-in page (design only, connected to nothing) |
| `src/components/auth/AuthShowcase.astro`, `src/config/showcase.ts` | The looping picture columns on the sign-in page, and the cards in them |
| `src/components/SiteHeader.astro` | The top bar shared by every page |
| `src/components/scenes/scene.tsx`, `src/styles/scenes.css` | The animated mini screens in the picture boxes (home page and sign-in panel) |
| `scripts/local-server.mjs` | Local-only server: serves `dist/` and runs the counter at `/api/visits` (no packages). Not used once the site is hosted |
| `src/components/VisitCounter.tsx`, `src/components/ui/animated-counter.tsx` | The live "people visited" counter in the home header, and the rolling-digit component it uses |
| `src/scripts/` | `reveal-on-scroll.ts` (starts the box entrance animation), `auth-notice.ts` (the sign-in message) |
| `src/styles/reveal.css` | The box entrance animation (pure CSS) |
| `src/config/categories.ts`, `src/config/showcase.ts` | The words and scene for each home box, and for each sign-in feature card |
| `public/images/` | Self-hosted images |

## Docs map
| File | What's in it |
|---|---|
| `project_spec.md` | The product spec |
| `CONTEXT.md` | Current state, always-do checklist, hard gates, next steps. **Read first.** |
| `ARCHITECTURE.md` | How the pieces fit |
| `SECURITY.md` | Threat model, permission table, controls |
| `DECISIONS.md` | What we chose and why |
| `TESTING.md` | Test plan and what has been verified |
| `INCIDENT.md` | What to do when something goes wrong |
| `COMPONENTS.md` | Component inventory and design tokens |
| `research_template.csv` | Columns for your research sheet |

## Putting it online (Cloudflare)

The site is plain files, so it is hosted with Cloudflare "Workers static assets" (free). Settings live in `wrangler.jsonc`; extra response headers live in `public/_headers`.

- **Build command:** `npm run build` (makes the `dist/` folder).
- **Deploy command:** `npx wrangler deploy` (uploads `dist/`).
- **From your computer:** `npx wrangler login` (opens a browser once), then `npm run build && npx wrangler deploy`.
- **Automatic on every push:** in the Cloudflare dashboard, Workers & Pages, Create application, import the GitHub repo, and use the two commands above.
- **Secrets:** none are needed today. If one is ever needed, put it in an environment variable (a local `.env` file, or the Cloudflare dashboard), never in the code. `.env` files are blocked by `.gitignore` and by a local pre-commit check (`gitleaks`).
- **The visitor counter does not work online.** It needs `scripts/local-server.mjs`. Online, the page simply shows no counter (DECISIONS D12, D15, D21).
