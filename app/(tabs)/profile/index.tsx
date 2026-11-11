import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Flame,
  Crown,
  ChevronRight,
  Download,
  Check,
  Pencil,
  CalendarDays,
  Target,
  Gauge,
  Scale,
  Timer,
  SunMoon,
  CalendarRange,
  PartyPopper,
  Zap,
  Bell,
  Clock,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text, TextInput } from "@/components/ui/Text";
import PressableScale from "@/components/ui/PressableScale";
import FadeIn from "@/components/ui/FadeIn";
import Sheet from "@/components/ui/Sheet";
import Meter from "@/components/ui/Meter";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { useDialog } from "@/components/ui/Dialog";
import { useTheme } from "@/providers/ThemeProvider";
import { type ColorScheme } from "@/constants/colors";
import { card, glow } from "@/constants/theme";
import { useGym } from "@/providers/GymProvider";
import { FitnessGoal, ExperienceLevel, GOAL_LABELS, LEVEL_LABELS, WeightUnit, AppTheme, WeekStart } from "@/types";
import { formatVolume } from "@/utils/units";
import { formatDuration } from "@/utils/helpers";
import { haptic } from "@/utils/haptics";
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
  const dialog = useDialog();
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

  const handleSaveName = useCallback(() => {
    if (profile && nameValue.trim()) saveProfile({ ...profile, name: nameValue.trim() });
    setEditingName(false);
  }, [profile, nameValue, saveProfile]);

  const handleExport = useCallback(async () => {
    try {
      await Share.share({ title: "GymPulse data export", message: exportData() });
    } catch {
      dialog.alert("Export failed", "Could not open the share sheet. Please try again.");
    }
  }, [exportData, dialog]);

  const handleClearData = useCallback(() => {
    dialog.confirm({
      title: "Erase all data?",
      message: "This permanently deletes your profile, routines, workout history, records and achievements on this device. It cannot be undone.",
      confirmLabel: "Erase everything",
      destructive: true,
      onConfirm: () => void clearAllData(),
    });
  }, [clearAllData, dialog]);

  if (!profile) return null;

  const level = gamification.level;
  const levelDef = getLevelDefinition(level);
  const xp = getXPProgress(gamification.totalXP);
  const atMax = level >= LEVEL_DEFINITIONS.length;
  const initial = profile.name.trim().charAt(0).toUpperCase() || "G";
  const days = profile.trainingDaysPerWeek;
  const setDays = (d: number) => {
    saveProfile({ ...profile, trainingDaysPerWeek: Math.min(MAX_DAYS, Math.max(MIN_DAYS, d)) });
    haptic.select();
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
  const row = { styles, colors };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (currentSession ? ACTIVE_BAR_HEIGHT : 0) + 36 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        <FadeIn style={[styles.heroShadow, glow("#1D46D8", colors, 0.26)]}>
          <View style={styles.hero}>
            <HeroBackdrop tone="ink" radius={30} />
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
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
                    selectionColor="#fff"
                    accessibilityLabel="Your name"
                  />
                ) : (
                  <Pressable
                    onPress={() => {
                      setNameValue(profile.name);
                      setEditingName(true);
                    }}
                    style={styles.nameRow}
                    accessibilityRole="button"
                    accessibilityLabel={`Your name, ${profile.name}. Tap to edit.`}
                  >
                    <Text style={styles.name} numberOfLines={1}>{profile.name || "Athlete"}</Text>
                    {premium.isPremium ? (
                      <View style={styles.proTag}>
                        <Text style={styles.proTagText}>PRO</Text>
                      </View>
                    ) : (
                      <Pencil size={14} color="rgba(255,255,255,0.6)" />
                    )}
                  </Pressable>
                )}
                <Text style={styles.sub}>
                  {GOAL_LABELS[profile.fitnessGoal]} · {LEVEL_LABELS[profile.experienceLevel]}
                </Text>
              </View>
            </View>

            <View style={styles.levelBlock}>
              <View style={styles.xpLabels}>
                <Text style={styles.levelName}>
                  Level {level} · {levelDef.title}
                </Text>
                <Text style={styles.xpLabel}>{gamification.totalXP.toLocaleString()} XP</Text>
              </View>
              <Meter value={xp.fraction} color="#fff" trackColor="rgba(255,255,255,0.2)" />
              <Text style={styles.xpHint}>
                {atMax ? "Max level reached" : `${Math.max(xp.nextLevelXP - gamification.totalXP, 0).toLocaleString()} XP to level ${level + 1}`}
              </Text>
            </View>

            <View style={styles.heroStats}>
              {[
                { v: String(totalWorkouts), l: "Workouts" },
                { v: String(streak.currentStreak), l: "Day streak", flame: true },
                { v: String(totalPRs), l: "Records" },
              ].map((s) => (
                <View key={s.l} style={styles.heroStat}>
                  <View style={styles.heroStatValueRow}>
                    {s.flame && <Flame size={16} color="#FDBA74" fill="#FDBA74" />}
                    <Text style={styles.heroStatValue}>{s.v}</Text>
                  </View>
                  <Text style={styles.heroStatLabel}>{s.l}</Text>
                </View>
              ))}
            </View>

            {!premium.isPremium && (
              <PressableScale onPress={() => router.push("/paywall")} haptic="light" style={styles.upgrade} accessibilityRole="button">
                <Crown size={17} color="#1D4ED8" />
                <Text style={styles.upgradeText}>Upgrade to Pro</Text>
              </PressableScale>
            )}
          </View>
        </FadeIn>

        {/* ── Lifetime ── */}
        <FadeIn delay={70} style={[styles.card, styles.list]}>
          {[
            ["Average session", totalWorkouts ? formatDuration(avgDuration) : "—"],
            ["Total time", totalWorkouts ? formatDuration(totalDuration) : "—"],
            ["Total volume", totalWorkouts ? formatVolume(totalVolume, settings.weightUnit) : "—"],
            ["Longest streak", `${streak.longestStreak} day${streak.longestStreak === 1 ? "" : "s"}`],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.lifeRow, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabelMuted}>{l}</Text>
              <Text style={styles.rowStrong}>{v}</Text>
            </View>
          ))}
        </FadeIn>

        <AchievementGrid unlockedAchievements={gamification.achievements} />

        {/* ── Training ── */}
        <Text style={styles.sectionLabel}>Training</Text>
        <View style={[styles.card, styles.list]}>
          <View style={styles.row}>
            <RowIcon Icon={CalendarDays} {...row} />
            <Text style={[styles.rowLabel, styles.flex]}>Training days</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setDays(days - 1)} disabled={days <= MIN_DAYS} accessibilityLabel="Fewer training days">
                <Text style={[styles.stepText, days <= MIN_DAYS && styles.dim]}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{days} / wk</Text>
              <Pressable style={styles.stepBtn} onPress={() => setDays(days + 1)} disabled={days >= MAX_DAYS} accessibilityLabel="More training days">
                <Text style={[styles.stepText, days >= MAX_DAYS && styles.dim]}>+</Text>
              </Pressable>
            </View>
          </View>
          <PickerRow Icon={Target} label="Goal" value={GOAL_LABELS[profile.fitnessGoal]} onPress={() => setPicker("goal")} {...row} />
          <PickerRow Icon={Gauge} label="Experience" value={LEVEL_LABELS[profile.experienceLevel]} onPress={() => setPicker("level")} {...row} />
        </View>

        {/* ── Preferences ── */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={[styles.card, styles.list]}>
          <View style={styles.row}>
            <RowIcon Icon={Scale} {...row} />
            <Text style={[styles.rowLabel, styles.flex]}>Units</Text>
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
          <PickerRow Icon={Timer} label="Default rest" value={restLabel(settings.defaultRestTimer)} onPress={() => setPicker("rest")} {...row} />
          <View style={[styles.block, styles.rowBorder]}>
            <View style={styles.blockHead}>
              <RowIcon Icon={SunMoon} {...row} />
              <Text style={styles.rowLabel}>Appearance</Text>
            </View>
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
            <RowIcon Icon={CalendarRange} {...row} />
            <Text style={[styles.rowLabel, styles.flex]}>Week starts on</Text>
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
            Icon={PartyPopper}
            label="Celebration effects"
            hint="Confetti and the workout summary"
            value={settings.showConfetti}
            onChange={(showConfetti) => updateSettings({ showConfetti })}
            {...row}
          />
          <Toggle
            Icon={Zap}
            label="Auto-start rest timer"
            hint="When you check off a set"
            value={settings.autoStartRestTimer}
            onChange={(autoStartRestTimer) => updateSettings({ autoStartRestTimer })}
            {...row}
          />
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={[styles.card, styles.list]}>
          <Toggle
            Icon={Bell}
            label="Workout reminders"
            hint="Skipped on days you've already trained"
            value={settings.notificationsEnabled}
            onChange={(notificationsEnabled) => updateSettings({ notificationsEnabled })}
            first
            {...row}
          />
          <PickerRow
            Icon={Clock}
            label="Reminder time"
            value={hourLabel(settings.reminderHour)}
            onPress={() => settings.notificationsEnabled && setPicker("reminder")}
            disabled={!settings.notificationsEnabled}
            {...row}
          />
        </View>

        {/* ── Data ── */}
        <Text style={styles.sectionLabel}>Your data</Text>
        <View style={[styles.card, styles.list]}>
          <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={handleExport} accessibilityRole="button">
            <RowIcon Icon={Download} {...row} />
            <View style={styles.flex}>
              <Text style={styles.rowLabel}>Export data</Text>
              <Text style={styles.rowHint}>
                {history.length} workout{history.length === 1 ? "" : "s"} · JSON, weights in lbs
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.row, styles.rowBorder, pressed && styles.pressed]} onPress={handleClearData} accessibilityRole="button">
            <View style={[styles.rowIcon, { backgroundColor: colors.errorLight }]}>
              <Trash2 size={17} color={colors.error} strokeWidth={2.3} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.error, fontWeight: "700" }]}>Erase all data</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>GymPulse · Track it. Check it. Crush it.</Text>
          <Text style={styles.footerSub}>v1.0 · Quntm Technology Group LLC</Text>
        </View>
      </ScrollView>

      <Sheet visible={active !== null} onClose={() => setPicker(null)} title={active?.title}>
        <View style={styles.optionsCard}>
          {active?.options.map((o, i) => (
            <Pressable
              key={o.label}
              style={({ pressed }) => [styles.option, i > 0 && styles.rowBorder, pressed && styles.pressed]}
              onPress={() => {
                o.pick();
                haptic.select();
                setPicker(null);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: o.on }}
            >
              <Text style={[styles.optionText, o.on && { color: colors.primaryText, fontWeight: "800" }]}>{o.label}</Text>
              {o.on && <Check size={20} color={colors.primaryText} strokeWidth={3} />}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;
interface RowBase {
  styles: Styles;
  colors: ColorScheme;
}

function RowIcon({ Icon, styles, colors }: RowBase & { Icon: LucideIcon }) {
  return (
    <View style={styles.rowIcon}>
      <Icon size={17} color={colors.primaryText} strokeWidth={2.3} />
    </View>
  );
}

function PickerRow({
  Icon,
  label,
  value,
  onPress,
  disabled,
  styles,
  colors,
}: RowBase & { Icon: LucideIcon; label: string; value: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, styles.rowBorder, disabled && styles.disabled, pressed && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
    >
      <RowIcon Icon={Icon} styles={styles} colors={colors} />
      <Text style={[styles.rowLabel, styles.flex]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

/** Switch row, green when on. */
function Toggle({
  Icon,
  label,
  hint,
  value,
  onChange,
  first,
  styles,
  colors,
}: RowBase & { Icon: LucideIcon; label: string; hint?: string; value: boolean; onChange: (next: boolean) => void; first?: boolean }) {
  return (
    <Pressable
      style={[styles.row, !first && styles.rowBorder]}
      onPress={() => {
        onChange(!value);
        haptic.select();
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <RowIcon Icon={Icon} styles={styles} colors={colors} />
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <View style={[styles.switchTrack, { backgroundColor: value ? colors.success : colors.fillStrong, alignItems: value ? "flex-end" : "flex-start" }]}>
        <View style={styles.switchThumb} />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1, minWidth: 0 },
    dim: { opacity: 0.3 },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.6 },
    scroll: { paddingHorizontal: 20, paddingTop: 10, gap: 16 },
    card: card(colors, 24),
    heroShadow: { borderRadius: 30 },
    hero: { borderRadius: 30, padding: 20, gap: 18, overflow: "hidden" },
    identity: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 26, fontWeight: "800", color: "#fff" },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    name: { flexShrink: 1, fontSize: 24, fontWeight: "800", letterSpacing: -0.7, color: "#fff" },
    nameInput: { fontSize: 24, fontWeight: "800", letterSpacing: -0.7, color: "#fff", borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.6)", paddingVertical: 2 },
    proTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: "#fff" },
    proTagText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: "#1D4ED8" },
    sub: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)", marginTop: 3 },
    levelBlock: { gap: 8 },
    xpLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
    levelName: { fontSize: 14, fontWeight: "800", color: "#fff" },
    xpLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.8)", fontVariant: ["tabular-nums"] },
    xpHint: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.65)", fontVariant: ["tabular-nums"] },
    heroStats: { flexDirection: "row", gap: 8 },
    heroStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.11)", borderRadius: 18, paddingVertical: 13, alignItems: "center", gap: 2 },
    heroStatValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    heroStatValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.7, color: "#fff", fontVariant: ["tabular-nums"] },
    heroStatLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.72)" },
    upgrade: { height: 52, borderRadius: 18, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    upgradeText: { fontSize: 16, fontWeight: "800", color: "#0F1F66" },
    list: { paddingVertical: 2, paddingHorizontal: 16 },
    lifeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 52 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10 },
    rowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
    block: { gap: 12, paddingVertical: 13 },
    blockHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    rowLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
    rowLabelMuted: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    rowStrong: { fontSize: 15, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    rowHint: { fontSize: 12, fontWeight: "500", color: colors.textTertiary, marginTop: 1 },
    rowValue: { fontSize: 15, fontWeight: "600", color: colors.textTertiary },
    sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: colors.textTertiary, paddingTop: 8, paddingLeft: 4, marginBottom: -6 },
    stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.fill, borderRadius: 12, padding: 2 },
    stepBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
    stepText: { fontSize: 18, fontWeight: "700", color: colors.text },
    stepValue: { minWidth: 56, textAlign: "center", fontSize: 14, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    switchTrack: { width: 50, height: 30, borderRadius: 999, padding: 2, justifyContent: "center" },
    switchThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 2 },
    footer: { alignItems: "center", gap: 2, paddingTop: 6 },
    footerText: { fontSize: 12, fontWeight: "600", color: colors.textTertiary },
    footerSub: { fontSize: 11, fontWeight: "500", color: colors.textTertiary, opacity: 0.8 },
    optionsCard: { backgroundColor: colors.card2, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator, paddingVertical: 2, paddingHorizontal: 16 },
    option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56 },
    optionText: { fontSize: 16, fontWeight: "600", color: colors.text },
  });
