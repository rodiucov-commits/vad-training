# Recipe database, shared page and Owner editor

## Storage boundary

`recipe-catalog.json` is the frozen, version-controlled source import: 134 content
records, 357 stage tables, 773 procedure blocks. `build-dough-catalog.mjs` adapts the
original workbook, normalized pizza sheets, Hamelman book tables/methods and
Pizzalovers presets. Original datasets/engines are untouched. Only the schema of
published records is shared; eggs, volume measures, ranges and unknown quantities
retain their units. Build stages, separate fillings/coatings and immutable overall
source references have distinct roles. The final stage alone determines dough mass.

`DOUGH_RECIPES_DB` already stores reversible collection visibility. This release
adds recipe_publications, recipe_revisions, recipe_drafts, recipe_draft_counters and
recipe_imports in that same content-only database. Authentication remains in
DOUGH_AUTH_DB; the training DB, accounts, bindings and Access policy are unchanged.

On first API access, source records are inserted idempotently as revision 1. Small
batches support interrupted cold starts; INSERT OR IGNORE cannot overwrite an
existing publication or draft. The source-import marker is written last. Future
releases must not regenerate/change the frozen source import accidentally; source
updates require an explicit import version/migration and parity review.

## APIs

- Public GET `/api/recipes[?id=…]`: published documents/revisions only, no-store.
- Owner GET `/owner/api/recipes?id=…`: publication, saved draft and revision history.
- Owner same-origin JSON POST to that route: draft, publish, discard or rollback.
- Existing archive endpoints retain their old visibility-only behavior.

All content writes validate the actual server session, origin, bounded request,
recipe identity/provenance, schema, numbers and explicit stage transfers. Saved
drafts do not alter public content. Publishing reads the saved draft, validates it
again, and atomically adds an immutable revision and updates the publication.
Rollback creates a new revision rather than deleting history. Optimistic revision
and monotonically increasing draft-version checks prevent concurrent/stale edits,
including discard/recreate version reuse. Immutable original reference tables and
revision 1 remain available; revised procedure text also displays the original
procedure in the public recipe.

Negative source corrections, unquantified ingredients and unknown seed hydration
remain visible. Source imports may contain inherited conflicts, but edited drafts
cannot publish negative mixing quantities. Rollback may restore the faithful
source revision with its explicit warnings. No seed hydration or missing inoculum
quantity has been invented to make imports look complete.

## Shared UI / calculation contract

`recipe-model.js` is shared by browser and built Worker. Scaling multiplies every
ingredient and retained quantity once. Transfers must reference preceding build
stages, reconcile prepared = transferred + retained, cannot overdraw a build, and
cannot leave a build orphaned. Final dough is the sum of final-stage additions,
including ripe transfers once—not overall references, fillings or prepared reserves.

`recipe-content.js` renders all published content through one template. Gram-known
recipes use loaf/ball/tray weight × count; mixed-unit recipes use batch multipliers
and explicitly label known gram subtotals as incomplete weights. Original percentages
remain in read-only reference tables with their original denominator; the Owner
editor's build/component feed percentages explicitly use that stage's fresh-flour weight. Final-stage percentages instead use the shared counted flour basis across the entire dough; the final water control represents overall counted water, subtracting the water already carried in transferred builds and any other final water rows.
Changing a build requires reconciling transfers; the editor provides a recalculation
button using prepared minus retained amounts. Unknown starter composition is never
silently decomposed or normalized. Seed hydration edits alone do not silently change
fresh feed quantities. Procedures preserve source wording; embedded source-batch
weights are labelled as such and the live scaling/dividing plan takes precedence.

The Owner editor supports ingredient quantities/units/types, stage names and
fermentation instructions, build/component addition, complete method editing,
preview, draft saving, publish, revision history, rollback and recipe export. It
never publishes merely because a field was edited. Existing delete/restore remains
separate and reversible. Source calculators and saved legacy variations are available
at `#source/<same-id>`; existing `#recipe/<id>` links use the new template. The blank
master calculator and DDT remain their existing independent tools.

## Private notes, offline and rollback

Old local-storage keys are retained. The shared view reads old private notes without
publishing or modifying them. New private notes and batch preferences use
`dough-recipe-private-v1`; per-recipe private export/import is separate from shared
recipe backup. Public batch controls never write Owner storage or server recipes.

Release recipe-db-2 / SWv23 versions the full dependency graph. A no-store catalogue
read supplies published revisions; a validated last-known snapshot supports offline
use, falling back to the frozen baseline. A fresh online navigation rechecks shared
content and collection visibility. Offline copies are not content-erasure mechanisms.

Private platform/source/visibility backups are outside this repository under the
agent's private storage. Production rollback restores the previous Pages deployment
(commit f27c1bc) and keeps the content/auth databases intact. Previous code ignores
the additive content tables; archive visibility and existing sessions still work.
No production recipe changes are made just to demonstrate the editor.

## Verification

- `node --test dough/tests/recipe-store.mjs dough/tests/owner-password.mjs dough/tests/recipe-archive.mjs`
- `SOURCE_PDF=/private/path/to/original.pdf node dough/tests/recipe-source-parity.mjs`
- Existing engine, pizza, Pizzalovers and Hamelman source-oracle suites.
- With PLAYWRIGHT_PATH set: recipe-content-browser.mjs (134 public +134 Owner),
  recipe-editor-browser.mjs (actual draft/publish/rollback/transfer edit),
  recipe-db-upgrade.mjs (old HTTP cache/SW, private inputs/notes and offline routes),
  owner-password-browser.mjs and ddt-browser.mjs.
- Preserved-original browser suites now use the explicit #source route; their
  formula/method expectations have not been weakened to match the new renderer.
- Live checks compare all imported records to the frozen source import, verify
  template/ingredient/method/scale behavior, cookie/anonymous boundaries, served
  asset parity, unchanged archive rows/bindings and no live testing publications.

Compatibility follow-up: legacy #recipe URLs with saved calculator query inputs
continue to the preserved original calculator. Normal recipe links use the shared
template. Duplicate inherited warning panels are suppressed without removing source
conflict or unknown-hydration information. Frozen import sourceVersion stays unchanged.

## Consistent percentages (overall-percent-2 / SWv24)

`recipeFlourWater` recursively traces ingredients actually transferred into final
dough, prorating prepared builds for retained reserves and chained transfers. It
excludes source-reference tables and separate components; known starter hydration
is decomposed into flour/water once. Unknown starter composition is never guessed:
these records explicitly show a known-ingredient/source-accounting percentage,
not verified complete hydration. Drained builds, unweighed flour/water or base dough
held in a separate recipe disable overall-percent editing rather than inventing a
basis. Water-only percentages do not treat milk, eggs or oil as water.

All applicable final-stage water controls now mean total counted water / total
counted flour. Setting one computes required final addition = target total water
minus all other counted water, including transferred builds. Other final additions
use that same total-flour denominator; build/component feed percentages remain
separately labelled local build ratios. These explicit formula edits change the
source-sized recipe, not a fixed target batch; piece weight × count scales it later.

Small Vermont source oracle: 1,047.120419 g flour; 732.984293 g water at70%;
209.424084 g build water; 523.560209 g final water. A586.387435 g final addition
corresponds to76% by this source-accounting basis, not70%. The source negative
starter correction and unknown seed hydration remain disclosed and unchanged.

Regression commands: `node dough/tests/recipe-percent.mjs` and, with PLAYWRIGHT_PATH,
`node dough/tests/recipe-percent-browser.mjs`. All134 editors are inspected, with114
eligible final-water controls exercised without changing production data. Existing
source engines, 134public+134Owner shared views, isolated editor writes and a real
previous-release cache/offline upgrade are checked independently.
