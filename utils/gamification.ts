import {
  LevelDefinition,
  AchievementDefinition,
  AchievementContext,
  XPBreakdown,
  GamificationData,
  WorkoutHistory,
  StreakData,
  UnlockedAchievement,
} from "@/types";

// ─── Level Definitions (30 levels) ────────────────────────

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 1, title: "Iron Novice", xpRequired: 0, emoji: "\u{1F4AA}" },
  { level: 2, title: "Gym Recruit", xpRequired: 500, emoji: "\u{1F3CB}" },
  { level: 3, title: "Rep Apprentice", xpRequired: 1300, emoji: "\u{1F94A}" },
  { level: 4, title: "Barbell Student", xpRequired: 2500, emoji: "\u{1F4DA}" },
  { level: 5, title: "Steel Initiate", xpRequired: 4000, emoji: "\u{2694}\u{FE0F}" },
  { level: 6, title: "Pump Adept", xpRequired: 5800, emoji: "\u{26A1}" },
  { level: 7, title: "Iron Disciple", xpRequired: 8000, emoji: "\u{1F525}" },
  { level: 8, title: "Plate Crusher", xpRequired: 10500, emoji: "\u{1F4A5}" },
  { level: 9, title: "Rack Commander", xpRequired: 13500, emoji: "\u{1F396}\u{FE0F}" },
  { level: 10, title: "Forge Guardian", xpRequired: 17000, emoji: "\u{1F6E1}\u{FE0F}" },
  { level: 11, title: "Steel Sentinel", xpRequired: 21000, emoji: "\u{1F5E1}\u{FE0F}" },
  { level: 12, title: "Titanium Warrior", xpRequired: 25500, emoji: "\u{2728}" },
  { level: 13, title: "Dumbbell Knight", xpRequired: 30500, emoji: "\u{1F3F0}" },
  { level: 14, title: "Power Paladin", xpRequired: 36000, emoji: "\u{1F31F}" },
  { level: 15, title: "Strength Sage", xpRequired: 42000, emoji: "\u{1F9D9}" },
  { level: 16, title: "Iron Conqueror", xpRequired: 49000, emoji: "\u{1F451}" },
  { level: 17, title: "Mythril Vanguard", xpRequired: 56500, emoji: "\u{1F48E}" },
  { level: 18, title: "Platinum Berserker", xpRequired: 65000, emoji: "\u{1F30A}" },
  { level: 19, title: "Obsidian Warlord", xpRequired: 74000, emoji: "\u{1F311}" },
  { level: 20, title: "Diamond Champion", xpRequired: 84000, emoji: "\u{1F48E}" },
  { level: 21, title: "Apex Titan", xpRequired: 95000, emoji: "\u{26F0}\u{FE0F}" },
  { level: 22, title: "Celestial Lifter", xpRequired: 107000, emoji: "\u{1F320}" },
  { level: 23, title: "Legendary Spartan", xpRequired: 120000, emoji: "\u{1F3DB}\u{FE0F}" },
  { level: 24, title: "Mythic Gladiator", xpRequired: 134000, emoji: "\u{1F3C6}" },
  { level: 25, title: "Eternal Colossus", xpRequired: 149000, emoji: "\u{1F30B}" },
  { level: 26, title: "Godforge Sentinel", xpRequired: 165500, emoji: "\u{1F52E}" },
  { level: 27, title: "Cosmic Destroyer", xpRequired: 183000, emoji: "\u{2604}\u{FE0F}" },
  { level: 28, title: "Omega Titan", xpRequired: 201500, emoji: "\u{1F300}" },
  { level: 29, title: "Transcendent", xpRequired: 221000, emoji: "\u{1F54A}\u{FE0F}" },
  { level: 30, title: "GymPulse Legend", xpRequired: 242000, emoji: "\u{1F3C6}" },
];

// ─── Achievement Definitions (22 achievements) ────────────

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Consistency
  {
    id: "streak_3",
    name: "Spark",
    description: "Reach a 3-day workout streak",
    emoji: "\u{1F525}",
    category: "consistency",
    tier: "bronze",
    condition: (ctx) => ctx.currentStreak >= 3 || ctx.longestStreak >= 3,
  },
  {
    id: "streak_7",
    name: "On Fire",
    description: "Reach a 7-day workout streak",
    emoji: "\u{1F525}",
    category: "consistency",
    tier: "silver",
    condition: (ctx) => ctx.currentStreak >= 7 || ctx.longestStreak >= 7,
  },
  {
    id: "streak_14",
    name: "Inferno",
    description: "Reach a 14-day workout streak",
    emoji: "\u{1F30B}",
    category: "consistency",
    tier: "gold",
    condition: (ctx) => ctx.currentStreak >= 14 || ctx.longestStreak >= 14,
  },
  {
    id: "streak_30",
    name: "Unstoppable",
    description: "Reach a 30-day workout streak",
    emoji: "\u{2604}\u{FE0F}",
    category: "consistency",
    tier: "diamond",
    condition: (ctx) => ctx.currentStreak >= 30 || ctx.longestStreak >= 30,
  },
  {
    id: "workouts_10",
    name: "Getting Started",
    description: "Complete 10 workouts",
    emoji: "\u{1F45F}",
    category: "consistency",
    tier: "bronze",
    condition: (ctx) => ctx.totalWorkouts >= 10,
  },
  {
    id: "workouts_50",
    name: "Dedicated",
    description: "Complete 50 workouts",
    emoji: "\u{1F4AA}",
    category: "consistency",
    tier: "silver",
    condition: (ctx) => ctx.totalWorkouts >= 50,
  },
  {
    id: "workouts_100",
    name: "Centurion",
    description: "Complete 100 workouts",
    emoji: "\u{1F6E1}\u{FE0F}",
    category: "consistency",
    tier: "gold",
    condition: (ctx) => ctx.totalWorkouts >= 100,
  },

  // Strength
  {
    id: "first_pr",
    name: "Record Breaker",
    description: "Set your first personal record",
    emoji: "\u{1F3C6}",
    category: "strength",
    tier: "bronze",
    condition: (ctx) => ctx.totalPRs >= 1,
  },
  {
    id: "prs_5",
    name: "PR Collector",
    description: "Set PRs on 5 different exercises",
    emoji: "\u{1F3C5}",
    category: "strength",
    tier: "silver",
    condition: (ctx) => ctx.totalPRs >= 5,
  },
  {
    id: "prs_15",
    name: "PR Hoarder",
    description: "Set PRs on 15 different exercises",
    emoji: "\u{1F451}",
    category: "strength",
    tier: "gold",
    condition: (ctx) => ctx.totalPRs >= 15,
  },
  {
    id: "pr_3_in_one",
    name: "Triple Threat",
    description: "Set 3+ PRs in a single workout",
    emoji: "\u{26A1}",
    category: "strength",
    tier: "gold",
    condition: (ctx) => ctx.singleWorkoutPRs >= 3,
  },

  // Volume
  {
    id: "volume_10k",
    name: "Heavy Lifter",
    description: "Lift 10,000 lbs total",
    emoji: "\u{1F3CB}\u{FE0F}",
    category: "volume",
    tier: "bronze",
    condition: (ctx) => ctx.totalVolume >= 10000,
  },
  {
    id: "volume_100k",
    name: "Ton Club",
    description: "Lift 100,000 lbs total",
    emoji: "\u{26F0}\u{FE0F}",
    category: "volume",
    tier: "silver",
    condition: (ctx) => ctx.totalVolume >= 100000,
  },
  {
    id: "volume_500k",
    name: "Iron Mountain",
    description: "Lift 500,000 lbs total",
    emoji: "\u{1F30B}",
    category: "volume",
    tier: "gold",
    condition: (ctx) => ctx.totalVolume >= 500000,
  },
  {
    id: "volume_1m",
    name: "Million Pound Club",
    description: "Lift 1,000,000 lbs total",
    emoji: "\u{1F48E}",
    category: "volume",
    tier: "diamond",
    condition: (ctx) => ctx.totalVolume >= 1000000,
  },

  // Variety
  {
    id: "muscles_all",
    name: "Well Rounded",
    description: "Train all 7 muscle groups",
    emoji: "\u{1F3AF}",
    category: "variety",
    tier: "silver",
    condition: (ctx) => ctx.uniqueMuscleGroups >= 7,
  },
  {
    id: "routines_3",
    name: "Routine Explorer",
    description: "Complete 3 different routines",
    emoji: "\u{1F5FA}\u{FE0F}",
    category: "variety",
    tier: "bronze",
    condition: (ctx) => ctx.uniqueRoutines >= 3,
  },
  {
    id: "routines_7",
    name: "Program Hopper",
    description: "Complete 7 different routines",
    emoji: "\u{1F30D}",
    category: "variety",
    tier: "silver",
    condition: (ctx) => ctx.uniqueRoutines >= 7,
  },

  // Endurance
  {
    id: "sets_100",
    name: "Set Setter",
    description: "Complete 100 total sets",
    emoji: "\u{2705}",
    category: "endurance",
    tier: "bronze",
    condition: (ctx) => ctx.totalSets >= 100,
  },
  {
    id: "sets_500",
    name: "Rep Machine",
    description: "Complete 500 total sets",
    emoji: "\u{2699}\u{FE0F}",
    category: "endurance",
    tier: "silver",
    condition: (ctx) => ctx.totalSets >= 500,
  },
  {
    id: "sets_1000",
    name: "Volume King",
    description: "Complete 1,000 total sets",
    emoji: "\u{1F451}",
    category: "endurance",
    tier: "gold",
    condition: (ctx) => ctx.totalSets >= 1000,
  },
  {
    id: "duration_600",
    name: "Time Lord",
    description: "Spend 10+ hours training",
    emoji: "\u{23F0}",
    category: "endurance",
    tier: "silver",
    condition: (ctx) => ctx.totalDuration >= 600,
  },
];

// ─── XP Calculation ───────────────────────────────────────

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

export function calculateXPGain(
  completedSets: number,
  newPRs: number,
  totalVolume: number,
  currentStreak: number
): XPBreakdown {
  const workoutComplete = 100;
  const setsCompleted = completedSets * 5;
  const personalRecords = newPRs * 50;
  const volumeBonus = Math.floor(totalVolume / 1000) * 10;
  const consistencyMultiplier = getStreakMultiplier(currentStreak);

  const baseXP = workoutComplete + setsCompleted + personalRecords + volumeBonus;
  const streakBonus = Math.floor(baseXP * (consistencyMultiplier - 1));
  const total = Math.floor(baseXP * consistencyMultiplier);

  return {
    workoutComplete,
    setsCompleted,
    personalRecords,
    streakBonus,
    volumeBonus,
    consistencyMultiplier,
    total,
  };
}

// ─── Level System ─────────────────────────────────────────

export function getLevelForXP(totalXP: number): number {
  let level = 1;
  for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_DEFINITIONS[i].xpRequired) {
      level = LEVEL_DEFINITIONS[i].level;
      break;
    }
  }
  return level;
}

export function getLevelDefinition(level: number): LevelDefinition {
  const clamped = Math.max(1, Math.min(level, LEVEL_DEFINITIONS.length));
  return LEVEL_DEFINITIONS[clamped - 1];
}

export function getXPForLevel(level: number): number {
  const def = getLevelDefinition(level);
  return def.xpRequired;
}

export function getXPProgress(totalXP: number): {
  currentLevelXP: number;
  nextLevelXP: number;
  progressXP: number;
  fraction: number;
} {
  const level = getLevelForXP(totalXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevel = Math.min(level + 1, LEVEL_DEFINITIONS.length);
  const nextLevelXP = getXPForLevel(nextLevel);

  if (level >= LEVEL_DEFINITIONS.length) {
    return { currentLevelXP, nextLevelXP: currentLevelXP, progressXP: 0, fraction: 1 };
  }

  const range = nextLevelXP - currentLevelXP;
  const progressXP = totalXP - currentLevelXP;
  const fraction = range > 0 ? Math.min(progressXP / range, 1) : 1;

  return { currentLevelXP, nextLevelXP, progressXP, fraction };
}

// ─── Achievement System ───────────────────────────────────

export function buildAchievementContext(
  history: WorkoutHistory[],
  streak: StreakData,
  personalRecords: Record<string, unknown>,
  level: number,
  singleWorkoutVolume: number = 0,
  singleWorkoutPRs: number = 0
): AchievementContext {
  const totalVolume = history.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const uniqueRoutineIds = new Set(history.map((w) => w.routineId));
  const allMuscleGroups = new Set<string>();
  let totalSets = 0;
  const totalDuration = history.reduce((sum, w) => sum + (w.duration || 0), 0);

  for (const w of history) {
    if (w.muscleGroups) {
      for (const mg of w.muscleGroups) {
        allMuscleGroups.add(mg);
      }
    }
    if (w.exercises) {
      for (const ex of w.exercises) {
        totalSets += ex.setsCompleted;
      }
    } else {
      totalSets += w.exerciseCount * 3;
    }
  }

  return {
    totalWorkouts: history.length,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalVolume,
    totalPRs: Object.keys(personalRecords).length,
    uniqueMuscleGroups: allMuscleGroups.size,
    uniqueRoutines: uniqueRoutineIds.size,
    totalSets,
    totalDuration,
    singleWorkoutVolume,
    singleWorkoutPRs,
    level,
    history,
  };
}

export function checkAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: string[]
): string[] {
  const unlockedSet = new Set(alreadyUnlocked);
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedSet.has(achievement.id)) continue;
    if (achievement.condition(ctx)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
}

// ─── Migration for Existing Users ─────────────────────────

export function migrateExistingData(
  history: WorkoutHistory[],
  streak: StreakData,
  personalRecords: Record<string, unknown>
): GamificationData {
  let totalXP = 0;

  for (const workout of history) {
    let completedSets = 0;
    if (workout.exercises) {
      for (const ex of workout.exercises) {
        completedSets += ex.setsCompleted;
      }
    } else {
      completedSets = workout.exerciseCount * 3;
    }

    const volume = workout.totalVolume || 0;
    const prs = workout.newPRs || 0;
    const breakdown = calculateXPGain(completedSets, prs, volume, 0);
    totalXP += breakdown.total;
  }

  const level = getLevelForXP(totalXP);

  const ctx = buildAchievementContext(history, streak, personalRecords, level);
  const unlockedIds = checkAchievements(ctx, []);
  const now = new Date().toISOString();
  const achievements: UnlockedAchievement[] = unlockedIds.map((id) => ({
    id,
    unlockedAt: now,
  }));

  return {
    totalXP,
    level,
    achievements,
    lastXPGain: null,
  };
}
