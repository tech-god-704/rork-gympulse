import { Exercise, MuscleGroup } from "@/types";

let idCounter = 0;
function makeExercise(name: string, muscleGroup: MuscleGroup): Exercise {
  idCounter++;
  return { id: `builtin_${idCounter}`, name, muscleGroup, isCustom: false };
}

export const BUILT_IN_EXERCISES: Exercise[] = [
  makeExercise("Bench Press", "chest"),
  makeExercise("Incline Dumbbell Press", "chest"),
  makeExercise("Cable Flyes", "chest"),
  makeExercise("Push-Ups", "chest"),
  makeExercise("Dumbbell Flyes", "chest"),
  makeExercise("Chest Dips", "chest"),

  makeExercise("Pull-Ups", "back"),
  makeExercise("Barbell Rows", "back"),
  makeExercise("Lat Pulldown", "back"),
  makeExercise("Seated Cable Row", "back"),
  makeExercise("Deadlift", "back"),
  makeExercise("T-Bar Row", "back"),

  makeExercise("Overhead Press", "shoulders"),
  makeExercise("Lateral Raises", "shoulders"),
  makeExercise("Front Raises", "shoulders"),
  makeExercise("Face Pulls", "shoulders"),
  makeExercise("Arnold Press", "shoulders"),
  makeExercise("Reverse Flyes", "shoulders"),

  makeExercise("Bicep Curls", "arms"),
  makeExercise("Tricep Pushdowns", "arms"),
  makeExercise("Hammer Curls", "arms"),
  makeExercise("Skull Crushers", "arms"),
  makeExercise("Preacher Curls", "arms"),
  makeExercise("Overhead Tricep Extension", "arms"),

  makeExercise("Squats", "legs"),
  makeExercise("Leg Press", "legs"),
  makeExercise("Romanian Deadlift", "legs"),
  makeExercise("Leg Curls", "legs"),
  makeExercise("Leg Extensions", "legs"),
  makeExercise("Calf Raises", "legs"),
  makeExercise("Lunges", "legs"),
  makeExercise("Bulgarian Split Squats", "legs"),

  makeExercise("Plank", "core"),
  makeExercise("Crunches", "core"),
  makeExercise("Russian Twists", "core"),
  makeExercise("Hanging Leg Raises", "core"),
  makeExercise("Ab Wheel Rollout", "core"),
  makeExercise("Cable Woodchops", "core"),

  makeExercise("Running", "cardio"),
  makeExercise("Cycling", "cardio"),
  makeExercise("Jump Rope", "cardio"),
  makeExercise("Rowing Machine", "cardio"),
  makeExercise("Stair Climber", "cardio"),
  makeExercise("Battle Ropes", "cardio"),
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
      { name: "Bicep Curls", muscleGroup: "arms" as MuscleGroup, sets: 3, reps: 12, weight: 30 },
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      { name: "Squats", muscleGroup: "legs" as MuscleGroup, sets: 4, reps: 8, weight: 185 },
      { name: "Romanian Deadlift", muscleGroup: "legs" as MuscleGroup, sets: 3, reps: 10, weight: 135 },
      { name: "Leg Press", muscleGroup: "legs" as MuscleGroup, sets: 3, reps: 12, weight: 270 },
      { name: "Leg Curls", muscleGroup: "legs" as MuscleGroup, sets: 3, reps: 12, weight: 80 },
      { name: "Calf Raises", muscleGroup: "legs" as MuscleGroup, sets: 4, reps: 15, weight: 100 },
    ],
  },
];
