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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Crown, ChevronRight, Download, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { elevation, gradient } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, GOAL_LABELS, LEVEL_LABELS, WeightUnit, AppTheme, WeekStart } from "@/types";
import { formatVolume } from "@/utils/units";
import { formatDuration } from "@/utils/helpers";
import AchievementGrid from "@/components/AchievementGrid";
import { getLevelDefinition, getXPProgress, LEVEL_DEFINITIONS } from "@/utils/gamification";
import { Segmented } from "@/components/ui";
import { ACTIVE_BAR_HEIGHT } from "@/components/ActiveWorkoutBar";

const GOALS: FitnessGoal[] = ["build_muscle", "lose_weight", "stay_active", "get_stronger"];
const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const REST_OPTIONS = [30, 60, 90, 120, 180];
const REMINDER_HOURS = [6, 7, 8, 12, 17, 18, 20];
const MIN_DAYS = 2;
const MAX_DAYS = 7;

const restLabel = (s: number) => (s < 120 ? `${s} sec` : `${s / 60} min`);
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`;

type PickerKey = "goal" | "level" | "rest" | "reminder";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
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
    personalRecords,
    exportData,
    clearAllData,
    currentSession,
  } = useGym();

  const [refreshing, setRefreshing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name ?? "");
  const [picker, setPicker] = useState<PickerKey | null>(null);

  const totalWorkouts = history.length;
  const totalVolume = history.reduce((sum, h) => sum + (h.totalVolume ?? 0), 0);
  const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
  const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;
  const totalPRs = Object.keys(personalRecords).length;

  const haptic = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  const handleSaveName = useCallback(() => {
    if (profile && nameValue.trim()) saveProfile({ ...profile, name: nameValue.trim() });
    setEditingName(false);
  }, [profile, nameValue, saveProfile]);

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
      ],
    );
  }, [clearAllData]);

  if (!profile) return null;

  const level = gamification.level;
  const levelDef = getLevelDefinition(level);
  const xp = getXPProgress(gamification.totalXP);
  const atMax = level >= LEVEL_DEFINITIONS.length;
  const initial = profile.name.trim().charAt(0).toUpperCase() || "G";
  const days = profile.trainingDaysPerWeek;
  const setDays = (d: number) => {
    saveProfile({ ...profile, trainingDaysPerWeek: Math.min(MAX_DAYS, Math.max(MIN_DAYS, d)) });
    haptic();
  };

  const pickerConfig: Record<PickerKey, { title: string; options: { label: string; on: boolean; pick: () => void }[] }> = {
    goal: {
      title: "Goal",
      options: GOALS.map((g) => ({ label: GOAL_LABELS[g], on: profile.fitnessGoal === g, pick: () => saveProfile({ ...profile, fitnessGoal: g }) })),
    },
    level: {
      title: "Experience",
      options: LEVELS.map((l) => ({ label: LEVEL_LABELS[l], on: profile.experienceLevel === l, pick: () => saveProfile({ ...profile, experienceLevel: l }) })),
    },
    rest: {
      title: "Default rest",
      options: REST_OPTIONS.map((s) => ({ label: restLabel(s), on: settings.defaultRestTimer === s, pick: () => updateSettings({ defaultRestTimer: s }) })),
    },
    reminder: {
      title: "Reminder time",
      options: REMINDER_HOURS.map((h) => ({ label: hourLabel(h), on: settings.reminderHour === h, pick: () => updateSettings({ reminderHour: h }) })),
    },
  };
  const active = picker ? pickerConfig[picker] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + 32 }]}
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
        <View style={[styles.card, styles.identityCard]}>
          <View style={styles.identity}>
            <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
            <View style={styles.flex}>
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
                >
                  <Text style={styles.name} numberOfLines={1}>{profile.name || "Athlete"}</Text>
                  {premium.isPremium && (
                    <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.proTag}>
                      <Text style={styles.proTagText}>PRO</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              )}
              <Text style={styles.sub}>
                Level {level} · {GOAL_LABELS[profile.fitnessGoal]}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <View style={styles.xpLabels}>
              <Text style={styles.xpLabel}>
                {atMax ? "Max level reached" : `${Math.max(xp.nextLevelXP - gamification.totalXP, 0).toLocaleString()} XP to level ${level + 1}`}
              </Text>
              <Text style={styles.xpLabel}>{levelDef.title}</Text>
            </View>
            <View style={styles.track}>
              <LinearGradient
                colors={gradient("bar", colors)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { width: `${Math.round(xp.fraction * 100)}%` }]}
              />
            </View>
          </View>

          {!premium.isPremium && (
            <TouchableOpacity onPress={() => router.push("/paywall")} activeOpacity={0.85} accessibilityRole="button">
              <LinearGradient colors={gradient("hero", colors)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upgrade}>
                <Crown size={17} color="#fff" />
                <Text style={styles.upgradeText}>Upgrade to Pro</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Headline stats ── */}
        <View style={[styles.card, styles.statStrip]}>
          {[
            { v: String(totalWorkouts), l: "Workouts" },
            { v: String(streak.currentStreak), l: "Day streak", flame: true },
            { v: String(totalPRs), l: "PRs" },
          ].map((s) => (
            <View key={s.l} style={styles.stat}>
              <View style={styles.statValueRow}>
                {s.flame && <Flame size={18} color={colors.gold} fill={colors.gold} />}
                <Text style={styles.statValue}>{s.v}</Text>
              </View>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* ── Lifetime ── */}
        <View style={[styles.card, styles.list]}>
          {[
            ["Average session", totalWorkouts ? formatDuration(avgDuration) : "—"],
            ["Total time", totalWorkouts ? formatDuration(totalDuration) : "—"],
            ["Total volume", totalWorkouts ? formatVolume(totalVolume, settings.weightUnit) : "—"],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.row, i < 2 && styles.rowBorder]}>
              <Text style={styles.rowLabelMuted}>{l}</Text>
              <Text style={styles.rowStrong}>{v}</Text>
            </View>
          ))}
        </View>

        <AchievementGrid unlockedAchievements={gamification.achievements} />

        {/* ── Training ── */}
        <Text style={styles.sectionLabel}>Training</Text>
        <View style={[styles.card, styles.list]}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Training days</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDays(days - 1)} disabled={days <= MIN_DAYS} accessibilityLabel="Fewer training days">
                <Text style={[styles.stepText, days <= MIN_DAYS && styles.dim]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{days} / wk</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setDays(days + 1)} disabled={days >= MAX_DAYS} accessibilityLabel="More training days">
                <Text style={[styles.stepText, days >= MAX_DAYS && styles.dim]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <PickerRow label="Goal" value={GOAL_LABELS[profile.fitnessGoal]} onPress={() => setPicker("goal")} border styles={styles} colors={colors} />
          <PickerRow label="Experience" value={LEVEL_LABELS[profile.experienceLevel]} onPress={() => setPicker("level")} styles={styles} colors={colors} />
        </View>

        {/* ── Preferences ── */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={[styles.card, styles.list]}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Units</Text>
            <Segmented<WeightUnit>
              label="Weight unit"
              options={[
                { value: "lbs", label: "lb" },
                { value: "kg", label: "kg" },
              ]}
              value={settings.weightUnit}
              onChange={(weightUnit) => updateSettings({ weightUnit })}
              size="sm"
            />
          </View>
          <PickerRow label="Default rest" value={restLabel(settings.defaultRestTimer)} onPress={() => setPicker("rest")} border styles={styles} colors={colors} />
          <View style={[styles.block, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Appearance</Text>
            <Segmented<AppTheme>
              label="Appearance"
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Week starts on</Text>
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
          </View>
          <Toggle
            label="Celebration effects"
            hint="PR and level-up animations"
            value={settings.showConfetti}
            onChange={(showConfetti) => updateSettings({ showConfetti })}
            border
            styles={styles}
            colors={colors}
          />
          <Toggle
            label="Auto-start rest timer"
            hint="When you check off a set"
            value={settings.autoStartRestTimer}
            onChange={(autoStartRestTimer) => updateSettings({ autoStartRestTimer })}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={[styles.card, styles.list]}>
          <Toggle
            label="Workout reminders"
            hint="Skipped on days you've already trained"
            value={settings.notificationsEnabled}
            onChange={(notificationsEnabled) => updateSettings({ notificationsEnabled })}
            border
            styles={styles}
            colors={colors}
          />
          <PickerRow
            label="Reminder time"
            value={hourLabel(settings.reminderHour)}
            onPress={() => settings.notificationsEnabled && setPicker("reminder")}
            disabled={!settings.notificationsEnabled}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* ── Data ── */}
        <Text style={styles.sectionLabel}>Your data</Text>
        <View style={[styles.card, styles.list]}>
          <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={handleExport} accessibilityRole="button">
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Export data</Text>
              <Text style={styles.rowHint}>
                {history.length} workout{history.length === 1 ? "" : "s"} · JSON, weights in lbs
              </Text>
            </View>
            <Download size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleClearData} accessibilityRole="button">
            <Text style={[styles.rowLabel, { color: colors.error, fontWeight: "700" }]}>Erase all data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>GymPulse · Track it. Check it. Crush it.</Text>
          <Text style={styles.footerSub}>v1.0 · Quntm Technology Group LLC</Text>
        </View>
      </ScrollView>

      {/* ── Picker sheet ── */}
      <Modal visible={active !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.sheetRoot}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPicker(null)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{active?.title}</Text>
              <TouchableOpacity onPress={() => setPicker(null)} style={styles.sheetDone} accessibilityRole="button">
                <Text style={styles.sheetDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.optionsCard}>
              {active?.options.map((o, i, a) => (
                <TouchableOpacity
                  key={o.label}
                  style={[styles.option, i < a.length - 1 && styles.rowBorder]}
                  onPress={() => {
                    o.pick();
                    haptic();
                    setPicker(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: o.on }}
                >
                  <Text style={styles.optionText}>{o.label}</Text>
                  {o.on && <Check size={20} color={colors.primaryText} strokeWidth={3} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function PickerRow({
  label,
  value,
  onPress,
  border,
  disabled,
  styles,
  colors,
}: {
  label: string;
  value: string;
  onPress: () => void;
  border?: boolean;
  disabled?: boolean;
  styles: Styles;
  colors: ColorScheme;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, border && styles.rowBorder, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue}>{value}</Text>
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );
}

/** iOS-style switch row, green when on as in the v4 settings. */
function Toggle({
  label,
  hint,
  value,
  onChange,
  border,
  styles,
  colors,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  border?: boolean;
  styles: Styles;
  colors: ColorScheme;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, border && styles.rowBorder]}
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
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={[styles.switchTrack, { backgroundColor: value ? colors.success : colors.fillStrong, alignItems: value ? "flex-end" : "flex-start" }]}>
        <View style={styles.switchThumb} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorScheme) => {
  const card = {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    ...elevation(1, colors),
  };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    dim: { opacity: 0.3 },
    disabled: { opacity: 0.4 },
    scroll: { paddingHorizontal: 20, paddingTop: 10, gap: 16 },
    card,
    identityCard: { borderRadius: 24, padding: 18, gap: 16 },
    identity: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 26, fontWeight: "800", color: "#fff" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    name: { flexShrink: 1, fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: colors.text },
    nameInput: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.6,
      color: colors.text,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
    },
    proTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    proTagText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: "#fff" },
    sub: { fontSize: 13, fontWeight: "600", color: colors.textTertiary, marginTop: 3 },
    xpLabels: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    xpLabel: { fontSize: 12, fontWeight: "700", color: colors.textTertiary, fontVariant: ["tabular-nums"] },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.fillStrong, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 999 },
    upgrade: { height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    upgradeText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    statStrip: { flexDirection: "row", paddingVertical: 14 },
    stat: { flex: 1, alignItems: "center", gap: 2 },
    statValueRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    statValue: { fontSize: 22, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    statLabel: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    list: { paddingVertical: 2, paddingHorizontal: 16 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 56, paddingVertical: 8 },
    block: { gap: 10, paddingVertical: 14 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    rowLabelMuted: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    rowStrong: { fontSize: 15, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    rowHint: { fontSize: 12, fontWeight: "500", color: colors.textTertiary, marginTop: 1 },
    rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
    rowValue: { fontSize: 15, fontWeight: "600", color: colors.textTertiary },
    sectionLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textTertiary, paddingTop: 8, paddingLeft: 4, marginBottom: -6 },
    stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.fill, borderRadius: 10, padding: 2 },
    stepBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
    stepText: { fontSize: 18, fontWeight: "700", color: colors.text },
    stepValue: { minWidth: 56, textAlign: "center", fontSize: 14, fontWeight: "800", color: colors.text },
    switchTrack: { width: 51, height: 31, borderRadius: 999, padding: 2, justifyContent: "center" },
    switchThumb: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#fff", ...elevation(1, colors) },
    footer: { alignItems: "center", gap: 2, paddingTop: 4 },
    footerText: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    footerSub: { fontSize: 11, fontWeight: "500", color: colors.textTertiary, opacity: 0.8 },
    sheetRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { backgroundColor: colors.cardBackground, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, ...elevation(3, colors) },
    handleRow: { alignItems: "center", paddingTop: 8 },
    handle: { width: 38, height: 5, borderRadius: 3, backgroundColor: colors.fillStrong },
    sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingBottom: 8, marginRight: -8 },
    sheetTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: colors.text },
    sheetDone: { height: 44, paddingHorizontal: 8, justifyContent: "center" },
    sheetDoneText: { fontSize: 16, fontWeight: "800", color: colors.primaryText },
    optionsCard: { backgroundColor: colors.card2, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 2, paddingHorizontal: 16 },
    option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 54 },
    optionText: { fontSize: 16, fontWeight: "600", color: colors.text },
  });
};
