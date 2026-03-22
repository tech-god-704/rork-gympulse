import { Stack } from "expo-router";
import React from "react";

export default function RoutinesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[routineId]" options={{ presentation: "card" }} />
    </Stack>
  );
}
