# CLAUDE.md — Iiams Family Genealogy

> Project memory for Claude Code. This file encodes **how this blog is built, how
> it looks, and how it reads**. Read it before touching templates, CSS, or content.
> The goal is a warm, literary, storytelling-first genealogy site rigorously
> grounded in evidence — documents, images, and a proper sources apparatus in the
> tradition of Elizabeth Shown Mills' *Evidence Explained*. UX should be
> informative and **unobtrusive**: the design serves the story and the proof,
> never decorates.

## Project status — theme transition

The site is a Hugo blog deployed on Netlify (https://blog.iams.name). It currently
runs on **hugo-PaperMod** with overrides in `assets/css/extended/` and `layouts/`.
We are transitioning to a custom theme called **"heirloom"** built on the
**Storyteller** direction; the full design system is in Part II below. PaperMod
remains the production theme until heirloom reaches parity. Operational commands,
deploy targets, content paths, and the RootsMagic database access are unchanged
across the transition.

---

# Part I — Operations & current state

## Essential Commands

### Development
- Start development server: `hugo server --buildDrafts -F`
  (Hugo's built-in server. Listens on `http://localhost:1313/` by default; pass
  `-p 8888` for the legacy port if needed.)
- Build for production: `hugo --gc --minify`
- Format code: `pnpm prettier --write .`
- Install dependencies: `pnpm install`

### Git and Deployment
- SSH setup (required for push): `ssh-add ~/.ssh/miams-github`
- Deploy: `git push origin main` (auto-deploys to Netlify)
- Check deployment status: `netlify status` (Homebrew install at
  `/opt/homebrew/bin/netlify`; a stale nvm copy may shadow it — see Caveats below)

## Current content structure

- **Posts**: `content/posts/[###]/` directories with `index.md` (or a named file).
  Page-bundle migration to co-located images is part of the heirloom transition;
  during transition, images may still live under `static/img/[###]/`.
- **Data sources**: YAML files in `data/` (`findagrave.yml`, `slavery.yml`).
- **Static assets**: Images, PDFs, and documents organized by post number in
  `static/img/[###]/` and `static/files/[###]/`. Render hook
  `layouts/_default/_markup/render-image.html` adds lazy loading, width/height,
  WebP `<picture>` fallback, and figure/figcaption wrapping when a markdown image
  carries a title.

## Current custom components (PaperMod-based)

These exist in the current production theme and will be reimplemented in the
heirloom theme per Part II. Don't extend them further — new components belong in
heirloom.

- **Shortcodes (`layouts/shortcodes/`)**:
  - `03_findagrave.html` — DataTables-rendered genealogical records.
  - `01_slavery.html` — historical-context table from `data/slavery.yml`.
  - `book-list.html` — bibliography rendering.
- **Partial overrides (`layouts/partials/`)**: `head.html`, `extend_head.html`,
  `google_analytics.html`, plus an override for `templates/twitter_cards.html`.
- **Static-side JS/CSS**: `static/js/lightbox.js`, `static/js/wikipedia-preview.js`,
  `static/js/image-float.js`, plus their CSS siblings.
- **Theme submodule**: `themes/hugo-PaperMod/` (Git submodule). The submodule has
  three in-place patches needed for Hugo ≥ 0.146; Netlify pins 0.142 so the
  patches are not currently required there.

## Configuration

- Hugo v0.142.0 (extended) is pinned in `netlify.toml`. Local dev runs newer Hugo;
  if you upgrade Netlify, the theme submodule patches become load-bearing.
- Site deploys automatically via Netlify on push to `main`.
- Google Analytics ID: `G-G7BZ69D7P6` (loaded via custom partial, not Hugo internal).
- Base URL: `https://blog.iams.name`.
- Build excludes `.txt` files from `posts/`.

## RootsMagic Genealogy Database

The author's primary genealogy database is a RootsMagic 11 `.rmtree` file (SQLite 3). When researching for blog posts, query it directly rather than asking the user to look things up.

### Locations

- **Database**: `~/Code/RMCitecraft/data/Iiams.rmtree` (~210 MB; 11,709 persons, 12,258 names)
- **ICU extension** (required for RMNOCASE collation): `~/Code/RMCitecraft/sqlite-extension/icu.dylib`
- **Annotated schema**: `~/Code/RMCitecraft/docs/annotated-schema.sql` (definitive reference; 31 tables with field-level comments)
- **Schema reference (human-readable)**: `~/Code/RMCitecraft/docs/reference/schema-reference.md`
- **Relationship encoding**: `~/Code/RMCitecraft/docs/reference/relationships.md` (how Relate1/Relate2/Flags encode parent/child/cousin/in-law)
- **Name selection rules**: `~/Code/RMCitecraft/docs/reference/name-display-logic.md` (NameTable + IsPrimary)
- **Working Python example**: `~/Code/RMCitecraft/sqlite-extension/python_example.py`

### Connecting

RootsMagic uses a proprietary `RMNOCASE` collation that the macOS system SQLite cannot handle. Always use Homebrew SQLite (`/opt/homebrew/opt/sqlite/bin/sqlite3`, not `/usr/bin/sqlite3`) and load the ICU extension first.

**CLI:**

```sh
/opt/homebrew/opt/sqlite/bin/sqlite3 ~/Code/RMCitecraft/data/Iiams.rmtree <<'EOF'
.load "/Users/miams/Code/RMCitecraft/sqlite-extension/icu.dylib"
SELECT icu_load_collation('en_US@colStrength=primary;caseLevel=off;normalization=on','RMNOCASE');
-- queries here
EOF
```

**Python:**

```python
import sqlite3

def connect_rmtree(db_path="/Users/miams/Code/RMCitecraft/data/Iiams.rmtree"):
    conn = sqlite3.connect(db_path)
    conn.enable_load_extension(True)
    conn.load_extension("/Users/miams/Code/RMCitecraft/sqlite-extension/icu.dylib")
    conn.execute(
        "SELECT icu_load_collation("
        "'en_US@colStrength=primary;caseLevel=off;normalization=on','RMNOCASE')"
    )
    conn.enable_load_extension(False)
    return conn
```

### Schema at a glance (31 tables)

| Category | Key tables |
|---|---|
| Core entities | `PersonTable`, `NameTable`, `FamilyTable`, `ChildTable` |
| Events & facts | `EventTable`, `FactTypeTable`, `RoleTable`, `WitnessTable` |
| Sources & citations | `SourceTable`, `SourceTemplateTable`, `CitationTable`, `CitationLinkTable` |
| Places | `PlaceTable`, `PlaceLinkTable` (plus `MultimediaTable` cross-refs) |
| Multimedia | `MultimediaTable`, `MediaLinkTable` |
| Research mgmt | `ResearchItemTable`, `ResearchTable`, `TaskTable`, `URLTable` |
| External services | `AncestryTable`, `FamilySearchTable` |
| DNA / health | `DNATable`, `HealthTable` |
| Relationships (cache) | `RelationshipTable`, `LabelTable` |
| System | `ConfigTable`, `GroupTable`, `ColorTable`, `ExclusionTable` |

### Critical concepts

- **`PersonTable.PersonID`** is the RIN (Record Identification Number) shown in the RootsMagic UI. It's also the SQL primary key. Blog post slugs like `posts/001/RIN_1635.md` map directly: PersonID = 1635 is Raleigh Brown Ijams. There is no separate UserRef column on PersonTable.
- **`PersonTable.UniqueID`** is a separate 36-character hex string used for cross-tree merging (e.g. when syncing with Ancestry/FamilySearch); use PersonID for local joins.
- **`NameTable.IsPrimary = 1`** for the preferred name; one per person. Always filter on this for "the" name.
- **`OwnerType` / `OwnerID` polymorphism** is used in every link table (`CitationLinkTable`, `MediaLinkTable`, `AddressLinkTable`, etc.):
  - `OwnerType` values: `0`=Person, `1`=Family, `2`=Event, `3`=Source, `4`=Citation, `5`=Place, `6`=Task, `7`=Name, `19`=Association.
  - Join condition must always include the right `OwnerType` filter, e.g. `WHERE OwnerType = 0` to scope to persons.
- **Dates** are stored two ways: `Date` (TEXT, RootsMagic's encoded format) for display; `SortDate` (FLOAT, Julian day) for ordering. Always sort by `SortDate`, parse `Date` for display.
- **`RMNOCASE` collation** is required for `Surname`, `Given`, place names, and most other text fields. Without the ICU extension loaded, queries on these fields will error with "no such collation sequence: RMNOCASE". Always add `COLLATE RMNOCASE` to `LIKE` and `ORDER BY` on text columns.
- **BLOB fields** in `SourceTable.Fields`, `SourceTemplateTable.FieldDefs`, and `CitationTable.Fields` hold structured data as UTF-8 XML with a BOM. See `~/Code/RMCitecraft/docs/reference/data-formats/` for layouts.
- **`UTCModDate`** appears in every table as a Julian-day float; use `julianday('now') - UTCModDate` to compute age in days.

### Common research queries

**Find a person by name (case-insensitive partial match):**

```sql
SELECT p.PersonID, n.Given, n.Surname, p.Sex, p.Living
FROM NameTable n
JOIN PersonTable p ON n.OwnerID = p.PersonID
WHERE n.IsPrimary = 1
  AND n.OwnerType = 0
  AND (n.Given LIKE '%Raleigh%' COLLATE RMNOCASE
       OR n.Surname LIKE '%Ijams%' COLLATE RMNOCASE);
```

**Resolve a blog post slug (`RIN_NNNN`) to a person:**

```sql
SELECT n.Given, n.Surname
FROM PersonTable p JOIN NameTable n ON n.OwnerID = p.PersonID AND n.IsPrimary = 1
WHERE p.PersonID = 1635;   -- from posts/001/RIN_1635.md
-- => "Raleigh Brown" / "Ijams"
```

**All events for a specific person (with citations):**

```sql
SELECT e.EventID, ft.Name AS FactType, e.Date, p.PlaceName, e.Details
FROM EventTable e
LEFT JOIN FactTypeTable ft ON e.EventType = ft.FactTypeID
LEFT JOIN PlaceTable p ON e.PlaceID = p.PlaceID
WHERE e.OwnerType = 0 AND e.OwnerID = ?  -- PersonID
ORDER BY e.SortDate;
```

**All citations for a person (across events):**

```sql
SELECT s.Name AS SourceName, c.PageNumber, c.Comments
FROM CitationLinkTable cl
JOIN CitationTable c ON cl.CitationID = c.CitationID
JOIN SourceTable s ON c.SourceID = s.SourceID
WHERE cl.OwnerType = 0 AND cl.OwnerID = ?;  -- PersonID for direct citations
-- (Repeat with OwnerType=2 and EventIDs to get event-level citations)
```

**Direct descendants of a person (use the cached RelationshipTable):**

```sql
SELECT r.PersonID2, n.Given, n.Surname, r.Relate1, r.Relate2, r.Flags
FROM RelationshipTable r
JOIN NameTable n ON n.OwnerID = r.PersonID2 AND n.IsPrimary = 1
WHERE r.PersonID1 = ?           -- the ancestor
  AND r.Relate1 > 0 AND r.Relate2 = 0   -- B is descendant of A
ORDER BY r.Relate1;
```

See `~/Code/RMCitecraft/docs/reference/query-patterns/` for a fuller library.

### Useful one-liner sanity check

```sh
/opt/homebrew/opt/sqlite/bin/sqlite3 ~/Code/RMCitecraft/data/Iiams.rmtree \
  ".load /Users/miams/Code/RMCitecraft/sqlite-extension/icu.dylib" \
  "SELECT icu_load_collation('en_US@colStrength=primary;caseLevel=off;normalization=on','RMNOCASE');" \
  "SELECT COUNT(*) FROM PersonTable;"
```

Should print `11709`.

## Caveats / known gotchas

- **netlify-cli shadow**: an old nvm-installed `netlify` (18.x) may sit earlier in
  PATH than the Homebrew install (26.x). Uninstall the old one via
  `nvm use 20.11.0 && npm uninstall -g netlify-cli`, then verify `which netlify`
  resolves to `/opt/homebrew/bin/netlify`.
- **PaperMod GA partial**: Hugo 0.144+ removed `_internal/google_analytics.html`.
  The custom partial at `layouts/partials/google_analytics.html` replaces it;
  don't reintroduce the internal template reference.
- **Theme submodule has uncommitted patches**: needed for Hugo ≥ 0.146 builds.
  Netlify is pinned to 0.142, so they don't affect production. If you upgrade,
  commit them in the submodule (or vendor the theme).

---

# Part II — Theme design system (heirloom, Storyteller direction)

## 0. The PaperMod decision — move to a small custom theme

**Recommendation: leave PaperMod behind and build a lean custom Hugo theme.** Keep
PaperMod installed on a branch until parity is reached, then cut over.

Why, specifically for *this* site:

- **The content is unusual.** Posts are document-driven micro-monographs: archival
  plates, transcriptions, data tables transcribed from census schedules, and dense
  source citations. PaperMod is a general blog theme — it has no first-class home for
  a *document plate*, a *transcript*, a *case-file vitals block*, or a *margin source
  rail*. You would be fighting its single-column body to add these.
- **Footnotes are the product, not an afterthought.** You want an Evidence Explained
  apparatus (sidenotes on wide screens, full citations at the foot). That requires
  template + CSS control PaperMod doesn't expose without forking it anyway.
- **You are scaling.** 25 years of research, 12 generations, 10,000+ people. This blog
  is a *publishing template*. Owning ~6 small layout files and one CSS file is far more
  maintainable at that scale than overriding a 100-file upstream theme whose updates
  you must keep merging.
- **Cost of custom is low here.** You don't need PaperMod's feature surface (search,
  multi-author, i18n, social widgets). A focused theme is a few hundred lines.

What we keep from PaperMod: nothing structural. We reuse its good instincts — fast,
no-framework, semantic HTML, dark-mode toggle, reading time — and reimplement them
small.

**If the user wants to stay on PaperMod after all:** implement everything below as
`assets/css/extended/custom.css` + `layouts/` overrides instead of a fresh theme. The
design system (sections 2–6) is identical either way.

---

## 1. Chosen direction — Storyteller (CONFIRMED)

The owner reviewed three directions and **chose C · Storyteller** as the base. Build the
theme on the Storyteller tokens (section 3, light/warm block) with the **Field Notes
source-rail apparatus** folded in (section 5.4). The other two directions remain valid
*themes* — a reader can be offered Heirloom/Field Notes as alternate skins via the same
tokens — but Storyteller is the default shell.

Storyteller signatures to preserve: the dark **title band**, a **full-bleed hero image**
(owner specifically loves this), a **drop cap** lede, the **simple intro timeline**, the
**interactive Story Timeline**, and the **reusable person widgets** (section 5.6). A
working prototype of all of this — the Jesse Dorsey Iams page — lives in the design
project; treat it as the visual spec.

### The three directions (for reference / alternate themes)

A side-by-side mockup of the real Raleigh Ijams post in three directions lives in the
design project. Tokens for all three are in section 3 so the choice is a one-block swap.

| Dir | Name | Feel | Type | Accent |
|----|------|------|------|--------|
| A | **Heirloom** | Privately-printed family history book; centered, ornamented | Cormorant Garamond + EB Garamond | Sepia `#8a5a2b` |
| B | **Field Notes** | Evidence-forward, ESM dossier; margin source rail, mono apparatus | Source Serif 4 + IBM Plex Mono | Oxblood `#7c2d28` |
| C | **Storyteller** | Editorial magazine; full-bleed hero, life timeline, drop caps | Spectral + Newsreader | Terracotta `#b05f2e` |

Do not invent new directions or colors. Stay inside the chosen token set.

---

## 2. Design principles (apply to every page)

1. **Evidence is visible.** Every claim that rests on a record shows or links the record.
   Plates and transcripts are first-class, never thumbnails crammed inline.
2. **One reading measure.** Body copy lives in a ~66ch column. Never run prose full-width.
3. **The apparatus is quiet but complete.** Citations use Evidence Explained form; they
   sit in the margin on wide screens and at the foot on narrow ones — present, not loud.
4. **Restraint.** Max 1 accent color in play at a time. No gradients-as-decoration, no
   emoji, no drop-shadow soup, no rounded-corner accent cards. Hairlines and space do the
   work.
5. **Unobtrusive motion.** Only the lightbox and the dark-mode toggle move. No scroll
   animation, no parallax.
6. **Difficult history is set uniformly.** Slavery records, the slave schedule, etc., are
   styled exactly like any other evidence — sober, factual, no special framing.
7. **Less is more.** Do not add stat counters, "related posts" walls, share buttons, or
   filler sections. If a section feels empty, fix it with type and space, not content.

---

## 3. Design tokens (`assets/css/tokens.css`)

Define as CSS custom properties on `:root`, with a `[data-theme="dark"]` override block.
Swap the accent/font triplet to change direction.

```css
:root {
  /* ---- type ---- */
  --font-display: "Spectral", Georgia, "Times New Roman", serif;   /* C */
  --font-text:    "Newsreader", Georgia, serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace;

  /* fluid type scale (1.25 major-third, clamps for mobile→desktop) */
  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --step-0:  clamp(1.06rem, 1.0rem + 0.3vw, 1.19rem);   /* body */
  --step-1:  clamp(1.33rem, 1.2rem + 0.6vw, 1.5rem);
  --step-2:  clamp(1.66rem, 1.45rem + 1vw, 2.1rem);     /* h2 */
  --step-3:  clamp(2.1rem, 1.7rem + 2vw, 3.1rem);
  --step-4:  clamp(2.6rem, 1.9rem + 3.4vw, 3.9rem);     /* h1 */
  --measure: 38rem;          /* ~66ch reading column */
  --rail:    13.5rem;        /* margin source-rail width */

  /* ---- color: warm light (Storyteller) ---- */
  --paper:  #fbf8f2;
  --band:   #221c16;         /* title band / strong rules */
  --ink:    #241d15;
  --soft:   #6d6253;         /* captions, meta */
  --faint:  #938876;
  --accent: #b05f2e;         /* terracotta — the ONE accent */
  --accent-tint: #f0e2d3;
  --rule:   #e6ddcd;
  --line:   #cbbfa9;
}

[data-theme="dark"] {
  --paper:  #1b1714;
  --band:   #0f0c0a;
  --ink:    #ece3d4;
  --soft:   #b3a692;
  --faint:  #8a7e6c;
  --accent: #d2854f;         /* lift accent for contrast on dark */
  --accent-tint: #2a2018;
  --rule:   #352c24;
  --line:   #4a3e32;
}
```

Alternate themes (swap the `--font-*` and color block):

```css
/* A · Heirloom */ --font-display:"Cormorant Garamond",serif; --font-text:"EB Garamond",serif;
  --paper:#f7f1e4; --ink:#2c2620; --soft:#6f6354; --accent:#8a5a2b; --rule:#ddd0b8;
/* B · Field Notes */ --font-display:"Source Serif 4",serif; --font-text:"Source Serif 4",serif;
  --font-mono:"IBM Plex Mono",monospace; --paper:#faf7f1; --ink:#211f1b; --soft:#6b6358;
  --accent:#7c2d28; --rule:#e3dccd; --line:#cbbfa9;
```

**Fonts:** self-host via Hugo (`hugo_stats`/`resources.Get` + `fingerprint`), don't hot-link
Google Fonts in production. Preload the two text weights. `font-display: swap`.

---

## 4. Layout system

```
┌───────────────────────── header (wordmark left · nav right · theme toggle) ─┐
│ title band  (kicker · h1 · lifespan · date·readtime)         [shell C only] │
│ full-bleed hero figure (optional, click-to-zoom)             [shell C only] │
│ life-timeline strip (shortcode, optional)                                   │
│ ┌── article ─────────────────────────────────┬── source rail ──┐           │
│ │ prose @ --measure                            │ sidenotes (mono)│           │
│ │ plates / tables / transcripts span prose     │ fig credits     │           │
│ └──────────────────────────────────────────────┴─────────────────┘           │
│ sources apparatus (full citations) · tags · prev/next person                │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Grid:** article body is `grid-template-columns: minmax(0,var(--measure)) var(--rail)`
  with `gap: clamp(1.5rem, 4vw, 2.5rem)`, centered. Below ~900px the rail collapses:
  sidenotes render inline as standard footnote references and the full apparatus moves to
  the foot. Use a container query or `@media (max-width: 56rem)`.
- **Vertical rhythm:** space sections with `margin-block` multiples of `0.5rem`; don't
  hand-tune pixel margins per element.
- **Header:** sticky is optional; if sticky, keep it a thin hairline-bordered bar, no shadow.

---

## 5. Components & Hugo shortcodes to build

Build these as `layouts/shortcodes/*.html` so authoring stays in clean Markdown.

### 5.1 `{{< plate >}}` — archival document
```
{{< plate src="001/1860-slave-schedule.jpg" n="1"
          caption="James Ijams household, 1860 federal slave schedule…"
          credit="National Archives · via Ancestry" >}}
```
- Renders `<figure>` with framed image, a **click-to-zoom lightbox** (see 6), a
  `Plate N` label in the accent, italic caption, optional mono credit (into the rail on
  wide screens).
- Use **Hugo image processing**: generate responsive `srcset` (e.g. 480/960/1600w) +
  a tiny LQIP/blur placeholder; serve AVIF/WebP with JPEG fallback. Never ship the raw
  2200px scan as the inline image — only the lightbox loads full-res.
- `loading="lazy"`, explicit `width`/`height` to reserve space (no layout shift).

### 5.2 `{{< transcript >}}` — primary-source transcription
```
{{< transcript place="Saranac Lake, N.Y." when="27 January 1905" sign="R.B. Ijams" >}}
Referring to the highly interesting prose-poem…
{{< /transcript >}}
```
- Shell C: centered pull-quote in `--font-display` italic with a hanging open-quote.
- Shell B: bordered "Transcript" card with a mono header row (source + date).
- Always preserve the transcriber's note convention (e.g. `[sic]`, `per E.J.`).

### 5.3 Data tables (the census/slave-schedule tables)
- Style globally in CSS — no shortcode needed; author writes normal Markdown tables.
- Header row: `--font-mono`, small, letter-spaced, uppercase, accent bottom-border.
- Numeric columns: `font-variant-numeric: tabular-nums`. Right-align pure numbers if a
  column is all numeric; otherwise left-align.
- Zebra with `--accent` at ~4% alpha; row separators are `--rule` hairlines, no vertical
  borders. Status words like "Escaped" render in `--accent`.
- Wrap in `<div class="table-scroll" style="overflow-x:auto">` for narrow screens.

### 5.4 Footnotes → **sources apparatus** (the priority feature)
This is the heart of the redesign. Two coordinated renderings of the *same* Hugo
footnotes:

1. **Inline marker:** superscript `[n]` (mono, accent) — Hugo's default `<sup>` ref,
   restyled.
2. **Sidenote (≥56rem):** on wide screens, float each footnote into the source rail
   aligned to its reference, set in `--font-mono` at `--step--1`, with an accent top-rule.
   Implement with a small progressive-enhancement script that reads Hugo's
   `.footnotes` list and positions clones beside their `#fnref:n` (or use CSS
   `float`/sidenote pattern). **Must degrade:** with JS off, the standard footnote list
   at the foot is the source of truth.
3. **Foot apparatus (always):** a `Sources` block at the article foot listing every
   citation in full, with back-links (`↩︎`) to the reference.

**Citation form — Evidence Explained.** Author citations in this layered order and never
flatten them:
`Creator/record, jurisdiction & date, specific item; "Collection title," Repository/site
(URL : accessed DATE).`
Example to match:
> 1860 U.S. census (slave schedule), Jefferson County, Virginia, entry for James Ijams;
> "United States Census (Slave Schedule), 1860," FamilySearch
> (familysearch.org/ark:/61903/1:1:W2XL-HB2M : accessed 3 November 2024).

Render URLs as links but keep the human-readable ARK/path visible. Italicize repository
publication titles. Do **not** auto-shorten or "tidy" citations — fidelity matters.

### 5.5 Two timelines — both are core to Storyteller

The owner wants **two distinct timeline components**; don't conflate them.

**(a) `{{< timeline >}}` — Simple intro timeline.** The standardized, always-present
life-context strip near the top of every person post. A horizontal dotted rail, one dot
per milestone, terminal event filled accent, year in `--font-display`, label in `--soft`.
Fixed set of ~5–7 milestones. Wraps to a vertical stack below ~700px. Purely presentational,
no JS. This is the "at a glance, where/when did this life happen" device.
```
{{< timeline >}}
1884 | Born, Pittsburgh
1920 | Married, Tulsa
1973 | Died
{{< /timeline >}}
```

**(b) `{{< storytimeline >}}` — Rich interactive timeline.** A tiki-toki-style
(see tiki-toki.com) pannable life axis: chapters positioned by date along a continuous
year axis, alternating above/below, drag-to-pan, prev/next arrows, click a chapter to
center & focus it. Each chapter has a kind badge, year + age, title, place, body, and an
optional image. This is the *storytelling* device — a curated narrative of a life, not
just facts. Source chapters from a `timeline:` list in front matter (or a data file):
```
timeline:
  - { year: 1884, age: 0,  kind: Birth,    title: "Born in Sheraden", place: "Pittsburgh, PA", img: "...", body: "…" }
  - { year: 1920, age: 35, kind: Marriage, title: "Marries Margaret Laubach", place: "Tulsa, OK", body: "…" }
```
Implementation notes from the prototype: parse year→x (≈34px/yr), clamp pan to bounds,
animate centering with a cubic-bezier transition, emphasize the active chapter (scale +
shadow + accent ring on its dot), decade ticks on the axis. **Must degrade:** with JS off,
render the same chapters as a plain vertical ordered list (it's just `timeline:` data).
Keep the JS small and dependency-free.

### 5.6 Person widget system (the FamilySearch-inspired rail)

A set of **standardized, reusable widgets** that render from front-matter / data so they
stay identical across all 10,000 people. They live in a right-hand rail on the person post
and are individually reusable elsewhere (person index cards, family pages). All take the
warm Storyteller styling — hairline-topped section, small-caps accent heading, optional
"view all" link — **not** FamilySearch's boxed-card chrome. Build each as a partial
(`layouts/partials/widgets/*.html`).

- **`at-a-glance`** — compact key/value vitals (Born · Died · Married · Children),
  driven by front matter. Labels uppercase `--faint`; values `--ink`.
- **`spouse-children`** — spouse row, a "Married — date · place" divider, then a
  Children list. Each person is a **PersonRow**: monogram avatar + name (`--font-display`)
  + life-dates (`--soft`, tabular-nums), linking to that person's page.
- **`parents-siblings`** — parents (with Father/Mother role tags in accent), then a
  Siblings list; the current person is highlighted in the sibling list (accent tint row).
- **`sources`** — count in the heading, top 3 sources with an "All sources" link;
  full apparatus still lives at the article foot (5.4).
- **`tags`** — accent-tinted tag chips.

**PersonRow is the shared atom.** Avatar = circle monogram (initials in `--font-display`,
`--accent-tint` fill; the subject filled solid accent; unknown/placeholder people italic
`--faint`). Reuse it anywhere a person is listed. **Layout rule:** the name+dates stack
must be a `flex-direction: column` block so a wrapped name can never collide with the
dates (a real bug we hit when names wrap — don't regress it).

Real photos are optional: PersonRow falls back to the monogram when no portrait exists,
so the rail looks complete for people with no image (most of the 10,000).

### 5.7 Imagery — hero & portraits (page-bundle resources)
- **Hero:** every person post may set a `hero:` image (a portrait, homestead, document,
  or map). It renders full-bleed under the title band — the image the reader meets first.
  In the prototype this is a fillable slot; in Hugo it's a bundle resource processed to
  responsive sizes. If no hero, fall back to the "Minimal band" treatment (no broken image).
- **Portrait:** an optional circular `portrait:` in the title band; falls back to a
  monogram. Never ship an empty gray circle.
- Process all imagery via Hugo image pipelines (responsive `srcset`, AVIF/WebP, LQIP);
  the lightbox loads full-res only on open.

### 5.8 Future (stub now, design later): **maps & family trees**
The owner wants maps and pedigree graphics. Reserve `{{< map >}}` and `{{< pedigree >}}`
shortcodes. Prefer static, build-time SVG/PNG (e.g. pre-rendered from GEDCOM or a Leaflet
static image) over heavy client JS — keep the unobtrusive, fast ethos. **Do not** hand-draw
complex SVG illustrations; use real generated assets or image placeholders and ask the owner.

---

## 6. Lightbox (the one required interaction)
- Click any plate/hero → full-screen overlay on a dark scrim, image bordered in `--paper`,
  caption beneath, `Esc`/click-out to close, `loading` full-res only on open.
- ~40 lines of vanilla JS, no library. Must be keyboard-accessible (focus trap, `Esc`,
  restore focus on close) and a no-op with JS disabled (the `<figure>` still links to the
  full image via `<a href>` fallback).

---

## 7. Hugo conventions
- **Structure:** `content/posts/NNN/index.md` (page bundles) with images co-located in
  the bundle (`content/posts/001/img/…`) — not in `static/`. This keeps each post
  portable and lets Hugo image processing find resources.
- **Archetype** (`archetypes/posts.md`): scaffold front matter — `title`, `date`,
  `lifespan`, `person_id`, `tags`, `summary`, and a `sources:` skeleton.
- **Taxonomies:** keep `tags` and `categories`. Surfaces unchanged from PaperMod's IA.
- **Reading time / word count:** use Hugo's `.ReadingTime` / `.WordCount`.
- **Dark mode:** `data-theme` on `<html>`, toggle persists to `localStorage`, respects
  `prefers-color-scheme` on first visit. Inline the theme-set script in `<head>` to avoid
  flash.
- **Performance budget:** no framework, no jQuery. Total blocking JS < 5KB (lightbox +
  sidenotes + theme). Fingerprint + minify CSS/JS. Lighthouse ≥ 95 on mobile.
- **Accessibility:** semantic landmarks, `figure/figcaption`, `<th scope>`, visible focus
  rings, alt text on every plate (author-supplied, required — lint for it), color
  contrast AA in both themes.
- **SEO/meta:** preserve the existing OpenGraph/Twitter/article meta and JSON-LD; add
  `schema.org/Person` structured data for person posts (birth/death/name) — it's a natural
  fit for genealogy and costs nothing.

---

## 8. Coding rules for Claude Code
- **No filler.** Don't add demo content, placeholder sections, or features not requested.
  Every element earns its place. Ask before adding new content types.
- **Small files.** Keep each layout/partial focused; factor shared bits into partials.
- **Tokens first.** Never hardcode a hex or font where a `--var` exists. New visual needs →
  add a token, don't one-off it.
- **Author ergonomics win.** If a choice makes writing the next 9,999 posts easier, take it.
  Push styling into CSS/shortcodes so Markdown stays clean.
- **Don't regress the apparatus.** Footnote fidelity and Evidence Explained citation form
  are non-negotiable.
- **Match, don't reinvent.** Before changing a component, read how the others are built and
  stay consistent (spacing, type scale, accent usage).
- **Verify both themes and a no-JS load** before calling a change done.

---

## 9. Implementation playbook (how to build it with Claude Code)

Build in thin, shippable slices. After each step, run `hugo server` and eyeball it before
moving on. Don't scaffold all of it at once.

**Repo layout (custom theme `themes/heirloom/`, or root `layouts/` + `assets/`):**
```
assets/css/tokens.css          # §3 custom properties (+ [data-theme=dark])
assets/css/base.css            # type scale, reading measure, tables (§5.3), prose
assets/css/components.css      # band, hero, widgets, timelines, apparatus
assets/js/lightbox.js          # §6
assets/js/sidenotes.js         # §5.4 progressive enhancement
assets/js/storytimeline.js     # §5.5b interactive axis
assets/js/theme.js             # dark-mode toggle (inline the no-flash setter in <head>)
layouts/_default/baseof.html   # head (fonts, tokens), header, footer
layouts/_default/single.html   # person post: band · hero · timeline · body+rail · storytimeline · apparatus
layouts/partials/widgets/*.html# at-a-glance, spouse-children, parents-siblings, sources, tags, person-row
layouts/shortcodes/*.html      # plate, transcript, timeline, storytimeline, (map, pedigree stubs)
archetypes/posts.md            # front-matter scaffold (vitals, relations, hero, timeline, sources)
```

**Build order:**
1. **Tokens + base type** on a throwaway page. Lock the reading measure, type scale,
   light/dark. Nothing else until this feels right.
2. **`baseof` + header/footer.** Wire fonts (self-hosted), the no-flash theme setter, the
   dark toggle.
3. **`single.html` skeleton** with the title band, hero, and prose body at `--measure`.
   Port the **Raleigh Ijams** post first (real content, real plates) — it's the truth set.
4. **`plate` + lightbox**, then **tables**, then the **footnote apparatus + sidenotes**.
   The apparatus is the priority feature — get citation fidelity right.
5. **Widget rail** (PersonRow atom first, then the four widgets). Port the **Jesse Dorsey
   Iams** data — it exercises spouse/children/parents/siblings.
6. **Simple timeline**, then the **interactive Story Timeline** (JS, with no-JS fallback).
7. **Front-matter contract + archetype** so new posts are pure data. Then dark-mode and
   a Lighthouse/no-JS pass.

**Front-matter contract (drive everything from data):**
```yaml
title: "Jesse Dorsey Iams"
date: 2026-05-28
person: { id: "MPYP-VKV", aka: "J.D. / Dorsey", born: {date: "1884-08-08", place: "Pittsburgh, PA"}, died: {date: "1973-01-15", place: "Tulsa, OK"} }
hero: hero.jpg
portrait: portrait.jpg
relations:
  spouse:   { name: "Margaret Shannon Laubach", life: "1895–1991", ref: "..." }
  marriage: { date: "1920-04-28", place: "Tulsa, OK" }
  children: [ { name: "…", life: "…", ref: "…" } ]
  parents:  [ { name: "Franklin Pierce Iams", life: "1852–1917", role: "Father", ref: "…" } ]
  siblings: [ { name: "…", life: "…", ref: "…" } ]
timeline: [ { year: 1884, age: 0, kind: Birth, title: "…", place: "…", body: "…", img: "…" } ]
tags: [Pittsburgh, Tulsa]
```
Reuse the design-project prototype data files (`data-jesse.js`) as the shape reference.

**Kickoff prompt for Claude Code (paste into the Hugo repo):**
> Read `CLAUDE.md`. We're replacing the PaperMod theme with a custom theme called
> "heirloom" built on the **Storyteller** direction. Start with **step 1** only:
> create `assets/css/tokens.css` and `assets/css/base.css` per §3 and the type system in
> §2/§3, and a temporary `layouts/index.html` that renders a heading, body paragraph, a
> Markdown table, a blockquote, and a footnote so I can judge the type, color, reading
> measure, and dark mode. Self-host the fonts. Don't build the rest of the theme yet —
> stop after this so I can review.

Then iterate one slice at a time, reviewing in `hugo server` between each.

---

## 10. Iterating with the design project
When the owner wants to explore look-and-feel changes (accent, hero style, density, fonts,
widget styling, new widgets, timeline behavior), prototype them **in the design project's
Storyteller person-page** (with Tweaks) first, settle the direction visually, then port the
settled result here as tokens/partials. Design exploration happens there; production lives
here.
