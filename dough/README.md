# Dough & Co.

Public dough recipes and spreadsheet-compatible calculator at https://dc.rodiucov.com.

Standalone static site, independent of the training app. Cloudflare Pages project `dough-calculator` watches this repository's `main` branch, with root directory `dough`, no build command and no output directory. The parent training Worker excludes this folder via `.assetsignore`.

## Development

From this directory: `python3 -m http.server 8876`. No dependencies or build required. Run `node tests/engine.mjs` to compare all 1,602 formulas to the workbook's cached results and check scaling and master-formula inputs.

`workbook.json` contains the source workbook's values, expanded shared formulas and percentage formats. `engine.js` implements the workbook's IF, IFERROR, SUM and VLOOKUP formulas without eval. Do not replace numeric precision with rounded display values. `recipes.js` provides curated views into the original cells. Generic flour names and source inconsistencies are intentional and documented in the UI.

User inputs and notes are local to each browser. Export/import backups support moving them; sharing includes the current sheet's input overrides and batch multiplier, never notes. No authentication, analytics or API backend. The service worker caches the static app for offline use after the initial visit. Changes to public recipe defaults require a source commit.

The original extraction script and attachment remain in the agent workspace under `projects/dough-calculator`. The workbook itself is not published. Browser checks covered every recipe at 390px width, desktop rendering, percent input, worksheet editing, persistence, scaling with non-gram units, export and offline reload.

## Dough-temperature calculator

`temperature.js` implements the standard bakery factor method. Straight dough: water = 3 × desired dough − flour − room − friction. With preferment: use 4 factors and subtract preferment temperature too. Calibration reverses that relationship using measured finished dough and actual mixing water. All internal calculations use °C; friction converts as a temperature difference, not an absolute temperature. The default 6°C friction is an editable estimate. Temperature settings use separate local storage and are not included in recipe exports. Run `node tests/temperature.mjs` for pure calculation and unit-conversion checks.

## Unified pizza formulas and dough totals

`pizza.js` derives independent bread-style sheets for sourdough and biga pizza from the original stored source inputs. The original 15-sheet JSON is unchanged and original pizza ingredients remain as a read-only reference. Sourdough seed initially assumes 100% hydration: total flour 1,600 g, water 1,070 g, oil 40 g, salt 25 g, dough 2,735 g. Its mature preferment is 1,100 g, assembled from 100 g seed + 500 g flour + 500 g water. Seed hydration and seeding percentage can be adjusted separately; seed is decomposed into flour/water and never added to dough weight twice.

Biga starts at 68% hydration, 33.6% prefermented flour (330 g of 982.142857 g), and 1,662 g dough, including the original 6 g yeast and 6 g honey. The old sheet's unrelated 30% field is not used. Yeast and honey are assigned wholly to preferment 1; their preferment-relative percentages recalculate from the editable total-formula percentages when the prefermented flour changes. No salt is invented; the originally absent salt remains at 0% until changed.

All bread-style calculators show flour + water + other ingredients = total dough and a separate final-mixing table, where ripe preferments and soakers are added once. The latter reconciles every numeric K10:K43 entry and flags a mismatch with target weight. Water in this list is final-addition water, not total water. All ingredients also have a footer in the full formula table. Legacy pizza input overrides, batch multipliers and notes are retained; old-format backups are migrated. Pizza sharing serializes the effective derived formula so migrated defaults reproduce on another browser, excluding notes.

Checks: `node tests/pizza.mjs`; `PLAYWRIGHT_PATH=/absolute/path/to/playwright-core node tests/pizza-browser.cjs`. The browser test hosts an ephemeral local fixture by default; set `SITE_URL=https://dc.rodiucov.com` for live verification (visitor-local test data only). It covers flour/water reconciliation, seed feeds, hydration and preferment edits, second preferments, shared links without notes, legacy input/multiplier/backup migration and offline reload. Original workbook parity checks remain in `tests/engine.mjs`.

### Pizza yield controls and updates

Pizza batches are driven by `number of pizzas × dough-ball weight`. Changing either recomputes C6 and scales the entire formula, including both preferments, with hydration and baker's percentages unchanged. Changing total C6 instead preserves the pizza count and derives a new ball weight. Count persists under the existing `<recipe-id>-pieces` key, is included in pizza share links and backups, and must be an integer from 1 to 10,000. Ball weight accepts 1 to 10,000 g.

The pizza batch panel explicitly identifies the common bread-style calculator. Versioned app/CSS entry URLs and no-cache headers on mutable runtime modules avoid stale entry assets on a fresh page load. Service worker v5 precaches both canonical and versioned entry URLs and activates with skipWaiting; no visitor notes or recipe storage are cleared.

### Immediate recalculation and old-client regression

All bread-style numeric controls now share one `input`-event calculation path. The engine and stored values update while typing; computed spans, preferment feed tables, totals and warnings are patched in place. Inputs are not replaced or blurred. This specifically fixes Biga preferment flour/water appearing unchanged until focus left the percentage field. The same path handles bread, both pizzas and the full calculator worksheet, including blank percentage cells.

`tests/pizza-browser.cjs` checks the exact Biga route: 33.6% → 40% changes flour 330 → 392.86 g and water 165 → 196.43 g before blur, with the original input still focused. `tests/upgrade-browser.cjs` serves the original c1ee15f site and service worker, switches to current files, and verifies a fresh navigation replaces that old layout without clearing notes or explicit legacy preferment edits. Explicit old J30 overrides are migrated to the new prefermented-flour control; the disconnected original default J30 is not used when never edited.

For deployment, keep `APP_RELEASE`, `version.json`, the HTML entry-query version and service-worker precache URLs aligned. Once this version has loaded, focused/visible pages check version.json periodically and on focus/hash navigation, then reload once per new release, preserving browser-local inputs. Pre-update pages with no update-check code need an initial fresh navigation (e.g. `/?update=live-calc-1#recipe/pizza-biga`); the server cannot execute new JavaScript in an old document that makes no requests. SW v6 skips waiting and claims clients but does not forcibly navigate active pages.

### Kitchen workflow before spreadsheet detail

The shared bread template now presents the process in cooking order: batch settings → prominent ripe-preferment transfer weight → Stage 1 prepare/ferment → Stage 2 final mixing → detailed baker's-percentage table. Stage 2 is no longer buried after that table. Ripe preferments are the first, highlighted rows, explicitly marked “add ALL”. Remaining flour and water are final additions only; do not repeat the preferment feed. Pizza oil and salt remain visible at zero, with editable total-formula controls near batch settings, rather than silently inventing amounts missing in the source.

Derived pizza cells M8/M9 and M10/M11 hold each preferment's hours and optional temperature and are included in existing formula sharing/backups. Sourdough defaults to 16 h within its original 12–16 h method; Biga timing is intentionally blank because the source's 24 h trial used a different yeast dose. The page asks for timing appropriate to the user's method, then explicitly instructs transferring all ripe preferment to Stage 2. These timing fields do not change ingredient weights.

The original Biga batch visibly reads: make 507 g Biga; after ripening add all 507 g to 652.14 g remaining flour + 502.86 g remaining water + 0 g oil + 0 g salt = 1,662 g dough. Yeast and honey are already inside the Biga and not added twice. Browser regression checks verify the transfer amount, row ordering, stage placement before percentages, zero-ingredient visibility, live timing/oil/salt changes and complete mass reconciliation.

## Pizzalovers yeast-pizza calculator (2026-10-26)

Six independent recipe cards are available at `#recipe/pizzalovers-contemporanea`, `-classica`, `-teglia`, `-romana`, `-biga` and `-poolish`. `pizzalovers.js` contains their public recipe facts, defaults, fermentation/temperature yeast estimator, fixed Biga/Poolish yeast doses and English kitchen methods; `pizzalovers.css` is scoped to the new calculator. Existing `recipes.js`, `pizza.js`, `workbook.json`, `engine.js` and global `style.css` are unchanged. In particular, the original Sourdough Pizza and original Biga routes/calculators remain independent.

Source: https://pizzalovers.ch/pages/teigrechner, calculator asset version `112400015520971189091791843021`, captured 26 October 2026. Defaults: Napoletana 65%, Verace 60%, Teglia 78%, Romana 60% with 10% semola, Biga 72% with 50% prefermented flour at 45% hydration, Poolish 65% with 30% prefermented flour at 100% hydration. Percentages are relative to flour. Biga includes 1% honey/malt and 1% oil; neither is omitted from batch mass.

The source uses fresh-equivalent yeast in the batch divisor even for dry yeast, then converts the yeast quantity by 1/3. This behaviour is preserved for ingredient parity, with the actual weighed mass and per-piece difference explicitly shown. The time/temperature estimator only affects direct doughs; Biga/Poolish retain recipe yeast doses and their own fermentation instructions. Mixer choice changes guidance, not ingredient weights.

New settings/notes use only `dough-pizzalovers-v1` local storage. The new calculator never writes workbook overrides, scales or notes. Share links contain whitelisted inputs, never notes; links are consumed on opening so later saved edits survive reload. Separate pizza JSON backups include settings/notes for these six recipes and do not import into the original workbook. Service worker v8 caches both new files; release `pizzalovers-1` is aligned across entry URLs, worker and version manifest.

Checks:
- `node tests/pizzalovers.mjs`: 36 independently captured source-oracle cases (six recipes, fresh/dry, custom inputs and limits), ingredient parity and mass balances.
- `PLAYWRIGHT_PATH=/absolute/path/to/playwright-core node tests/pizzalovers-browser.cjs`: all routes/cards/filter/search; 390px and desktop layout; live inputs/focus; yeast, tool and time changes; sharing privacy; copy; backup roundtrip; invalid input; persistence; offline navigation. Also asserts exact original Sourdough Pizza DOM and workbook storage before/after using all six recipes. Set `SITE_URL=https://dc.rodiucov.com` for production checks (browser-local test edits only).
- Existing `engine.mjs`, `pizza.mjs`, `temperature.mjs`, `pizza-browser.cjs` and `upgrade-browser.cjs` remain passing, including all 1,602 spreadsheet formulas and upgrades from a cached original client.

Deploy only the `dough/` changes to the shared repository main branch; Cloudflare Pages automatically publishes them. Parent training assets exclude `dough/`. Check production `version.json`, compare served runtime assets to local bytes, then rerun both browser suites against the custom domain. To roll back, revert only this dough commit (not unrelated training changes); browser-local pizza settings remain available.

## Hamelman reference collection (2026-10-27)

The user-supplied `Hamelman_Yeast_Breads.txt` is imported as 60 independent recipe cards, filterable via `#hamelman` or the Hamelman collection chip. `hamelman.json` preserves every complete supplied entry verbatim plus structured ingredient tables and all 365 numbered method steps across 58 entries. Source provenance, book pages, yields, descriptions and transcription gaps remain visible. Recipe guidance is expanded on the page, printable, and included in “Copy recipe & guidance”; it is never discarded in favour of ingredient calculations.

The attachment contains only 31 complete **overall** formulas. The other 29 entries are guidance/reference pages with an explicit missing-formula notice, not fabricated calculators. Two entries have no numbered method; several source passages end mid-text. Original unstructured/partial quantities are still in each read-only full source entry. The importer never supplies missing book text from elsewhere. Rebuild deterministically with `python3 scripts/import-hamelman.py /absolute/path/Hamelman_Yeast_Breads.txt hamelman.json`.

`hamelman.js` independently scales the 31 overall formulas, editable baker's percentages, flour/grain basis, target dough and pieces × piece weight. All quantities use internal full precision. Source yields are labelled separately; the initial 1,000 g formula basis is a calculator convenience, not an inferred original batch. Added water is not conflated with milk, juice, eggs or fat. Yeast type is unspecified in the attachment, so no fresh/dry assumption is made. Wheat germ (p101), cracked wheat (p129) and fine cornmeal (p143) are included in the source's 100% flour/grain basis, while additional soaker grains elsewhere remain additions.

Complete single preferments and soakers are allocated from total quantities into prepare → transfer all → remaining final additions. Soaker dry weights use the exact overall amounts; rounded 26.7/23.3% source splits are retained with a rounding notice rather than creating fictitious negative grain additions. The p141 sponge uses 1.72% overall yeast while the overall formula says 1.7%; its -0.2 g per 1,000 g basis is explicitly flagged as a source conflict, not silently corrected. Country/Rustic omit build formulas; Swiss Farmhouse has ambiguous linked-build data; Hot Cross Buns, Pizza, Pissaladière and Fougasse omit prefermented-flour shares. Such entries show overall totals but no unverified final-mixing list. Where only the share is missing, a visitor may enter a verified value; no default is invented. Unquantified toppings, crossing paste and syrups are flagged separately.

Storage is only `dough-hamelman-v1`, with separate Hamelman backups. Share links whitelist formula inputs and exclude notes; links are consumed so later local edits survive reload. Original workbook, Sourdough Pizza and Pizzalovers storage/modules/data/styles remain untouched. Release `hamelman-1` and SW v9 cache the new JSON/module/scoped CSS for offline use.

Verification: `SOURCE_TXT=/absolute/path/Hamelman_Yeast_Breads.txt node tests/hamelman.mjs` checks original attachment SHA256, exact 60 source blocks and all 365 steps, all 31 formulas at three scales, mass balances, soakers, missing data and source conflicts. `PLAYWRIGHT_PATH=/absolute/path/playwright-core node tests/hamelman-browser.cjs` checks all 60 routes, exact visible methods, source references, mobile overflow, formula/count/weight edits, focus/flour warnings, private sharing, full-method copy, separate backups, print, offline use and exact protected Sourdough/Pizzalovers DOM/storage before/after. Set `SITE_URL=https://dc.rodiucov.com` for production. Original pure-calculation, pizza and Pizzalovers browser suites and cached-old-client upgrade test remain passing. Deploy only dough/ to main; verify live release/assets and rerun the Hamelman browser suite before reporting completion. Revert only this collection's commit to roll back.

### Second batch: sourdough and rye

`hamelman-sourdough.json` adds 49 entries / 338 supplied method steps from `Hamelman_Sourdough_Breads.txt`, bringing `#hamelman` to 109 entries / 703 steps. The original 60-entry JSON is unchanged. Original book Vermont is `#recipe/hamelman-vermont-sourdough`; existing spreadsheet `#recipe/vermont` and Sourdough Pizza remain independent and unchanged. The importer is `scripts/import-hamelman-sourdough.py`; it retains every source entry and method exactly. Four malformed overall tables (p218/221/224/264) and the formula-less p262 entry are reference-only; 44 overall formulas scale. Merged/ambiguous stage data is retained without inventing allocations.

`hamelman-sourdough.js` handles only records marked `batch:sourdough`. The source explicitly excludes mature seed from overall dough weight: preserve those source percentages, add weighed mature culture to the physical build, subtract only fresh build ingredients from final additions, and show `source dough + seed = actual dough`. Piece/total-weight controls use actual weight when seed quantity is determinable, or explicitly labelled source-only weight when it is not. No seed hydration is assumed; displayed flour, water, hydration and prefermented-flour percentages are the source convention excluding seed composition. At a 1,000 g source-flour basis, original Vermont has 900 g bread flour + 100 g rye + 650 g water + 19 g salt = 1,669 g source dough; the levain feed is 150 g bread flour + 187.5 g water + 30 g seed = 367.5 g. Final additions: 750 g bread flour + 100 g rye + 462.5 g water + 19 g salt. Whole ripe levain + final additions = 1,699 g actual dough. Never add seed twice or label 1,669 g as actual divided dough.

For sourdough soakers, separate salt from the dry-grain denominator and apply salt/water percentages to dry grains. Canonical ingredient aliases connect the supplied “Flax seeds”, “Old bread, cubed” and “Grains, assorted (see headnote)” labels without modifying the source labels. Same-flour preferment/soaker allocations and merged multi-build data remain unresolved where the attachment does not specify a reliable split. Temporarily detach host input/change handlers during recipe DOM replacement: browser blur can otherwise send the previous recipe's last edited percentage into the next recipe before the old input is removed. Browser regression navigates directly from an edited Hot Cross Bun share to Vermont and checks Vermont retains its own 15% share / 30 g seed.

Run `SOURCE_TXT=/absolute/path/Hamelman_Sourdough_Breads.txt node tests/hamelman-sourdough.mjs` for source preservation, 44 formulas at three scales, explicit Vermont/stiff levain mass balances, soaker salt and unsupported-stage checks. Expanded `hamelman-browser.cjs` covers all 109 routes/703 visible steps, existing and new controls, backup preservation, source conflicts, exact protected Sourdough/Pizzalovers DOM/storage, and offline use. Existing pure/bread/pizza/Pizzalovers checks stay passing. Release `hamelman-sourdough-1`, SW v10 caches the added JSON/module; shared Hamelman storage/backups retain first-batch notes/edits and accept all 109 validated IDs. Only dough/ is deployed; revert this second-batch commit alone to roll back without touching prior recipes.

## Public recipes and owner-only calculator access

Public `/` pages now render published defaults as read-only outputs; search, filters, recipe guidance and print remain public. Visitor localStorage and input-state links do not alter the public view. Existing local edits/notes are not cleared or shown publicly. `/owner` is the interactive entry point, protected by a separate Cloudflare Access application using the existing email one-time-code provider and an exact owner-email allowlist; existing unrelated applications/policies were not changed.

`_worker.js` is the standalone Pages advanced-mode gateway. It validates the Cloudflare Access JWT's RSA signature, issuer, app audience, owner identity and expiry before returning owner HTML. The private HTML has an owner marker, root base URL and `private, no-store`; invalid sessions are rejected even on pages.dev without the custom-domain Access edge. Public HTML has no owner marker. Its public UI has no editing controls and ignores old local overrides, while `/owner` retains original calculator logic/storage. No new public-write API or shared recipe publishing function was introduced: owner calculations/notes are still browser-local, and publishing default recipes still requires a source deployment.

`access.js` controls the public presentation and owner entry link. The legacy app, Hamelman and Pizzalovers mounts accept the role without changing formulas or datasets. Source modules/recipes/workbook and the full original guidance remain unchanged. The worker denies source-test/script paths. Server auth helper source lives outside the static site in `scripts/dough-owner-auth.mjs`; its verifier is compiled verbatim into `_worker.js`. Session tokens are not persisted by JavaScript. Cloudflare issues Secure, HttpOnly application cookies with an 8-hour session. The service worker explicitly bypasses `/owner*`, never caches owner HTML and cannot reopen an owner session offline; private local edits remain preserved. Release `owner-access-1`, SWv11 precaches the new public role module/CSS.

Run `PLAYWRIGHT_PATH=/absolute/path/to/playwright-core node tests/owner-access.mjs`: real RS256-signed fixture tokens and the actual Worker handler test correct/wrong identity, issuer, audience, algorithm, expiry/tampering, anonymous denial and non-cacheable private HTML; an isolated browser tests all 136 public pages, default quantities, input-link bypass denial, hidden/preserved old private notes, a forged local owner marker, actual owner controls for all three calculator families and loss of access after cookie removal. Fixture keys/tokens are synthetic and never used in production. Existing pure formula/mass-balance suites remain passing. Production verification must check anonymous public pages, custom-domain Access redirect, direct pages.dev owner denial, private/source path denial and the configured email-only policy; completing a real owner email-code sign-in remains an owner action unless explicitly tested.

Private platform IDs/rollback are in the agent workspace evidence/cloudflare-owner-access.json, outside published assets. Roll back only the owner-access commit and delete only the newly created Dough owner Access application; retain unrelated existing Access apps. The prior deployment is commit 8fa8a31. Private local browser data must never be deleted during rollback.

## Formula completeness and public visibility

Release `formula-visibility-1` / SW v12 makes ingredient-data completeness explicit on
Hamelman cards and recipe headings. Of 109 entries, 34 lack a usable overall formula
and 17 more have unresolved build allocations or conflicting quantities. The remaining
58 have a ready ingredient/mixing calculation; this is not a claim that all prose is complete.
This source-data limitation affects public and owner views alike, not the Access policy.

Reference-only entries now expose available transcribed ingredient/stage percentages
in an expanded, clearly unverified table, including the malformed Three-Stage Rye
records (pp218/221/224). They are not summed or assigned invented gram weights.
Their original source is expanded too. Overall formulas missing a preferment table
show a dedicated missing-preferment section. Complete builds remain visible publicly,
with calculator edits still owner-only. No formula, dataset, private storage or auth
configuration is modified. Original book tables are required to complete missing data.
`tests/owner-access.mjs` checks all supplied methods and available build/reference
sections across all 109 entries, mobile width, read-only state and owner isolation.

## Original Hamelman book restoration (hamelman-book-1)

All 109 existing Hamelman routes now use `hamelman-book.json` and
`hamelman-book.js`, restored from the original 514-page PDF. There are 301 original
book tables plus the explicitly linked Focaccia dough/oil list, 719 procedure
blocks, complete original page texts, and the original Brioche/Pretzel illustrations.
Old JSON transcriptions and pure calculation functions remain independently preserved;
they are not the live weight oracle. New book state is `dough-hamelman-book-v1`.
Old `dough-hamelman-v1` notes/variations remain intact, notes are reused, version-1
backups remain importable and version-2 exports contain both data sets. Old numerical
variations are deliberately not applied to the corrected book formulas.

The metric ingredient rows drive scaling. Original percentages and U.S./Home measures
are retained separately because the book rounds them independently and may use fresh
yeast in one column and instant dry in another. Final dough is the sum of the explicit
final-addition rows, with ripe builds counted once and retained starter excluded.
Vermont at a 1,000 g basis is 368 g prepared levain, 338 g transferred and 30 g held
back, finishing at 1,669 g—not the previous inferred 1,699 g. Three-Stage 90% Rye
has 24 g Freshening → 202 g Basic Sour → 742 g Full Sour, of which 738 g enters
1,815 g final dough. These are direct metric-column weights, not silently recalculated
from the book's rounded percentages. Build and soaker percentage denominators differ
from the overall denominator. Oil/juice/milk/eggs are not treated as pure water.

104 recipes have fully weighed final lists and support actual dough/piece targets.
Five contain counts, ranges or volume/to-taste quantities: those scale in their own
units and expose only a known weighed subtotal, never an invented complete dough mass.
Overall percentage variations change matching fresh final additions only; build ratios
remain the source ratios. Wholly build-allocated ingredients are read-only. Negative
final additions and flour-basis imbalance are flagged before blur without replacing
the active field. Source defaults remain immutable and public pages read-only.

Editorial arithmetic is explicit, with all original source rows preserved:
- p93 Poolish prints 6.067 kg transfer although the prepared build is 6.607 kg and says
  “all of above”; the calculator transfers the actual full build and labels the correction.
- p94 pâte fermentée's rounded rows sum to 4.205 kg versus its 4.210 kg printed yield;
  “all of above” transfers its weighed ingredient sum, not an unprepared extra 5 g.
- p126 Brown Rice final yield repeats the 5.016 kg preferment; the final rows sum to
  19.855 kg and agree with its overall formula.
- p264 has a horizontally misaligned culture row; the explicit .7 kg seed is used.
- p338 Crossing Paste prints milk as .228 g versus 8 oz: the editorial kg-unit correction
  is 228 g, clearly labelled, with .228 g retained in the original reference.
- Other small metric-row/printed-total rounding differences remain visible; targets use
  the weighed ingredient sum. Raisin-soak liquid is drained, not a whole-soaker transfer.

Checks: `node tests/hamelman-book.mjs` covers every table/recipe at four scales, explicit
book oracles, starter reserves, chained transfers, source corrections, unit/count scaling,
percent variations and all known actual targets. Optionally set `SOURCE_PDF` for SHA256.
`PLAYWRIGHT_PATH=/absolute/path/playwright-core node tests/owner-access.mjs` verifies
all 109 public and all 109 real-RSA-authenticated owner recipe views, every original
procedure and scaled row, mobile width, private notes, print, targets/pieces, in-focus
percentage edits, both backup versions and the protected pizza calculators. Existing
engine/pizza/Pizzalovers/temperature and transcription preservation tests still apply;
the old transcription-specific Hamelman browser fixture is historical, not the book UI.
Release/SW v13 must be published together. Deploy only dough/. All assets, recipes and
original procedures must be checked again on dc.rodiucov.com before claiming completion.
