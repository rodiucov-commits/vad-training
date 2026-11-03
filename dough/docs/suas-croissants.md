# Suas croissants — 2026-11-03

Eight base croissant formulas added to the existing Suas source collection, explicitly requested as an exception to the prior no-sweet-breads scope. No Danish, brioche, sweet fillings or other sweet breads added. The collection now has52 Suas recipes;203 database records and208 visible cards including tools.

## Original source checked

Michel Suas, *Advanced Bread and Pastry*, first edition (2009): printed331 (direct),332–333 (poolish),335–336 (prefermented dough),337–338 (sponge),339–341 (natural starter),341–342 (hand mix),343 (whole wheat),345–346 (whole wheat with prefermented dough). Original page images checked for every formula/process table. Supplementary lamination/shaping facts checked against images311–313,315,317–318. PDF page = printed page +14. Source SHA-256 embedded in each record; bundled PDF and master skill are unchanged.

## Formula accounting

- Source metric kg columns converted to grams; rounded quantities are not secretly adjusted to match printed total or percentage. Original local percentages retained, not substituted for overall percentages.
- Dough butter and roll-in butter are separate rows. Both contribute once to finished batch mass; only dough butter goes into the mixer. Roll-in25% is based on détrempe, NOT flour. Its sourcePercent cell is intentionally null to avoid mislabelling25% as baker's flour percentage. Original1134g is retained for the seven formulas that print it.
- Natural-starter pp339–341 omit roll-in weight. Explicit working adaptation uses Suas's general p311 standard25% ×4536g détrempe =1134g; warning identifies the omission and separate general-source calculation. Not represented as an ingredient printed on p340.
- Natural levain45g → first dough consumes34g, retains11g; first dough447g → final consumes447g. Hydration of the seed itself is unknown, not inferred. Milk, eggs and butter water is not quantified, so direct-water percentage is not full effective hydration.
- Sponge843g ingredients vs842g subtotal/transfer: retain1g. Hand-mix poolish1469g ingredients vs1468g subtotal/transfer: retain1g.
- Source détrempe4536g vs working actual4535g (poolish/whole wheat),4537g (hand mix),4527g (whole-wheat prefermented). Preserve final metric components plus explicit roll-in1134g; final totals5669,5671,5661g respectively. Other four batches5670g.
- Hand-mix milk336g final vs329g overall retained separately. Whole-wheat prefermented final whole wheat502g vs overall509g, yolk205g vs204g and total yeast35g vs36g retained, not silently reconciled.
- p331385°F(96°C) discrepancy disclosed; working196°C follows explicit Fahrenheit calculation and other formula pages. Sponge p33772°F(27°C) discrepancy disclosed; working22–25°C follows printed Fahrenheit conversions and parallel formulas.
-48 base pieces is explicitly labelled an editable planning assumption, not source yield. Finishing egg wash/dusting flour is unquantified and excluded from dough mass.

## Process and timeline

Three single folds, refrigerated interfold rests, final rest ≥30min,3–3.5mm final sheet and traditional croissant shaping retained. Hand-mix uses its formula-specific1h interfold rest, not generic30min. Required cold-hold and combined lamination/handling/rest duration fields prevent their silent omission; no numeric defaults invented. Natural levain and first dough schedule sequentially. Prefermented build time includes unspecified cold storage; repeated levain feed duration is not inferred. No alternative freezing schedules added.

Existing public/Owner template, source filters, navigation generation guard and calculator classifications unchanged. General planner still ends at oven exit, excludes cooling and includes55min preheat reminder.

## Backup, import and checks

Private `private/dough-suas-croissants-20261103`: previous d1c7376 source archive,195 actual live publication/revision snapshot and visibility snapshot. Not a complete D1 draft/history export. New `suas-croissants-v1` idempotent additive import preserves all existing records and markers; fixtures test interrupted batches, edited publications, drafts, counters and history.

Tests: `suas-croissants.mjs` page-image independent arithmetic, scaling, reserve fractions, butter basis, chained timeline; `suas-croissants-browser.mjs` real Suas menu/cards/source/back/scaling/mobile; `recipe-content-browser.mjs`203 public and203 Owner views; source44/DiMuzio preservation and partition; Owner/auth/archive/store tests; Suas mixing unchanged. Independent Decimal audit203 records:192 computable bases agree,127 partial composition,11 unavailable,182 water controls. Scope is accounting, not physical validation of source discrepancies.

Rollback: revert the croissant source/deployment change with fresh release/cache key. Do not delete/restore the content or auth databases or browser-local notes. The additive rows remain in the database but previous source navigation does not list them. Reconcile any subsequent Owner edits before reimporting; INSERT OR IGNORE does not overwrite them.
