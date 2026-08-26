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
import {
  Flame,
  Dumbbell,
  Trophy,
  Clock,
  TrendingUp,
  Crown,
  Download,
  Trash2,
  ChevronRight,
  Pencil,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import {
  Layout,
  Radius,
  Space,
  Type,
  glow,
  numeric,
  tint,
} from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import {
  FitnessGoal,
  ExperienceLevel,
  GOAL_LABELS,
  LEVEL_LABELS,
  WeightUnit,
  AppTheme,
  WeekStart,
} from "@/types";
import { formatVolume } from "@/utils/units";
import { formatDuration } from "@/utils/helpers";
import XPBar from "@/components/XPBar";
import AchievementGrid from "@/components/AchievementGrid";
import { getLevelDefinition } from "@/utils/gamification";
import {
  Card,
  ListRow,
  RowDivider,
  ScreenHeader,
  SectionHeader,
  Segmented,
  StatTile,
  Tag,
} from "@/components/ui";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";

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
  const [openPicker, setOpenPicker] = useState<"goal" | "level" | "days" | null>(null);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "today";

  const initials = profile?.name
    ? profile.name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "GP";

  const totalWorkouts = history.length;
  const totalVolume = history.reduce((sum, h) => sum + (h.totalVolume ?? 0), 0);
  const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
  const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

  const togglePicker = useCallback((picker: "goal" | "level" | "days") => {
    setOpenPicker((current) => (current === picker ? null : picker));
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, []);

  const handleSaveName = useCallback(() => {
    if (profile && nameValue.trim()) {
      saveProfile({ ...profile, name: nameValue.trim() });
    }
    setEditingName(false);
  }, [profile, nameValue, saveProfile]);

  const handleChangeGoal = useCallback(
    (goal: FitnessGoal) => {
      if (profile) saveProfile({ ...profile, fitnessGoal: goal });
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setOpenPicker(null);
    },
    [profile, saveProfile]
  );

  const handleChangeLevel = useCallback(
    (level: ExperienceLevel) => {
      if (profile) saveProfile({ ...profile, experienceLevel: level });
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setOpenPicker(null);
    },
    [profile, saveProfile]
  );

  const handleChangeDays = useCallback(
    (days: number) => {
      if (profile) saveProfile({ ...profile, trainingDaysPerWeek: days });
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setOpenPicker(null);
    },
    [profile, saveProfile]
  );

  const handleExport = useCallback(async () => {
    try {
      await Share.share({ title: "GymPulse data export", message: exportData() });
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
        { text: "Erase everything", style: "destructive", onPress: () => void clearAllData() },
      ]
    );
  }, [clearAllData]);

  if (!profile) return null;

  const levelDef = getLevelDefinition(gamification.level);

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader title="Profile" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + Space.xxxl },
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
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Identity ── */}
        <Card padding={Space.lg}>
          <View style={styles.identity}>
            <LinearGradient
              colors={[colors.primary, colors.indigo, colors.violet]}
              style={[styles.avatar, glow(colors.indigo, colors, 0.35)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>

            <View style={styles.identityInfo}>
              {editingName ? (
                <TextInput
                  style={styles.nameInput}
                  value={nameValue}
                  onChangeText={setNameValue}
                  onBlur={handleSaveName}
                  onSubmitEditing={handleSaveName}
                  autoFocus
                  maxLength={40}
                  returnKeyType="done"
                  accessibilityLabel="Your name"
                />
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setNameValue(profile.name);
                    setEditingName(true);
                  }}
                  style={styles.nameRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Your name, ${profile.name}. Tap to edit.`}
                  hitSlop={{ top: 6, bottom: 6, left: 0, right: 10 }}
                >
                  <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
                  <Pencil size={13} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
              <Text style={styles.memberSince}>Training since {memberSince}</Text>
              <View style={styles.tagRow}>
                <Tag label={`${levelDef.emoji} Lv.${gamification.level}`} color={colors.xpBarFill} size="sm" />
                <Tag label={GOAL_LABELS[profile.fitnessGoal]} color={colors.primary} size="sm" />
                <Tag label={LEVEL_LABELS[profile.experienceLevel]} color={colors.textTertiary} size="sm" />
              </View>
            </View>
          </View>
        </Card>

        {/* ── Headline stats ── */}
        <Card padding={Space.base}>
          <View style={styles.statRow}>
            <StatTile
              layout="stack"
              value={streak.currentStreak}
              label="Streak"
              color={colors.amber}
              icon={<Flame size={17} color={colors.amber} />}
            />
            <View style={styles.statDivider} />
            <StatTile
              layout="stack"
              value={totalWorkouts}
              label="Workouts"
              color={colors.primary}
              icon={<Dumbbell size={17} color={colors.primary} />}
            />
            <View style={styles.statDivider} />
            <StatTile
              layout="stack"
              value={streak.longestStreak}
              label="Best streak"
              color={colors.emerald}
              icon={<Trophy size={17} color={colors.emerald} />}
            />
          </View>
        </Card>

        {/* ── Level ── */}
        <Card padding={Space.base}>
          <XPBar totalXP={gamification.totalXP} level={gamification.level} />
        </Card>

        {/* ── Pro ── */}
        {premium.isPremium ? (
          <Card padding={Space.base}>
            <View style={styles.proActive}>
              <Crown size={19} color={colors.amber} />
              <Text style={styles.proActiveText}>GymPulse Pro</Text>
              <Tag label="Active" color={colors.emerald} variant="solid" size="sm" />
            </View>
          </Card>
        ) : (
          <TouchableOpacity
            style={[styles.proCard, glow(colors.indigo, colors, 0.3)]}
            onPress={() => router.push("/paywall")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to GymPulse Pro"
          >
            <LinearGradient
              colors={[colors.primary, colors.indigo, colors.violet]}
              style={styles.proGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Crown size={22} color="#fff" />
              <View style={styles.proInfo}>
                <Text style={styles.proTitle}>Upgrade to Pro</Text>
                <Text style={styles.proDesc}>
                  Advanced analytics, smart plans, unlimited routines
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.75)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Lifetime ── */}
        {totalWorkouts > 0 && (
          <Card padding={Space.base}>
            <View style={styles.statRow}>
              <StatTile
                layout="stack"
                size="sm"
                value={formatVolume(totalVolume, settings.weightUnit, false)}
                label={`Volume (${settings.weightUnit})`}
                color={colors.indigo}
                icon={<TrendingUp size={16} color={colors.indigo} />}
              />
              <View style={styles.statDivider} />
              <StatTile
                layout="stack"
                size="sm"
                value={formatDuration(avgDuration)}
                label="Avg session"
                color={colors.cyan}
                icon={<Clock size={16} color={colors.cyan} />}
              />
              <View style={styles.statDivider} />
              <StatTile
                layout="stack"
                size="sm"
                value={formatDuration(totalDuration)}
                label="Total time"
                color={colors.violet}
                icon={<Clock size={16} color={colors.violet} />}
              />
            </View>
          </Card>
        )}

        {/* ── Achievements ── */}
        <Card padding={Space.base}>
          <AchievementGrid unlockedAchievements={gamification.achievements} />
        </Card>

        {/* ── Training ── */}
        <SectionHeader title="Training" style={styles.sectionHeader} />
        <Card padding={0}>
          <ListRow
            label="Training days"
            hint="Your weekly goal"
            trailing={<Text style={styles.rowValue}>{profile.trainingDaysPerWeek}/week</Text>}
            chevron
            onPress={() => togglePicker("days")}
          />
          {openPicker === "days" && (
            <View style={styles.pickerTray}>
              {[2, 3, 4, 5, 6, 7].map((d) => {
                const active = profile.trainingDaysPerWeek === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => handleChangeDays(d)}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${d} days per week`}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <RowDivider />
          <ListRow
            label="Fitness goal"
            trailing={<Text style={styles.rowValue}>{GOAL_LABELS[profile.fitnessGoal]}</Text>}
            chevron
            onPress={() => togglePicker("goal")}
          />
          {openPicker === "goal" && (
            <View style={styles.pickerTray}>
              {GOALS.map((g) => {
                const active = profile.fitnessGoal === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => handleChangeGoal(g)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {GOAL_LABELS[g]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <RowDivider />
          <ListRow
            label="Experience"
            trailing={<Text style={styles.rowValue}>{LEVEL_LABELS[profile.experienceLevel]}</Text>}
            chevron
            onPress={() => togglePicker("level")}
          />
          {openPicker === "level" && (
            <View style={styles.pickerTray}>
              {LEVELS.map((l) => {
                const active = profile.experienceLevel === l;
                return (
                  <TouchableOpacity
                    key={l}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => handleChangeLevel(l)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {LEVEL_LABELS[l]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* ── Preferences ── */}
        <SectionHeader title="Preferences" style={styles.sectionHeader} />
        <Card padding={0}>
          <ListRow
            label="Weight unit"
            trailing={
              <Segmented<WeightUnit>
                label="Weight unit"
                options={[
                  { value: "lbs", label: "LBS" },
                  { value: "kg", label: "KG" },
                ]}
                value={settings.weightUnit}
                onChange={(weightUnit) => updateSettings({ weightUnit })}
                size="sm"
              />
            }
          />
          <RowDivider />
          <ListRow
            label="Default rest"
            trailing={
              <Segmented<number>
                label="Default rest timer"
                options={[30, 60, 90, 120].map((v) => ({ value: v, label: `${v}s` }))}
                value={settings.defaultRestTimer}
                onChange={(defaultRestTimer) => updateSettings({ defaultRestTimer })}
                size="sm"
              />
            }
          />
          <RowDivider />
          <ListRow
            label="Appearance"
            trailing={
              <Segmented<AppTheme>
                label="Appearance"
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "Auto" },
                ]}
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
                size="sm"
              />
            }
          />
          <RowDivider />
          <ListRow
            label="Week starts"
            trailing={
              <Segmented<WeekStart>
                label="Week starts on"
                options={[
                  { value: "monday", label: "Mon" },
                  { value: "sunday", label: "Sun" },
                ]}
                value={settings.weekStartsOn}
                onChange={(weekStartsOn) => updateSettings({ weekStartsOn })}
                size="sm"
              />
            }
          />
          <RowDivider />
          <Toggle
            label="Celebration effects"
            hint="Confetti when you finish a workout"
            value={settings.showConfetti}
            onChange={(showConfetti) => updateSettings({ showConfetti })}
          />
          <RowDivider />
          <Toggle
            label="Auto-start rest timer"
            hint="Starts counting the moment you log a set"
            value={settings.autoStartRestTimer}
            onChange={(autoStartRestTimer) => updateSettings({ autoStartRestTimer })}
          />
        </Card>

        {/* ── Notifications ── */}
        <SectionHeader title="Notifications" style={styles.sectionHeader} />
        <Card padding={0}>
          <Toggle
            label="Push notifications"
            hint="Training reminders and streak milestones"
            value={settings.notificationsEnabled}
            onChange={(notificationsEnabled) => updateSettings({ notificationsEnabled })}
          />
          {settings.notificationsEnabled && (
            <>
              <RowDivider />
              <ListRow
                label="Reminder time"
                hint="Skipped on days you've already trained"
                trailing={
                  <Segmented<number>
                    label="Reminder time"
                    options={[
                      { value: 8, label: "8a" },
                      { value: 12, label: "12p" },
                      { value: 18, label: "6p" },
                      { value: 20, label: "8p" },
                    ]}
                    value={settings.reminderHour}
                    onChange={(reminderHour) => updateSettings({ reminderHour })}
                    size="sm"
                  />
                }
              />
            </>
          )}
        </Card>

        {/* ── Data ── */}
        <SectionHeader title="Your data" style={styles.sectionHeader} />
        <Card padding={0}>
          <ListRow
            label="Export data"
            hint={`${history.length} workout${history.length === 1 ? "" : "s"} · JSON, weights in lbs`}
            leading={<Download size={17} color={colors.primary} />}
            onPress={handleExport}
          />
          <RowDivider />
          <ListRow
            label="Erase all data"
            hint="Cannot be undone"
            leading={<Trash2 size={17} color={colors.error} />}
            destructive
            onPress={handleClearData}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerApp}>
            GymPulse <Text style={styles.footerVersion}>v1.0</Text>
          </Text>
          <Text style={styles.footerSub}>Quntm Technology Group LLC</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/** A settings switch styled to match the rest of the list. */
function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.toggleRow}
      onPress={() => {
        onChange(!value);
        if (Platform.OS !== "web") void Haptics.selectionAsync();
      }}
      activeOpacity={0.7}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.toggleHint}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Layout.gutter,
    gap: Space.md,
  },
  // ── Identity ──
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.base,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    ...Type.title2,
    fontWeight: "800",
    color: "#fff",
  },
  identityInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  name: {
    ...Type.title2,
    color: colors.text,
    flexShrink: 1,
  },
  nameInput: {
    ...Type.title2,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 2,
  },
  memberSince: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 3,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.xs + 2,
    marginTop: Space.sm,
  },
  // ── Stats ──
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statDivider: {
    width: Layout.hairline,
    height: 40,
    backgroundColor: colors.separator,
  },
  // ── Pro ──
  proCard: {
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  proGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    padding: Space.base,
  },
  proInfo: {
    flex: 1,
  },
  proTitle: {
    ...Type.headline,
    color: "#fff",
  },
  proDesc: {
    ...Type.caption,
    fontWeight: "500",
    color: "rgba(255,255,255,0.82)",
    marginTop: 2,
  },
  proActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  proActiveText: {
    ...Type.headline,
    color: colors.text,
    flex: 1,
  },
  // ── Sections ──
  sectionHeader: {
    paddingHorizontal: Space.xs,
    marginTop: Space.sm,
  },
  rowValue: {
    ...Type.subhead,
    ...numeric,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  pickerTray: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    paddingHorizontal: Space.base,
    paddingBottom: Space.base,
  },
  dayChip: {
    width: Layout.touchTarget,
    height: Layout.touchTarget,
    borderRadius: Radius.sm,
    backgroundColor: colors.fill,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dayChipActive: {
    backgroundColor: tint(colors.primary, 0.14),
    borderColor: colors.primary,
  },
  dayChipText: {
    ...Type.headline,
    ...numeric,
    color: colors.textSecondary,
  },
  dayChipTextActive: {
    color: colors.primary,
  },
  optionChip: {
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    borderRadius: Radius.sm,
    backgroundColor: colors.fill,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: Layout.touchTarget,
    justifyContent: "center",
  },
  optionChipActive: {
    backgroundColor: tint(colors.primary, 0.14),
    borderColor: colors.primary,
  },
  optionText: {
    ...Type.callout,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  // ── Toggle ──
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    paddingHorizontal: Space.base,
    paddingVertical: Space.md,
    minHeight: Layout.rowHeight,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    ...Type.callout,
    color: colors.text,
  },
  toggleHint: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    marginTop: 2,
  },
  track: {
    width: 50,
    height: 30,
    borderRadius: Radius.pill,
    backgroundColor: colors.fillStrong,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  trackOn: {
    backgroundColor: colors.emerald,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbOn: {
    alignSelf: "flex-end",
  },
  // ── Footer ──
  footer: {
    alignItems: "center",
    paddingVertical: Space.lg,
  },
  footerApp: {
    ...Type.callout,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  footerVersion: {
    ...numeric,
    fontWeight: "500",
  },
  footerSub: {
    ...Type.caption,
    fontWeight: "500",
    color: colors.textTertiary,
    opacity: 0.6,
    marginTop: Space.xs,
  },
});
