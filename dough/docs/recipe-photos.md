# Finished-product photos — version A

Release: `recipe-photos-1`, SWv46. Implementation is prepared locally; production
provisioning/deployment is blocked on authenticated Cloudflare R2/Pages access.
The existing API token returns403 for both APIs and the managed Cloudflare browser
is signed out. No bucket/subscription, Pages binding or live source has been changed.

## Owner workflow

Edit published recipe → Finished bread photos → choose a photo → adjust crop/zoom
→ Use this photo → description and optional caption/credit → Save draft → Publish.
Up to2photos: cover plus optional crumb/second view. Replace, Remove and Make cover
are changes to the working recipe, not automatic publications. Upload alone is
private, and saving a draft still does not publish the photo. New named recipe
copies label inherited photos as references. Revision rollback restores the photo
references stored in that revision; original formula references stay immutable.

JPEG/PNG/WebP decode and rasterize in the browser. HEIC/HEIF is attempted using the
browser's native decoders, including an image-element fallback; support depends on
browser/OS. An unsupported file gets an explicit JPEG/PNG conversion message.
HEIC compatibility is not claimed as tested on real Safari/iPhone hardware.

The browser makes480×360 and1200×900 JPEG derivatives at0.84quality from a deliberate
4:3crop; the phone original is never uploaded. Canvas encoding removes source EXIF
location metadata. The Worker caps the whole request at2.3MB, each derivative at
1.1MB, checks JPEG structure/dimensions and rejects EXIF/IPTC segments and non-JPEG
payloads. File decoding/rasterization happens in the browser, not a server codec.

## Layout

A single figure sits atop the existing teal method panel on desktop. At1050px and
below, the same DOM figure moves under the recipe title; it is not duplicated.
Collection rows, panels, fonts, colours, batch positions and recipe calculations
are unchanged. No image means no new block. Click opens the native modal dialog
with both photos; Escape/Close restore focus. Print omits photographs. A bounded
service-worker cache keeps up to80visited public image derivatives; it never caches
Owner draft images or bulk-downloads the entire image library.

## Storage and boundaries

- Add one new Pages production R2 binding: `DOUGH_PHOTOS`, bucket proposed
  `dough-recipe-photos`. Do not enable public r2.dev/bucket access.
- Existing `DOUGH_AUTH_DB` remains authentication-only. Preserve both existing D1
  bindings, compatibility settings, environment variables and routes.
- The content-only `DOUGH_RECIPES_DB` receives `recipe_media` only on the first
  authenticated upload. No existing source/publication/draft/history is migrated.
- Photos are optional metadata in versioned recipe JSON: `{id,alt,caption,kind}`.
  IDs are immutable32hex strings; `kind` is actual/reference/illustrative. Original
  immutable source references and schemaVersion1 remain unchanged.
- R2 object keys: `photos/<id>/small.jpg` and `large.jpg`. Public GET/HEAD at
  `/media/<id>/<variant>.jpg` works only after explicit publication. Owner-only
  `/owner/media/<id>/<variant>.jpg` supports private staged preview.
- Publication marks media public in the same D1 transaction as recipe publication,
  conditional on the exact recipe document and revision; a competing publication
  with the same revision cannot expose somebody else's staged document's photo.
- Previously published objects remain reachable for revision history. Removing a
  photo removes the current recipe reference, not historical media. Failed uploads
  clean up partially written objects. Unused successful staged uploads are retained;
  no destructive background cleanup policy is enabled in this release.
- No Cloudflare/GitHub credentials appear in frontend assets. No CSP relaxation.
  Photos do not enter Git history; only the uploader/renderer code does.

## Deployment checklist — resume after Cloudflare sign-in

1. Confirm the signed-in Cloudflare account and target Pages project from the
   dashboard. Export the entire current project config, latest deployment settings
   and public recipe/archive snapshots into private agent storage before mutation.
   Public snapshots do not include private drafts/history; do not claim a full DB
   backup unless separately exported.
2. GET the account's R2 bucket list. If R2 requires billing activation, report the
   exact account checkout prerequisite rather than inventing available storage.
3. Create only the intended bucket if absent, or verify its identity if it exists.
   Add `DOUGH_PHOTOS:{name:'dough-recipe-photos'}` to production
   `deployment_configs.production.r2_buckets`, preserving the complete inspected
   existing production/preview settings and D1 bindings. Use a narrow PATCH after inspecting the current config, not a guessed full replacement.
4. Upload/get/delete one synthetic object under an isolated `_verification/` prefix
   to prove actual R2 storage, without publishing or altering a real recipe.
5. Recheck origin/main and local status, merge/push only reviewed code. Wait for the
   exact commit's Pages deployment success. Compare served runtime/bundle bytes,
   public recipe/archive JSON, anonymous upload denial and direct origin/Owner auth.
6. Exercise deployed modules using synthetic read-only Owner GET interception and
   upload POST interception, not by publishing a live test recipe. Separately verify
   the real R2 binding via deployment config/runtime availability and object check;
   distinguish this from an authenticated production Owner upload test.

Rollback: restore the prior source tree with a fresh release/cache version. Keep
R2 objects/media metadata and all existing D1/auth data. Prior code ignores optional
photo metadata. Never roll back the auth/content databases to revert a UI release.

## Verification

- `node --test dough/tests/recipe-photos.mjs`: origin/session denial, bounded requests,
  JPEG shape/metadata validation, private→draft→publish boundaries, replacement/
  removal/history, malformed metadata, failed-R2 cleanup, copied-photo reference
  labelling and exact-document conflict protection.
- `PLAYWRIGHT_PATH=... node dough/tests/recipe-photos-browser.mjs`: actual browser
  decoding/cropping/JPEG upload against the real Worker with SQLite and an R2-shaped
  fixture; private media denial, draft reload, publication, unchanged desktop
  geometry, one mobile figure through scaling, viewer/Escape/focus, second image,
  cover/replace/remove and rollback. Synthetic test images are not recipe results.
- Existing content/auth/store/transfer/engine suites remain independent checks.

An extra offline fresh-navigation experiment was inconclusive: the HTTPS fixture
stalled on service-worker readiness, and a localhost fixture failed fresh reload
with both synthetic-offline and a stopped server. This is not claimed as a passing
offline test. Core photo lifecycle tests run separately with SW disabled; actual
production cache/offline behaviour still requires verification after deployment.
