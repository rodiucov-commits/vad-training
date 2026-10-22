this is my WOD training page

## Timers

`src/index.html` contains the workout dialog; `src/chrono.html` contains the standalone timer. Root HTML files and `assets/` are generated production output; edit the sources, not the generated files.
Both use `timer-engine.js` for schedules, phase lookup and scheduled-workout scoring.
The pre-start countdown is not part of workout elapsed time. Schedules use one global
elapsed clock, so delayed callbacks can cross multiple stations/sides without losing time.
Standalone REST remains a between-set countdown; workout STRENGTH and ROUNDS use
manual set/round completion followed by prescribed rest.

- EMOM `config.rounds` means **total minute slots**, not work bouts. A 12-minute
  alternating EMOM is six work and six rest minutes.
- Prefer `config.minuteCycle: [{label: "Bike", phase: "work"}, {label: "Rest", phase: "rest"}]`.
  Workout movements explicitly numbered `Min 1: ...`, `Min 2: ...` are also recognized.
  Legacy explicit odd-work/even-rest notes are adapted without halving duration.
- INTERVALS supports `config.includeFinalRest: true`; the default is rest **between**
  rounds only. Both timer settings expose this choice. Strength also honors that flag,
  otherwise the last completed set finishes immediately.
- Explicit duration configurations and clearly timed warm-up/rest titles get countdowns.
  Titles marked `untimed` or giving a time range stay untimed.
- CORE / untimed strength circuits preserve round count and optional rest; each completed
  round adds a result entry. These are counts and timings, not per-round weight/repetition inputs.
- Results include `completed` to distinguish early logging, AMRAP `extraReps`, interval
  `intervalsCompleted` (with legacy `repsCompleted` alias), and total hold/block elapsed time.
  Old results remain readable; no historical results or programme records are migrated.

### Verification

```sh
node tests/timer-engine.cjs
curl -fsSL https://unpkg.com/@babel/standalone@7.26.4/babel.min.js -o /tmp/chrono-babel-7.26.4.js
BABEL_STANDALONE=/tmp/chrono-babel-7.26.4.js node tests/timer-components.cjs
```

Component tests execute the actual inline JSX/transition callbacks with a controlled clock
and fake logger. Their structural checks are **not** visual viewport verification.
Compile both pages and run `git diff --check` before deployment. Keep the shared script
URL cache version in both pages in sync when the engine changes.


## Production build and reliable data changes

```sh
npm ci
npm run build
npm test
# With an isolated Chromium browser available over CDP:
npm run test:browser
git diff --check
```

Commit both source and generated output. Cloudflare deploys committed static output;
no dashboard build-setting change is required. React is vendored at 18.3.1; Babel
7.26.4 and Tailwind 3.4.17 run only at build time. Old content-hashed assets may be
retained to keep cached pages working. `.assetsignore` excludes source, tests, local
configuration and dependencies from served assets.

`training-core.js` provides shared validation, profile-local persistent outboxes,
snapshot reconciliation, stable exercise identities and mode-specific chart metrics.
Pending uploads survive reloads and retry when connectivity returns. Edits create the
replacement result before deleting the old one. Local/server storage failures remain
visible; no test writes to the live training API.

Results can be reviewed before save, edited/deleted from Progress, and include actual
load/reps, effort, notes and per-round scores. Planned load is not silently recorded as
actual load. Current-week navigation, dated days, day instructions and next-block
navigation are available.

Current-week selection prefers explicit workout dates over ISO-numbered legacy slots.
Seasonal programme Week 1 can therefore correspond to calendar week 43. Opening or
syncing the app corrects old cached selections; manual week browsing is retained for
the current day. “Jump to current week” always resolves the dated programme, including
rest days. Navigation does not renumber programmes or change logged results.

The browser fixture intercepts **every** network request and uses a fake backend. It
checks all eight workout modes in portrait/landscape with safe-area padding, save/edit/
delete, offline/reload retry, imports, next-block navigation and standalone rendering.
It launches an isolated headless Chrome (`CHROME_PATH` can select the executable);
its local fixture does not verify production backend authorization or write semantics.

### Backend security

Server-side authentication is implemented below. Original snapshots, settings and the previous private helper credential are backed up outside the public repository.

## Server-side authentication

The live API Worker is `vad-training-api` on `rodiucov.com/api/*`, backed by the D1
`DB` binding. `backend/auth.mjs` wraps the preserved legacy handler. Public snapshot /
programme reads and the old browser bearer credential are rejected. Website users
have separate profile sessions using Secure, HttpOnly, SameSite=Strict cookies.
Passwords use salted PBKDF2; sign-in attempts are throttled. Setup/recovery tokens
are profile-bound, single-use and expire after 48 hours. Password changes revoke
other sessions. The website must never embed the agent machine credential.

Run `npm run test:auth` and `npm run test:auth-browser` (Node with `node:sqlite` and
Chrome installed). Browser tests launch an isolated headless Chrome; they do not
close or reuse the signed-in Cloudflare dashboard. Set CHROME_PATH for a different
Chrome installation in the ordinary browser test.

For Worker builds, `scripts/build-worker.cjs` reads a private config with only
machine/setup hashes, never raw credentials. Preserve the original D1 and secret
bindings when uploading. Agent API access uses a separate private machine credential
whose SHA-256 hash is in the Worker config; the local vt.sh config holds the raw key.
A machine-authenticated POST `/api/auth/enroll?profile=vad` (or tatka) issues a new
private setup link without changing the existing password until that link is used.
Health remains public; every data read/write requires a valid profile session or
machine credential. Deploy backend and frontend together and verify anonymous 401,
machine access, cookie/profile isolation and unchanged profile data snapshots.

Offline session checks may allow a previously verified profile to display its cached device data during a connection failure. That UI state grants no server privileges: all cloud reads/writes still require the server session cookie, and a 401 clears the cached-view marker.
