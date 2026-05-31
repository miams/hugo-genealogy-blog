# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo-based genealogy blog using the PaperMod theme, deployed on Netlify. The site focuses on family history research and genealogical documentation.

## Essential Commands

### Development
- Start development server: `hugo -b http://127.0.0.1:8888/ -w --buildDrafts -F`
- Build for production: `hugo --gc --minify`
- Format code: `pnpm prettier --write .`
- Install dependencies: `pnpm install`

### Git and Deployment
- SSH setup (required for push): `ssh-add ~/.ssh/miams-github`
- Deploy: `git push origin main` (auto-deploys to Netlify)
- Check deployment status: `netlify status`

## Architecture

### Content Structure
- **Posts**: Located in `content/posts/[###]/` directories with index.md or specific filename
- **Data Sources**: YAML files in `data/` (findagrave.yml contains genealogical records, slave.yml for historical data)
- **Static Assets**: Images, PDFs, and documents organized by post number in `static/img/[###]/` and `static/files/[###]/`

### Custom Components
- **Shortcodes**: `layouts/shortcodes/` contains custom Hugo shortcodes for:
  - `03_findagrave.html`: DataTables integration for genealogical records
  - `01_slavery.html`: Historical context displays
  - `book-list.html`: Bibliography rendering
- **Partials**: Custom layouts override theme defaults, including Google Analytics integration

### Theme and Styling
- Uses hugo-PaperMod theme as Git submodule in `themes/hugo-PaperMod/`
- Custom CSS overrides in `assets/css/extended/theme-vars.css`
- DataTables integration for interactive genealogical data display

### Data Integration
- Large YAML datasets (findagrave.yml ~900KB) contain structured genealogical information
- Custom shortcodes render this data as sortable tables using DataTables
- Images and documents are systematically organized by post number

## Configuration Notes

- Hugo v0.142.0 (extended) required
- Site deploys automatically via Netlify on push to main branch
- Google Analytics tracking ID: G-G7BZ69D7P6
- Base URL: https://blog.iams.name
- Excludes .txt files from posts directory during build

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