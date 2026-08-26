import { Tabs } from "expo-router";
import { Home, LayoutGrid, BarChart3, User } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";
import ActiveWorkoutBar from "@/components/ActiveWorkoutBar";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
            paddingTop: 6,
            // Was a hardcoded 80px, which floated above the home indicator on
            // newer iPhones and left a dead band on gesture-nav Android.
            paddingBottom: insets.bottom,
            height: 58 + insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600" as const,
            letterSpacing: 0.3,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: "Today",
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: "Routines",
            tabBarIcon: ({ color }) => <LayoutGrid size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => <User size={22} color={color} />,
          }}
        />
      </Tabs>
      <ActiveWorkoutBar />
    </View>
  );
}
