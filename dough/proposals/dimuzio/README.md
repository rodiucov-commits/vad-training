# Recipe-sheet design proposal · 2 November 2026

Static example: `index.html` with same-origin `worksheet.js` and `worksheet.css`.
No external dependencies, accounts, local storage, database writes or modifications
to the existing app. Serve this directory locally or use the live example URL.
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

## Requested revision 5 and live example

Procedure-only right panel: removed “At the final mix” ingredient table, widened
notes to approximately39% of the desktop workspace and reduced worksheet width.
Ingredient weights remain in the worksheet; sidebar method/yield remain live-linked.
Externalized CSS/JS so the site's existing script-src self policy stays intact.
Direct example route: `/proposals/dimuzio/`. The collection template, existing
published records, databases, authentication and original calculator assets are not
modified. Screenshots are local verification outputs and not part of deployment.

Predeployment checks: all134 canonical/public+Owner recipe views and source adapters,
all134 Owner editors/114 water controls;1602 workbook formulas;15 calculation/content/
auth suites; independent Decimal audit; live134recipe route/content scan; existing
live publications equal the frozen originals and live model bytes match tested code.
Partial/unknown compositions retain disclosures (85partial bases,11unavailable bases).
Deployment adds only this example and its tests/docs. Revert the proposal commits to
remove it; no data rollback is needed because no shared recipe writes occur.

## Starter correction

Removed the intermediate total: the worksheet has one grand-total row at the bottom.
Added a weighed starter ingredient and editable starter hydration. The default2%
of whole-flour mass at100% hydration is an explicit demo assumption, not book data
or a fermentation recommendation. Missing hydration is rejected, never guessed.

Whole-formula flour/water and target mass include starter contents. Split seed into
seedFlour=seedMass/(1+seedHydration/100), seedWater=seedMass-seedFlour. Keep the ripe
preferment's chosen whole-flour allocation/hydration fixed; fresh feed flour/water
are ripe composition minus seed contributions. Main rows show fresh flour/water
and a separate starter ingredient, so physical masses can be summed without double
counting. Ripe mass=fresh feed flour+fresh feed water+starter; final dough=ripe
transfers+final additions. Reject starter overdraw. All recipe flour, including seed,
is100%; fresh-flour percentage alone can be less than100%.

Independent `python3 dough/tests/dimuzio-seed-audit.py`:54Decimal cases across both
presets,3batch sizes,3starter doses and50/100/200%seed hydrations. Hand oracle:
1000gwhole flour,110gwhole levain flour at100%hydration,20gseed at100%hydration:
100gfeed flour+100gfeed water+20gseed=220gripe; final890gflour+580gwater+20gsalt+
4gyeast+220gripe=1714g,69%whole-dough hydration. Seed isnot20gextra above that target.
Browser tests verify one total, starter row, build equations, live seed hydration,
unknown/overdraw rejection, batch scaling and both responsive presets.

## Preferments-first / single-formula revision

Live asset tagdimuzio-flow-7. Both build cards precede the compact final-dough table.
No blank rows, separate transfer footer or “included” annotations in the total.
Final table is one nonoverlapping weighing list: ripe levain/sponge then fresh final
flour/water/salt/yeast; one total at bottom. Do not add build feed rows to this table.

Primary editable controls specify each ripe preferment mass as percent of TOTAL
DOUGH MASS. Display baker's equivalent (ripe mass / all recipe flour) and PFF
(build flour incl starter / all recipe flour) separately. If d=1+H/100+S/100+.004,
PFF=share*d/(1+buildHydration/100), and share=PFF*(1+buildHydration/100)/d.
Canonical UI shares keep full precision; displayed rounding never drives recalculation.
Changing overall hydration or batch size preserves chosen mass shares. Advanced
PFF input updates the matching mass share in reverse. Seed mass/hydration controls
remain available in the levain card, with weighed starter in its ingredient list.

Browser tests cover both conversion directions, hydration and count edits, seed
accounting/recovery, combined preferments, single total, absence of blank/footer
rows, build order, process links and390/768/1440layouts.54independent Decimal
seed oracles now also compare mass-share and baker's-percent outputs. Existing
collection engines and records are not changed.

## Overall formula reference added

Assettagdimuzio-overall-8: show overall baker's formula immediately after count /
pieceweight / targetmass, before01Preparethepreferments. Four reference rows:
whole-recipe flour100%, wateroverall%,salt%,instantyeast0.4%,withscaledgrams and
one table total. Flour/water include all starter and preferment components; do not
add levain/spongemass again to this reference. Final-mix table and explicit build
feed/seed ledgers remain unchanged. Invalid states hide/clear this table too.
Browser tests verify position,100%flour andwaterbasis,livehydration/scaling and
unknownseed recovery.54independent Decimal model cases remain passing.


### Sectioned reference and baking timeline · 2026-11-02
The screenshot is a design reference only, not a new Bagels formula. The top reference now shows overall composition, each preferment’s fresh components and explicit starter, then adjusted final dough. All percentage cells use whole-recipe flour (including seed flour), clearly labelled; section yields are alternative views, never added together.

Ripening hours and editable bulk/rest/shaping/proof/baking/cooling minutes feed a start-time planner. Preferments start together and run in parallel (maximum readiness interval, not sum). Subsequent duration ranges propagate endpoint-wise through mixing, fermentation, oven exit and cooling. The planner’s declared order is Speed 1 → autolyse/rest → Speed 2, an editable-method planning convention rather than a book-specified autolyse method. Oven preheating must overlap proofing; it is not added to the elapsed total.

Unknown source timings stay blank and block a complete schedule, including explicit autolyse=0 when absent. One-preferment source timings are from printed p.167; p.169 supplies no procedure. Ripening, shaping allowance and cooling are user settings. Calendar output uses browser-local time, elapsed durations, date rollover and range labels. This estimates a work plan, not biological readiness.

Verified: 54 independent Decimal mass/composition cases; browser checks for section balances, parallel-build clock vector (12h readiness + subsequent stages = 17h18–17h54), overnight rollover, missing/negative duration rejection, live-linked notes, scaling without resetting the schedule, and 390/768/1440px layouts. Existing collection and shared engines untouched.


### Action-plan endpoint: baked bread
The timeline now finishes at oven exit, not cooling. Cooling is removed from inputs, required stages, elapsed duration, recipe timing summaries and milestones. The start-date/time field updates the action plan automatically; its summary leads with the dated oven-finish time and elapsed duration. Main actions are preferment preparation/readiness, mixing, start bulk, divide/rest, shape, proof, oven entry and baked bread. Mixer speeds and rest still contribute internally, without separate micro-milestones.

The independent parallel-build vector now ends after 978–1014 minutes (16h18–16h54), exactly 60 minutes earlier than the former cooling-inclusive vector. Tests cover completing the planner with no cooling field, changing the start date, clearing/recovering the start field, final baked-bread milestone, date rollover and interval output. These changes supersede the cooling endpoint described above.


### Oven reminder and cleaned page notes
The action plan inserts “Switch on the oven” exactly 55 minutes before the baking-start interval, sorts it chronologically alongside the other actions, and leaves the total duration and oven-exit finish unchanged. The reminder is not clamped to the plan start; a very short plan can correctly require preheating before the preferment-start time. Tests check both time-range endpoints and epoch offsets.

Removed the requested long source/adaptation paragraph and source citation/error paragraph from the visible page. Underlying provenance and formula-audit details remain in repository documentation; calculation behavior is unchanged.

The action plan is in the right-hand kitchen-recipe panel below the baking instructions, with sidebar-matched typography and contrasting finish time. DOM order and responsive layout are checked.
