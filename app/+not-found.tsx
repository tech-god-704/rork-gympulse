import React, { useMemo } from "react";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Text style={styles.subtitle}>
          The link you followed doesn&apos;t point anywhere in GymPulse.
        </Text>

        <Link href="/" style={styles.link} accessibilityRole="link">
          <Text style={styles.linkText}>Back to Today</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center" as const,
    marginTop: 8,
    lineHeight: 20,
  },
  link: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primary,
  },
});
