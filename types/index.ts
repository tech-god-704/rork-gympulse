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
  /** Stored in pounds. See utils/units.ts — display unit is a presentation concern. */
  weight: number;
  completed: boolean;
  /** When this specific set was checked off. Drives accurate workout duration. */
  completedAt?: string;
}

export interface WorkoutSessionExercise {
  routineExerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number;
  weight: number;
  /** "Resolved" — either genuinely finished or deliberately skipped. Drives progress UI. */
  completed: boolean;
  completedAt?: string;
  /**
   * Explicitly skipped by the user. A skipped exercise resolves the card but
   * contributes nothing to volume, PRs, sets or XP — previously skipping marked
   * every set complete, which silently inflated all four.
   */
  skipped?: boolean;
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

export interface LoggedSet {
  weight: number;
  reps: number;
}

export interface WorkoutHistoryExercise {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  setsCompleted: number;
  totalSets: number;
  volume: number; // weight × reps summed across completed sets
  bestSet: LoggedSet;
  /** Every completed set, so history is self-sufficient and can be recomputed exactly. */
  sets?: LoggedSet[];
  skipped?: boolean;
}

export interface WorkoutHistory {
  id: string;
  routineId: string;
  routineName: string;
  completedAt: string;
  /** Exercises in the routine. Kept for backwards compatibility with old entries. */
  exerciseCount: number;
  duration: number;
  totalVolume?: number; // total lbs lifted in this workout
  muscleGroups?: MuscleGroup[]; // unique muscle groups hit
  exercises?: WorkoutHistoryExercise[]; // per-exercise breakdown
  newPRs?: number; // count of new PRs set in this workout
  /** Exercises actually worked (excludes skipped and untouched). */
  completedExercises?: number;
  skippedExercises?: number;
  totalSets?: number;
  completedSets?: number;
  /** XP awarded at the time, so history stays replayable after a deletion. */
  xpAwarded?: number;
}

/** A personal record for one exercise. Weight in pounds. */
export interface PersonalRecord {
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
}

/** The most recent completed sets for one exercise, used to pre-fill next time. */
export interface ExercisePerformance {
  sets: LoggedSet[];
  date: string;
}

export type PerformanceMap = Record<string, ExercisePerformance>;
export type PRMap = Record<string, PersonalRecord>;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  completedDates: string[];
}

export type WeightUnit = "lbs" | "kg";
export type AppTheme = "light" | "dark" | "system";
export type WeekStart = "sunday" | "monday";

/** Bumped when stored data needs a one-time migration. */
export const CURRENT_DATA_VERSION = 2;

export interface AppSettings {
  weightUnit: WeightUnit;
  defaultRestTimer: number; // seconds
  theme: AppTheme;
  showConfetti: boolean;
  autoStartRestTimer: boolean;
  notificationsEnabled: boolean;
  /** Weekly stats and the activity calendar both honour this. */
  weekStartsOn: WeekStart;
  /** Hour of day (0-23) for the daily training reminder. */
  reminderHour: number;
  dataVersion: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: "lbs",
  defaultRestTimer: 60,
  // app.json declares userInterfaceStyle "automatic", so follow the system by default.
  theme: "system",
  showConfetti: true,
  autoStartRestTimer: true,
  notificationsEnabled: true,
  weekStartsOn: "monday",
  reminderHour: 18,
  dataVersion: CURRENT_DATA_VERSION,
};

/** Fallback weekly training goal when a profile somehow has none. */
export const DEFAULT_TRAINING_DAYS = 4;

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

// ─── Gamification Types ────────────────────────────────────

export type AchievementCategory = 'consistency' | 'strength' | 'volume' | 'variety' | 'endurance';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface GamificationData {
  totalXP: number;
  level: number;
  achievements: UnlockedAchievement[];
  lastXPGain: XPGainEvent | null;
}

export interface XPGainEvent {
  timestamp: string;
  breakdown: XPBreakdown;
  totalGained: number;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  newAchievements: string[];
}

export interface XPBreakdown {
  workoutComplete: number;
  setsCompleted: number;
  personalRecords: number;
  streakBonus: number;
  volumeBonus: number;
  consistencyMultiplier: number;
  total: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: AchievementCategory;
  tier: AchievementTier;
  condition: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  totalPRs: number;
  uniqueMuscleGroups: number;
  uniqueRoutines: number;
  totalSets: number;
  totalDuration: number;
  singleWorkoutVolume: number;
  singleWorkoutPRs: number;
  level: number;
  history: WorkoutHistory[];
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export interface LevelDefinition {
  level: number;
  title: string;
  xpRequired: number;
  emoji: string;
}

export const DEFAULT_GAMIFICATION: GamificationData = {
  totalXP: 0,
  level: 1,
  achievements: [],
  lastXPGain: null,
};

// ─── Premium / Subscription Types ──────────────────────────

export type SubscriptionPlan = 'monthly' | 'yearly' | 'lifetime';

export interface PremiumStatus {
  isPremium: boolean;
  plan: SubscriptionPlan | null;
  subscribedAt: string | null;
  paywallDismissCount: number;
  lastPaywallShown: string | null;
  workoutsSinceLastPaywall: number;
}

export const DEFAULT_PREMIUM: PremiumStatus = {
  isPremium: false,
  plan: null,
  subscribedAt: null,
  paywallDismissCount: 0,
  lastPaywallShown: null,
  workoutsSinceLastPaywall: 0,
};

export const PREMIUM_FEATURES = [
  { emoji: "\u{1F4CA}", title: "Advanced Analytics", description: "Muscle heatmaps, volume trends, and progressive overload tracking" },
  { emoji: "\u{1F3AF}", title: "Smart Workout Plans", description: "AI-personalized routines that adapt to your progress" },
  { emoji: "\u{1F3C6}", title: "Unlimited Routines", description: "Create as many custom routines as you want" },
  { emoji: "\u{23F1}\u{FE0F}", title: "Advanced Rest Timer", description: "Custom intervals, auto-progression, and voice cues" },
  { emoji: "\u{1F4F1}", title: "Export & Backup", description: "Export workout data and cloud backup" },
  { emoji: "\u{26A1}", title: "Priority Features", description: "Early access to new features and updates" },
] as const;
