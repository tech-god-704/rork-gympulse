import {
  ExercisePerformance,
  LoggedSet,
  MuscleGroup,
  PerformanceMap,
  PRMap,
  SetData,
  WorkoutHistory,
  WorkoutHistoryExercise,
  WorkoutSession,
  WorkoutSessionExercise,
} from "@/types";

/**
 * Single source of truth for "what happened in this workout".
 *
 * The home screen used to compute volume / PRs / XP for the celebration overlay
 * with one set of rules while the provider computed the numbers it actually
 * saved with another, so the confetti routinely reported figures that were
 * never awarded. Both now call `summarizeSession`.
 */

/** A workout longer than this is almost certainly a session left open. */
export const MAX_WORKOUT_MINUTES = 240;

/** Above this rep count a 1RM estimate stops meaning anything useful. */
const ONE_RM_REP_CAP = 12;

/**
 * Estimated one-rep max.
 *
 * Epley alone (`w * (1 + reps/30)`) drifts badly at high reps — a 20-rep set
 * would claim a 1.67x max. We average Epley with Brzycki and cap the rep count
 * so a long burnout set can't manufacture a bogus PR.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0) return 0;
  if (reps <= 1) return weight;
  const r = Math.min(reps, ONE_RM_REP_CAP);
  const epley = weight * (1 + r / 30);
  const brzycki = weight * (36 / (37 - r));
  return (epley + brzycki) / 2;
}

/** Sets that count: completed, on an exercise that wasn't skipped. */
function countedSets(exercise: WorkoutSessionExercise): SetData[] {
  if (exercise.skipped) return [];
  return (exercise.setDetails ?? []).filter((s) => s.completed);
}

/** Pick the heaviest set, breaking ties on reps. */
export function bestSetOf(sets: LoggedSet[]): LoggedSet {
  return sets.reduce<LoggedSet>(
    (best, s) =>
      s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? { weight: s.weight, reps: s.reps } : best,
    { weight: 0, reps: 0 }
  );
}

export interface SessionSummary {
  exercises: WorkoutHistoryExercise[];
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  /** Exercises with at least one completed set. */
  completedExercises: number;
  skippedExercises: number;
  /** Every exercise in the routine, skipped or not. */
  exerciseCount: number;
  muscleGroups: MuscleGroup[];
  /** Only exercises that genuinely beat their previous record. Max one per exercise. */
  prUpdates: PRMap;
  newPRCount: number;
  performanceUpdates: PerformanceMap;
  durationMinutes: number;
}

export interface SummarizeOptions {
  /** Local date string (YYYY-MM-DD) to stamp PRs and performance with. */
  today: string;
  /** Defaults to Date.now(). Injectable for tests. */
  now?: number;
}

/**
 * Reduce a live session to everything we need to persist.
 * Pure — no side effects, no mutation of the inputs.
 */
export function summarizeSession(
  session: WorkoutSession,
  existingPRs: PRMap,
  options: SummarizeOptions
): SessionSummary {
  const now = options.now ?? Date.now();
  const exercises: WorkoutHistoryExercise[] = [];
  const prUpdates: PRMap = {};
  const performanceUpdates: PerformanceMap = {};
  const muscleGroupsSet = new Set<MuscleGroup>();

  let totalVolume = 0;
  let completedSets = 0;
  let totalSets = 0;
  let completedExercises = 0;
  let skippedExercises = 0;
  let newPRCount = 0;
  let lastActivity = 0;

  for (const exercise of session.exercises) {
    const allSets = exercise.setDetails ?? [];
    const done = countedSets(exercise);
    totalSets += allSets.length;

    if (exercise.skipped) {
      skippedExercises++;
    } else if (done.length > 0) {
      completedExercises++;
      muscleGroupsSet.add(exercise.muscleGroup);
    }

    for (const s of done) {
      if (s.completedAt) {
        const t = new Date(s.completedAt).getTime();
        if (Number.isFinite(t) && t > lastActivity) lastActivity = t;
      }
    }

    const loggedSets: LoggedSet[] = done.map((s) => ({ weight: s.weight, reps: s.reps }));
    const exerciseVolume = loggedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const best = bestSetOf(loggedSets);

    completedSets += loggedSets.length;
    totalVolume += exerciseVolume;

    if (loggedSets.length > 0) {
      performanceUpdates[exercise.exerciseName] = {
        sets: loggedSets,
        date: options.today,
      };

      // One PR per exercise per workout, judged on the single best set —
      // not once per set that happens to beat the running best.
      const best1RM = estimateOneRepMax(best.weight, best.reps);
      const previous = existingPRs[exercise.exerciseName];
      if (best.weight > 0 && best1RM > 0 && (!previous || best1RM > previous.estimated1RM)) {
        prUpdates[exercise.exerciseName] = {
          weight: best.weight,
          reps: best.reps,
          estimated1RM: best1RM,
          date: options.today,
        };
        newPRCount++;
      }
    }

    exercises.push({
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      setsCompleted: loggedSets.length,
      totalSets: allSets.length,
      volume: exerciseVolume,
      bestSet: best,
      sets: loggedSets,
      skipped: exercise.skipped === true,
    });
  }

  // Duration runs to the last logged set, not to "now". Otherwise a session
  // left open overnight records as a 900-minute workout and poisons the
  // average-duration, total-time and endurance-achievement figures.
  const startedAt = new Date(session.startedAt).getTime();
  const endedAt = lastActivity > startedAt ? Math.min(lastActivity, now) : now;
  const rawMinutes = Number.isFinite(startedAt) ? Math.round((endedAt - startedAt) / 60000) : 0;
  const durationMinutes = Math.min(Math.max(rawMinutes, 1), MAX_WORKOUT_MINUTES);

  return {
    exercises,
    totalVolume,
    completedSets,
    totalSets,
    completedExercises,
    skippedExercises,
    exerciseCount: session.exercises.length,
    muscleGroups: [...muscleGroupsSet],
    prUpdates,
    newPRCount,
    performanceUpdates,
    durationMinutes,
  };
}

/** Live progress for the in-workout UI, measured in sets rather than exercises. */
export function sessionProgress(session: WorkoutSession | null): {
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  volume: number;
  fraction: number;
} {
  if (!session) {
    return { completedSets: 0, totalSets: 0, completedExercises: 0, totalExercises: 0, volume: 0, fraction: 0 };
  }
  let completedSets = 0;
  let totalSets = 0;
  let completedExercises = 0;
  let volume = 0;

  for (const exercise of session.exercises) {
    const all = exercise.setDetails ?? [];
    if (exercise.completed) completedExercises++;
    // A skipped exercise's sets are never going to be done, so counting them
    // in the denominator would cap progress below 100% for the whole session.
    if (exercise.skipped) continue;
    totalSets += all.length;
    for (const s of all) {
      if (s.completed) {
        completedSets++;
        volume += s.weight * s.reps;
      }
    }
  }

  const allResolved =
    session.exercises.length > 0 && session.exercises.every((e) => e.completed);
  const fraction = allResolved
    ? 1
    : totalSets > 0
      ? completedSets / totalSets
      : 0;

  return {
    completedSets,
    totalSets,
    completedExercises,
    totalExercises: session.exercises.length,
    volume,
    fraction,
  };
}

// ─── Rebuilding derived data from history ───────────────────
// History entries are self-sufficient (they carry every completed set), so
// personal records, last-performance and totals can be rebuilt exactly after
// a workout is deleted or edited. Legacy entries only carry `bestSet`, which
// is still enough for PRs — a PR is defined by the best set.

function historyChronological(history: WorkoutHistory[]): WorkoutHistory[] {
  return [...history].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
}

export function rebuildPersonalRecords(history: WorkoutHistory[]): PRMap {
  const records: PRMap = {};
  for (const workout of historyChronological(history)) {
    const date = workout.completedAt.split("T")[0];
    for (const exercise of workout.exercises ?? []) {
      if (exercise.skipped || exercise.setsCompleted === 0) continue;
      const candidates: LoggedSet[] = exercise.sets?.length
        ? exercise.sets
        : exercise.bestSet.weight > 0
          ? [exercise.bestSet]
          : [];
      const best = bestSetOf(candidates);
      if (best.weight <= 0) continue;
      const oneRM = estimateOneRepMax(best.weight, best.reps);
      const existing = records[exercise.exerciseName];
      if (!existing || oneRM > existing.estimated1RM) {
        records[exercise.exerciseName] = {
          weight: best.weight,
          reps: best.reps,
          estimated1RM: oneRM,
          date,
        };
      }
    }
  }
  return records;
}

export function rebuildLastPerformance(history: WorkoutHistory[]): PerformanceMap {
  const performance: PerformanceMap = {};
  // Chronological, so later workouts overwrite earlier ones.
  for (const workout of historyChronological(history)) {
    const date = workout.completedAt.split("T")[0];
    for (const exercise of workout.exercises ?? []) {
      if (exercise.skipped || exercise.setsCompleted === 0) continue;
      const sets: LoggedSet[] = exercise.sets?.length
        ? exercise.sets
        : exercise.bestSet.weight > 0
          ? Array.from({ length: exercise.setsCompleted }, () => exercise.bestSet)
          : [];
      if (sets.length === 0) continue;
      const entry: ExercisePerformance = { sets, date };
      performance[exercise.exerciseName] = entry;
    }
  }
  return performance;
}

/** Unique local dates on which a workout was completed. */
export function rebuildCompletedDates(history: WorkoutHistory[]): string[] {
  const dates = new Set<string>();
  for (const workout of history) {
    const d = new Date(workout.completedAt);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.add(`${y}-${m}-${day}`);
  }
  return [...dates].sort();
}

/**
 * Longest and current streak implied by a set of completed dates.
 * `today` is the local YYYY-MM-DD string; a streak stays alive if the last
 * workout was today or yesterday.
 */
export function streakFromDates(
  completedDates: string[],
  today: string
): { currentStreak: number; longestStreak: number; lastWorkoutDate: string | null } {
  const sorted = [...new Set(completedDates)].sort();
  if (sorted.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };
  }

  const dayNumber = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000);
  };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (dayNumber(sorted[i]) - dayNumber(sorted[i - 1]) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  const last = sorted[sorted.length - 1];
  const gap = dayNumber(today) - dayNumber(last);
  const current = gap === 0 || gap === 1 ? run : 0;

  return { currentStreak: current, longestStreak: longest, lastWorkoutDate: last };
}
