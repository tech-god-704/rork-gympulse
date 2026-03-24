import { Exercise, MuscleGroup } from "@/types";

let idCounter = 0;
function makeExercise(name: string, muscleGroup: MuscleGroup): Exercise {
  idCounter++;
  return { id: `builtin_${idCounter}`, name, muscleGroup, isCustom: false };
}

export const BUILT_IN_EXERCISES: Exercise[] = [
  // ─── CHEST ────────────────────────────────────────────────
  makeExercise("Bench Press", "chest"),
  makeExercise("Incline Bench Press", "chest"),
  makeExercise("Decline Bench Press", "chest"),
  makeExercise("Dumbbell Bench Press", "chest"),
  makeExercise("Incline Dumbbell Press", "chest"),
  makeExercise("Dumbbell Flyes", "chest"),
  makeExercise("Incline Dumbbell Flyes", "chest"),
  makeExercise("Cable Flyes", "chest"),
  makeExercise("Cable Crossovers", "chest"),
  makeExercise("Push-Ups", "chest"),
  makeExercise("Chest Dips", "chest"),
  makeExercise("Machine Chest Press", "chest"),
  makeExercise("Pec Deck", "chest"),
  makeExercise("Landmine Press", "chest"),

  // ─── BACK ─────────────────────────────────────────────────
  makeExercise("Deadlift", "back"),
  makeExercise("Pull-Ups", "back"),
  makeExercise("Chin-Ups", "back"),
  makeExercise("Barbell Rows", "back"),
  makeExercise("Dumbbell Rows", "back"),
  makeExercise("Lat Pulldown", "back"),
  makeExercise("Seated Cable Row", "back"),
  makeExercise("T-Bar Row", "back"),
  makeExercise("Pendlay Rows", "back"),
  makeExercise("Meadow Rows", "back"),
  makeExercise("Chest-Supported Row", "back"),
  makeExercise("Rack Pulls", "back"),
  makeExercise("Straight-Arm Pulldown", "back"),
  makeExercise("Inverted Rows", "back"),
  makeExercise("Cable Pullovers", "back"),

  // ─── SHOULDERS ────────────────────────────────────────────
  makeExercise("Overhead Press", "shoulders"),
  makeExercise("Dumbbell Shoulder Press", "shoulders"),
  makeExercise("Arnold Press", "shoulders"),
  makeExercise("Lateral Raises", "shoulders"),
  makeExercise("Cable Lateral Raises", "shoulders"),
  makeExercise("Front Raises", "shoulders"),
  makeExercise("Face Pulls", "shoulders"),
  makeExercise("Reverse Flyes", "shoulders"),
  makeExercise("Rear Delt Machine", "shoulders"),
  makeExercise("Upright Rows", "shoulders"),
  makeExercise("Machine Shoulder Press", "shoulders"),
  makeExercise("Landmine Lateral Raises", "shoulders"),
  makeExercise("Shrugs", "shoulders"),
  makeExercise("Dumbbell Shrugs", "shoulders"),

  // ─── ARMS ─────────────────────────────────────────────────
  makeExercise("Barbell Curls", "arms"),
  makeExercise("Dumbbell Curls", "arms"),
  makeExercise("Hammer Curls", "arms"),
  makeExercise("Preacher Curls", "arms"),
  makeExercise("Concentration Curls", "arms"),
  makeExercise("Cable Curls", "arms"),
  makeExercise("Incline Dumbbell Curls", "arms"),
  makeExercise("EZ Bar Curls", "arms"),
  makeExercise("Spider Curls", "arms"),
  makeExercise("Tricep Pushdowns", "arms"),
  makeExercise("Overhead Tricep Extension", "arms"),
  makeExercise("Skull Crushers", "arms"),
  makeExercise("Close-Grip Bench Press", "arms"),
  makeExercise("Tricep Dips", "arms"),
  makeExercise("Tricep Kickbacks", "arms"),
  makeExercise("Cable Overhead Extension", "arms"),
  makeExercise("Diamond Push-Ups", "arms"),

  // ─── LEGS ─────────────────────────────────────────────────
  makeExercise("Barbell Squats", "legs"),
  makeExercise("Front Squats", "legs"),
  makeExercise("Goblet Squats", "legs"),
  makeExercise("Hack Squat", "legs"),
  makeExercise("Leg Press", "legs"),
  makeExercise("Romanian Deadlift", "legs"),
  makeExercise("Stiff-Leg Deadlift", "legs"),
  makeExercise("Sumo Deadlift", "legs"),
  makeExercise("Leg Curls", "legs"),
  makeExercise("Leg Extensions", "legs"),
  makeExercise("Lunges", "legs"),
  makeExercise("Walking Lunges", "legs"),
  makeExercise("Bulgarian Split Squats", "legs"),
  makeExercise("Step-Ups", "legs"),
  makeExercise("Hip Thrusts", "legs"),
  makeExercise("Glute Bridges", "legs"),
  makeExercise("Calf Raises", "legs"),
  makeExercise("Seated Calf Raises", "legs"),
  makeExercise("Smith Machine Squats", "legs"),
  makeExercise("Good Mornings", "legs"),

  // ─── CORE ─────────────────────────────────────────────────
  makeExercise("Plank", "core"),
  makeExercise("Side Plank", "core"),
  makeExercise("Crunches", "core"),
  makeExercise("Bicycle Crunches", "core"),
  makeExercise("Russian Twists", "core"),
  makeExercise("Hanging Leg Raises", "core"),
  makeExercise("Leg Raises", "core"),
  makeExercise("Ab Wheel Rollout", "core"),
  makeExercise("Cable Woodchops", "core"),
  makeExercise("Cable Crunches", "core"),
  makeExercise("Mountain Climbers", "core"),
  makeExercise("Dead Bug", "core"),
  makeExercise("Pallof Press", "core"),
  makeExercise("Dragon Flags", "core"),

  // ─── CARDIO ───────────────────────────────────────────────
  makeExercise("Running", "cardio"),
  makeExercise("Treadmill", "cardio"),
  makeExercise("Cycling", "cardio"),
  makeExercise("Stationary Bike", "cardio"),
  makeExercise("Jump Rope", "cardio"),
  makeExercise("Rowing Machine", "cardio"),
  makeExercise("Stair Climber", "cardio"),
  makeExercise("Battle Ropes", "cardio"),
  makeExercise("Elliptical", "cardio"),
  makeExercise("Swimming", "cardio"),
  makeExercise("Box Jumps", "cardio"),
  makeExercise("Burpees", "cardio"),
];

// ── Exercise template type used by starter / preset routines ───────
type RoutineExerciseTemplate = {
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number;
  weight: number; // lbs – reasonable beginner-intermediate starting weight
};

type RoutineTemplate = {
  name: string;
  emoji?: string;
  exercises: RoutineExerciseTemplate[];
};

// ── Workout-split metadata ────────────────────────────────────────
export type WorkoutSplitId = "ppl" | "upper_lower" | "bro_split" | "full_body";

export interface WorkoutSplit {
  id: WorkoutSplitId;
  name: string;
  shortDescription: string;
  daysPerWeek: number;
  routines: RoutineTemplate[];
}

// ===================================================================
//  1. PUSH / PULL / LEGS  –  6-day split (3 routines, repeated 2x)
// ===================================================================
const PPL_ROUTINES: RoutineTemplate[] = [
  {
    name: "Push Day",
    emoji: "🔥",
    exercises: [
      { name: "Bench Press", muscleGroup: "chest", sets: 4, reps: 8, weight: 135 },
      { name: "Incline Dumbbell Press", muscleGroup: "chest", sets: 3, reps: 10, weight: 50 },
      { name: "Cable Flyes", muscleGroup: "chest", sets: 3, reps: 12, weight: 30 },
      { name: "Overhead Press", muscleGroup: "shoulders", sets: 4, reps: 8, weight: 95 },
      { name: "Lateral Raises", muscleGroup: "shoulders", sets: 3, reps: 15, weight: 15 },
      { name: "Tricep Pushdowns", muscleGroup: "arms", sets: 3, reps: 12, weight: 40 },
      { name: "Overhead Tricep Extension", muscleGroup: "arms", sets: 3, reps: 12, weight: 30 },
    ],
  },
  {
    name: "Pull Day",
    emoji: "💪",
    exercises: [
      { name: "Barbell Rows", muscleGroup: "back", sets: 4, reps: 8, weight: 135 },
      { name: "Pull-Ups", muscleGroup: "back", sets: 3, reps: 8, weight: 0 },
      { name: "Seated Cable Row", muscleGroup: "back", sets: 3, reps: 10, weight: 120 },
      { name: "Lat Pulldown", muscleGroup: "back", sets: 3, reps: 10, weight: 100 },
      { name: "Face Pulls", muscleGroup: "shoulders", sets: 3, reps: 15, weight: 30 },
      { name: "Barbell Curls", muscleGroup: "arms", sets: 3, reps: 10, weight: 50 },
      { name: "Hammer Curls", muscleGroup: "arms", sets: 3, reps: 12, weight: 25 },
    ],
  },
  {
    name: "Leg Day",
    emoji: "🦵",
    exercises: [
      { name: "Barbell Squats", muscleGroup: "legs", sets: 4, reps: 8, weight: 185 },
      { name: "Romanian Deadlift", muscleGroup: "legs", sets: 3, reps: 10, weight: 135 },
      { name: "Leg Press", muscleGroup: "legs", sets: 3, reps: 12, weight: 270 },
      { name: "Leg Curls", muscleGroup: "legs", sets: 3, reps: 12, weight: 80 },
      { name: "Leg Extensions", muscleGroup: "legs", sets: 3, reps: 12, weight: 90 },
      { name: "Calf Raises", muscleGroup: "legs", sets: 4, reps: 15, weight: 100 },
    ],
  },
];

// ===================================================================
//  2. UPPER / LOWER  –  4-day split (2 routines, repeated 2x)
// ===================================================================
const UPPER_LOWER_ROUTINES: RoutineTemplate[] = [
  {
    name: "Upper Body",
    emoji: "🏋️",
    exercises: [
      { name: "Bench Press", muscleGroup: "chest", sets: 4, reps: 8, weight: 135 },
      { name: "Barbell Rows", muscleGroup: "back", sets: 4, reps: 8, weight: 135 },
      { name: "Overhead Press", muscleGroup: "shoulders", sets: 3, reps: 10, weight: 85 },
      { name: "Lat Pulldown", muscleGroup: "back", sets: 3, reps: 10, weight: 100 },
      { name: "Dumbbell Flyes", muscleGroup: "chest", sets: 3, reps: 12, weight: 30 },
      { name: "Lateral Raises", muscleGroup: "shoulders", sets: 3, reps: 15, weight: 15 },
      { name: "Barbell Curls", muscleGroup: "arms", sets: 3, reps: 10, weight: 50 },
      { name: "Tricep Pushdowns", muscleGroup: "arms", sets: 3, reps: 12, weight: 40 },
    ],
  },
  {
    name: "Lower Body",
    emoji: "🦵",
    exercises: [
      { name: "Barbell Squats", muscleGroup: "legs", sets: 4, reps: 8, weight: 185 },
      { name: "Romanian Deadlift", muscleGroup: "legs", sets: 4, reps: 10, weight: 135 },
      { name: "Leg Press", muscleGroup: "legs", sets: 3, reps: 12, weight: 270 },
      { name: "Leg Curls", muscleGroup: "legs", sets: 3, reps: 12, weight: 80 },
      { name: "Leg Extensions", muscleGroup: "legs", sets: 3, reps: 12, weight: 90 },
      { name: "Hip Thrusts", muscleGroup: "legs", sets: 3, reps: 10, weight: 135 },
      { name: "Calf Raises", muscleGroup: "legs", sets: 4, reps: 15, weight: 100 },
    ],
  },
];

// ===================================================================
//  3. BRO SPLIT  –  5-day split (5 routines, one muscle group each)
// ===================================================================
const BRO_SPLIT_ROUTINES: RoutineTemplate[] = [
  {
    name: "Chest Day",
    emoji: "🫁",
    exercises: [
      { name: "Bench Press", muscleGroup: "chest", sets: 4, reps: 8, weight: 135 },
      { name: "Incline Dumbbell Press", muscleGroup: "chest", sets: 4, reps: 10, weight: 50 },
      { name: "Cable Flyes", muscleGroup: "chest", sets: 3, reps: 12, weight: 30 },
      { name: "Dumbbell Flyes", muscleGroup: "chest", sets: 3, reps: 12, weight: 30 },
      { name: "Chest Dips", muscleGroup: "chest", sets: 3, reps: 10, weight: 0 },
      { name: "Cable Crossovers", muscleGroup: "chest", sets: 3, reps: 15, weight: 25 },
    ],
  },
  {
    name: "Back Day",
    emoji: "🦍",
    exercises: [
      { name: "Deadlift", muscleGroup: "back", sets: 4, reps: 6, weight: 185 },
      { name: "Pull-Ups", muscleGroup: "back", sets: 4, reps: 8, weight: 0 },
      { name: "Barbell Rows", muscleGroup: "back", sets: 4, reps: 8, weight: 135 },
      { name: "Seated Cable Row", muscleGroup: "back", sets: 3, reps: 10, weight: 120 },
      { name: "Lat Pulldown", muscleGroup: "back", sets: 3, reps: 10, weight: 100 },
      { name: "Straight-Arm Pulldown", muscleGroup: "back", sets: 3, reps: 12, weight: 50 },
    ],
  },
  {
    name: "Shoulder Day",
    emoji: "🎯",
    exercises: [
      { name: "Overhead Press", muscleGroup: "shoulders", sets: 4, reps: 8, weight: 95 },
      { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", sets: 3, reps: 10, weight: 40 },
      { name: "Lateral Raises", muscleGroup: "shoulders", sets: 4, reps: 15, weight: 15 },
      { name: "Face Pulls", muscleGroup: "shoulders", sets: 3, reps: 15, weight: 30 },
      { name: "Reverse Flyes", muscleGroup: "shoulders", sets: 3, reps: 12, weight: 15 },
      { name: "Shrugs", muscleGroup: "shoulders", sets: 3, reps: 12, weight: 135 },
    ],
  },
  {
    name: "Leg Day",
    emoji: "🦵",
    exercises: [
      { name: "Barbell Squats", muscleGroup: "legs", sets: 4, reps: 8, weight: 185 },
      { name: "Leg Press", muscleGroup: "legs", sets: 4, reps: 10, weight: 270 },
      { name: "Romanian Deadlift", muscleGroup: "legs", sets: 3, reps: 10, weight: 135 },
      { name: "Leg Extensions", muscleGroup: "legs", sets: 3, reps: 12, weight: 90 },
      { name: "Leg Curls", muscleGroup: "legs", sets: 3, reps: 12, weight: 80 },
      { name: "Calf Raises", muscleGroup: "legs", sets: 4, reps: 15, weight: 100 },
    ],
  },
  {
    name: "Arms Day",
    emoji: "💪",
    exercises: [
      { name: "Barbell Curls", muscleGroup: "arms", sets: 3, reps: 10, weight: 50 },
      { name: "Close-Grip Bench Press", muscleGroup: "arms", sets: 3, reps: 10, weight: 95 },
      { name: "Hammer Curls", muscleGroup: "arms", sets: 3, reps: 12, weight: 25 },
      { name: "Skull Crushers", muscleGroup: "arms", sets: 3, reps: 10, weight: 50 },
      { name: "Preacher Curls", muscleGroup: "arms", sets: 3, reps: 12, weight: 40 },
      { name: "Tricep Pushdowns", muscleGroup: "arms", sets: 3, reps: 12, weight: 40 },
      { name: "Concentration Curls", muscleGroup: "arms", sets: 3, reps: 12, weight: 20 },
      { name: "Overhead Tricep Extension", muscleGroup: "arms", sets: 3, reps: 12, weight: 30 },
    ],
  },
];

// ===================================================================
//  4. FULL BODY  –  3-day split (1 routine, performed 3x/week)
// ===================================================================
const FULL_BODY_ROUTINES: RoutineTemplate[] = [
  {
    name: "Full Body Workout",
    emoji: "⚡",
    exercises: [
      { name: "Barbell Squats", muscleGroup: "legs", sets: 4, reps: 8, weight: 185 },
      { name: "Bench Press", muscleGroup: "chest", sets: 4, reps: 8, weight: 135 },
      { name: "Barbell Rows", muscleGroup: "back", sets: 4, reps: 8, weight: 135 },
      { name: "Overhead Press", muscleGroup: "shoulders", sets: 3, reps: 10, weight: 85 },
      { name: "Romanian Deadlift", muscleGroup: "legs", sets: 3, reps: 10, weight: 135 },
      { name: "Lat Pulldown", muscleGroup: "back", sets: 3, reps: 10, weight: 100 },
      { name: "Dumbbell Curls", muscleGroup: "arms", sets: 3, reps: 12, weight: 25 },
      { name: "Tricep Pushdowns", muscleGroup: "arms", sets: 3, reps: 12, weight: 40 },
    ],
  },
];

// ── All splits in one exportable collection ───────────────────────
export const WORKOUT_SPLITS: WorkoutSplit[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    shortDescription: "6 days per week — each routine performed twice",
    daysPerWeek: 6,
    routines: PPL_ROUTINES,
  },
  {
    id: "upper_lower",
    name: "Upper / Lower",
    shortDescription: "4 days per week — each routine performed twice",
    daysPerWeek: 4,
    routines: UPPER_LOWER_ROUTINES,
  },
  {
    id: "bro_split",
    name: "Bro Split",
    shortDescription: "5 days per week — one muscle group per day",
    daysPerWeek: 5,
    routines: BRO_SPLIT_ROUTINES,
  },
  {
    id: "full_body",
    name: "Full Body",
    shortDescription: "3 days per week — same workout each session",
    daysPerWeek: 3,
    routines: FULL_BODY_ROUTINES,
  },
];

// ── Legacy export used by onboarding (defaults to PPL) ────────────
export const STARTER_ROUTINES = PPL_ROUTINES;

// ── Quick-tap routine name suggestions for the create modal ───────
export const ROUTINE_NAME_SUGGESTIONS = [
  "Push Day",
  "Pull Day",
  "Leg Day",
  "Upper Body",
  "Lower Body",
  "Chest Day",
  "Back Day",
  "Shoulder Day",
  "Arms Day",
  "Full Body",
  "Cardio",
  "Core & Abs",
];

// ── Emoji palette for routine customization ───────────────────────
export const ROUTINE_EMOJI_OPTIONS = [
  "🔥", "💪", "🦵", "⚡", "🏆", "🎯", "🏋️", "🦍",
  "💥", "🫁", "🧱", "🚀", "⭐", "🌟", "💎", "🏅",
  "🥇", "🔱", "👊", "✊", "🤸", "🧘", "🏃", "🚴",
  "💣", "🔰", "❤️‍🔥", "🩵", "💜", "🖤",
];
