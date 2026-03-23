import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
} from "@/types";
import { BUILT_IN_EXERCISES, STARTER_ROUTINES } from "@/mocks/exercises";
import { generateId, getToday, formatDate } from "@/utils/helpers";

const STORAGE_KEYS = {
  PROFILE: "gympulse_profile",
  ROUTINES: "gympulse_routines",
  CUSTOM_EXERCISES: "gympulse_custom_exercises",
  CURRENT_SESSION: "gympulse_current_session",
  HISTORY: "gympulse_history",
  STREAK: "gympulse_streak",
  LAST_PERFORMANCE: "gympulse_last_performance",
  PERSONAL_RECORDS: "gympulse_personal_records",
};

// Per-exercise last performance data
interface ExercisePerformance {
  sets: { weight: number; reps: number }[];
  date: string;
}

// Personal record per exercise
interface PersonalRecord {
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
}

type PerformanceMap = Record<string, ExercisePerformance>;
type PRMap = Record<string, PersonalRecord>;

function createDefaultStreak(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null, completedDates: [] };
}

// Calculate what the streak should be right now (decays if user missed days)
function recalculateStreak(streakData: StreakData): StreakData {
  if (!streakData.lastWorkoutDate) return streakData;
  const today = getToday();
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  // If last workout was today or yesterday, streak is still alive
  if (streakData.lastWorkoutDate === today || streakData.lastWorkoutDate === yesterday) {
    return streakData;
  }
  // Streak is broken - reset to 0
  return {
    ...streakData,
    currentStreak: 0,
  };
}

// Ensure setDetails exists on a session exercise (backwards compat)
function ensureSetDetails(exercise: {
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
  setDetails?: SetData[];
}): SetData[] {
  if (exercise.setDetails && exercise.setDetails.length > 0) {
    return exercise.setDetails;
  }
  return Array.from({ length: exercise.sets }, (_, i) => ({
    setNumber: i + 1,
    reps: exercise.reps,
    weight: exercise.weight,
    completed: exercise.completed, // sync with exercise-level state
  }));
}

// Get start of calendar week (Sunday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
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
  const [isLoading, setIsLoading] = useState(true);

  // Use refs for values accessed in rapid-fire callbacks to avoid stale closures
  const sessionRef = useRef<WorkoutSession | null>(null);
  const historyRef = useRef<WorkoutHistory[]>([]);
  const streakRef = useRef<StreakData>(createDefaultStreak());
  const lastPerformanceRef = useRef<PerformanceMap>({});
  const personalRecordsRef = useRef<PRMap>({});

  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { lastPerformanceRef.current = lastPerformance; }, [lastPerformance]);
  useEffect(() => { personalRecordsRef.current = personalRecords; }, [personalRecords]);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      return stored ? (JSON.parse(stored) as UserProfile) : null;
    },
  });

  const routinesQuery = useQuery({
    queryKey: ["routines"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
      return stored ? (JSON.parse(stored) as Routine[]) : [];
    },
  });

  const customExQuery = useQuery({
    queryKey: ["customExercises"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
      return stored ? (JSON.parse(stored) as Exercise[]) : [];
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["currentSession"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
      if (!stored) return null;
      const session = JSON.parse(stored) as WorkoutSession;
      // Migrate: ensure all exercises have setDetails
      session.exercises = session.exercises.map((e) => ({
        ...e,
        setDetails: ensureSetDetails(e),
      }));
      return session;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      return stored ? (JSON.parse(stored) as WorkoutHistory[]) : [];
    },
  });

  const streakQuery = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
      const data = stored ? (JSON.parse(stored) as StreakData) : createDefaultStreak();
      return recalculateStreak(data);
    },
  });

  const perfQuery = useQuery({
    queryKey: ["lastPerformance"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PERFORMANCE);
      return stored ? (JSON.parse(stored) as PerformanceMap) : {};
    },
  });

  const prQuery = useQuery({
    queryKey: ["personalRecords"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PERSONAL_RECORDS);
      return stored ? (JSON.parse(stored) as PRMap) : {};
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
    const allDone =
      !profileQuery.isLoading &&
      !routinesQuery.isLoading &&
      !customExQuery.isLoading &&
      !sessionQuery.isLoading &&
      !historyQuery.isLoading &&
      !streakQuery.isLoading &&
      !perfQuery.isLoading &&
      !prQuery.isLoading;
    if (allDone) setIsLoading(false);
  }, [
    profileQuery.isLoading,
    routinesQuery.isLoading,
    customExQuery.isLoading,
    sessionQuery.isLoading,
    historyQuery.isLoading,
    streakQuery.isLoading,
    perfQuery.isLoading,
    prQuery.isLoading,
  ]);

  // ─── Mutations ────────────────────────────────────────────
  const saveProfileMutation = useMutation({
    mutationFn: async (p: UserProfile) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p));
      return p;
    },
    onSuccess: (p) => {
      setProfile(p);
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const saveRoutinesMutation = useMutation({
    mutationFn: async (r: Routine[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(r));
      return r;
    },
    onSuccess: (r) => {
      setRoutines(r);
    },
  });

  const saveCustomExMutation = useMutation({
    mutationFn: async (e: Exercise[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(e));
      return e;
    },
    onSuccess: (e) => {
      setCustomExercises(e);
    },
  });

  // For session, update state immediately (optimistic) to prevent stale closures
  const saveSession = useCallback(
    (s: WorkoutSession | null) => {
      setCurrentSession(s);
      sessionRef.current = s;
      // Fire async save
      if (s) {
        void AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(s));
      } else {
        void AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      }
    },
    []
  );

  const saveHistoryMutation = useMutation({
    mutationFn: async (h: WorkoutHistory[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(h));
      return h;
    },
    onSuccess: (h) => {
      setHistory(h);
    },
  });

  const saveStreakMutation = useMutation({
    mutationFn: async (s: StreakData) => {
      await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(s));
      return s;
    },
    onSuccess: (s) => {
      setStreak(s);
    },
  });

  // ─── Actions ──────────────────────────────────────────────
  const saveProfile = useCallback(
    (p: UserProfile) => {
      saveProfileMutation.mutate(p);
    },
    [saveProfileMutation]
  );

  const completeOnboarding = useCallback(
    (p: UserProfile) => {
      saveProfile(p);
      const starterRoutines: Routine[] = STARTER_ROUTINES.map((sr) => ({
        id: generateId(),
        name: sr.name,
        exercises: sr.exercises.map((e) => ({
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
      saveRoutinesMutation.mutate(starterRoutines);
    },
    [saveProfile, saveRoutinesMutation]
  );

  const addRoutine = useCallback(
    (name: string) => {
      const newRoutine: Routine = {
        id: generateId(),
        name,
        exercises: [],
        createdAt: new Date().toISOString(),
      };
      const updated = [...routines, newRoutine];
      saveRoutinesMutation.mutate(updated);
      return newRoutine;
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

  const addCustomExercise = useCallback(
    (name: string, muscleGroup: MuscleGroup) => {
      const ex: Exercise = { id: generateId(), name, muscleGroup, isCustom: true };
      const updated = [...customExercises, ex];
      saveCustomExMutation.mutate(updated);
      return ex;
    },
    [customExercises, saveCustomExMutation]
  );

  const allExercises = useMemo(() => {
    return [...BUILT_IN_EXERCISES, ...customExercises];
  }, [customExercises]);

  const startWorkout = useCallback(
    (routine: Routine) => {
      const session: WorkoutSession = {
        id: generateId(),
        routineId: routine.id,
        routineName: routine.name,
        exercises: routine.exercises.map((e) => {
          // Auto-fill from previous performance if available
          const prev = lastPerformance[e.exerciseName];
          return {
            routineExerciseId: e.id,
            exerciseName: e.exerciseName,
            muscleGroup: e.muscleGroup,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            completed: false,
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
    [saveSession, lastPerformance]
  );

  // Toggle exercise complete — also syncs setDetails
  const toggleExerciseComplete = useCallback(
    (routineExerciseId: string) => {
      const session = sessionRef.current;
      if (!session) return false;
      const updatedExercises = session.exercises.map((e) => {
        if (e.routineExerciseId !== routineExerciseId) return e;
        const newCompleted = !e.completed;
        // Sync setDetails with exercise-level toggle
        const updatedSets = ensureSetDetails(e).map((s) => ({
          ...s,
          completed: newCompleted,
        }));
        return {
          ...e,
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : undefined,
          setDetails: updatedSets,
        };
      });
      const allComplete = updatedExercises.every((ex) => ex.completed);
      const updatedSession: WorkoutSession = {
        ...session,
        exercises: updatedExercises,
        isComplete: allComplete,
        completedAt: allComplete ? new Date().toISOString() : undefined,
      };
      saveSession(updatedSession);
      return allComplete;
    },
    [saveSession]
  );

  // Toggle individual set complete
  const toggleSetComplete = useCallback(
    (routineExerciseId: string, setNumber: number) => {
      const session = sessionRef.current;
      if (!session) return false;
      const updatedExercises = session.exercises.map((e) => {
        if (e.routineExerciseId !== routineExerciseId) return e;
        const sets = ensureSetDetails(e);
        const updatedSets = sets.map((s) =>
          s.setNumber === setNumber ? { ...s, completed: !s.completed } : s
        );
        const allSetsComplete = updatedSets.length > 0 && updatedSets.every((s) => s.completed);
        return {
          ...e,
          setDetails: updatedSets,
          completed: allSetsComplete,
          completedAt: allSetsComplete ? new Date().toISOString() : undefined,
        };
      });
      const allComplete = updatedExercises.every((ex) => ex.completed);
      const updatedSession: WorkoutSession = {
        ...session,
        exercises: updatedExercises,
        isComplete: allComplete,
        completedAt: allComplete ? new Date().toISOString() : undefined,
      };
      saveSession(updatedSession);
      return allComplete;
    },
    [saveSession]
  );

  // Update weight for a specific set
  const updateSetWeight = useCallback(
    (routineExerciseId: string, setNumber: number, weight: number) => {
      const session = sessionRef.current;
      if (!session) return;
      const updatedExercises = session.exercises.map((e) => {
        if (e.routineExerciseId !== routineExerciseId) return e;
        const sets = ensureSetDetails(e);
        const updatedSets = sets.map((s) =>
          s.setNumber === setNumber ? { ...s, weight } : s
        );
        return { ...e, setDetails: updatedSets };
      });
      const updatedSession: WorkoutSession = {
        ...session,
        exercises: updatedExercises,
      };
      saveSession(updatedSession);
    },
    [saveSession]
  );

  const completeWorkout = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    const startTime = new Date(session.startedAt).getTime();
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 60000);

    const historyEntry: WorkoutHistory = {
      id: generateId(),
      routineId: session.routineId,
      routineName: session.routineName,
      completedAt: new Date().toISOString(),
      exerciseCount: session.exercises.length,
      duration,
    };

    // Use refs for latest values (avoids stale closure)
    const currentHistory = historyRef.current;
    const currentStreak = streakRef.current;
    const currentPerf = lastPerformanceRef.current;
    const currentPRs = personalRecordsRef.current;

    const updatedHistory = [historyEntry, ...currentHistory];
    saveHistoryMutation.mutate(updatedHistory);

    // Save per-exercise performance for auto-fill next time
    const updatedPerf = { ...currentPerf };
    const updatedPRs = { ...currentPRs };
    const today = getToday();

    session.exercises.forEach((ex) => {
      const sets = ensureSetDetails(ex);
      const completedSets = sets.filter((s) => s.completed);
      if (completedSets.length > 0) {
        updatedPerf[ex.exerciseName] = {
          sets: completedSets.map((s) => ({ weight: s.weight, reps: s.reps })),
          date: today,
        };
        // Check for PR (Epley formula: 1RM = weight * (1 + reps/30))
        completedSets.forEach((s) => {
          if (s.weight > 0) {
            const estimated1RM = s.weight * (1 + s.reps / 30);
            const existingPR = updatedPRs[ex.exerciseName];
            if (!existingPR || estimated1RM > existingPR.estimated1RM) {
              updatedPRs[ex.exerciseName] = {
                weight: s.weight,
                reps: s.reps,
                estimated1RM,
                date: today,
              };
            }
          }
        });
      }
    });

    setLastPerformance(updatedPerf);
    setPersonalRecords(updatedPRs);
    void AsyncStorage.setItem(STORAGE_KEYS.LAST_PERFORMANCE, JSON.stringify(updatedPerf));
    void AsyncStorage.setItem(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify(updatedPRs));

    // Update streak
    const updatedDates = currentStreak.completedDates.includes(today)
      ? currentStreak.completedDates
      : [...currentStreak.completedDates, today];

    let newStreak = currentStreak.currentStreak;
    const yesterday = formatDate(new Date(Date.now() - 86400000));

    if (currentStreak.lastWorkoutDate === today) {
      // already counted today
    } else if (currentStreak.lastWorkoutDate === yesterday || currentStreak.lastWorkoutDate === null) {
      newStreak = currentStreak.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(currentStreak.longestStreak, newStreak);
    const updatedStreak: StreakData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastWorkoutDate: today,
      completedDates: updatedDates,
    };
    saveStreakMutation.mutate(updatedStreak);

    saveSession(null);
  }, [saveHistoryMutation, saveStreakMutation, saveSession]);

  const cancelWorkout = useCallback(() => {
    saveSession(null);
  }, [saveSession]);

  // ─── Computed Data ────────────────────────────────────────
  const getWorkoutsThisWeek = useCallback(() => {
    const startOfWeek = getStartOfWeek(new Date());
    return history.filter((h) => new Date(h.completedAt) >= startOfWeek).length;
  }, [history]);

  // Calendar-week aligned weekly counts
  const getWeeklyWorkoutCounts = useCallback(
    (weeks: number) => {
      const counts: number[] = [];
      const currentWeekStart = getStartOfWeek(new Date());

      for (let w = weeks - 1; w >= 0; w--) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const count = history.filter((h) => {
          const d = new Date(h.completedAt);
          return d >= weekStart && d < weekEnd;
        }).length;
        counts.push(count);
      }
      return counts;
    },
    [history]
  );

  // Invalidate queries for pull-to-refresh
  const refreshData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["history"] });
    void queryClient.invalidateQueries({ queryKey: ["streak"] });
    void queryClient.invalidateQueries({ queryKey: ["routines"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["currentSession"] });
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
    saveProfile,
    completeOnboarding,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
    addCustomExercise,
    startWorkout,
    toggleExerciseComplete,
    toggleSetComplete,
    updateSetWeight,
    completeWorkout,
    cancelWorkout,
    getWorkoutsThisWeek,
    getWeeklyWorkoutCounts,
    refreshData,
    lastPerformance,
    personalRecords,
  };
}
