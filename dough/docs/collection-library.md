# Bread-family library (approved proposal A)

Release `bread-library-1`; previous production `8bff0a3` / `culture-defects-1`.

## Navigation boundaries

- All 203 published food/build records remain independent, with unchanged IDs, provenance, source notes, formulas, procedures and publication revisions.
- Ten bread-family shelves may overlap. Starter builds/scalds and other foods remain reachable through secondary shelves; every record is present exactly once in the unfiltered list.
- Source filters remain exclusive: Hamelman 109, Artisan 17, Suas 52, Personal 19, PizzaLovers 6, Others 0. Workbook recipes named after an author remain Personal because provenance, not titles, determines source.
- Calculators contains the six existing tools/references and the previously unlisted-in-the-count blank master (`Create a formula`). The blank master is no longer listed as food. Three-stage Detmolder remains a Personal starter build.
- Source and method filters combine with family selection; accent/case-insensitive search requires every search token and searches the published title, description, source and ingredient names. Typing a query searches across families, retaining source/method filters. Clear all resets those filters; the header Collection button opens the full library.
- Recipe/source/back routes preserve the current shelf; the header deliberately resets it. The existing async navigation-generation guard is unchanged. No new top-level author links.
- Unknown future IDs fall back to Other recipes with no inferred method. They remain searchable. Unknown methods are not labelled Direct.

## Metadata review

`collection-metadata.js` is a navigation-only adapter, not a recipe data migration. All 203 IDs were inspected against published titles and build stage names. Ingredients supply additional search terms at runtime. Family membership uses explicit bread names and grain ingredients; membership does not imply hydration, readiness, difficulty or baking time.

Important corrections to proposal draft labels:

- Detmolder freshening/basic/full-sour stages → Levain.
- GOST and Hamelman workbook scalds → Scald, not Direct/fermented starter.
- Five-grain and semolina/fennel soakers do not make a preferment; these doughs remain Direct.
- Country/Rustic bread salted yeast pre-ferments → Old dough.
- Swiss farmhouse raisin-liquid builds → Fruit-water starter, not an assumed ordinary levain.
- Irish soda bread → Soda; waffles, dumplings and Lebkuchen → No preferment, not yeast-based Direct bread.

## Interface and efficiency

Unified Arial, teal, paper cards; five columns on desktop, two on narrow mobile. Results are compact rows, not repeated large illustrations. The search control is not recreated on input. Filter controls expose pressed states and preserve keyboard focus. A matching-results jump provides quick access below the family tiles on mobile. All results remain accessible without a hidden eight-record cutoff or nested scrolling.

Removed the unused old card-art generator. Reduced service-worker precache URLs from 111 to 74 by dropping obsolete versioned aliases, retaining current HTML/module dependencies and original unversioned assets. Cache `dough-co-v39` includes all new module/CSS/metadata dependencies.

## Verification / backup

- `tests/collection-library.mjs`: all203 IDs, 12 baguettes, three poolish baguettes across three authors, combined source/method/family filters, accent/token/flour search, focus, empty/reset/sort, actual recipe/back, separate seven tools, Owner delete/restore in isolated database, 390/768/1440px.
- `tests/library-upgrade.mjs`: real previous v38 cached client → v39, private settings preserved; offline family/filter/recipe scaling and DDT/mixing/retarding/culture-reference deep links.
- Existing canonical recipe browser audit: all203 public + all203 Owner ingredient/stage/method/scaling checks, private-note import/export/preservation.
- Existing source-only navigation, DiMuzio, mixing, retarding and sourdough-defects browser tests retained; catalogue-count assertions updated without changing independent ingredient/transfer arithmetic oracles.
- Private rollback archive and live publication/visibility snapshots: workspace `private/dough-library-20261104`. This is a source archive plus public publication/visibility backup, **not** a complete D1 draft/revision database backup. No database writes or imports are part of this UI release.
