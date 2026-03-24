import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GymProvider, useGym } from "@/providers/GymProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { profile, isLoading } = useGym();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const onOnboarding = segments[0] === "onboarding";
    const needsOnboarding = !profile?.onboardingComplete;

    if (needsOnboarding && !onOnboarding) {
      router.replace("/onboarding");
    } else if (!needsOnboarding && onOnboarding) {
      router.replace("/(tabs)/(home)");
    }
  }, [isLoading, profile, segments, router]);

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GymProvider>
          <ThemeProvider>
            <ThemedStatusBar />
            <RootLayoutNav />
          </ThemeProvider>
        </GymProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
