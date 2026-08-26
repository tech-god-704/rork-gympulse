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
  const { profile, isLoading, premium } = useGym();
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const hasShownPostOnboardingPaywall = React.useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const onOnboarding = segments[0] === "onboarding";
    const needsOnboarding = !profile?.onboardingComplete;

    if (needsOnboarding && !onOnboarding) {
      router.replace("/onboarding");
    } else if (!needsOnboarding && onOnboarding) {
      // After onboarding completes, show paywall if not premium
      if (!premium.isPremium && !hasShownPostOnboardingPaywall.current) {
        hasShownPostOnboardingPaywall.current = true;
        router.replace("/(tabs)/(home)");
        // Small delay to let the home screen mount first
        setTimeout(() => router.push("/paywall"), 500);
      } else {
        router.replace("/(tabs)/(home)");
      }
    }
  }, [isLoading, profile, segments, router, premium]);

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal", gestureEnabled: true }} />
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
