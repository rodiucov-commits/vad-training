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


## Requested revision 3

Top row: count, piece weight, derived total dough weight only. Water/salt controls
moved beneath the worksheet. Grand-total row includes each ripe levain/sponge
weight with an explicit final-additions + ripe-transfers equation. Right-hand final-
mix recipe card restored. Added speed1/speed2 minutes, autolyse rest, derived active
mixing total and elapsed mixing-plus-rest total; blank is unknown, not zero. Added
post-mix dough temperature, fermentation temperature and public DDT link. Speed2
supports the printed3–4min range. Only p167's supplied process values prefill;169
remains blank. User trial settings are separate from printed source commentary and
are not reset when scaling ingredients. Both presets reset process fields explicitly.
All changes remain isolated; no deployment or shared recipe writes.

## Requested revision 4

Unified typography (regular tabular sans-serif numbers, consistent labels and input
sizes; serif headings only), spacing and teal palette. The right-hand panel is now
“The kitchen recipe / Bake this bread”: live batch yield, final-mix ingredients and
ordered cooking guidance. Baguette process uses verified p167 times; p169's missing
method remains disclosed, not borrowed from the baguette example. Ingredient scaling,
mixing-time edits, entered post-mix/fermentation temperatures and autolyse trial fields
update the sidebar without HTML interpolation of user text. Autolyse placement remains
explicitly unspecified rather than inventing an ingredient split. Tests cover sidebar
batch/time updates, known source process, missing source method and unified numeric
font style, in addition to existing source arithmetic/responsive checks. No deployment.
