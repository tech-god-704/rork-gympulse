import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { haptic } from "@/utils/haptics";

interface DialogOptions {
  title: string;
  message?: string;
  /** Label for the main button. Defaults to "OK". */
  confirmLabel?: string;
  /** When set, a second button is shown that just closes the dialog. */
  cancelLabel?: string;
  /** Style the main button as a destructive action. */
  destructive?: boolean;
  onConfirm?: () => void;
}

interface DialogApi {
  /** Ask before doing something: shows Cancel plus the confirm button. */
  confirm: (options: DialogOptions) => void;
  /** Tell the user something: a single OK button. */
  alert: (title: string, message?: string) => void;
}

const DialogContext = createContext<DialogApi>({ confirm: () => {}, alert: () => {} });

export function useDialog(): DialogApi {
  return useContext(DialogContext);
}

/**
 * In-app dialogs in the app's own style. Replaces the system alert, which
 * ignores the theme and does nothing at all on web.
 */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!options) return;
    setVisible(true);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300, mass: 0.8 }).start();
  }, [options, progress]);

  const close = useCallback(
    (then?: () => void) => {
      Animated.timing(progress, { toValue: 0, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setVisible(false);
        setOptions(null);
        then?.();
      });
    },
    [progress],
  );

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (o) => setOptions({ cancelLabel: "Cancel", ...o }),
      alert: (title, message) => setOptions({ title, message }),
    }),
    [],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
        <View style={styles.root}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Dismiss" />
          </Animated.View>
          {options && (
            <Animated.View
              style={[
                styles.card,
                { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
              ]}
              accessibilityRole="alert"
            >
              <Text style={styles.title}>{options.title}</Text>
              {options.message ? <Text style={styles.message}>{options.message}</Text> : null}
              <View style={styles.actions}>
                {options.cancelLabel ? (
                  <Pressable style={({ pressed }) => [styles.btn, styles.cancel, pressed && styles.pressed]} onPress={() => close()} accessibilityRole="button">
                    <Text style={styles.cancelText}>{options.cancelLabel}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={({ pressed }) => [styles.btn, { backgroundColor: options.destructive ? colors.errorFill : colors.primaryFill }, pressed && styles.pressed]}
                  onPress={() => {
                    if (options.destructive) haptic.warning();
                    else haptic.light();
                    close(options.onConfirm);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText}>{options.confirmLabel ?? "OK"}</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    scrim: { backgroundColor: colors.scheme === "dark" ? "rgba(0,0,0,0.7)" : "rgba(9,12,20,0.45)" },
    card: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.sheet,
      borderRadius: 28,
      padding: 22,
      gap: 8,
      borderWidth: colors.scheme === "dark" ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.separator,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.24,
      shadowRadius: 32,
      elevation: 24,
    },
    title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, lineHeight: 26, color: colors.text },
    message: { fontSize: 15, fontWeight: "500", lineHeight: 22, color: colors.textSecondary },
    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    btn: { flex: 1, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.8 },
    cancel: { backgroundColor: colors.fill },
    cancelText: { fontSize: 15, fontWeight: "700", color: colors.text },
    confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  });
