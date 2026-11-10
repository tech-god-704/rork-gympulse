import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useGym } from "@/providers/GymProvider";
import { useDialog } from "@/components/ui/Dialog";
import { haptic } from "@/utils/haptics";
import type { Routine } from "@/types";

/**
 * Start a routine from anywhere outside the Today tab, then jump to the live
 * workout. Asks first if another workout is already running.
 */
export function useStartWorkout() {
  const router = useRouter();
  const dialog = useDialog();
  const { startWorkout, currentSession } = useGym();

  return useCallback(
    (routine: Routine) => {
      const begin = () => {
        if (!startWorkout(routine)) {
          dialog.alert("Nothing to do yet", "Add at least one exercise to this routine before starting it.");
          return;
        }
        haptic.medium();
        router.push("/(tabs)/(home)");
      };
      if (currentSession) {
        dialog.confirm({
          title: "Workout in progress",
          message: `“${currentSession.routineName}” is still running. Starting a new one discards it.`,
          cancelLabel: "Keep current",
          confirmLabel: "Discard & start",
          destructive: true,
          onConfirm: begin,
        });
        return;
      }
      begin();
    },
    [startWorkout, currentSession, dialog, router],
  );
}
