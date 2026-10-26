/**
 * Checks for the Progress screen math: range totals and deltas, chart
 * bucketing, and the progressive-overload series.
 *
 * Run with:  bun run test
 */
import { summarizeRange, formatDelta, overloadCandidates, overloadSeries } from "@/utils/progressStats";
import type { WorkoutHistory } from "@/types";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`, detail ?? ""); }
}
function eq(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`);
}

// Wednesday 2026-10-28, local noon.
const NOW = new Date(2026, 9, 28, 12);
const daysAgo = (n: number) => new Date(2026, 9, 28 - n, 10).toISOString();

function workout(id: string, ago: number, volume: number, bench?: number, extra: Partial<WorkoutHistory> = {}): WorkoutHistory {
  return {
    id,
    routineId: "r",
    routineName: "Push",
    completedAt: daysAgo(ago),
    exerciseCount: 1,
    duration: 50,
    totalVolume: volume,
    newPRs: 0,
    exercises: bench
      ? [{
          exerciseName: "Bench Press", muscleGroup: "chest", setsCompleted: 2, totalSets: 2, volume,
          bestSet: { weight: bench, reps: 8 }, sets: [{ weight: bench - 10, reps: 8 }, { weight: bench, reps: 8 }],
        }]
      : [],
    ...extra,
  };
}

console.log("summarizeRange");
{
  const h = [
    workout("a", 0, 1000, 135, { newPRs: 1 }), // this week
    workout("b", 8, 2000, 130),                // last week
    workout("c", 20, 500, 125, { duration: 70 }), // 3 weeks back
    workout("d", 40, 4000, 120),               // previous 4-week period
    workout("e", 200, 9000),                   // far outside
  ];
  const r = summarizeRange(h, "4w", "monday", NOW);
  eq("4w total counts only the range", r.total, 3500);
  eq("4w previous period", r.previousTotal, 4000);
  eq("4w has four bars", r.bars.length, 4);
  eq("current week is the last bar", r.bars[3], { value: 1000, label: "W4", current: true });
  eq("last week bar", r.bars[2].value, 2000);
  eq("workouts in range", r.workouts, 3);
  eq("new PRs in range", r.newPRs, 1);
  eq("avg session", r.avgMinutes, 57);
  eq("total minutes", r.totalMinutes, 170);

  const q = summarizeRange(h, "3m", "monday", NOW);
  eq("3m has twelve weekly bars", q.bars.length, 12);
  check("3m labels months only once", q.bars.filter((b) => b.label === "Oct").length === 1, q.bars.map((b) => b.label));

  const y = summarizeRange(h, "1y", "monday", NOW);
  eq("1y has twelve monthly bars", y.bars.length, 12);
  eq("1y ends on the current month", y.bars[11].label, "O");
  eq("1y includes the old workout", y.total, 16500);
}

{
  // Two days into the week: last period's comparison stops two days in too.
  const h = [workout("now", 1, 100), workout("prevEarly", 29, 50), workout("prevLate", 26, 900)];
  const r = summarizeRange(h, "4w", "monday", NOW);
  eq("previous period is cut to the same elapsed time", r.previousTotal, 50);
}
{
  const h = [
    { ...workout("a", 0, 1, 100), exercises: [
      { exerciseName: "Curl", muscleGroup: "arms" as const, setsCompleted: 1, totalSets: 1, volume: 1, bestSet: { weight: 40, reps: 8 } },
      { exerciseName: "Squat", muscleGroup: "legs" as const, setsCompleted: 1, totalSets: 1, volume: 1, bestSet: { weight: 225, reps: 5 } },
    ] },
    { ...workout("b", 7, 1, 100), exercises: [
      { exerciseName: "Curl", muscleGroup: "arms" as const, setsCompleted: 1, totalSets: 1, volume: 1, bestSet: { weight: 35, reps: 8 } },
      { exerciseName: "Squat", muscleGroup: "legs" as const, setsCompleted: 1, totalSets: 1, volume: 1, bestSet: { weight: 215, reps: 5 } },
    ] },
  ];
  eq("ties go to the heavier lift", overloadCandidates(h, "monday"), ["Squat", "Curl"]);
}

console.log("formatDelta");
eq("growth", formatDelta(108, 100), "+8% vs previous");
eq("decline", formatDelta(90, 100), "-10% vs previous");
eq("no baseline", formatDelta(100, 0), null);

console.log("overload");
{
  const h = [
    workout("a", 0, 1000, 145),
    workout("b", 14, 1000, 135),
    workout("c", 21, 1000, 130),
    workout("d", 2, 300), // no bench
  ];
  eq("candidates need two weeks", overloadCandidates(h, "monday"), ["Bench Press"]);
  // Weeks (oldest first): -7..0 → data at weeks -3, -2, 0; -1 carries forward.
  eq("series starts at first session and carries gaps", overloadSeries(h, "Bench Press", "monday", 8, NOW), [130, 135, 135, 145]);
  eq("unknown exercise is empty", overloadSeries(h, "Squat", "monday", 8, NOW), []);
  eq("single week is not a candidate", overloadCandidates([workout("x", 0, 1, 100)], "monday"), []);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) throw new Error(`${fail} check(s) failed`);
