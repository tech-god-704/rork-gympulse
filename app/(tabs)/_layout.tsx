import { Tabs } from "expo-router";
import { Home, List, BarChart3, User, type LucideIcon } from "lucide-react-native";
import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";
import ActiveWorkoutBar from "@/components/ActiveWorkoutBar";
import { fontFamilyFor } from "@/constants/typography";

/** v4 tab icon: the active tab sits on a soft primary pill. */
function TabIcon({ Icon, color, focused, tint }: { Icon: LucideIcon; color: string; focused: boolean; tint: string }) {
  return (
    <View style={[tabStyles.pill, focused && { backgroundColor: tint }]}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  pill: { width: 58, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
});

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primaryText,
          tabBarInactiveTintColor: colors.textTertiary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.separator,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingTop: 10,
            // Was a hardcoded 80px, which floated above the home indicator on
            // newer iPhones and left a dead band on gesture-nav Android.
            paddingBottom: insets.bottom,
            height: 68 + insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: fontFamilyFor("700"),
            fontWeight: fontFamilyFor("700") ? ("normal" as const) : ("700" as const),
            marginTop: 3,
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
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} color={color} focused={focused} tint={colors.primaryTint} />,
          }}
        />
        <Tabs.Screen
          name="routines"
          options={{
            title: "Routines",
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={List} color={color} focused={focused} tint={colors.primaryTint} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={BarChart3} color={color} focused={focused} tint={colors.primaryTint} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={User} color={color} focused={focused} tint={colors.primaryTint} />,
          }}
        />
      </Tabs>
      <ActiveWorkoutBar />
    </View>
  );
}
