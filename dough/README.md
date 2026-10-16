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
