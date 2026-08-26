import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import {
  UserProfile,
  Routine,
  RoutineExercise,
  Exercise,
  WorkoutSession,
  WorkoutHistory,
  StreakData,
  MuscleGroup,
  SetData,
  AppSettings,
  DEFAULT_SETTINGS,
  CURRENT_DATA_VERSION,
  GamificationData,
  DEFAULT_GAMIFICATION,
  XPGainEvent,
  PremiumStatus,
  DEFAULT_PREMIUM,
  SubscriptionPlan,
  PerformanceMap,
  PRMap,
  WeightUnit,
} from "@/types";
import { BUILT_IN_EXERCISES } from "@/mocks/exercises";
import { generateId, getToday, getStartOfWeek, formatDate } from "@/utils/helpers";
import { fromDisplayWeight } from "@/utils/units";
import {
  summarizeSession,
  rebuildPersonalRecords,
  rebuildLastPerformance,
  rebuildCompletedDates,
  streakFromDates,
} from "@/utils/workoutStats";
import {
  sendWorkoutCompleteNotification,
  sendStreakMilestoneNotification,
  setupNotifications,
  disableAllNotifications,
  refreshDailyReminder,
} from "@/utils/notifications";
import {
  calculateXPGain,
  getLevelForXP,
  buildAchievementContext,
  checkAchievements,
  migrateExistingData,
} from "@/utils/gamification";

const STORAGE_KEYS = {
  PROFILE: "gympulse_profile",
  ROUTINES: "gympulse_routines",
  CUSTOM_EXERCISES: "gympulse_custom_exercises",
  CURRENT_SESSION: "gympulse_current_session",
  HISTORY: "gympulse_history",
  STREAK: "gympulse_streak",
  LAST_PERFORMANCE: "gympulse_last_performance",
  PERSONAL_RECORDS: "gympulse_personal_records",
  SETTINGS: "gympulse_settings",
  GAMIFICATION: "gympulse_gamification",
  PREMIUM: "gympulse_premium",
};

const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

function createDefaultStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null, completedDates: [] };
}

/**
 * Recompute the streak from its completed dates. A streak decays the moment
 * a day is missed, and this now derives every field (including `longestStreak`)
 * from the date list rather than trusting stored counters that can drift.
 */
function recalculateStreak(streakData: StreakData): StreakData {
  const dates = [...new Set(streakData.completedDates ?? [])].sort();
  const derived = streakFromDates(dates, getToday());
  return {
    currentStreak: derived.currentStreak,
    // Never regress a longest-streak the user actually earned.
    longestStreak: Math.max(derived.longestStreak, streakData.longestStreak ?? 0),
    lastWorkoutDate: derived.lastWorkoutDate,
    completedDates: dates,
  };
}

/** Ensure setDetails exists on a session exercise (backwards compat). */
function ensureSetDetails(exercise: {
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
  skipped?: boolean;
  setDetails?: SetData[];
}): SetData[] {
  if (exercise.setDetails && exercise.setDetails.length > 0) {
    return exercise.setDetails;
  }
  return Array.from({ length: Math.max(exercise.sets, 0) }, (_, i) => ({
    setNumber: i + 1,
    reps: exercise.reps,
    weight: exercise.weight,
    // A skipped exercise has no completed sets, however it was resolved.
    completed: exercise.skipped ? false : exercise.completed,
  }));
}

/** Renumber sets 1..n after an insert or removal. */
function renumber(sets: SetData[]): SetData[] {
  return sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
}

export const [GymProvider, useGym] = createContextHook(() => {
  return useGymState();
});

function useGymState() {
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [streak, setStreak] = useState<StreakData>(createDefaultStreak());
  const [lastPerformance, setLastPerformance] = useState<PerformanceMap>({});
  const [personalRecords, setPersonalRecords] = useState<PRMap>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [gamification, setGamification] = useState<GamificationData>(DEFAULT_GAMIFICATION);
  const [premium, setPremium] = useState<PremiumStatus>(DEFAULT_PREMIUM);
  const [isLoading, setIsLoading] = useState(true);

  // Use refs for values accessed in rapid-fire callbacks to avoid stale closures
  const sessionRef = useRef<WorkoutSession | null>(null);
  const historyRef = useRef<WorkoutHistory[]>([]);
  const streakRef = useRef<StreakData>(createDefaultStreak());
  const lastPerformanceRef = useRef<PerformanceMap>({});
  const personalRecordsRef = useRef<PRMap>({});
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const gamificationRef = useRef<GamificationData>(DEFAULT_GAMIFICATION);
  const premiumRef = useRef<PremiumStatus>(DEFAULT_PREMIUM);
  const completedSessionIds = useRef<Set<string>>(new Set());

  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { lastPerformanceRef.current = lastPerformance; }, [lastPerformance]);
  useEffect(() => { personalRecordsRef.current = personalRecords; }, [personalRecords]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { gamificationRef.current = gamification; }, [gamification]);
  useEffect(() => { premiumRef.current = premium; }, [premium]);

  // Local storage is the source of truth and every write goes through this
  // provider, so background refetching would only ever clobber fresher state.
  const localQuery = { staleTime: Infinity, gcTime: Infinity, refetchOnMount: false } as const;

  const profileQuery = useQuery({
    ...localQuery,
    queryKey: ["profile"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!stored) return null;
      try { return JSON.parse(stored) as UserProfile; } catch { return null; }
    },
  });

  const routinesQuery = useQuery({
    ...localQuery,
    queryKey: ["routines"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
      if (!stored) return [];
      try { return JSON.parse(stored) as Routine[]; } catch { return []; }
    },
  });

  const customExQuery = useQuery({
    ...localQuery,
    queryKey: ["customExercises"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
      if (!stored) return [];
      try { return JSON.parse(stored) as Exercise[]; } catch { return []; }
    },
  });

  const sessionQuery = useQuery({
    ...localQuery,
    queryKey: ["currentSession"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (!stored) return null;
      try {
        const session = JSON.parse(stored) as WorkoutSession;
        // Migrate: ensure all exercises have setDetails
        session.exercises = session.exercises.map((e) => ({
          ...e,
          setDetails: ensureSetDetails(e),
        }));
        return session;
      } catch { return null; }
    },
  });

  const historyQuery = useQuery({
    ...localQuery,
    queryKey: ["history"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!stored) return [];
      try { return JSON.parse(stored) as WorkoutHistory[]; } catch { return []; }
    },
  });

  const streakQuery = useQuery({
    ...localQuery,
    queryKey: ["streak"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
      if (!stored) return recalculateStreak(createDefaultStreak());
      try {
        const data = JSON.parse(stored) as StreakData;
        return recalculateStreak(data);
      } catch { return recalculateStreak(createDefaultStreak()); }
    },
  });

  const perfQuery = useQuery({
    ...localQuery,
    queryKey: ["lastPerformance"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PERFORMANCE);
      if (!stored) return {};
      try { return JSON.parse(stored) as PerformanceMap; } catch { return {}; }
    },
  });

  const prQuery = useQuery({
    ...localQuery,
    queryKey: ["personalRecords"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PERSONAL_RECORDS);
      if (!stored) return {};
      try { return JSON.parse(stored) as PRMap; } catch { return {}; }
    },
  });

  const settingsQuery = useQuery({
    ...localQuery,
    queryKey: ["settings"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) return DEFAULT_SETTINGS;
      try {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Settings saved before versioning existed are, by definition, v1.
          dataVersion: parsed.dataVersion ?? 1,
        } as AppSettings;
      } catch { return DEFAULT_SETTINGS; }
    },
  });

  const gamificationQuery = useQuery({
    ...localQuery,
    queryKey: ["gamification"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.GAMIFICATION);
      if (!stored) return null; // null signals migration needed
      try { return JSON.parse(stored) as GamificationData; } catch { return null; }
    },
  });

  const premiumQuery = useQuery({
    ...localQuery,
    queryKey: ["premium"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM);
      if (!stored) return DEFAULT_PREMIUM;
      try { return { ...DEFAULT_PREMIUM, ...JSON.parse(stored) } as PremiumStatus; } catch { return DEFAULT_PREMIUM; }
    },
  });

  useEffect(() => {
    if (profileQuery.data !== undefined) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  useEffect(() => {
    if (routinesQuery.data !== undefined) setRoutines(routinesQuery.data);
  }, [routinesQuery.data]);

  useEffect(() => {
    if (customExQuery.data !== undefined) setCustomExercises(customExQuery.data);
  }, [customExQuery.data]);

  useEffect(() => {
    if (sessionQuery.data !== undefined) setCurrentSession(sessionQuery.data);
  }, [sessionQuery.data]);

  useEffect(() => {
    if (historyQuery.data !== undefined) setHistory(historyQuery.data);
  }, [historyQuery.data]);

  useEffect(() => {
    if (streakQuery.data !== undefined) setStreak(streakQuery.data);
  }, [streakQuery.data]);

  useEffect(() => {
    if (perfQuery.data !== undefined) setLastPerformance(perfQuery.data);
  }, [perfQuery.data]);

  useEffect(() => {
    if (prQuery.data !== undefined) setPersonalRecords(prQuery.data);
  }, [prQuery.data]);

  useEffect(() => {
    if (settingsQuery.data !== undefined) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (premiumQuery.data !== undefined) setPremium(premiumQuery.data);
  }, [premiumQuery.data]);

  // Gamification: load or migrate
  const gamificationMigrated = useRef(false);
  useEffect(() => {
    if (gamificationQuery.data !== undefined && !gamificationMigrated.current) {
      if (gamificationQuery.data !== null) {
        setGamification(gamificationQuery.data);
      }
      // Migration happens after all data is loaded (see isLoading effect below)
    }
  }, [gamificationQuery.data]);

  const unitsMigrated = useRef(false);

  useEffect(() => {
    const allDone =
      !profileQuery.isLoading &&
      !routinesQuery.isLoading &&
      !customExQuery.isLoading &&
      !sessionQuery.isLoading &&
      !historyQuery.isLoading &&
      !streakQuery.isLoading &&
      !perfQuery.isLoading &&
      !prQuery.isLoading &&
      !settingsQuery.isLoading &&
      !gamificationQuery.isLoading &&
      !premiumQuery.isLoading;
    if (!allDone) return;

    // ── One-time unit migration ────────────────────────────
    // Weights are now stored canonically in pounds. Users who were on kg
    // typed kg numbers that got stored bare, so reinterpret and convert them.
    const loadedSettings = settingsQuery.data ?? DEFAULT_SETTINGS;
    if (!unitsMigrated.current && (loadedSettings.dataVersion ?? 1) < CURRENT_DATA_VERSION) {
      unitsMigrated.current = true;
      if (loadedSettings.weightUnit === "kg") {
        void migrateStoredWeightsToPounds();
      }
      const upgraded: AppSettings = { ...loadedSettings, dataVersion: CURRENT_DATA_VERSION };
      setSettings(upgraded);
      settingsRef.current = upgraded;
      void AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(upgraded)).catch(() => {});
    }

    // Migrate gamification data for existing users (one-time)
    if (gamificationQuery.data === null && !gamificationMigrated.current) {
      gamificationMigrated.current = true;
      const migrated = migrateExistingData(
        historyRef.current,
        streakRef.current,
        personalRecordsRef.current
      );
      setGamification(migrated);
      gamificationRef.current = migrated;
      void AsyncStorage.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(migrated)).catch(() => {});
    }

    setIsLoading(false);
    if (settingsRef.current.notificationsEnabled) {
      void setupNotifications({
        reminderHour: settingsRef.current.reminderHour,
        trainedToday: streakRef.current.lastWorkoutDate === getToday(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profileQuery.isLoading,
    routinesQuery.isLoading,
    customExQuery.isLoading,
    sessionQuery.isLoading,
    historyQuery.isLoading,
    streakQuery.isLoading,
    perfQuery.isLoading,
    prQuery.isLoading,
    settingsQuery.isLoading,
    gamificationQuery.isLoading,
    gamificationQuery.data,
    premiumQuery.isLoading,
  ]);

  /**
   * Reinterpret every stored weight as kilograms and rewrite it in pounds.
   * Runs once, only for users whose unit setting was already kg.
   */
  const migrateStoredWeightsToPounds = useCallback(async () => {
    const toLbs = (v: number) => fromDisplayWeight(v, "kg");

    const nextRoutines = routinesQuery.data?.map((r) => ({
      ...r,
      exercises: r.exercises.map((e) => ({
        ...e,
        weight: toLbs(e.weight),
        setConfigs: e.setConfigs?.map((c) => ({ ...c, weight: toLbs(c.weight) })),
      })),
    }));

    const rawSession = sessionQuery.data;
    const nextSession = rawSession
      ? {
          ...rawSession,
          exercises: rawSession.exercises.map((e) => ({
            ...e,
            weight: toLbs(e.weight),
            setDetails: e.setDetails?.map((s) => ({ ...s, weight: toLbs(s.weight) })),
          })),
        }
      : null;

    const nextHistory = historyQuery.data?.map((h) => ({
      ...h,
      totalVolume: h.totalVolume != null ? toLbs(h.totalVolume) : h.totalVolume,
      exercises: h.exercises?.map((e) => ({
        ...e,
        volume: toLbs(e.volume),
        bestSet: { ...e.bestSet, weight: toLbs(e.bestSet.weight) },
        sets: e.sets?.map((s) => ({ ...s, weight: toLbs(s.weight) })),
      })),
    }));

    const nextPRs: PRMap = {};
    Object.entries(prQuery.data ?? {}).forEach(([name, pr]) => {
      nextPRs[name] = { ...pr, weight: toLbs(pr.weight), estimated1RM: toLbs(pr.estimated1RM) };
    });

    const nextPerf: PerformanceMap = {};
    Object.entries(perfQuery.data ?? {}).forEach(([name, perf]) => {
      nextPerf[name] = { ...perf, sets: perf.sets.map((s) => ({ ...s, weight: toLbs(s.weight) })) };
    });

    if (nextRoutines) {
      setRoutines(nextRoutines);
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(nextRoutines)).catch(() => {});
    }
    if (nextSession) {
      setCurrentSession(nextSession);
      sessionRef.current = nextSession;
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(nextSession)).catch(() => {});
    }
    if (nextHistory) {
      setHistory(nextHistory);
      historyRef.current = nextHistory;
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(nextHistory)).catch(() => {});
    }
    setPersonalRecords(nextPRs);
    personalRecordsRef.current = nextPRs;
    await AsyncStorage.setItem(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify(nextPRs)).catch(() => {});
    setLastPerformance(nextPerf);
    lastPerformanceRef.current = nextPerf;
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_PERFORMANCE, JSON.stringify(nextPerf)).catch(() => {});
  }, [routinesQuery.data, sessionQuery.data, historyQuery.data, prQuery.data, perfQuery.data]);

  // Streaks decay at midnight. Without this the display stays stale for a user
  // who leaves the app open overnight.
  useEffect(() => {
    let lastSeenDay = getToday();
    const check = () => {
      const today = getToday();
      if (today === lastSeenDay) return;
      lastSeenDay = today;
      const refreshed = recalculateStreak(streakRef.current);
      setStreak(refreshed);
      streakRef.current = refreshed;
    };
    const interval = setInterval(check, 60_000);
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") check();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  // ─── Mutations ────────────────────────────────────────────
  const saveProfileMutation = useMutation({
    mutationFn: async (p: UserProfile) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p));
      return p;
    },
    onSuccess: (p) => {
      setProfile(p);
      queryClient.setQueryData(["profile"], p);
    },
  });

  const saveRoutinesMutation = useMutation({
    mutationFn: async (r: Routine[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(r));
      return r;
    },
    onSuccess: (r) => {
      setRoutines(r);
      queryClient.setQueryData(["routines"], r);
    },
  });

  const saveCustomExMutation = useMutation({
    mutationFn: async (e: Exercise[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(e));
      return e;
    },
    onSuccess: (e) => {
      setCustomExercises(e);
      queryClient.setQueryData(["customExercises"], e);
    },
  });

  // For session, update state immediately (optimistic) to prevent stale closures
  const saveSession = useCallback(
    (s: WorkoutSession | null) => {
      setCurrentSession(s);
      sessionRef.current = s;
      // Keep the cache in step so a refetch can't resurrect a stale session.
      queryClient.setQueryData(["currentSession"], s);
      if (s) {
        void AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(s)).catch(() => {});
      } else {
        void AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION).catch(() => {});
      }
    },
    [queryClient]
  );

  const saveHistoryMutation = useMutation({
    mutationFn: async (h: WorkoutHistory[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(h));
      return h;
    },
    onSuccess: (h) => {
      setHistory(h);
      queryClient.setQueryData(["history"], h);
    },
  });

  const saveStreakMutation = useMutation({
    mutationFn: async (s: StreakData) => {
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(s));
      return s;
    },
    onSuccess: (s) => {
      setStreak(s);
      queryClient.setQueryData(["streak"], s);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (s: AppSettings) => {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
      return s;
    },
    onSuccess: (s) => {
      setSettings(s);
      queryClient.setQueryData(["settings"], s);
    },
  });

  // ─── Actions ──────────────────────────────────────────────
  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      const current = settingsRef.current;
      const updated = { ...current, ...updates };
      setSettings(updated);
      settingsRef.current = updated;
      saveSettingsMutation.mutate(updated);

      // Toggle scheduled notifications when the setting changes
      if (updates.notificationsEnabled !== undefined || updates.reminderHour !== undefined) {
        if (updated.notificationsEnabled) {
          void setupNotifications({
            reminderHour: updated.reminderHour,
            trainedToday: streakRef.current.lastWorkoutDate === getToday(),
          });
        } else {
          void disableAllNotifications();
        }
      }
    },
    [saveSettingsMutation]
  );

  // ─── Premium / Paywall ──────────────────────────────────
  const savePremium = useCallback((p: PremiumStatus) => {
    setPremium(p);
    premiumRef.current = p;
    void AsyncStorage.setItem(STORAGE_KEYS.PREMIUM, JSON.stringify(p)).catch(() => {});
  }, []);

  const subscribeToPlan = useCallback((plan: SubscriptionPlan) => {
    const updated: PremiumStatus = {
      ...premiumRef.current,
      isPremium: true,
      plan,
      subscribedAt: new Date().toISOString(),
    };
    savePremium(updated);
  }, [savePremium]);

  const dismissPaywall = useCallback(() => {
    const updated: PremiumStatus = {
      ...premiumRef.current,
      paywallDismissCount: premiumRef.current.paywallDismissCount + 1,
      lastPaywallShown: new Date().toISOString(),
      workoutsSinceLastPaywall: 0,
    };
    savePremium(updated);
  }, [savePremium]);

  const recordPaywallWorkout = useCallback(() => {
    if (premiumRef.current.isPremium) return;
    const updated: PremiumStatus = {
      ...premiumRef.current,
      workoutsSinceLastPaywall: premiumRef.current.workoutsSinceLastPaywall + 1,
    };
    savePremium(updated);
  }, [savePremium]);

  /**
   * Show the upgrade prompt after every third workout, but never more than
   * once a day. The 24-hour guard used to sit *after* the early return, so it
   * never actually ran and the paywall could reappear the same session.
   */
  const shouldShowPaywall = useCallback((): boolean => {
    const p = premiumRef.current;
    if (p.isPremium) return false;
    if (p.workoutsSinceLastPaywall < 3) return false;

    if (p.lastPaywallShown) {
      const hoursSince = (Date.now() - new Date(p.lastPaywallShown).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return false;
    }
    // Back off after repeated dismissals rather than nagging indefinitely.
    if (p.paywallDismissCount >= 5) return false;

    return true;
  }, []);

  const saveProfile = useCallback(
    (p: UserProfile) => {
      saveProfileMutation.mutate(p);
    },
    [saveProfileMutation]
  );

  const completeOnboarding = useCallback(
    (p: UserProfile) => {
      saveProfile(p);
      // Don't auto-create routines — let the user build or pick from splits
    },
    [saveProfile]
  );

  const addRoutine = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const newRoutine: Routine = {
        id: generateId(),
        name: trimmed,
        exercises: [],
        createdAt: new Date().toISOString(),
      };
      const updated = [...routines, newRoutine];
      saveRoutinesMutation.mutate(updated);
      return newRoutine;
    },
    [routines, saveRoutinesMutation]
  );

  const addRoutinesFromTemplates = useCallback(
    (templates: { name: string; emoji?: string; exercises: { name: string; muscleGroup: MuscleGroup; sets: number; reps: number; weight: number }[] }[]) => {
      const newRoutines: Routine[] = templates.map((template) => ({
        id: generateId(),
        name: template.name,
        emoji: template.emoji,
        exercises: template.exercises.map((e) => ({
          id: generateId(),
          exerciseId: BUILT_IN_EXERCISES.find((be) => be.name === e.name)?.id ?? generateId(),
          exerciseName: e.name,
          muscleGroup: e.muscleGroup,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          setConfigs: Array.from({ length: e.sets }, () => ({ reps: e.reps, weight: e.weight })),
        })),
        createdAt: new Date().toISOString(),
      }));
      const updated = [...routines, ...newRoutines];
      saveRoutinesMutation.mutate(updated);
      return newRoutines;
    },
    [routines, saveRoutinesMutation]
  );

  const updateRoutine = useCallback(
    (routineId: string, updates: Partial<Routine>) => {
      const updated = routines.map((r) => (r.id === routineId ? { ...r, ...updates } : r));
      saveRoutinesMutation.mutate(updated);
    },
    [routines, saveRoutinesMutation]
  );

  const deleteRoutine = useCallback(
    (routineId: string) => {
      const updated = routines.filter((r) => r.id !== routineId);
      saveRoutinesMutation.mutate(updated);
      // Don't strand a live session pointing at a routine that no longer exists.
      if (sessionRef.current?.routineId === routineId) {
        saveSession(null);
      }
    },
    [routines, saveRoutinesMutation, saveSession]
  );

  const reorderRoutine = useCallback(
    (routineId: string, direction: "up" | "down") => {
      const idx = routines.findIndex((r) => r.id === routineId);
      if (idx < 0) return;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= routines.length) return;
      const updated = [...routines];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      saveRoutinesMutation.mutate(updated);
    },
    [routines, saveRoutinesMutation]
  );

  const addExerciseToRoutine = useCallback(
    (routineId: string, exercise: RoutineExercise) => {
      const updated = routines.map((r) =>
        r.id === routineId ? { ...r, exercises: [...r.exercises, exercise] } : r
      );
      saveRoutinesMutation.mutate(updated);
    },
    [routines, saveRoutinesMutation]
  );

  const removeExerciseFromRoutine = useCallback(
    (routineId: string, exerciseId: string) => {
      const updated = routines.map((r) =>
        r.id === routineId ? { ...r, exercises: r.exercises.filter((e) => e.id !== exerciseId) } : r
      );
      saveRoutinesMutation.mutate(updated);
    },
    [routines, saveRoutinesMutation]
  );

  const reorderExerciseInRoutine = useCallback(
    (routineId: string, exerciseId: string, direction: "up" | "down") => {
      const updated = routines.map((r) => {
        if (r.id !== routineId) return r;
        const idx = r.exercises.findIndex((e) => e.id === exerciseId);
        if (idx < 0) return r;
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= r.exercises.length) return r;
        const exercises = [...r.exercises];
        [exercises[idx], exercises[newIdx]] = [exercises[newIdx], exercises[idx]];
        return { ...r, exercises };
      });
      saveRoutinesMutation.mutate(updated);
    },
    [routines, saveRoutinesMutation]
  );

  const addCustomExercise = useCallback(
    (name: string, muscleGroup: MuscleGroup) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      // Don't create duplicates that then split a user's history in two.
      const existing = [...BUILT_IN_EXERCISES, ...customExercises].find(
        (e) => e.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return existing;
      const ex: Exercise = { id: generateId(), name: trimmed, muscleGroup, isCustom: true };
      const updated = [...customExercises, ex];
      saveCustomExMutation.mutate(updated);
      return ex;
    },
    [customExercises, saveCustomExMutation]
  );

  const deleteCustomExercise = useCallback(
    (exerciseId: string) => {
      const updated = customExercises.filter((e) => e.id !== exerciseId);
      saveCustomExMutation.mutate(updated);
    },
    [customExercises, saveCustomExMutation]
  );

  const allExercises = useMemo(() => {
    return [...BUILT_IN_EXERCISES, ...customExercises];
  }, [customExercises]);

  const startWorkout = useCallback(
    (routine: Routine) => {
      if (routine.exercises.length === 0) return null;
      const session: WorkoutSession = {
        id: generateId(),
        routineId: routine.id,
        routineName: routine.name,
        exercises: routine.exercises.map((e) => {
          // Auto-fill from previous performance if available
          const prev = lastPerformanceRef.current[e.exerciseName];
          return {
            routineExerciseId: e.id,
            exerciseName: e.exerciseName,
            muscleGroup: e.muscleGroup,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            completed: false,
            skipped: false,
            setDetails: Array.from({ length: e.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: prev?.sets[i]?.reps ?? e.setConfigs?.[i]?.reps ?? e.reps,
              weight: prev?.sets[i]?.weight ?? e.setConfigs?.[i]?.weight ?? e.weight,
              completed: false,
            })),
          };
        }),
        startedAt: new Date().toISOString(),
        isComplete: false,
      };
      saveSession(session);
      return session;
    },
    [saveSession]
  );

  /** Apply a transform to one exercise and recompute session-level completion. */
  const mutateSessionExercise = useCallback(
    (
      routineExerciseId: string,
      transform: (e: WorkoutSession["exercises"][number]) => WorkoutSession["exercises"][number]
    ): boolean => {
      const session = sessionRef.current;
      if (!session) return false;
      const exercises = session.exercises.map((e) =>
        e.routineExerciseId === routineExerciseId ? transform(e) : e
      );
      const allComplete = exercises.length > 0 && exercises.every((ex) => ex.completed);
      saveSession({
        ...session,
        exercises,
        isComplete: allComplete,
        completedAt: allComplete ? new Date().toISOString() : undefined,
      });
      return allComplete;
    },
    [saveSession]
  );

  const toggleExerciseComplete = useCallback(
    (routineExerciseId: string) => {
      return mutateSessionExercise(routineExerciseId, (e) => {
        const newCompleted = !e.completed;
        const stamp = new Date().toISOString();
        const updatedSets = ensureSetDetails(e).map((s) => ({
          ...s,
          completed: newCompleted,
          completedAt: newCompleted ? (s.completedAt ?? stamp) : undefined,
        }));
        return {
          ...e,
          completed: newCompleted,
          // Un-completing also clears a skip, so the card returns to a clean state.
          skipped: false,
          completedAt: newCompleted ? stamp : undefined,
          setDetails: updatedSets,
        };
      });
    },
    [mutateSessionExercise]
  );

  /**
   * Skip / unskip. A skipped exercise resolves the card without marking its
   * sets complete — previously it flipped every set to `completed: true`, which
   * added phantom volume, invented personal records and paid out XP for work
   * that never happened.
   */
  const skipExercise = useCallback(
    (routineExerciseId: string) => {
      mutateSessionExercise(routineExerciseId, (e) => {
        if (e.skipped) {
          return {
            ...e,
            completed: false,
            skipped: false,
            completedAt: undefined,
            setDetails: ensureSetDetails(e).map((s) => ({ ...s, completed: false, completedAt: undefined })),
          };
        }
        return {
          ...e,
          completed: true,
          skipped: true,
          completedAt: new Date().toISOString(),
          setDetails: ensureSetDetails(e).map((s) => ({ ...s, completed: false, completedAt: undefined })),
        };
      });
    },
    [mutateSessionExercise]
  );

  const toggleSetComplete = useCallback(
    (routineExerciseId: string, setNumber: number) => {
      return mutateSessionExercise(routineExerciseId, (e) => {
        const stamp = new Date().toISOString();
        const updatedSets = ensureSetDetails(e).map((s) =>
          s.setNumber === setNumber
            ? { ...s, completed: !s.completed, completedAt: !s.completed ? stamp : undefined }
            : s
        );
        const allSetsComplete = updatedSets.length > 0 && updatedSets.every((s) => s.completed);
        return {
          ...e,
          setDetails: updatedSets,
          completed: allSetsComplete,
          skipped: false,
          completedAt: allSetsComplete ? stamp : undefined,
        };
      });
    },
    [mutateSessionExercise]
  );

  /** Weight is stored in pounds; callers convert from the display unit. */
  const updateSetWeight = useCallback(
    (routineExerciseId: string, setNumber: number, weight: number) => {
      if (!Number.isFinite(weight) || weight < 0) return;
      mutateSessionExercise(routineExerciseId, (e) => ({
        ...e,
        setDetails: ensureSetDetails(e).map((s) =>
          s.setNumber === setNumber ? { ...s, weight } : s
        ),
      }));
    },
    [mutateSessionExercise]
  );

  const updateSetReps = useCallback(
    (routineExerciseId: string, setNumber: number, reps: number) => {
      if (!Number.isFinite(reps) || reps < 0 || reps > 999) return;
      mutateSessionExercise(routineExerciseId, (e) => ({
        ...e,
        setDetails: ensureSetDetails(e).map((s) =>
          s.setNumber === setNumber ? { ...s, reps: Math.round(reps) } : s
        ),
      }));
    },
    [mutateSessionExercise]
  );

  /** Add a set mid-workout — you don't always stop where the plan said to. */
  const addSetToExercise = useCallback(
    (routineExerciseId: string) => {
      mutateSessionExercise(routineExerciseId, (e) => {
        const sets = ensureSetDetails(e);
        const last = sets[sets.length - 1];
        const next: SetData = {
          setNumber: sets.length + 1,
          reps: last?.reps ?? e.reps,
          weight: last?.weight ?? e.weight,
          completed: false,
        };
        const updated = [...sets, next];
        return {
          ...e,
          sets: updated.length,
          setDetails: updated,
          // A newly added set is unfinished, so the exercise reopens.
          completed: false,
          skipped: false,
          completedAt: undefined,
        };
      });
    },
    [mutateSessionExercise]
  );

  const removeSetFromExercise = useCallback(
    (routineExerciseId: string, setNumber: number) => {
      mutateSessionExercise(routineExerciseId, (e) => {
        const sets = ensureSetDetails(e);
        if (sets.length <= 1) return e;
        const updated = renumber(sets.filter((s) => s.setNumber !== setNumber));
        const allComplete = updated.length > 0 && updated.every((s) => s.completed);
        return {
          ...e,
          sets: updated.length,
          setDetails: updated,
          completed: e.skipped ? e.completed : allComplete,
          completedAt: allComplete ? (e.completedAt ?? new Date().toISOString()) : e.completedAt,
        };
      });
    },
    [mutateSessionExercise]
  );

  /**
   * Persist everything derived from `history` in one place, so a delete and a
   * completion can't drift apart.
   */
  const persistDerived = useCallback(
    (
      nextHistory: WorkoutHistory[],
      derived: {
        performance: PerformanceMap;
        records: PRMap;
        streak: StreakData;
        gamification: GamificationData;
      }
    ) => {
      saveHistoryMutation.mutate(nextHistory);
      historyRef.current = nextHistory;

      setLastPerformance(derived.performance);
      lastPerformanceRef.current = derived.performance;
      void AsyncStorage.setItem(STORAGE_KEYS.LAST_PERFORMANCE, JSON.stringify(derived.performance)).catch(() => {});

      setPersonalRecords(derived.records);
      personalRecordsRef.current = derived.records;
      void AsyncStorage.setItem(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify(derived.records)).catch(() => {});

      saveStreakMutation.mutate(derived.streak);
      streakRef.current = derived.streak;

      setGamification(derived.gamification);
      gamificationRef.current = derived.gamification;
      void AsyncStorage.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(derived.gamification)).catch(() => {});
    },
    [saveHistoryMutation, saveStreakMutation]
  );

  /** Returns true if the session was logged, false if it was discarded. */
  const completeWorkout = useCallback((): boolean => {
    const session = sessionRef.current;
    if (!session) return false;
    // Guard against the celebration overlay and the auto-complete path both
    // firing for the same session.
    if (completedSessionIds.current.has(session.id)) return false;
    completedSessionIds.current.add(session.id);

    const today = getToday();
    const summary = summarizeSession(session, personalRecordsRef.current, { today });

    // Skipping every exercise resolves the session but performs no work, so it
    // must not log a workout, extend the streak or pay out the completion bonus.
    if (summary.completedSets === 0) {
      saveSession(null);
      return false;
    }

    const currentHistory = historyRef.current;
    const currentStreak = streakRef.current;

    const updatedPerf: PerformanceMap = { ...lastPerformanceRef.current, ...summary.performanceUpdates };
    const updatedPRs: PRMap = { ...personalRecordsRef.current, ...summary.prUpdates };

    // ── Streak ──
    const updatedDates = [...new Set([...currentStreak.completedDates, today])].sort();
    const derivedStreak = streakFromDates(updatedDates, today);
    const updatedStreak: StreakData = {
      currentStreak: derivedStreak.currentStreak,
      longestStreak: Math.max(currentStreak.longestStreak, derivedStreak.longestStreak),
      lastWorkoutDate: today,
      completedDates: updatedDates,
    };

    // ── XP + achievements ──
    const currentGamification = gamificationRef.current;
    const xpBreakdown = calculateXPGain(
      summary.completedSets,
      summary.newPRCount,
      summary.totalVolume,
      updatedStreak.currentStreak
    );
    const newTotalXP = currentGamification.totalXP + xpBreakdown.total;
    const previousLevel = currentGamification.level;
    const newLevel = getLevelForXP(newTotalXP);

    const historyEntry: WorkoutHistory = {
      id: generateId(),
      routineId: session.routineId,
      routineName: session.routineName,
      completedAt: new Date().toISOString(),
      exerciseCount: summary.exerciseCount,
      completedExercises: summary.completedExercises,
      skippedExercises: summary.skippedExercises,
      totalSets: summary.totalSets,
      completedSets: summary.completedSets,
      duration: summary.durationMinutes,
      totalVolume: summary.totalVolume,
      muscleGroups: summary.muscleGroups,
      exercises: summary.exercises,
      newPRs: summary.newPRCount,
      xpAwarded: xpBreakdown.total,
    };
    const updatedHistory = [historyEntry, ...currentHistory];

    const achievementCtx = buildAchievementContext(
      updatedHistory,
      updatedStreak,
      updatedPRs,
      newLevel,
      summary.totalVolume,
      summary.newPRCount
    );
    const alreadyUnlockedIds = currentGamification.achievements.map((a) => a.id);
    const newAchievementIds = checkAchievements(achievementCtx, alreadyUnlockedIds);
    const now = new Date().toISOString();

    const xpGainEvent: XPGainEvent = {
      timestamp: now,
      breakdown: xpBreakdown,
      totalGained: xpBreakdown.total,
      leveledUp: newLevel > previousLevel,
      previousLevel,
      newLevel,
      newAchievements: newAchievementIds,
    };

    const updatedGamification: GamificationData = {
      totalXP: newTotalXP,
      level: newLevel,
      achievements: [
        ...currentGamification.achievements,
        ...newAchievementIds.map((id) => ({ id, unlockedAt: now })),
      ],
      lastXPGain: xpGainEvent,
    };

    persistDerived(updatedHistory, {
      performance: updatedPerf,
      records: updatedPRs,
      streak: updatedStreak,
      gamification: updatedGamification,
    });

    if (settingsRef.current.notificationsEnabled) {
      void sendWorkoutCompleteNotification(
        summary.completedExercises,
        summary.durationMinutes,
        summary.newPRCount
      );
      void sendStreakMilestoneNotification(updatedStreak.currentStreak);
      // Already trained today — don't let the 6pm reminder claim otherwise.
      void refreshDailyReminder({ reminderHour: settingsRef.current.reminderHour, trainedToday: true });
    }

    recordPaywallWorkout();
    saveSession(null);
    return true;
  }, [persistDerived, recordPaywallWorkout, saveSession]);

  const cancelWorkout = useCallback(() => {
    saveSession(null);
  }, [saveSession]);

  /**
   * The session as of the most recent mutation, not as of the last render.
   * Callers that react synchronously to a toggle (the completion celebration)
   * would otherwise summarise the session *before* the set they just checked.
   */
  const getLiveSession = useCallback(() => sessionRef.current, []);

  /**
   * Delete a logged workout and rebuild everything derived from history.
   * Without this a single mistyped set permanently poisoned personal records,
   * lifetime volume and achievements with no way to correct it.
   */
  const deleteWorkout = useCallback(
    (workoutId: string) => {
      const nextHistory = historyRef.current.filter((h) => h.id !== workoutId);
      if (nextHistory.length === historyRef.current.length) return;

      const records = rebuildPersonalRecords(nextHistory);
      const performance = rebuildLastPerformance(nextHistory);
      const dates = rebuildCompletedDates(nextHistory);
      const today = getToday();
      const derived = streakFromDates(dates, today);
      const nextStreak: StreakData = {
        currentStreak: derived.currentStreak,
        longestStreak: derived.longestStreak,
        lastWorkoutDate: derived.lastWorkoutDate,
        completedDates: dates,
      };

      // XP replays from what each workout actually awarded. Older entries
      // predate that field, so fall back to recomputing from their totals.
      const totalXP = nextHistory.reduce((sum, w) => {
        if (typeof w.xpAwarded === "number") return sum + w.xpAwarded;
        const sets =
          w.completedSets ??
          w.exercises?.reduce((s, e) => s + e.setsCompleted, 0) ??
          w.exerciseCount * 3;
        return sum + calculateXPGain(sets, w.newPRs ?? 0, w.totalVolume ?? 0, 0).total;
      }, 0);
      const level = getLevelForXP(totalXP);

      // Re-test unlocked achievements: one earned only by the deleted workout
      // should not survive it. Genuinely earned ones keep their original date.
      const ctx = buildAchievementContext(nextHistory, nextStreak, records, level);
      const stillQualifying = new Set(checkAchievements(ctx, []));
      const stillValid = gamificationRef.current.achievements.filter((a) =>
        stillQualifying.has(a.id)
      );

      persistDerived(nextHistory, {
        performance,
        records,
        streak: nextStreak,
        gamification: {
          totalXP,
          level,
          achievements: stillValid,
          lastXPGain: null,
        },
      });
    },
    [persistDerived]
  );

  // ─── Export / reset ───────────────────────────────────────
  const exportData = useCallback(() => {
    const payload = {
      app: "GymPulse",
      schemaVersion: CURRENT_DATA_VERSION,
      exportedAt: new Date().toISOString(),
      weightUnitNote: "All weights are stored in pounds (lbs).",
      profile,
      settings: settingsRef.current,
      routines,
      customExercises,
      history: historyRef.current,
      streak: streakRef.current,
      personalRecords: personalRecordsRef.current,
      lastPerformance: lastPerformanceRef.current,
      gamification: gamificationRef.current,
    };
    return JSON.stringify(payload, null, 2);
  }, [profile, routines, customExercises]);

  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove(ALL_STORAGE_KEYS).catch(() => {});
    completedSessionIds.current.clear();
    setProfile(null);
    setRoutines([]);
    setCustomExercises([]);
    setCurrentSession(null);
    sessionRef.current = null;
    setHistory([]);
    historyRef.current = [];
    setStreak(createDefaultStreak());
    streakRef.current = createDefaultStreak();
    setLastPerformance({});
    lastPerformanceRef.current = {};
    setPersonalRecords({});
    personalRecordsRef.current = {};
    setSettings(DEFAULT_SETTINGS);
    settingsRef.current = DEFAULT_SETTINGS;
    setGamification(DEFAULT_GAMIFICATION);
    gamificationRef.current = DEFAULT_GAMIFICATION;
    setPremium(DEFAULT_PREMIUM);
    premiumRef.current = DEFAULT_PREMIUM;
    await disableAllNotifications().catch(() => {});
    queryClient.clear();
  }, [queryClient]);

  // ─── Computed Data ────────────────────────────────────────

  /**
   * Distinct *days* trained this week, not workout count. The goal is
   * "training days per week", so two sessions in one day used to read as 2/5.
   */
  const getWorkoutsThisWeek = useCallback(() => {
    const startOfWeek = getStartOfWeek(new Date(), settings.weekStartsOn);
    const days = new Set<string>();
    for (const h of history) {
      const d = new Date(h.completedAt);
      if (d.getTime() >= startOfWeek.getTime()) days.add(formatDate(d));
    }
    return days.size;
  }, [history, settings.weekStartsOn]);

  /** Calendar-week aligned counts with real labels for the chart axis. */
  const getWeeklyWorkoutCounts = useCallback(
    (weeks: number) => {
      const result: { count: number; label: string; startDate: string; isCurrent: boolean }[] = [];
      const currentWeekStart = getStartOfWeek(new Date(), settings.weekStartsOn);

      for (let w = weeks - 1; w >= 0; w--) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const count = history.filter((h) => {
          const d = new Date(h.completedAt);
          return d.getTime() >= weekStart.getTime() && d.getTime() < weekEnd.getTime();
        }).length;

        result.push({
          count,
          // "Aug 4" beats "W3" — the old labels named nothing the user could place.
          label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          startDate: formatDate(weekStart),
          isCurrent: w === 0,
        });
      }
      return result;
    },
    [history, settings.weekStartsOn]
  );

  const getVolumeThisWeek = useCallback(() => {
    const startOfWeek = getStartOfWeek(new Date(), settings.weekStartsOn);
    return history
      .filter((h) => new Date(h.completedAt).getTime() >= startOfWeek.getTime())
      .reduce((sum, h) => sum + (h.totalVolume ?? 0), 0);
  }, [history, settings.weekStartsOn]);

  const trainedToday = useMemo(
    () => streak.lastWorkoutDate === getToday(),
    [streak.lastWorkoutDate]
  );

  const refreshData = useCallback(() => {
    // Deliberately excludes ["currentSession"]: refetching it mid-workout can
    // lose the most recent set toggle, because session writes are fire-and-forget.
    void queryClient.invalidateQueries({ queryKey: ["history"] });
    void queryClient.invalidateQueries({ queryKey: ["streak"] });
    void queryClient.invalidateQueries({ queryKey: ["routines"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["personalRecords"] });
    void queryClient.invalidateQueries({ queryKey: ["lastPerformance"] });
    if (!sessionRef.current) {
      void queryClient.invalidateQueries({ queryKey: ["currentSession"] });
    }
  }, [queryClient]);

  return {
    profile,
    routines,
    customExercises,
    allExercises,
    currentSession,
    history,
    streak,
    isLoading,
    trainedToday,
    saveProfile,
    completeOnboarding,
    addRoutine,
    addRoutinesFromTemplates,
    updateRoutine,
    deleteRoutine,
    reorderRoutine,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
    reorderExerciseInRoutine,
    addCustomExercise,
    deleteCustomExercise,
    startWorkout,
    toggleExerciseComplete,
    skipExercise,
    toggleSetComplete,
    updateSetWeight,
    updateSetReps,
    addSetToExercise,
    removeSetFromExercise,
    completeWorkout,
    cancelWorkout,
    getLiveSession,
    deleteWorkout,
    exportData,
    clearAllData,
    getWorkoutsThisWeek,
    getWeeklyWorkoutCounts,
    getVolumeThisWeek,
    refreshData,
    lastPerformance,
    personalRecords,
    settings,
    updateSettings,
    gamification,
    premium,
    subscribeToPlan,
    dismissPaywall,
    shouldShowPaywall,
  };
}

export type { WeightUnit };
