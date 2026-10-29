# Recipe data and templates

## Current system

Recipes are already data-driven, not individually authored HTML pages:

- `workbook.json` + `engine.js`: immutable spreadsheet source and formulas.
- `recipes.js`: catalogue and source-cell mappings, including simple component feeds.
- `pizza.js`: normalized pizza adapter with explicit seed flour/water accounting.
- `hamelman-book.json`: original ingredient/build/final tables and procedure blocks;
  `hamelman-book.js` calculates and renders those records.
- `pizzalovers.js`: structured presets, calculations and a shared kitchen template.
- `recipe-stages.js`: common build-record contract for original bread workbooks.
  `app.js` renders all enabled workbook preferments, not just pizza builds.

The missing Small Vermont build was a template condition, not missing source data.
Moving the same data to a database alone would not prevent that omission.

## Recommended next step for shared editing

Use one canonical recipe/stage schema, with source adapters feeding the same template.
A future dedicated recipe database should store versioned published records and draft
edits, separately from authentication and visibility databases. No such migration has
been performed by this build-table fix. Owner variations/notes remain browser-local.

Suggested record structure:

- Recipe: stable id, title, yield plan, ordered stages, method blocks, source provenance,
  revision and publication status.
- Stage: stable id, type (preferment/soaker/scald/final), ordered ingredient additions,
  explicit transfers from previous stages, fermentation conditions and instructions.
- Ingredient: label, quantity/baker's percentage, denominator and unit, source reference.
- Transfer: prepared quantity, transferred quantity, retained starter or discarded liquid.
- Seed: ingredient type and known hydration; unknown must remain unknown, not default100%.

Validation before publication must require a visible build for each final-dough
preferment transfer, reconcile stage and final masses, preserve all supplied procedure
blocks, identify incomplete source fields, and compare adapters to their original
formula oracles. Counts/eggs/volumes cannot become grams without supplied conversions.

A database then enables an Owner editor, revisions, validation, draft preview and
publish/rollback without editing page markup. Public batch scaling remains local;
only explicit authenticated publication changes shared recipes.

## Present audit / regression checks

`tests/preferment-builds.mjs` compares all 9 stages across 8 original bread workbooks
to the exact source cells at two scales. Small Vermont's generic source “Yeast” slot
is presented as sourdough starter (confirmed by Vadim on 2026-10-29). No source cell,
seed hydration assumption, final-mix correction or original formula is rewritten.
The 70% rye starter dose and workbook Ciabatta yeast dose are absent in the source;
these gaps remain visibly identified. Workbook builds lack reliable timing fields;
pizza's M8:M11 timing cells must never be applied to these unrelated workbook cells.

`tests/preferment-builds-browser.mjs` checks actual public and authenticated Owner
build rows/weights, live scaling without focus loss, mobile and simple-stage feeds.
`tests/hamelman-book-browser.mjs` verifies all 109 book recipes, 302 tables and 719
method blocks in both roles. Pizza source/oracle and public batch checks remain
separate. `tests/preferment-upgrade.mjs` verifies real browser cache migration and
offline use without clearing private notes/inputs.
