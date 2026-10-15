this is my WOD training page

## Timers

`index.html` contains the workout dialog; `chrono.html` contains the standalone timer.
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
