export type FitnessGoal = "build_muscle" | "lose_weight" | "stay_active" | "get_stronger";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type MuscleGroup = "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "cardio";

export interface UserProfile {
  name: string;
  fitnessGoal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  trainingDaysPerWeek: number;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom: boolean;
}

export interface RoutineSetConfig {
  reps: number;
  weight: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number;
  weight: number;
  setConfigs?: RoutineSetConfig[];
  color?: string;
}

export type WeekDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const WEEKDAY_SHORT: Record<WeekDay, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const ALL_WEEKDAYS: WeekDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export type RestTimerAlert = "vibrate" | "sound" | "both" | "none";

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  scheduledDays?: WeekDay[];
  color?: string;
  emoji?: string;
  restTimerEnabled?: boolean; // per-routine override (defaults to global setting)
  restTimerDuration?: number; // seconds, per-routine override
  restTimerAlert?: RestTimerAlert; // alert type when timer ends
  createdAt: string;
}

export interface SetData {
  setNumber: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutSessionExercise {
  routineExerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
  completedAt?: string;
  setDetails?: SetData[];
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineName: string;
  exercises: WorkoutSessionExercise[];
  startedAt: string;
  completedAt?: string;
  isComplete: boolean;
}

export interface WorkoutHistoryExercise {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  setsCompleted: number;
  totalSets: number;
  volume: number; // weight × reps summed across completed sets
  bestSet: { weight: number; reps: number };
}

export interface WorkoutHistory {
  id: string;
  routineId: string;
  routineName: string;
  completedAt: string;
  exerciseCount: number;
  duration: number;
  totalVolume?: number; // total lbs lifted in this workout
  muscleGroups?: MuscleGroup[]; // unique muscle groups hit
  exercises?: WorkoutHistoryExercise[]; // per-exercise breakdown
  newPRs?: number; // count of new PRs set in this workout
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  completedDates: string[];
}

export type WeightUnit = "lbs" | "kg";
export type AppTheme = "light" | "dark" | "system";

export interface AppSettings {
  weightUnit: WeightUnit;
  defaultRestTimer: number; // seconds
  theme: AppTheme;
  showConfetti: boolean;
  autoStartRestTimer: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: "lbs",
  defaultRestTimer: 60,
  theme: "light",
  showConfetti: true,
  autoStartRestTimer: true,
  notificationsEnabled: true,
};

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  build_muscle: "Build Muscle",
  lose_weight: "Lose Weight",
  stay_active: "Stay Active",
  get_stronger: "Get Stronger",
};

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
  cardio: "Cardio",
};
