import { useState, useEffect, useCallback, useMemo } from "react";
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
      return stored ? (JSON.parse(stored) as WorkoutSession) : null;
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
      return stored ? (JSON.parse(stored) as StreakData) : createDefaultStreak();
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

  const saveSessionMutation = useMutation({
    mutationFn: async (s: WorkoutSession | null) => {
      if (s) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(s));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
      }
      return s;
    },
    onSuccess: (s) => {
      setCurrentSession(s);
    },
  });

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
        })),
        startedAt: new Date().toISOString(),
        isComplete: false,
      };
      saveSessionMutation.mutate(session);
      return session;
    },
    [saveSessionMutation]
  );

  const toggleExerciseComplete = useCallback(
    (routineExerciseId: string) => {
      if (!currentSession) return false;
      const updatedExercises = currentSession.exercises.map((e) =>
        e.routineExerciseId === routineExerciseId
          ? { ...e, completed: !e.completed, completedAt: !e.completed ? new Date().toISOString() : undefined }
          : e
      );
      const allComplete = updatedExercises.every((e) => e.completed);
      const updatedSession: WorkoutSession = {
        ...currentSession,
        exercises: updatedExercises,
        isComplete: allComplete,
        completedAt: allComplete ? new Date().toISOString() : undefined,
      };
      saveSessionMutation.mutate(updatedSession);
      return allComplete;
    },
    [currentSession, saveSessionMutation]
  );

  const completeWorkout = useCallback(() => {
    if (!currentSession) return;

    const startTime = new Date(currentSession.startedAt).getTime();
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 60000);

    const historyEntry: WorkoutHistory = {
      id: generateId(),
      routineId: currentSession.routineId,
      routineName: currentSession.routineName,
      completedAt: new Date().toISOString(),
      exerciseCount: currentSession.exercises.length,
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
      // already counted
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

    saveSessionMutation.mutate(null);
  }, [currentSession, history, streak, saveHistoryMutation, saveStreakMutation, saveSessionMutation]);

  const cancelWorkout = useCallback(() => {
    saveSessionMutation.mutate(null);
  }, [saveSessionMutation]);

  const getWorkoutsThisWeek = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    return history.filter((h) => new Date(h.completedAt) >= startOfWeek).length;
  }, [history]);

  const getWeeklyWorkoutCounts = useCallback(
    (weeks: number) => {
      const counts: number[] = [];
      const now = new Date();
      for (let w = weeks - 1; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (w + 1) * 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - w * 7);
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
    completeWorkout,
    cancelWorkout,
    getWorkoutsThisWeek,
    getWeeklyWorkoutCounts,
  };
}
