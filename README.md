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

The browser fixture intercepts **every** network request and uses a fake backend. It
checks all eight workout modes in portrait/landscape with safe-area padding, save/edit/
delete, offline/reload retry, imports, next-block navigation and standalone rendering.
It requires `BROWSER_CDP` (default http://127.0.0.1:18800); its local fixture does not
verify production backend authorization or write semantics.

### Pending backend security work

The legacy backend still exposes public read endpoints and accepts a shared browser
bearer token for writes. Device-local password checks are not server authorization.
Real server-side login/profile authorization and credential rotation require access
to the deployed Cloudflare API Worker. Do not remove/rotate the current credential
without coordinating backend and the agent API helper; that would break existing sync.
