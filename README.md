# GymPulse

A gym workout tracker built with Expo and React Native. Plan routines, log
every set as you lift, and watch streaks, personal records and volume build up
over time. All data lives on the device — no account, no network required.

## Running it

```bash
bun install
bun run start          # Expo dev server (tunnel)
bun run start-web      # web target
```

Checks:

```bash
bun run typecheck      # tsc --noEmit
bun run lint           # expo lint
bun run test           # workout-math + design-system regression suites
```

## Layout

```
app/                 expo-router screens (tabs: Today, Routines, Progress, Profile)
components/          feature components (ExerciseCard, RestTimer, …)
components/ui/       design-system primitives (Card, Button, ListRow, …)
constants/theme.ts   design tokens: spacing, radius, type, elevation, motion
constants/colors.ts  light + dark palettes
providers/           GymProvider (all state and persistence), ThemeProvider
utils/workoutStats   the workout math — see "invariants" below
utils/units.ts       weight storage and display conversion
```

## Invariants worth knowing before you change things

These are the rules the app quietly depends on. Breaking one tends to produce
numbers that look plausible and are wrong.

**Weights are stored in pounds. Always.**
`settings.weightUnit` is a presentation concern only. Convert on the way out
with `toDisplayWeight` / `formatWeight` and on the way in with
`fromDisplayWeight`. Anything reading a raw `weight` field is reading pounds.

**`summarizeSession()` is the only place that decides what a workout was worth.**
Volume, completed sets, personal records, duration and XP all come from it.
The celebration overlay and the code that persists the workout both call it, so
the figures a user is shown are the figures that get saved. Don't recompute
these inline.

**A skipped exercise performed no work.**
`skipped` resolves the card for progress purposes but contributes nothing to
volume, sets, PRs or XP. A session where everything was skipped isn't logged at
all — it doesn't extend the streak or pay the completion bonus.

**A personal record is judged once per exercise, on its best set.**
Not once per set that beats the running best.

**Workout duration runs to the last logged set, not to `Date.now()`,** and is
capped at 4 hours. Otherwise a session left open overnight records as a
900-minute workout and poisons every average that reads it.

**History entries are self-sufficient.** Each carries every completed set and
the XP it awarded, so deleting a workout can exactly rebuild personal records,
last-performance, streaks, XP and achievements from what remains.

## Design system

`constants/theme.ts` holds the tokens; `components/ui/` holds the primitives.
Screens compose from these rather than hand-rolling values.

Two things that bite if you forget them:

- **`overflow: "hidden"` clips a view's own shadow on iOS** (it sets
  `masksToBounds`). A style that both rounds and clips loses its elevation, so
  put the shadow on a non-clipping parent. `Card` doesn't clip by default for
  this reason.
- **Dark mode gets no iOS shadow** — shadows are invisible on black. Depth
  there comes from the `surfaceSunken` / `surfaceBase` / `surfaceRaised` ramp.
  `elevation()` and `surface()` already handle this; use them.

Numbers that change (timers, weights, set counts) should carry the `numeric`
token for tabular figures so digits don't jitter.

## Tests

`bun run test` runs two suites, both plain scripts rather than a framework:

- `utils/workoutStats.test.ts` — the invariants above, plus unit conversion,
  streak derivation and rebuilding derived data after a deletion.
- `constants/theme.test.ts` — every colour token survives `tint()` across both
  palettes, no type role sits below the legibility floor, scales stay monotonic.

## Notes

`PLAN.md` is the original product brief. It predates dark mode and the current
design system, so treat this file as the accurate description.
