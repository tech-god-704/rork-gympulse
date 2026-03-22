import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, ChevronRight, Dumbbell, Trophy } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, GOAL_LABELS, LEVEL_LABELS } from "@/types";

const GOALS: FitnessGoal[] = ["build_muscle", "lose_weight", "stay_active", "get_stronger"];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, streak, history, saveProfile, refreshData } = useGym();

  const [refreshing, setRefreshing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name ?? "");
  const [editingGoal, setEditingGoal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(false);
  const [editingDays, setEditingDays] = useState(false);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Today";

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "GP";

  const totalWorkouts = history.length;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refreshData();
              setTimeout(() => setRefreshing(false), 600);
            }}
            tintColor={Colors.indigo}
          />
        }
      >
        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <LinearGradient
            colors={[Colors.primary, Colors.indigo, Colors.violet]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.avatarInfo}>
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
            <Text style={styles.memberText}>Member since {memberSince}</Text>
            <View style={styles.badgesRow}>
              <View style={styles.badgeActive}>
                <Text style={styles.badgeActiveText}>{GOAL_LABELS[profile.fitnessGoal]}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{LEVEL_LABELS[profile.experienceLevel]}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stat Cards Grid */}
        <View style={styles.statGrid}>
          {[
            { v: streak.currentStreak.toString(), l: "STREAK", icon: <Flame size={18} color="#F59E0B" />, bg: ["#FFFBEB", "#FEF3C7"] as [string, string] },
            { v: totalWorkouts.toString(), l: "WORKOUTS", icon: <Dumbbell size={18} color={Colors.indigo} />, bg: ["#EEF2FF", "#E0E7FF"] as [string, string] },
            { v: streak.longestStreak.toString(), l: "BEST", icon: <Trophy size={18} color={Colors.emerald} />, bg: ["#ECFDF5", "#D1FAE5"] as [string, string] },
          ].map((s) => (
            <View key={s.l} style={styles.statGridCard}>
              <LinearGradient
                colors={s.bg}
                style={styles.statGridIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {s.icon}
              </LinearGradient>
              <Text style={styles.statGridValue}>{s.v}</Text>
              <Text style={styles.statGridLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setEditingDays(!editingDays)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Training Days</Text>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{profile.trainingDaysPerWeek} days/week</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
          {editingDays && (
            <View style={styles.daysRow}>
              {[2, 3, 4, 5, 6, 7].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => handleChangeDays(d)}
                >
                  {profile.trainingDaysPerWeek === d ? (
                    <LinearGradient
                      colors={[Colors.primary, Colors.indigo]}
                      style={styles.dayPill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.dayPillTextActive}>{d}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.dayPill, styles.dayPillInactive]}>
                      <Text style={styles.dayPillText}>{d}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setEditingGoal(!editingGoal)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Fitness Goal</Text>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{GOAL_LABELS[profile.fitnessGoal]}</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </View>
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

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setEditingLevel(!editingLevel)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Experience</Text>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{LEVEL_LABELS[profile.experienceLevel]}</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </View>
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

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>On</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </View>
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Off</Text>
              <ChevronRight size={14} color={Colors.textTertiary} />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerApp}>GymPulse <Text style={styles.footerVersion}>v1.0</Text></Text>
          <Text style={styles.footerSub}>Media Ape Ventures</Text>
        </View>
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
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingTop: 0,
    paddingBottom: 40,
    gap: 12,
  },
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  avatarInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 4,
    letterSpacing: -0.5,
  },
  memberText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  badgeActive: {
    backgroundColor: "rgba(59,130,246,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statGridCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  statGridIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statGridValue: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: Colors.text,
    letterSpacing: -0.8,
    lineHeight: 24,
  },
  statGridLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 3,
  },
  settingsList: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingValue: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: Colors.textTertiary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.04)",
    marginHorizontal: 16,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dayPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dayPillInactive: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  dayPillText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  dayPillTextActive: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  optionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.04)",
  },
  optionItemActive: {
    backgroundColor: "rgba(59,130,246,0.08)",
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
  footer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  footerApp: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.textTertiary,
    letterSpacing: -0.3,
  },
  footerVersion: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "500" as const,
  },
  footerSub: {
    fontSize: 11,
    color: Colors.textTertiary,
    opacity: 0.5,
    marginTop: 4,
  },
});
