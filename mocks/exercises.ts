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

export const STARTER_ROUTINES = [
  {
    name: "Push Day",
    exercises: [
      { name: "Bench Press", muscleGroup: "chest" as MuscleGroup, sets: 4, reps: 8, weight: 135 },
      { name: "Incline Dumbbell Press", muscleGroup: "chest" as MuscleGroup, sets: 3, reps: 10, weight: 50 },
      { name: "Overhead Press", muscleGroup: "shoulders" as MuscleGroup, sets: 3, reps: 10, weight: 95 },
      { name: "Lateral Raises", muscleGroup: "shoulders" as MuscleGroup, sets: 3, reps: 15, weight: 20 },
      { name: "Tricep Pushdowns", muscleGroup: "arms" as MuscleGroup, sets: 3, reps: 12, weight: 40 },
    ],
  },
  {
    name: "Pull Day",
    exercises: [
      { name: "Pull-Ups", muscleGroup: "back" as MuscleGroup, sets: 4, reps: 8, weight: 0 },
      { name: "Barbell Rows", muscleGroup: "back" as MuscleGroup, sets: 4, reps: 8, weight: 135 },
      { name: "Lat Pulldown", muscleGroup: "back" as MuscleGroup, sets: 3, reps: 10, weight: 120 },
      { name: "Face Pulls", muscleGroup: "shoulders" as MuscleGroup, sets: 3, reps: 15, weight: 30 },
      { name: "Barbell Curls", muscleGroup: "arms" as MuscleGroup, sets: 3, reps: 12, weight: 30 },
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      { name: "Barbell Squats", muscleGroup: "legs" as MuscleGroup, sets: 4, reps: 8, weight: 185 },
      { name: "Romanian Deadlift", muscleGroup: "legs" as MuscleGroup, sets: 3, reps: 10, weight: 135 },
      { name: "Leg Press", muscleGroup: "legs" as MuscleGroup, sets: 3, reps: 12, weight: 270 },
      { name: "Leg Curls", muscleGroup: "legs" as MuscleGroup, sets: 3, reps: 12, weight: 80 },
      { name: "Calf Raises", muscleGroup: "legs" as MuscleGroup, sets: 4, reps: 15, weight: 100 },
    ],
  },
];
