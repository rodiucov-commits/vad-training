# DiMuzio · Artisan Bread import

Seventeen requested formulas from Daniel T. DiMuzio, *Bread Baking: An Artisan’s
Perspective* (copyright2010), ISBN978-0-470-13882-3. Source PDF SHA-256:
`56ef9f6c9bdb91326c42dbf6f3adc39dadd1a01bd3362c467ad102d0b44b9f10`.

## Scope and evidence

- Four baguette formulas: direct199, liquid levain200, old dough201, poolish202.
- Brioche204–205; ciabatta210–211; croissants212–213; focaccia219–220;
  hearty sourdough rye220–221; firm pain au levain223; liquid pain au levain224–225;
  campagne225; rustique226; Pugliese227–228; pizza228–229;
  San Francisco232; Sicilian semolina233–234.
- Original page images were inspected for every formula, numeric procedure and
  continuation. Referenced mixing/proof/baking guidance on195–197 was inspected;
  baguette shaping86–88 and butter enclosure/turns145–147 were read and inspected
  to expand the recipes’ cross-references into practical paraphrased guidance.
- `sources/dimuzio-artisan.json` is the reviewed structured transcription and
  paraphrased method source. `dimuzio-import-audit.json` retains the original1×
  ingredient ledger, page mapping and correction decisions. The1× metric column
  drives scaling; inconsistent4× and imperial columns are not substituted.
- Every recipe is tagged Artisan Bread, including the requested pastry/pizza recipes.
  The collection link is `/#artisan-bread`. All four baguette titles are separate
  records; the direct formula’s three mixer/yeast choices remain explicit options.

## Accounting and printed conflicts

Seed is always an explicit weighed build ingredient. Where the book excludes an
amount equal to inoculum from the final transfer, that is an explicit retained
portion of the ripe build, not a second addition or a hidden zero. Starter hydration
is not supplied in these tables and is not invented. Physical hydration is therefore
labelled partial until the user specifies culture composition. Milk/eggs/butter are
not treated as pure water. Printed reference percentages stay printed; derived
working-stage percentages declare the counted-flour denominator separately.

Rounded commercial-yeast build subtotals omit trace yeast in several formulas.
The working transfer includes the entire prepared build and sums final additions
once. Original rounded transfers and totals remain in notes/reference evidence.
Examples: poolish400→400.1g; ciabatta biga504→504.3g; focaccia445→445.3g;
pizza320→320.2g; semolina560→560.4g. These are arithmetic adaptations, not claims
that the author printed the corrected numbers.

Larger conflicts remain prominently disclosed:

- p201 old dough: transfer420 conflicts with prepared427 and final yield1707;
  working transfer427. Hydration box100 conflicts with170/250=68%.
- p204 brioche: actual1× ingredient sum1670, not printed1668.
- p212 croissants: straight8g yeast vs adjusted7g; mixing follows adjusted1722g.
- p219 focaccia and p233 semolina: biga hydration boxes100% contradict60% feeds.
- p223 firm levain4× subtotal2554 conflicts with3120 from its components.
- p225 campagne:3g yeast/1000g flour is0.3%, although percentage column prints0.5%.
- p226 rustique: metric scaling450–525g conflicts with the printed8–16oz line;
  rounded salt/yeast percentages are not rewritten.
- p227 Pugliese: build533.3 vs printed532; adjusted ingredients imply951g flour
  and723g water rather than950/722. Keep the fresh additions, transfer the actual
  build, and report1697.3g rather than forcing1695g.
- p228 pizza4× yeast422g is inconsistent; scale the inspected1×0.2g.
- p232 San Francisco adjusted rows visibly conflict with the overall formula and
  build. Explicit reconstruction:700g flour+500g water+20g salt+0g yeast+480g levain
  =1700g. Printed0g salt/480g yeast/427g transfer remain read-only source references.

## Publication and preservation

Existing134 source records are structurally identical to release712d835. The total
is151 records/408 stage tables/889 method blocks. `build-dough-catalog.mjs` appends
the reviewed DiMuzio source deterministically. Schema adds only the `dimuzio` source
kind and bounded optional extra timing stages. No legacy formula engine is rewritten.

The content store uses additive import marker `dimuzio-artisan-v1`: validate the
complete151-record catalogue, INSERT OR IGNORE publications and source revisions,
write the marker last. Existing source-v1 marker, publications, edited revisions,
drafts, counters, visibility and history remain intact. An interrupted batch test
proves resume safety. The generated Worker’s archive allowlist includes the new IDs;
authentication code, accounts and bindings are unchanged.

Brioche/croissant/pizza cold holds are explicit required timing fields. Croissants
also require elapsed lamination time. No fixed “overnight” duration is invented.
The generic action plan cannot silently omit those stages. Source methods remain
visible in full and times/temperatures do not scale with dough mass.

Release `dimuzio-artisan-1` / SWv27 versions the changed module graph and catalogue;
old browser notes are untouched. New source-only routes use the frozen record,
not a nonexistent legacy spreadsheet. Owner editing/preview remains functional.

Private pre-import site/source, public publications and visibility backups are in
agent private storage. Rollback the previous Pages source if necessary; retain the
additive database rows/history and use visibility controls rather than destructive
SQL removal. The older client ignores unknown catalogue entries and can fall back
to its original source; old notes are not migrated or cleared.

## Checks

- `node tests/dimuzio-artisan.mjs`: independent17-formula mass/transfer/retained
  oracles at4 scales, original134 equality, source references, required cold holds.
- `node --test tests/recipe-store.mjs`: cold/additive/interrupted import, preserved
  edited publication/private draft/counter/history, all151 schema/scaling checks.
- `node tests/dimuzio-browser.mjs` with PLAYWRIGHT_PATH: all17 cards/routes, actual
  card/back/source/Owner-preview links, printed100%, cold-hold gating, mobile/desktop.
- Shared151public+151Owner content/method/scale views and151editors/131water controls.
- Independent Decimal ledger:151 checked,140 computed bases match,92 partial
  composition records,11 unavailable bases; no false full-hydration certification.
- Real prior-release cache/SW upgrade and offline navigation include a new DiMuzio
  route while retaining old private notes. Original source-oracle suites still pass.
