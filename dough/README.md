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
