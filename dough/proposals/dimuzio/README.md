# Recipe-sheet design proposal · 2 November 2026

Standalone `index.html`: open directly in any browser. No dependencies, accounts,
network requests, local storage, database writes or modifications to the existing app.
The external brand link goes to the existing Dough site. Do not deploy this folder
as the production site root: it is an isolated design proposal.

One page with two selectable source-based examples:
- Baguettes: DiMuzio printed166–167; overall69% water,11% PFF,100% levain hydration.
- Boules: printed169 worksheet; overall70% water,8% levain PFF at100% hydration,
  10% sponge PFF at60% hydration. Source168 instead says69%; preserved as a note.
- Both include2% salt and0.4% instant yeast, relative to whole-formula flour.

All quantities are independently recalculated, not transcribed rounded gram rows.
Default home batches (3×400g and2×700g) are presentation adaptations. Preferment
allocations describe required ripe composition, not a fabricated seed-feed schedule.
Source process is retained for167, Celsius conversions labelled;169 has no invented
procedure. Book inconsistency notes are shown on the page and retained separately
in the baking skill. The source PDF and all existing recipes/calculators are unchanged.

Revised at Vadim’s request: match the book’s table closely. A teal-headed,
full-width worksheet replaces the editorial cards/sidebar. Columns are ingredients,
whole-formula baker’s percent, straight/overall dough, one or two preferment
subtractions and adjusted/final dough. Ripe transfer rows and a reconciled final
total are inside the same table. Percentage sum, flour equation, preferment ratios
and two-column procedure fields sit beneath, as in the source. Small screens scroll
the worksheet inside its own frame; no whole-page overflow. Arithmetic unchanged.

Verification:
`PLAYWRIGHT_PATH=/path/to/playwright-core node dough/tests/dimuzio-proposal.cjs`
Tests independent source formula oracles, fixed-hydration allocation changes, both
builds, mass equality, invalid allocation rejection, focused-input recalculation,
both presets at390/768/1440px and browser errors. Screenshots saved alongside HTML.
No production deployment or shared recipe changes were made.
