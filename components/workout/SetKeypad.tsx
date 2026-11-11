import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Delete } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import Sheet from "@/components/ui/Sheet";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { WeightUnit } from "@/types";
import { fromDisplayWeight, toDisplayWeight, trimNumber } from "@/utils/units";
import { haptic } from "@/utils/haptics";
import type { SetField } from "@/components/ExerciseCard";

export interface KeypadTarget {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  field: SetField;
  /** Stored pounds. */
  weight: number;
  reps: number;
  /** Later sets that aren't done yet, which the change can carry to. */
  followingSets: number;
}

interface Props {
  target: KeypadTarget | null;
  weightUnit: WeightUnit;
  onClose: () => void;
  /** Weight is passed back in stored pounds. Only changed values are included. */
  onCommit: (target: KeypadTarget, patch: { weight?: number; reps?: number }, applyToFollowing: boolean) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;
const MAX_LEN = 6;

/**
 * Purpose-built keypad for logging a set. Bigger keys than the system
 * keyboard, jump buttons for the common plate changes, and one tap to move
 * from weight to reps.
 */
export default function SetKeypad({ target, weightUnit, onClose, onCommit }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [field, setField] = useState<SetField>("weight");
  const [weight, setWeight] = useState("0");
  const [reps, setReps] = useState("0");
  // The first key after opening or switching replaces the value instead of appending.
  const [fresh, setFresh] = useState(true);
  const [carry, setCarry] = useState(true);

  useEffect(() => {
    if (!target) return;
    setField(target.field);
    setWeight(trimNumber(toDisplayWeight(target.weight, weightUnit)));
    setReps(String(target.reps));
    setFresh(true);
    // A new working weight usually applies to the rest of the sets; a rep count
    // usually describes just the set you did.
    setCarry(target.field === "weight");
  }, [target, weightUnit]);

  const value = field === "weight" ? weight : reps;
  const setValue = field === "weight" ? setWeight : setReps;
  const jumps = field === "weight" ? (weightUnit === "kg" ? [-5, -2.5, 2.5, 5] : [-10, -5, 5, 10]) : [-2, -1, 1, 2];

  const switchField = (next: SetField) => {
    if (next === field) return;
    haptic.select();
    setField(next);
    setFresh(true);
  };

  const press = (key: (typeof KEYS)[number]) => {
    haptic.select();
    if (key === "del") {
      setValue(fresh || value.length <= 1 ? "0" : value.slice(0, -1));
      setFresh(false);
      return;
    }
    if (key === ".") {
      if (field === "reps") return;
      if (fresh) setValue("0.");
      else if (!value.includes(".")) setValue(value + ".");
      setFresh(false);
      return;
    }
    const next = fresh || value === "0" ? key : value + key;
    if (next.length <= MAX_LEN) setValue(next);
    setFresh(false);
  };

  const jump = (delta: number) => {
    haptic.select();
    const next = Math.max(0, (parseFloat(value) || 0) + delta);
    setValue(trimNumber(Math.round(next * 100) / 100));
    setFresh(true);
  };

  const commit = () => {
    if (!target) return;
    const w = fromDisplayWeight(Math.max(0, parseFloat(weight) || 0), weightUnit);
    const r = Math.max(0, Math.round(parseFloat(reps) || 0));
    const patch: { weight?: number; reps?: number } = {};
    if (Math.abs(w - target.weight) > 0.01) patch.weight = w;
    if (r !== target.reps) patch.reps = r;
    if (patch.weight != null || patch.reps != null) onCommit(target, patch, carry && target.followingSets > 0);
    haptic.light();
    onClose();
  };

  const primary = () => {
    if (field === "weight") switchField("reps");
    else commit();
  };

  return (
    <Sheet
      visible={target !== null}
      onClose={onClose}
      onAction={commit}
      actionLabel="Save"
      eyebrow={target ? `Set ${target.setNumber}` : undefined}
      title={target?.exerciseName}
      scroll={false}
    >
      <View style={styles.fields}>
        {(["weight", "reps"] as const).map((f) => {
          const on = field === f;
          return (
            <Pressable
              key={f}
              onPress={() => switchField(f)}
              style={[styles.field, on && styles.fieldOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={f === "weight" ? `Weight, ${weight} ${weightUnit}` : `Reps, ${reps}`}
            >
              <Text style={[styles.fieldLabel, on && { color: colors.primaryText }]}>{f === "weight" ? `Weight · ${weightUnit}` : "Reps"}</Text>
              <Text style={[styles.fieldValue, !on && { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                {f === "weight" ? weight : reps}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.jumps}>
        {jumps.map((j) => (
          <PressableScale key={j} style={styles.jump} onPress={() => jump(j)} accessibilityRole="button" accessibilityLabel={`${j > 0 ? "Add" : "Subtract"} ${Math.abs(j)}`}>
            <Text style={styles.jumpText}>
              {j > 0 ? "+" : "−"}
              {trimNumber(Math.abs(j))}
            </Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.pad}>
        {KEYS.map((k) => {
          const off = k === "." && field === "reps";
          return (
            <PressableScale
              key={k}
              style={[styles.key, off && styles.keyOff]}
              scaleTo={0.93}
              disabled={off}
              onPress={() => press(k)}
              accessibilityRole="button"
              accessibilityLabel={k === "del" ? "Delete" : k === "." ? "Decimal point" : k}
              testID={`key-${k}`}
            >
              {k === "del" ? <Delete size={24} color={colors.text} /> : <Text style={styles.keyText}>{k}</Text>}
            </PressableScale>
          );
        })}
      </View>

      {target && target.followingSets > 0 && (
        <Pressable
          style={styles.carry}
          onPress={() => {
            haptic.select();
            setCarry((c) => !c);
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: carry }}
        >
          <Text style={styles.carryText}>
            Also update the {target.followingSets === 1 ? "next set" : `next ${target.followingSets} sets`}
          </Text>
          <View style={[styles.switchTrack, { backgroundColor: carry ? colors.success : colors.fillStrong, alignItems: carry ? "flex-end" : "flex-start" }]}>
            <View style={styles.switchThumb} />
          </View>
        </Pressable>
      )}

      <PressableScale style={styles.primary} onPress={primary} accessibilityRole="button" testID="keypad-primary">
        <Text style={styles.primaryText}>{field === "weight" ? "Next · Reps" : "Save set"}</Text>
      </PressableScale>
    </Sheet>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    fields: { flexDirection: "row", gap: 10 },
    field: { flex: 1, height: 92, borderRadius: 22, backgroundColor: colors.fill, borderWidth: 2, borderColor: "transparent", paddingHorizontal: 16, justifyContent: "center", gap: 2 },
    fieldOn: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
    fieldLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, textTransform: "uppercase", color: colors.textTertiary },
    fieldValue: { fontSize: 40, fontWeight: "800", letterSpacing: -1.6, lineHeight: 46, color: colors.text, fontVariant: ["tabular-nums"] },
    jumps: { flexDirection: "row", gap: 8 },
    jump: { flex: 1, height: 42, borderRadius: 14, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    jumpText: { fontSize: 15, fontWeight: "800", color: colors.primaryText, fontVariant: ["tabular-nums"] },
    pad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
    key: { width: "32%", height: 56, borderRadius: 18, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    keyOff: { opacity: 0.25 },
    keyText: { fontSize: 24, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
    carry: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44, paddingHorizontal: 4 },
    carryText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    switchTrack: { width: 48, height: 29, borderRadius: 999, padding: 2, justifyContent: "center" },
    switchThumb: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#fff" },
    primary: { height: 56, borderRadius: 18, backgroundColor: colors.primaryFill, alignItems: "center", justifyContent: "center" },
    primaryText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  });
