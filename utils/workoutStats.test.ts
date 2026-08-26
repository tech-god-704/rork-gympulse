/**
 * Regression checks for the workout math that the UI and the provider both
 * depend on. These cover the accuracy bugs that motivated extracting
 * `utils/workoutStats.ts`: skipped exercises inflating volume/PRs/XP, personal
 * records counted once per set instead of once per exercise, wall-clock
 * durations from sessions left open, and unit handling.
 *
 * Run with:  bun run test
 */
import {
  summarizeSession, sessionProgress, estimateOneRepMax,
  rebuildPersonalRecords, rebuildLastPerformance, streakFromDates,
} from "@/utils/workoutStats";
import { toDisplayWeight, fromDisplayWeight, formatWeight, formatVolume } from "@/utils/units";
import { getStartOfWeek, weekdayInitials, estimateRoutineDuration } from "@/utils/helpers";
import type { SetData, WorkoutHistory, WorkoutSession, WorkoutSessionExercise } from "@/types";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`, detail ?? ""); }
}
function eq(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`);
}

const T0 = Date.parse("2026-08-26T10:00:00Z");
const mins = (n: number) => new Date(T0 + n * 60000).toISOString();

function session(exercises: WorkoutSessionExercise[]): WorkoutSession {
  return { id: "s1", routineId: "r1", routineName: "Push", exercises, startedAt: mins(0), isComplete: false };
}
const set = (n: number, w: number, r: number, done: boolean, at?: number): SetData => ({
  setNumber: n,
  weight: w,
  reps: r,
  completed: done,
  completedAt: done && at != null ? mins(at) : undefined,
});

console.log("\n== skipped exercises contribute nothing ==");
{
  const s = session([
    { routineExerciseId: "a", exerciseName: "Bench", muscleGroup: "chest", sets: 3, reps: 8, weight: 135,
      completed: true, skipped: false, setDetails: [set(1,135,8,true,10), set(2,135,8,true,15), set(3,135,8,true,20)] },
    { routineExerciseId: "b", exerciseName: "Fly", muscleGroup: "chest", sets: 3, reps: 12, weight: 40,
      completed: true, skipped: true, setDetails: [set(1,40,12,false), set(2,40,12,false), set(3,40,12,false)] },
  ]);
  const sum = summarizeSession(s, {}, { today: "2026-08-26", now: T0 + 60 * 60000 });
  eq("volume excludes skipped", sum.totalVolume, 135 * 8 * 3);
  eq("completedSets excludes skipped", sum.completedSets, 3);
  eq("skippedExercises counted", sum.skippedExercises, 1);
  eq("completedExercises excludes skipped", sum.completedExercises, 1);
  eq("no PR from skipped exercise", Object.keys(sum.prUpdates), ["Bench"]);
  eq("muscleGroups from worked only", sum.muscleGroups, ["chest"]);
  eq("skip flag recorded", sum.exercises[1].skipped, true);
}

console.log("\n== PR counted once per exercise, not once per set ==");
{
  // Three progressively heavier sets on ONE exercise, each beating the last.
  const s = session([
    { routineExerciseId: "a", exerciseName: "Squat", muscleGroup: "legs", sets: 3, reps: 5, weight: 225,
      completed: true, skipped: false, setDetails: [set(1,225,5,true,10), set(2,245,5,true,15), set(3,265,5,true,20)] },
  ]);
  const sum = summarizeSession(s, {}, { today: "2026-08-26", now: T0 + 60 * 60000 });
  eq("exactly one new PR", sum.newPRCount, 1);
  eq("PR uses the best set", sum.prUpdates["Squat"].weight, 265);
}

console.log("\n== 1RM estimator is sane at high reps ==");
{
  const heavy = estimateOneRepMax(300, 1);
  const burnout = estimateOneRepMax(135, 30);
  eq("1 rep = the weight", heavy, 300);
  check("30-rep set of 135 does not out-rank a 300lb single", burnout < heavy, { burnout, heavy });
  check("rep cap applied (30 reps == 12 reps)", estimateOneRepMax(135, 30) === estimateOneRepMax(135, 12));
  check("more reps at same weight ranks higher (below cap)", estimateOneRepMax(200, 8) > estimateOneRepMax(200, 5));
}

console.log("\n== duration runs to last logged set, not to 'now' ==");
{
  const s = session([
    { routineExerciseId: "a", exerciseName: "Bench", muscleGroup: "chest", sets: 2, reps: 8, weight: 135,
      completed: true, skipped: false, setDetails: [set(1,135,8,true,10), set(2,135,8,true,45)] },
  ]);
  // App left open for 14 hours after the last set.
  const sum = summarizeSession(s, {}, { today: "2026-08-26", now: T0 + 14 * 60 * 60000 });
  eq("duration = 45 min, not 840", sum.durationMinutes, 45);
}
{
  const s = session([
    { routineExerciseId: "a", exerciseName: "Bench", muscleGroup: "chest", sets: 1, reps: 8, weight: 135,
      completed: false, skipped: false, setDetails: [set(1,135,8,false)] },
  ]);
  const sum = summarizeSession(s, {}, { today: "2026-08-26", now: T0 + 40 * 60 * 60000 });
  check("no logged sets still clamps to the 240 min ceiling", sum.durationMinutes === 240, sum.durationMinutes);
}

console.log("\n== progress ignores skipped sets in the denominator ==");
{
  const s = session([
    { routineExerciseId: "a", exerciseName: "Bench", muscleGroup: "chest", sets: 3, reps: 8, weight: 135,
      completed: false, skipped: false, setDetails: [set(1,135,8,true,5), set(2,135,8,false), set(3,135,8,false)] },
    { routineExerciseId: "b", exerciseName: "Fly", muscleGroup: "chest", sets: 3, reps: 12, weight: 40,
      completed: true, skipped: true, setDetails: [set(1,40,12,false), set(2,40,12,false), set(3,40,12,false)] },
  ]);
  const p = sessionProgress(s);
  eq("denominator excludes the skipped exercise", p.totalSets, 3);
  eq("fraction is 1/3", Math.round(p.fraction * 100), 33);
}
{
  const s = session([
    { routineExerciseId: "a", exerciseName: "Bench", muscleGroup: "chest", sets: 1, reps: 8, weight: 100,
      completed: true, skipped: false, setDetails: [set(1,100,8,true,5)] },
    { routineExerciseId: "b", exerciseName: "Fly", muscleGroup: "chest", sets: 2, reps: 12, weight: 40,
      completed: true, skipped: true, setDetails: [set(1,40,12,false), set(2,40,12,false)] },
  ]);
  eq("all resolved reaches 100%", sessionProgress(s).fraction, 1);
}

console.log("\n== unit conversion round-trips ==");
{
  eq("225 lbs -> kg display", toDisplayWeight(225, "kg"), 102);
  eq("lbs passthrough", toDisplayWeight(225, "lbs"), 225);
  const back = fromDisplayWeight(toDisplayWeight(225, "kg"), "kg");
  check("kg round-trip stays within a quarter pound", Math.abs(back - 225) < 0.25, back);
  eq("bodyweight label", formatWeight(0, "lbs"), "BW");
  eq("format kg", formatWeight(100, "kg"), "45.25 kg");
  eq("volume compaction", formatVolume(12430, "lbs"), "12.4k lbs");
}

console.log("\n== streak derivation ==");
{
  const r = streakFromDates(["2026-08-24", "2026-08-25", "2026-08-26"], "2026-08-26");
  eq("3-day current streak", r.currentStreak, 3);
  eq("longest matches", r.longestStreak, 3);

  const stale = streakFromDates(["2026-08-01", "2026-08-02"], "2026-08-26");
  eq("missed days reset current to 0", stale.currentStreak, 0);
  eq("longest is preserved", stale.longestStreak, 2);

  const yday = streakFromDates(["2026-08-24", "2026-08-25"], "2026-08-26");
  eq("yesterday keeps the streak alive", yday.currentStreak, 2);

  const gap = streakFromDates(["2026-08-01","2026-08-02","2026-08-03","2026-08-25","2026-08-26"], "2026-08-26");
  eq("longest run found across a gap", gap.longestStreak, 3);
  eq("current run is the recent one", gap.currentStreak, 2);

  eq("empty history", streakFromDates([], "2026-08-26").currentStreak, 0);
}

console.log("\n== rebuilding derived data after a deletion ==");
{
  const hist: WorkoutHistory[] = [
    { id: "w2", routineId: "r1", routineName: "Legs", completedAt: "2026-08-26T12:00:00Z",
      exerciseCount: 1, duration: 40, totalVolume: 5000, newPRs: 1,
      exercises: [{ exerciseName: "Squat", muscleGroup: "legs", setsCompleted: 2, totalSets: 2,
        volume: 5000, bestSet: { weight: 500, reps: 5 }, sets: [{ weight: 400, reps: 5 }, { weight: 500, reps: 5 }] }] },
    { id: "w1", routineId: "r1", routineName: "Legs", completedAt: "2026-08-20T12:00:00Z",
      exerciseCount: 1, duration: 40, totalVolume: 2000, newPRs: 1,
      exercises: [{ exerciseName: "Squat", muscleGroup: "legs", setsCompleted: 2, totalSets: 2,
        volume: 2000, bestSet: { weight: 225, reps: 5 }, sets: [{ weight: 200, reps: 5 }, { weight: 225, reps: 5 }] }] },
  ];
  const before = rebuildPersonalRecords(hist);
  eq("PR reflects the fat-fingered 500lb entry", before["Squat"].weight, 500);

  // Delete the bogus workout — the record must fall back to the real one.
  const after = rebuildPersonalRecords(hist.filter((h) => h.id !== "w2"));
  eq("PR recovers after deletion", after["Squat"].weight, 225);

  const perf = rebuildLastPerformance(hist.filter((h) => h.id !== "w2"));
  eq("last performance recovers too", perf["Squat"].sets.length, 2);
  eq("last performance date", perf["Squat"].date, "2026-08-20");
}

console.log("\n== week boundaries honour the setting ==");
{
  // 2026-08-26 is a Wednesday.
  const wed = new Date(2026, 7, 26, 15, 0, 0);
  eq("monday-start week begins Mon 24th", getStartOfWeek(wed, "monday").getDate(), 24);
  eq("sunday-start week begins Sun 23rd", getStartOfWeek(wed, "sunday").getDate(), 23);
  eq("monday initials", weekdayInitials("monday"), ["M","T","W","T","F","S","S"]);
  eq("sunday initials", weekdayInitials("sunday"), ["S","M","T","W","T","F","S"]);
  check("start of week is midnight", getStartOfWeek(wed, "monday").getHours() === 0);
}

console.log("\n== routine duration estimate ==");
{
  check("scales with sets, not just exercise count",
    estimateRoutineDuration(5, 20) > estimateRoutineDuration(5, 10));
  eq("empty routine is 0", estimateRoutineDuration(0), 0);
}

console.log("\n== a fully-skipped session performs no work ==");
{
  const s = session([
    { routineExerciseId: "a", exerciseName: "Bench", muscleGroup: "chest", sets: 2, reps: 8, weight: 135,
      completed: true, skipped: true, setDetails: [set(1,135,8,false), set(2,135,8,false)] },
    { routineExerciseId: "b", exerciseName: "Fly", muscleGroup: "chest", sets: 2, reps: 12, weight: 40,
      completed: true, skipped: true, setDetails: [set(1,40,12,false), set(2,40,12,false)] },
  ]);
  const sum = summarizeSession(s, {}, { today: "2026-08-26", now: T0 + 30 * 60000 });
  eq("no sets completed", sum.completedSets, 0);
  eq("no volume", sum.totalVolume, 0);
  eq("no PRs", sum.newPRCount, 0);
  eq("no exercises worked", sum.completedExercises, 0);
  // completeWorkout() keys off completedSets === 0 to discard the session.
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) throw new Error(`${fail} check(s) failed`);
