import { WeightUnit } from "@/types";

/**
 * Weights are stored canonically in POUNDS everywhere in the app
 * (routines, sessions, history, PRs, last-performance).
 * The user's `weightUnit` setting is purely a presentation concern:
 * convert on the way out with `toDisplayWeight`, and back on the way in
 * with `fromDisplayWeight`.
 *
 * Before this existed the unit toggle only swapped the label, so a 225 lb
 * bench press read "225 kg" after switching units.
 */
export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 1 / KG_PER_LB;

/** Smallest increment we bother storing, per unit (in display units). */
const DISPLAY_PRECISION: Record<WeightUnit, number> = {
  lbs: 0.5,
  kg: 0.25,
};

/** Step size for +/- steppers — matches the plates people actually load. */
const STEP: Record<WeightUnit, number> = {
  lbs: 5,
  kg: 2.5,
};

function roundTo(value: number, increment: number): number {
  if (increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

/** Convert a stored (lbs) weight into the unit the user is looking at. */
export function toDisplayWeight(lbs: number, unit: WeightUnit): number {
  if (!Number.isFinite(lbs)) return 0;
  const raw = unit === "kg" ? lbs * KG_PER_LB : lbs;
  return roundTo(raw, DISPLAY_PRECISION[unit]);
}

/** Convert a weight the user typed (in their unit) back into stored lbs. */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  if (!Number.isFinite(value)) return 0;
  const lbs = unit === "kg" ? value * LB_PER_KG : value;
  // Keep two decimals of headroom so kg -> lb -> kg round-trips cleanly.
  return Math.max(0, Math.round(lbs * 100) / 100);
}

/** Stepper increment in *display* units. */
export function weightStep(unit: WeightUnit): number {
  return STEP[unit];
}

/** Stepper increment expressed in stored lbs, for nudging stored values. */
export function weightStepInLbs(unit: WeightUnit): number {
  return fromDisplayWeight(STEP[unit], unit);
}

/** Drop a pointless trailing ".0" but keep real fractions. */
export function trimNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export interface FormatWeightOptions {
  /** Render 0 as "BW" (bodyweight) instead of "0 lbs". Defaults to true. */
  bodyweightLabel?: boolean;
  /** Include the unit suffix. Defaults to true. */
  withUnit?: boolean;
}

/** Format a stored (lbs) weight for display in the user's unit. */
export function formatWeight(
  lbs: number,
  unit: WeightUnit,
  options: FormatWeightOptions = {}
): string {
  const { bodyweightLabel = true, withUnit = true } = options;
  if (bodyweightLabel && (!lbs || lbs <= 0)) return "BW";
  const display = toDisplayWeight(lbs, unit);
  return withUnit ? `${trimNumber(display)} ${unit}` : trimNumber(display);
}

/**
 * Format a large volume figure (stored lbs) compactly: 12,430 -> "12.4k".
 * Volume numbers get big fast, so the raw figure is unreadable in a stat tile.
 */
export function formatVolume(lbs: number, unit: WeightUnit, withUnit = true): string {
  const display = toDisplayWeight(lbs, unit);
  let text: string;
  if (display >= 1_000_000) text = `${(display / 1_000_000).toFixed(1)}M`;
  else if (display >= 1_000) text = `${(display / 1_000).toFixed(1)}k`;
  else text = trimNumber(Math.round(display));
  return withUnit ? `${text} ${unit}` : text;
}

/**
 * One-time migration for users who were on kg before units were real.
 * Their numbers were typed as kg but stored as bare values, so they need
 * to be reinterpreted as kg and converted into canonical lbs.
 */
export function migrateWeightToLbs(value: number, storedAs: WeightUnit): number {
  if (storedAs === "lbs") return value;
  return fromDisplayWeight(value, "kg");
}
