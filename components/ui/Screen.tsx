import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/ThemeProvider";

interface Props {
  children: React.ReactNode;
  /** Apply the top safe-area inset. Off for screens under a native header. */
  topInset?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Root container: themed background plus consistent safe-area handling. */
export default function Screen({ children, topInset = true, style }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topInset ? insets.top : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
