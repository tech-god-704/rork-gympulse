import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Calendar, Target, Dumbbell, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, GOAL_LABELS, LEVEL_LABELS } from "@/types";

const GOALS: FitnessGoal[] = ["build_muscle", "lose_weight", "stay_active", "get_stronger"];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, saveProfile } = useGym();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name ?? "");
  const [editingGoal, setEditingGoal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(false);
  const [editingDays, setEditingDays] = useState(false);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Today";

  const handleSaveName = useCallback(() => {
    if (profile && nameValue.trim()) {
      saveProfile({ ...profile, name: nameValue.trim() });
    }
    setEditingName(false);
  }, [profile, nameValue, saveProfile]);

  const handleChangeGoal = useCallback(
    (goal: FitnessGoal) => {
      if (profile) {
        saveProfile({ ...profile, fitnessGoal: goal });
        if (Platform.OS !== "web") void Haptics.selectionAsync();
      }
      setEditingGoal(false);
    },
    [profile, saveProfile]
  );

  const handleChangeLevel = useCallback(
    (level: ExperienceLevel) => {
      if (profile) {
        saveProfile({ ...profile, experienceLevel: level });
        if (Platform.OS !== "web") void Haptics.selectionAsync();
      }
      setEditingLevel(false);
    },
    [profile, saveProfile]
  );

  const handleChangeDays = useCallback(
    (days: number) => {
      if (profile) {
        saveProfile({ ...profile, trainingDaysPerWeek: days });
        if (Platform.OS !== "web") void Haptics.selectionAsync();
      }
      setEditingDays(false);
    },
    [profile, saveProfile]
  );

  if (!profile) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Profile</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <User size={40} color={Colors.white} />
          </View>
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              autoFocus
            />
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNameValue(profile.name);
                setEditingName(true);
              }}
            >
              <Text style={styles.profileName}>{profile.name}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.memberRow}>
            <Calendar size={14} color={Colors.textTertiary} />
            <Text style={styles.memberText}>Member since {memberSince}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setEditingGoal(!editingGoal)}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.primaryUltraLight }]}>
              <Target size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Fitness Goal</Text>
              <Text style={styles.settingValue}>{GOAL_LABELS[profile.fitnessGoal]}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        {editingGoal && (
          <View style={styles.optionsList}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.optionItem, profile.fitnessGoal === g && styles.optionItemActive]}
                onPress={() => handleChangeGoal(g)}
              >
                <Text
                  style={[styles.optionText, profile.fitnessGoal === g && styles.optionTextActive]}
                >
                  {GOAL_LABELS[g]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setEditingLevel(!editingLevel)}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: "#FEF3C7" }]}>
              <Dumbbell size={18} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Experience Level</Text>
              <Text style={styles.settingValue}>{LEVEL_LABELS[profile.experienceLevel]}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        {editingLevel && (
          <View style={styles.optionsList}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.optionItem, profile.experienceLevel === l && styles.optionItemActive]}
                onPress={() => handleChangeLevel(l)}
              >
                <Text
                  style={[styles.optionText, profile.experienceLevel === l && styles.optionTextActive]}
                >
                  {LEVEL_LABELS[l]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setEditingDays(!editingDays)}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: "#DCFCE7" }]}>
              <Calendar size={18} color={Colors.success} />
            </View>
            <View>
              <Text style={styles.settingLabel}>Training Days</Text>
              <Text style={styles.settingValue}>{profile.trainingDaysPerWeek} days/week</Text>
            </View>
          </View>
          <ChevronRight size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        {editingDays && (
          <View style={styles.daysRow}>
            {[2, 3, 4, 5, 6, 7].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayPill, profile.trainingDaysPerWeek === d && styles.dayPillActive]}
                onPress={() => handleChangeDays(d)}
              >
                <Text style={[styles.dayPillText, profile.trainingDaysPerWeek === d && styles.dayPillTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    textAlign: "center" as const,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  optionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  optionItemActive: {
    backgroundColor: Colors.primaryUltraLight,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  optionTextActive: {
    color: Colors.primary,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  dayPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  dayPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayPillText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  dayPillTextActive: {
    color: Colors.white,
  },
});
