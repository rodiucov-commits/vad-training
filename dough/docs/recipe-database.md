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

## Linked levain amendments (linked-levain-1 / SWv40)

The Owner amendment editor now links known-composition build/seed quantity and
feed-percentage edits to adjusted final flour/water additions. It recalculates
explicit transfers, preserves absolute reserves and deducts the *carried* component
differences, preserving overall flour, water and final dough mass. Final fresh
flour blends are reduced proportionally; source/reference stages remain immutable.

Each eligible final-stage ripe-build or starter row offers two synchronized controls:
**Levain / build · % of final dough weight** (ripe transferred mass / final mass)
and **Prefermented flour · % of all recipe flour** (carried flour / whole-dough
flour). Resizing preserves the build's flour/water/starter proportions, not its
ripening time. Fixed non-flour/water build ingredients are not silently scaled.
This is a calculation/adaptation, not a fermentation-time prediction; allocation
follows the subtraction convention in DiMuzio printed p165.

Unknown starter hydration is never guessed. Assign its actual hydration first;
this defines previously unknown accounting without changing weighed ingredients.
Only subsequent composition edits rebalance known components. Unweighed/drained,
shared or chained builds cannot use the direct ripe-share resize control; explicit
feed edits can propagate through single-use chains. Negative final additions,
insufficient flour/water and non-flour/water mass changes reject transactionally.
An emptied build requires explicit fresh-feed quantities to restart it. These
constraints are surfaced in the editor; no source publication or saved draft is
changed by deploying the software.

Verification: `node dough/tests/recipe-allocation.mjs` and, with PLAYWRIGHT_PATH,
`node dough/tests/recipe-allocation-browser.mjs`, plus recipe-percent, editor-browser,
source parity, and the independent Decimal audit. Browser fixtures use synthetic
sessions/databases, not live recipe writes. Entry/module/SW versions are coordinated;
private local notes and published recipe revisions are preserved.

Release verification note: the historical `recipe-source-parity.mjs` still asserts
134 non-DiMuzio records and fails against the pre-existing expanded catalog (186).
That unrelated obsolete assertion was not weakened. The current Dimuzio, Suas bread,
Suas croissant, workbook, pizza and Hamelman source-oracle suites pass; all source
JSON and the common recipe model are byte-for-byte unchanged from the prior release.

## Save as new recipe and live amendment preview (save-new-recipe-1 / SWv41)

The Owner editor offers two explicit paths:
- **Save draft → Update existing recipe** publishes amendments (including its
  editable Title) against the existing revision/history.
- **New recipe name → Save as new recipe** validates the current working formula
  and method, confirms creation of a separate published recipe, and opens it.
  The original publication, saved draft, history, notes and calculator remain
  unchanged. Copying does not upload/copy browser-private baking notes.

The authenticated, same-origin `copy` action on the existing Owner recipes API
creates a server-assigned `personal-<request UUID>` identity with provenance and
parent revision recorded in `derivedFrom`. It preserves immutable original
reference tables, validates publishable quantities/transfers and atomically inserts
publication + revision1 into the existing content-only database. A repeated request
ID returns the same record, not an extra copy. It does not require changing the
original saved draft. New recipes belong to Personal and inherit the original
bread-family navigation metadata without claiming to be the author's original.
The original source link remains available. Personal recipes support normal
editing, renaming, revision history and reversible delete/restore. Authentication,
D1 bindings, frozen imports and all source records are unchanged.

The client accepts validated personal records in addition to every frozen source
record, upserts dynamic collection entries/picker options and retains them in its
last-known public snapshot. Browser private data remains isolated by recipe ID.
Existing source recipes must all be present before accepting a full snapshot.

An expanded **Live amended recipe preview** is present from initial editor load.
It renders the same recipe-content template with builds, adjusted final additions,
yield and complete procedure. Title, percentages, grams, method and new-copy name
update on input without replacing the focused editing field. Desktop shows a
scrollable sticky preview beside the editing fields; mobile stacks the complete
preview below with View live preview / Back to editing navigation. Preview-only
process controls are hidden/disabled; it cannot save or publish anything.

Checks: recipe-store/recipe-archive/owner-password server suites;
recipe-copy-browser (named unsaved copy, original + private-note preservation,
reload, public route, Personal search/library, existing-copy rename, archive/restore),
recipe-preview-browser (live values/names/method, focus and responsive layout),
203 public +203 Owner recipe-content views, existing editor lifecycle/levain suites,
and recipe-copy-upgrade (previous HTTP/SW cache, private settings, offline original
routes). Owner writes run only against synthetic fixture databases. The separate
HTTPS custom-recipe offline test could not use a self-signed service worker;
custom-copy offline fresh navigation is not certified by these browser checks.

## Semolina live-adjustment repair (live-adjustments-2 / SWv42)

The exact reported route is `/owner#edit/hamelman-semolina-bread`. Its legacy
record marks sesame seeds as `starter`, and leaves the mature culture's hydration
unspecified. The previous global known-culture requirement blocked every levain
water/flour edit, and hid the dough-share control even though these particular
edits can be balanced without guessing culture composition.

`ingredientKind` treats named botanical seeds as additions, except names explicitly
identifying a culture/starter. Frozen records/reference tables remain unchanged.
Both runtime and independent Python ledger recognize this classification.

The allocation ledger now tracks flour by ingredient, water, and each unknown
culture's transferred mass. It rejects any change in unknown culture carried into
finished dough. When a build has a fixed retained reserve R, a water/flour edit
rebalances prepared unknown culture X while keeping its carried quantity K fixed:
`X*(A+X-R)/(A+X)=K`, where A is the other prepared material. This is a transparent
mass-balance calculation, not an assumed hydration. For a requested ripe transfer
T, prepared unknown culture is `K*(T+R)/T`; remaining known flour/water/feed material
is resized proportionally. Actual inoculum-dose changes still require its actual
hydration. Partial/source-accounting percentages remain labelled as such.

Flour differences deduct matching final flour first: changing Semolina's bread
flour does not change its durum flour. Final water, transfer, local feed percentages,
levain dough-share/PFF controls and full preview update on input. The overall
known flour/water, unknown culture contribution, dough mass, sesame/salt additions
and absolute retained reserve all stay fixed.

A fixed, high-contrast **Apply adjustments** bar stays on screen on desktop and
mobile, including after repeated applies, edits and scrolling. Apply validates the
working recipe without publishing or deleting controls. Existing Save draft /
Update existing recipe / Save as new recipe boundaries are unchanged.

Checks: exact-route `semolina-adjustments.mjs` and browser fixture (water/flour,
four sequential levain-share edits, matching flour, preview, focus and seven applies),
existing levain/copy/preview/editor/server suites, all203 Owner percentage editors,
and independent Decimal audit:193 matched bases,124 partial-composition bases,
10 unavailable;183 final-water controls. Frozen recipe/source data unchanged.
The additional previous-release HTTP-cache fixture timed out before initial load;
that extra returning-browser fixture is inconclusive, not a passing upgrade check.
All changed dependency URLs, entry, release manifest and SWv42 are versioned together.
