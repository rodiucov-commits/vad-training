# Suas retarding chart

`suas-retarding.js` adds one reference utility under Calculators only. It is not a published recipe, editable database document or new header tab. Existing203 recipe records, source filters and recipe math stay unchanged; the utility count increases from4 to5. All remains204 recipe/build cards.

Source: Michel Suas, *Advanced Bread and Pastry*, first edition (2009), printed p.103 (PDF117), Fig.4-16. Original page image inspected at180dpi. Narrative pp102,104–105 read separately to identify differences, not to rewrite the chart. Original PDF checksum was verified against the same source used for Suas collection imports; bundled source/master unchanged.

## Four rows and all facts

1. Delayed first fermentation:100/67/1.5/2 flour/water/yeast/salt. Improved mix, dough73°F; bulk15–20h44°F(6°C); divide,20minrest,shape; finalproof1–1.5h; bake470°F.
2. Frozen preshaped dough:100/65/2.5 flour/water/yeast,40%preferment,20ppmA.A. Improved/intensive mix,dough72°F;15minfirstferment;divide,10minrest,preshape as drawn;flashfreeze−27°C/−18°F as printed;baggedstorage−18°C/−0°F;defrost2–8h40–45°F dependingloafsize;shape;finalproof1.5h75°F;bake460°F. Do not insert a salt amount or invent freeze/storage durations or preferment composition.
3. Slow final proof:100/67/1/2 plusoptional15ppmA.A. Improved mix,dough73°F;20minfirstferment;divide,preshape,20minrest,shape;12–15h50°F(10°C);bake470°F.
4. Retarding–proofing:100/66/1.8/2 plus20ppmA.A. Improved/intensive mix,dough73°F;15minfirstferment;divide,preshape,20minrest,shape;retard12–48h40°F(4°C);proof4h60°F(16°C);bake470°F.

No row gives bake duration; delayed final-proof temperature, frozen freeze/storage durations and salt/composition gaps are kept unspecified. Figure yeast type is not stated; adjacent fresh-yeast guidance must not become an unlabelled instant-yeast substitution. A.A. abbreviation expanded as ascorbic acid without adding a dosing calculator or assuming a full missing recipe.

Celsius additions explicitly calculated from Fahrenheit:73≈23,72≈22,75≈24,470≈243,460≈238,40–45≈4.4–7.2. Existing printed pairs preserved, not overwritten by conversion;−27°C/−18°F mismatch disclosed. Figure delayed15–20h6°C/1.5% differs from p10212–18h7–9°C/freshyeast1.2%; figure finalproof4h16°C differs from p10522–24°C. Both positions retained separately in expandable source notes.

## Presentation and artifacts

Original layout/symbol artwork, not a scan or tracing of the publisher’s illustrations.24 grouped process cards retain action order; steps combined into divide/preshape/rest/shape cards preserve all named actions. Numbers/arrows indicate order, not a time-scaled chart. Cold/proof/bake have distinct low-saturation semantic colors consistent with the site’s Arial/teal style. Responsive vertical flow on phones; horizontal process rows on desktop. No new top-level menu.

Standalone HTML contains inlineCSS+SVG, no scripts/external fonts/images; SVG downloadable. Generate deterministically with `node scripts/build-suas-retarding.mjs`. Both exports derive from the reviewed process data. Do not replace the chart’s printed facts with narrative values during regeneration.

## Verification / deployment

`PLAYWRIGHT_PATH=/opt/homebrew/lib/node_modules/openclaw/node_modules/playwright-core node dough/tests/suas-retarding.mjs`: independent page-image value/sequence oracles, conversions, formula percentages/optionalA.A., all24 rendered cards, print/download, export parity, SVG text bounding boxes, source notes, Calculators-only placement, direct/card/back navigation and390/768/1440 widths. Existing `collection-navigation.mjs`, `suas-mixing.mjs` and source partition tests retain all previous tools/recipes.

Release retarding-1 /SWv36 includes full module/CSS/SVG/HTML cache graph. No Worker/auth/database changes. Before rollout, source/public-record/visibility snapshots saved privately; this is not a complete D1 export. Verify actual live asset bytes, new utility route, all203 existing publication documents/revisions and visibility equality. Rollback frontend only with a new release/cache key; never clear recipe/auth databases or private local notes.
