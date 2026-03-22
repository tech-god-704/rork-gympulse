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
};

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
  const [isLoading, setIsLoading] = useState(true);

  // Use ref for currentSession to avoid stale closure in rapid toggles
  const sessionRef = useRef<WorkoutSession | null>(null);
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

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
      // Recalculate streak on load (decay if missed days)
      return recalculateStreak(data);
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
    const allDone =
      !profileQuery.isLoading &&
      !routinesQuery.isLoading &&
      !customExQuery.isLoading &&
      !sessionQuery.isLoading &&
      !historyQuery.isLoading &&
      !streakQuery.isLoading;
    if (allDone) setIsLoading(false);
  }, [
    profileQuery.isLoading,
    routinesQuery.isLoading,
    customExQuery.isLoading,
    sessionQuery.isLoading,
    historyQuery.isLoading,
    streakQuery.isLoading,
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
        exercises: routine.exercises.map((e) => ({
          routineExerciseId: e.id,
          exerciseName: e.exerciseName,
          muscleGroup: e.muscleGroup,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          completed: false,
          setDetails: Array.from({ length: e.sets }, (_, i) => ({
            setNumber: i + 1,
            reps: e.reps,
            weight: e.weight,
            completed: false,
          })),
        })),
        startedAt: new Date().toISOString(),
        isComplete: false,
      };
      saveSession(session);
      return session;
    },
    [saveSession]
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

    const updatedHistory = [historyEntry, ...history];
    saveHistoryMutation.mutate(updatedHistory);

    const today = getToday();
    const updatedDates = streak.completedDates.includes(today)
      ? streak.completedDates
      : [...streak.completedDates, today];

    let newStreak = streak.currentStreak;
    const yesterday = formatDate(new Date(Date.now() - 86400000));

    if (streak.lastWorkoutDate === today) {
      // already counted today
    } else if (streak.lastWorkoutDate === yesterday || streak.lastWorkoutDate === null) {
      newStreak = streak.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(streak.longestStreak, newStreak);
    const updatedStreak: StreakData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastWorkoutDate: today,
      completedDates: updatedDates,
    };
    saveStreakMutation.mutate(updatedStreak);

    saveSession(null);
  }, [history, streak, saveHistoryMutation, saveStreakMutation, saveSession]);

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
  };
}
