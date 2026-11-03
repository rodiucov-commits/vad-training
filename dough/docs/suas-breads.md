# Suas non-sweet bread collection — 2026-11-03

## Scope

44 formulas from Michel Suas, *Advanced Bread and Pastry: A Professional Approach*, first edition (2009), chapter8. Four baguettes; ciabatta/country bread; all sourdough/levain loaves in the chapter; nonsweet prefermented pan breads, flatbreads and rolls; pretzels, bagels, spelt and sesame semolina. Includes the sourdough/sponge/poolish/prefermented-dough recipes, not just formulas whose titles say sourdough. Sweet breads, egg celebration bread, caramelized hazelnut squares, pastries, conchas, challah, stollen, chocolate/holiday breads and butter–walnut filoncini excluded. Honey wheat is a sandwich pan bread; pear buckwheat is a nonsweet hearth bread served with cheese/salads.

`Suas formulas` in the main menu and `Suas` in the source filters open the same existing collection. No dedicated landing URL. Short/improved/intensive mixing tools stay under Calculators with DDT. Other source filters retain their original members.

## Sources and audit

- `sources/suas-breads.json`: frozen reviewed source adaptation,44 schema1 records.
- `docs/suas-source-ledger.json`: original metric ingredient rows, percentages and printed totals, unmodified by working-stage adjustments.
- Original PDF SHA-256 is embedded in every source record. Printed page = PDF page minus14 for these pages.
- Page images inspected for ingredient tables and numeric/process facts:186–194,201–227,229–230,232–235,241–248,252–261,263–275,280–285. Pages195–200 decorative-shape photographs are not transcribed into a purported standalone shaping course; the country-bread formula retains its boule/batard directions on193–194.
- No historical background, health claims, pastries, outside recipes or new starter-hydration assumptions imported. Short process facts are retained with author/printed-page citations; supplementary shaping/preparation notes are paraphrased.

## Accounting and original discrepancies

Working ingredients start from the metric kilogram columns converted to grams. Printed local-table percentages are preserved; they do not silently become whole-dough percentages. Transfers trace chained builds; known flour/water accounting follows only the amount consumed. Seed starter is a physical ingredient counted once. Its flour/water composition remains unknown unless explicitly supplied; “stiff” and “liquid” alone are not silently assigned hydration values.

Rounded build/transfer differences up to5g are made explicit: small deficits use the actual ingredient sum; small excesses show retained residue. Zero-gram yeast/salt with positive printed percentages are explicit sub-gram adaptations calculated from local flour. Printed zeros remain visible in a reference stage. Development time/fermentation are never inferred from a yeast dose.

Larger inconsistent builds (whole-grain p208, Two Castle soaker p222, fougasse p234, rustic-filone levain p256) are explicitly proportionally scaled from their listed metric component ratios to the required transfer. They are labelled **untested calculated adaptations**, not book corrections; original rows remain separately visible. A mass-balanced adaptation does not establish what the author intended. Naan preserves the conflicting yogurt metric quantity and flags the unit/overall disagreement. Multigrain’s printed final sum also conflicts with its ingredients. These are labelled source discrepancies on cards and recipe warnings, not presented as verified corrected recipes.

Other flags: spelt440°F/238°C conflict; wholegrain/wholewheat/honey-wheat printed temperature conversions; Pain meunier overall malt absent from final mix; pita butter/sugar vs overall oil/sugar conflict. Source Celsius values are preserved and conflicting Fahrenheit pairs disclosed. Focaccia has no baking time/temperature on its process sheet; dinner rolls omit bake duration. Nothing invented to fill those fields.

Pretzel dip is a separate bath, not dough mass; source bath and protective-equipment directions are retained, with a clearly labelled food-grade-only safety clarification. Bagel cold proof and blanching retained. Cold final proof is part of proof time; pre-ferment refrigeration belongs in the full build duration. Miche’s first and second feedings are linked sequentially; independent builds run in parallel. Olive first dough is an intermediate mixing stage with no invented extra ripening.

## Preservation and rollout

Previous live commit8ace879. Private backup `private/dough-suas-20261103` contains source archive, public publications/revisions and visibility snapshots; it is **not** a complete D1 export of drafts/history. Additive import marker `suas-breads-v1` is written only after successful idempotent INSERT OR IGNORE batches. Existing151 publication documents, drafts, draft counters, revisions and previous import markers must not be rewritten. Dedicated recipe/auth bindings are unchanged.

Tests: `tests/suas-breads.mjs`, `tests/suas-breads-browser.mjs`, `tests/recipe-store.mjs`, existing full `recipe-content-browser.mjs`, `dimuzio-artisan.mjs`, `dimuzio-browser.mjs` and template checks. Coverage includes independent page-image mass oracles,44 ledgers/transfer/scaling checks,151 prior record equality,195 public+195 Owner views, source navigation, real menu/back clicks, no-sweets scope and200 cards partitioned exactly once.

Navigation regression: async hash refreshes now carry a generation/hash guard, so responses from superseded source/back navigations cannot remount the active recipe and reset an in-progress batch. The Suas browser test injects API latency before real source/back/card interactions.
