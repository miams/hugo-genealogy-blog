# Repository Guidelines

## Project Structure & Module Organization
- `content/` — Markdown bundles grouped by numeric case folders (`posts/001`, `posts/004`); start new stories with a fresh folder and keep the primary article in `index.md`, leaving supporting documents in descriptive PascalCase filenames.
- `layouts/partials/` — PaperMod overrides and bespoke components; clone theme templates here instead of editing `themes/hugo-PaperMod/` directly.
- `assets/` — SCSS and JavaScript processed through Hugo Pipes; outputs are cached under `resources/` and should never be edited by hand.
- `static/` — Passthrough files (images, PDFs, data dumps); store hero imagery under `static/img/` so existing shortcodes continue to resolve.
- `data/` — Structured data files (CSV, YAML, JSON) supporting tables and timelines; align filenames with the matching post folder for easier discovery.
- `public/` — Generated site; treat as disposable build output.

## Build, Test, and Development Commands
- `hugo server -D` — Run a live preview with drafts and future-dated posts; refreshes automatically on content or layout changes.
- `hugo --gc --minify` — Production build used by Netlify (`HUGO_VERSION=0.142.0`); run before pushing to confirm pages render cleanly.
- `npx prettier --write "layouts/**/*.{html,xml}" "content/**/*.md"` — Apply repository formatting (Prettier + `prettier-plugin-go-template`).

## Coding Style & Naming Conventions
Use two-space indentation in HTML/Go templates and wrap long attribute lists one per line to match existing partials. Front matter remains YAML; keep PaperMod boolean params (e.g., `ShowWordCount`, `ShowToc`) in PascalCase and group taxonomy arrays (`tags`, `categories`) before other metadata. Name new content directories with zero-padded numeric IDs and prefer `kebab-case` for image assets. Avoid committing generated HTML or resources; rely on Hugo to rebuild them.

## Testing Guidelines
Automated tests are not yet defined; treat `hugo --gc --minify` as the regression gate and watch for warnings about missing resources or invalid shortcodes. When editing data-backed tables, open the relevant page in `hugo server` and verify sorting/filtering interactions manually. Capture screenshots of significant UI changes for stakeholder review.

## Commit & Pull Request Guidelines
Follow the existing history: concise, capitalized summaries in present tense (`Datatables CSS fix for controls overlapping numbers`) and limit the subject to ~70 characters. Squash incidental work before opening a PR. Each PR should include: a high-level summary, links to any tracking issues, screenshots or before/after diffs for UI updates, and notes on content status (`draft: true/false`). Check that Prettier and `hugo --gc --minify` have been run locally before requesting review.

## Content & Data Tips
Historical narratives often reference shared people or events; cross-link using Hugo shortcodes rather than raw URLs to preserve theme styling. Store private research artifacts outside the repo and expose only derived summaries. When adding translations, mirror strings in `i18n/` and verify fallbacks via the local server.
