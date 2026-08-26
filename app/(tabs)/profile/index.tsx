import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  RefreshControl,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, ChevronRight, Dumbbell, Trophy, Clock, TrendingUp, Crown, Download, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, GOAL_LABELS, LEVEL_LABELS, WeightUnit, AppTheme, WeekStart } from "@/types";
import { formatVolume } from "@/utils/units";
import { formatDuration } from "@/utils/helpers";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";
import XPBar from "@/components/XPBar";
import AchievementGrid from "@/components/AchievementGrid";
import { getLevelDefinition } from "@/utils/gamification";

const GOALS: FitnessGoal[] = ["build_muscle", "lose_weight", "stay_active", "get_stronger"];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    profile,
    streak,
    history,
    saveProfile,
    refreshData,
    settings,
    updateSettings,
    gamification,
    premium,
    exportData,
    clearAllData,
    currentSession,
  } = useGym();
  const router = useRouter();

  const styles = useMemo(() => createStyles(colors), [colors]);

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
    ? profile.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "GP";

  const totalWorkouts = history.length;

  const totalVolume = history.reduce((sum, h) => sum + (h.totalVolume ?? 0), 0);
  const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
  const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

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

  const handleExport = useCallback(async () => {
    try {
      const payload = exportData();
      await Share.share({
        title: "GymPulse data export",
        message: payload,
      });
    } catch {
      Alert.alert("Export failed", "Could not open the share sheet. Please try again.");
    }
  }, [exportData]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      "Erase all data?",
      "This permanently deletes your profile, routines, workout history, personal records and achievements on this device. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Erase everything",
          style: "destructive",
          onPress: () => {
            void clearAllData();
          },
        },
      ]
    );
  }, [clearAllData]);

  if (!profile) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Profile</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: currentSession ? 40 + ACTIVE_BAR_HEIGHT : 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refreshData();
              setTimeout(() => setRefreshing(false), 600);
            }}
            tintColor={colors.indigo}
          />
        }
      >
        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <LinearGradient
            colors={[colors.primary, colors.indigo, colors.violet]}
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
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  {getLevelDefinition(gamification.level).emoji} Lv.{gamification.level}
                </Text>
              </View>
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
            { v: streak.currentStreak.toString(), l: "STREAK", icon: <Flame size={18} color={colors.amber} />, bg: [colors.amberLight, colors.amberBorder] as [string, string] },
            { v: totalWorkouts.toString(), l: "WORKOUTS", icon: <Dumbbell size={18} color={colors.indigo} />, bg: [colors.primaryUltraLight, colors.primaryLight] as [string, string] },
            { v: streak.longestStreak.toString(), l: "BEST", icon: <Trophy size={18} color={colors.emerald} />, bg: [colors.successLight, colors.completedBorder] as [string, string] },
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

        {/* XP Progress */}
        <View style={styles.xpSection}>
          <XPBar totalXP={gamification.totalXP} level={gamification.level} />
        </View>

        {/* Upgrade to Pro */}
        {!premium.isPremium && (
          <TouchableOpacity
            style={styles.proCard}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.indigo, colors.violet]}
              style={styles.proCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Crown size={22} color="#fff" />
              <View style={styles.proCardInfo}>
                <Text style={styles.proCardTitle}>Upgrade to Pro</Text>
                <Text style={styles.proCardDesc}>Unlock advanced analytics, unlimited routines & more</Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        {premium.isPremium && (
          <View style={styles.proActiveCard}>
            <Crown size={18} color={colors.amber} />
            <Text style={styles.proActiveText}>GymPulse Pro</Text>
            <View style={styles.proActiveBadge}>
              <Text style={styles.proActiveBadgeText}>ACTIVE</Text>
            </View>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.achievementSection}>
          <AchievementGrid unlockedAchievements={gamification.achievements} />
        </View>

        {/* Extended Stats */}
        {totalWorkouts > 0 && (
          <View style={styles.extendedStats}>
            <View style={styles.extendedStatsRow}>
              <View style={styles.extendedStatItem}>
                <TrendingUp size={14} color={colors.indigo} />
                <Text style={styles.extendedStatValue}>
                  {formatVolume(totalVolume, settings.weightUnit)}
                </Text>
                <Text style={styles.extendedStatLabel}>Total Volume</Text>
              </View>
              <View style={styles.extendedStatDivider} />
              <View style={styles.extendedStatItem}>
                <Clock size={14} color={colors.indigo} />
                <Text style={styles.extendedStatValue}>{formatDuration(avgDuration)}</Text>
                <Text style={styles.extendedStatLabel}>Avg Duration</Text>
              </View>
              <View style={styles.extendedStatDivider} />
              <View style={styles.extendedStatItem}>
                <Clock size={14} color={colors.indigo} />
                <Text style={styles.extendedStatValue}>{formatDuration(totalDuration)}</Text>
                <Text style={styles.extendedStatLabel}>Total Time</Text>
              </View>
            </View>
          </View>
        )}

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
              <ChevronRight size={14} color={colors.textTertiary} />
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
                      colors={[colors.primary, colors.indigo]}
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
              <ChevronRight size={14} color={colors.textTertiary} />
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
              <ChevronRight size={14} color={colors.textTertiary} />
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

        </View>

        {/* App Settings */}
        <View style={styles.settingsList}>
          {/* Weight Unit */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Weight Unit</Text>
            <View style={styles.segmentedControl}>
              {(["lbs", "kg"] as WeightUnit[]).map((unit) => (
                <TouchableOpacity
                  key={unit}
                  onPress={() => {
                    updateSettings({ weightUnit: unit });
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                >
                  {settings.weightUnit === unit ? (
                    <LinearGradient
                      colors={[colors.primary, colors.indigo]}
                      style={styles.segmentActive}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.segmentTextActive}>{unit.toUpperCase()}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentInactive}>
                      <Text style={styles.segmentText}>{unit.toUpperCase()}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingDivider} />

          {/* Default Rest Timer */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Rest Timer</Text>
            <View style={styles.segmentedControl}>
              {[30, 60, 90, 120].map((sec) => (
                <TouchableOpacity
                  key={sec}
                  onPress={() => {
                    updateSettings({ defaultRestTimer: sec });
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                >
                  {settings.defaultRestTimer === sec ? (
                    <LinearGradient
                      colors={[colors.primary, colors.indigo]}
                      style={styles.segmentActive}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.segmentTextActive}>{sec}s</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentInactive}>
                      <Text style={styles.segmentText}>{sec}s</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingDivider} />

          {/* Theme */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Theme</Text>
            <View style={styles.segmentedControl}>
              {([
                { key: "light" as AppTheme, label: "Light" },
                { key: "dark" as AppTheme, label: "Dark" },
                { key: "system" as AppTheme, label: "Auto" },
              ]).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => {
                    updateSettings({ theme: t.key });
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                >
                  {settings.theme === t.key ? (
                    <LinearGradient
                      colors={[colors.primary, colors.indigo]}
                      style={styles.segmentActive}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.segmentTextActive}>{t.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentInactive}>
                      <Text style={styles.segmentText}>{t.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingDivider} />

          {/* Week Start — weekly stats and the activity calendar both honour this */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Week Starts</Text>
            <View style={styles.segmentedControl}>
              {([
                { key: "monday" as WeekStart, label: "Mon" },
                { key: "sunday" as WeekStart, label: "Sun" },
              ]).map((w) => (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => {
                    updateSettings({ weekStartsOn: w.key });
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: settings.weekStartsOn === w.key }}
                  accessibilityLabel={`Week starts on ${w.key === "monday" ? "Monday" : "Sunday"}`}
                >
                  {settings.weekStartsOn === w.key ? (
                    <LinearGradient
                      colors={[colors.primary, colors.indigo]}
                      style={styles.segmentActive}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.segmentTextActive}>{w.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.segmentInactive}>
                      <Text style={styles.segmentText}>{w.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingDivider} />

          {/* Confetti Toggle */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              updateSettings({ showConfetti: !settings.showConfetti });
              if (Platform.OS !== "web") void Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.showConfetti }}
            accessibilityLabel="Celebration Effects"
          >
            <Text style={styles.settingLabel}>Celebration Effects</Text>
            <View style={[styles.toggleTrack, settings.showConfetti && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, settings.showConfetti && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          {/* Auto Rest Timer Toggle */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              updateSettings({ autoStartRestTimer: !settings.autoStartRestTimer });
              if (Platform.OS !== "web") void Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.autoStartRestTimer }}
            accessibilityLabel="Auto-Start Rest Timer"
          >
            <Text style={styles.settingLabel}>Auto-Start Rest Timer</Text>
            <View style={[styles.toggleTrack, settings.autoStartRestTimer && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, settings.autoStartRestTimer && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          {/* Notifications Toggle */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              updateSettings({ notificationsEnabled: !settings.notificationsEnabled });
              if (Platform.OS !== "web") void Haptics.selectionAsync();
            }}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.notificationsEnabled }}
            accessibilityLabel="Push Notifications"
          >
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <View style={[styles.toggleTrack, settings.notificationsEnabled && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, settings.notificationsEnabled && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          {settings.notificationsEnabled && (
            <>
              <View style={styles.settingDivider} />
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Reminder Time</Text>
                <View style={styles.segmentedControl}>
                  {[
                    { hour: 8, label: "8am" },
                    { hour: 12, label: "12pm" },
                    { hour: 17, label: "5pm" },
                    { hour: 20, label: "8pm" },
                  ].map((r) => (
                    <TouchableOpacity
                      key={r.hour}
                      onPress={() => {
                        updateSettings({ reminderHour: r.hour });
                        if (Platform.OS !== "web") void Haptics.selectionAsync();
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: settings.reminderHour === r.hour }}
                      accessibilityLabel={`Remind me at ${r.label}`}
                    >
                      {settings.reminderHour === r.hour ? (
                        <LinearGradient
                          colors={[colors.primary, colors.indigo]}
                          style={styles.segmentActive}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={styles.segmentTextActive}>{r.label}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.segmentInactive}>
                          <Text style={styles.segmentText}>{r.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* ─── Your Data ─── */}
        <View style={styles.settingsList}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleExport}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Export your data as JSON"
          >
            <View style={styles.dataRowLeft}>
              <Download size={16} color={colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingHint}>
                  {history.length} workout{history.length === 1 ? "" : "s"} · JSON, weights in lbs
                </Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleClearData}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Erase all data on this device"
          >
            <View style={styles.dataRowLeft}>
              <Trash2 size={16} color={colors.error} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.error }]}>Erase All Data</Text>
                <Text style={styles.settingHint}>Cannot be undone</Text>
              </View>
            </View>
            <ChevronRight size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerApp}>GymPulse <Text style={styles.footerVersion}>v1.0</Text></Text>
          <Text style={styles.footerSub}>Quntm Technology Group LLC</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.text,
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
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.white,
  },
  avatarInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 4,
    letterSpacing: -0.5,
  },
  memberText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  levelBadge: {
    backgroundColor: colors.xpBarFill + "18",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.xpBarFill + "30",
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.xpBarFill,
    letterSpacing: 0.3,
  },
  badgeActive: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statGridCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    color: colors.text,
    letterSpacing: -0.8,
    lineHeight: 24,
  },
  statGridLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.3,
    marginTop: 3,
  },
  xpSection: {
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  proCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  proCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 12,
  },
  proCardInfo: {
    flex: 1,
  },
  proCardTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: -0.3,
  },
  proCardDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  proActiveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
  },
  proActiveText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
    flex: 1,
  },
  proActiveBadge: {
    backgroundColor: colors.emerald,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proActiveBadgeText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  achievementSection: {
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  extendedStats: {
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  extendedStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  extendedStatItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  extendedStatValue: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  extendedStatLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  extendedStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.glassBorder,
  },
  settingsList: {
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    minHeight: 56,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  settingHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  dataRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingValue: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: colors.textTertiary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  dayPillText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  dayPillTextActive: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
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
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  optionItemActive: {
    backgroundColor: colors.primaryUltraLight,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.primary,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: 6,
  },
  segmentActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 44,
    alignItems: "center",
  },
  segmentInactive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minWidth: 44,
    alignItems: "center",
  },
  segmentTextActive: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.white,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.text,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleTrackOn: {
    backgroundColor: colors.emerald,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  footerApp: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.textTertiary,
    letterSpacing: -0.3,
  },
  footerVersion: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "500" as const,
  },
  footerSub: {
    fontSize: 11,
    color: colors.textTertiary,
    opacity: 0.5,
    marginTop: 4,
  },
});
