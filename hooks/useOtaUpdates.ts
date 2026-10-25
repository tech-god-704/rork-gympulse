import { useEffect } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

/**
 * Over-the-air updates (EAS Update). Each time the app comes back to the foreground it checks for
 * a newer JavaScript bundle on its channel and downloads it in the background; once one is ready,
 * the app restarts into it the next time the user returns to it, so a session is never cut short.
 * Does nothing in development or in builds without expo-updates enabled.
 */
export function useOtaUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let checking = false;
    let ready = false;

    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        if (ready) {
          await Updates.reloadAsync();
          return;
        }
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          ready = true;
        }
      } catch {
        // Offline or the update server is unreachable; try again next time.
      } finally {
        checking = false;
      }
    };

    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, []);
}
