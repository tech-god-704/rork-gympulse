import React, { useMemo } from "react";
import { router } from "expo-router";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";

export default function ModalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible
      onRequestClose={() => router.back()}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <View style={styles.modalContent}>
          <Text style={styles.title}>Nothing here yet</Text>
          <Text style={styles.description}>
            This screen is a placeholder. Head back to keep training.
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 24,
    margin: 20,
    alignItems: "center",
    minWidth: 280,
  },
  title: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  description: {
    textAlign: "center" as const,
    marginBottom: 22,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 120,
    minHeight: 48,
    justifyContent: "center",
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: "700" as const,
    fontSize: 15,
    textAlign: "center" as const,
  },
});
