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
