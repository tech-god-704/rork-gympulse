import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from "react-native";
import { X } from "lucide-react-native";
import Colors from "@/constants/colors";

const BAR_WEIGHT = 45;
const AVAILABLE_PLATES = [45, 35, 25, 10, 5, 2.5];

const PLATE_COLORS: Record<number, string> = {
  45: Colors.error,
  35: Colors.amber,
  25: Colors.emerald,
  10: Colors.primary,
  5: Colors.violet,
  2.5: Colors.cyan,
};

interface Props {
  visible: boolean;
  weight: number;
  onClose: () => void;
}

function calculatePlates(totalWeight: number): { plates: number[]; remainder: number } {
  if (totalWeight <= BAR_WEIGHT) return { plates: [], remainder: 0 };
  let perSide = (totalWeight - BAR_WEIGHT) / 2;
  const plates: number[] = [];

  for (const plate of AVAILABLE_PLATES) {
    while (perSide >= plate) {
      plates.push(plate);
      perSide -= plate;
    }
  }

  return { plates, remainder: Math.round(perSide * 10) / 10 };
}

export default function PlateCalculator({ visible, weight, onClose }: Props) {
  const { plates, remainder } = useMemo(() => calculatePlates(weight), [weight]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Plate Calculator</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.totalWeight}>{weight} lbs</Text>

          {weight <= BAR_WEIGHT ? (
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                {weight === BAR_WEIGHT ? "Just the bar!" : "Less than bar weight (45 lbs)"}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>Each side of the bar:</Text>

              {/* Visual plate display */}
              <View style={styles.barContainer}>
                <View style={styles.barEnd} />
                <View style={styles.bar} />
                {plates.map((plate, i) => (
                  <View
                    key={i}
                    style={[
                      styles.plate,
                      {
                        backgroundColor: PLATE_COLORS[plate] || Colors.textTertiary,
                        height: 30 + plate * 0.8,
                      },
                    ]}
                  >
                    <Text style={styles.plateText}>{plate}</Text>
                  </View>
                ))}
                <View style={styles.barCollar} />
              </View>

              {/* Plate list */}
              <View style={styles.plateList}>
                {plates.map((plate, i) => (
                  <View key={i} style={styles.plateListItem}>
                    <View style={[styles.plateDot, { backgroundColor: PLATE_COLORS[plate] }]} />
                    <Text style={styles.plateListText}>{plate} lb plate</Text>
                  </View>
                ))}
              </View>

              {remainder > 0 && (
                <Text style={styles.remainder}>
                  +{remainder} lbs can't be made with standard plates
                </Text>
              )}

              <View style={styles.breakdown}>
                <Text style={styles.breakdownText}>
                  Bar (45) + {plates.reduce((a, b) => a + b, 0)} x 2 sides = {BAR_WEIGHT + plates.reduce((a, b) => a + b, 0) * 2} lbs
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  totalWeight: {
    fontSize: 36,
    fontWeight: "900" as const,
    color: Colors.text,
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: "center",
    marginBottom: 20,
  },
  messageContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  barEnd: {
    width: 8,
    height: 20,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
  },
  bar: {
    width: 20,
    height: 10,
    backgroundColor: Colors.textTertiary,
  },
  plate: {
    width: 20,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  plateText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: "#fff",
  },
  barCollar: {
    width: 6,
    height: 16,
    backgroundColor: Colors.textTertiary,
    borderRadius: 2,
    marginLeft: 2,
  },
  plateList: {
    gap: 6,
    marginBottom: 16,
  },
  plateListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  plateListText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  remainder: {
    fontSize: 12,
    color: Colors.amber,
    textAlign: "center",
    fontWeight: "500" as const,
    marginBottom: 12,
  },
  breakdown: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  breakdownText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: Colors.textTertiary,
  },
});
