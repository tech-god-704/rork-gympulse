import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Text button at the top right. Defaults to "Done", which closes the sheet. */
  actionLabel?: string;
  onAction?: () => void;
  /** Wrap the content in a ScrollView. Turn off for fixed layouts like a keypad. */
  scroll?: boolean;
  children: React.ReactNode;
}

const SCREEN_H = Dimensions.get("window").height;

/**
 * The app's bottom sheet: the backdrop fades while the sheet springs up, and
 * it can be dragged down by its header to dismiss.
 */
export default function Sheet({ visible, onClose, title, eyebrow, actionLabel = "Done", onAction, scroll = true, children }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  // Keep showing the last content while the sheet animates away.
  const content = useRef(children);
  const header = useRef({ title, eyebrow, actionLabel });
  if (visible) {
    content.current = children;
    header.current = { title, eyebrow, actionLabel };
  }

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.setValue(0);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 24, stiffness: 260, mass: 0.9 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false),
      );
    }
  }, [visible, progress, drag]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) closeRef.current();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;

  if (!mounted) return null;

  const translateY = Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H * 0.7, 0] }), drag);
  const h = header.current;
  const bottomPad = Math.max(insets.bottom, 16) + 12;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View {...pan.panHandlers}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <View style={styles.head}>
              <View style={styles.headText}>
                {h.eyebrow ? <Text style={styles.eyebrow}>{h.eyebrow}</Text> : null}
                {h.title ? <Text style={styles.title} numberOfLines={1}>{h.title}</Text> : null}
              </View>
              <Pressable onPress={onAction ?? onClose} style={styles.action} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.actionText}>{h.actionLabel}</Text>
              </Pressable>
            </View>
          </View>
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.body, { paddingBottom: bottomPad }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {content.current}
            </ScrollView>
          ) : (
            <View style={[styles.body, { paddingBottom: bottomPad }]}>{content.current}</View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    scrim: { backgroundColor: colors.scheme === "dark" ? "rgba(0,0,0,0.66)" : "rgba(9,12,20,0.42)" },
    sheet: {
      maxHeight: "90%",
      backgroundColor: colors.sheet,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      borderWidth: colors.scheme === "dark" ? StyleSheet.hairlineWidth : 0,
      borderBottomWidth: 0,
      borderColor: colors.separator,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 24,
    },
    handleRow: { alignItems: "center", paddingTop: 10 },
    handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.fillStrong },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 8, paddingBottom: 10, paddingLeft: 22, paddingRight: 14 },
    headText: { flex: 1, minWidth: 0, gap: 2 },
    eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase", color: colors.textTertiary },
    title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.text },
    action: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    actionText: { fontSize: 14, fontWeight: "800", color: colors.primaryText },
    body: { paddingHorizontal: 22, paddingTop: 4, gap: 14 },
  });
