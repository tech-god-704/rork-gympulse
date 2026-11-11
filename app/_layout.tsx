import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { GymProvider, useGym } from "@/providers/GymProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { useOtaUpdates } from "@/hooks/useOtaUpdates";
import { DialogProvider } from "@/components/ui/Dialog";
import { APP_FONTS, setFontsReady } from "@/constants/typography";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Shown instead of a blank screen if a render error escapes. It sits outside
 * the theme provider, so it uses fixed colors.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.body}>Your workouts are saved on this device. Try again, and if it keeps happening, restart the app.</Text>
      <Pressable onPress={() => void retry()} style={errorStyles.button} accessibilityRole="button">
        <Text style={errorStyles.buttonText}>Try again</Text>
      </Pressable>
      {__DEV__ && <Text style={errorStyles.detail}>{error.message}</Text>}
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07080B", alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6, color: "#F4F5F7", textAlign: "center" },
  body: { fontSize: 15, fontWeight: "500", lineHeight: 22, color: "#8C919B", textAlign: "center", maxWidth: 300 },
  button: { height: 52, paddingHorizontal: 28, borderRadius: 18, backgroundColor: "#2F6BEA", alignItems: "center", justifyContent: "center", marginTop: 14 },
  buttonText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  detail: { fontSize: 12, color: "#8C919B", marginTop: 16, textAlign: "center" },
});

function RootLayoutNav() {
  const { profile, isLoading, premium } = useGym();
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const hasShownPostOnboardingPaywall = React.useRef(false);
  useOtaUpdates();

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
      <Stack.Screen name="exercise/index" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="exercise/[slug]" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  // If the font files fail to load, carry on in the system font rather than block the app.
  if (fontsLoaded) setFontsReady(true);
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GymProvider>
          <ThemeProvider>
            <DialogProvider>
              <ThemedStatusBar />
              <RootLayoutNav />
            </DialogProvider>
          </ThemeProvider>
        </GymProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
