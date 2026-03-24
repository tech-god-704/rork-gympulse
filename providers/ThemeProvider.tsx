import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { LightColors, DarkColors, type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useGym();
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    let isDark = false;
    if (settings.theme === "dark") {
      isDark = true;
    } else if (settings.theme === "system") {
      isDark = systemScheme === "dark";
    }
    return {
      colors: isDark ? DarkColors : LightColors,
      isDark,
    };
  }, [settings.theme, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
