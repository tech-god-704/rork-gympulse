/**
 * Guards the design system's invariants across both palettes.
 *
 * Catches the failure modes that are invisible until they ship: a colour token
 * that `tint()` can't parse (it would emit "rgba(NaN,...)" and render nothing),
 * a palette key present in one theme but not the other, or a type role that
 * drifts back below the legibility floor.
 *
 * Run with:  bun run test
 */

import { mock } from "bun:test";


// theme.ts pulls Platform/StyleSheet from react-native, which can't be parsed
// outside a Metro bundle, so stub the surface it actually touches.
mock.module("react-native", () => ({
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default },
  StyleSheet: { create: <T,>(s: T) => s, hairlineWidth: 0.5, absoluteFillObject: {} },
}));

const { LightColors, DarkColors } = await import("@/constants/colors");
const {
  elevation, glow, surface, tint, luminance, onColor,
  muscleColor, dominantMuscleColor, statNumber, Type, Space, Radius,
} = await import("@/constants/theme");

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) { pass++; }
  else { fail++; console.log(`  FAIL ${name}`, detail ?? ""); }
};

const GROUPS = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio"] as const;

for (const [theme, colors] of [["light", LightColors], ["dark", DarkColors]] as const) {
  for (const [key, value] of Object.entries(colors)) {
    if (key === "scheme") continue;
    check(`${theme}.${key} is a colour`, typeof value === "string" && value.length > 0, value);
    // Every token must survive tint(): the neutral fills are rgba strings, and
    // a naive hex parser would turn those into rgba(NaN,NaN,NaN).
    check(`${theme}.${key} tints cleanly`, !tint(value as string, 0.2).includes("NaN"), tint(value as string, 0.2));
  }

  for (const level of [0, 1, 2, 3] as const) {
    check(`${theme} elevation(${level})`, typeof elevation(level, colors) === "object");
    const s = surface(colors, level);
    check(
      `${theme} surface(${level}) is complete`,
      Boolean(s.backgroundColor && s.borderColor && s.borderRadius != null)
    );
  }
  // Shadows are invisible on black, so dark mode must lean on the surface ramp.
  check(`${theme} elevation has no iOS shadow in dark`, theme === "light" || !("shadowOpacity" in elevation(2, colors)));
  check(`${theme} glow`, Boolean(glow(colors.primary, colors)));

  for (const group of GROUPS) {
    const c = muscleColor(group, colors);
    check(`${theme} muscleColor(${group})`, c.startsWith("#"), c);
  }
  check(`${theme} dominantMuscleColor([]) is undefined`, dominantMuscleColor([], colors) === undefined);
  check(
    `${theme} dominantMuscleColor picks the majority`,
    dominantMuscleColor(["chest", "chest", "legs"], colors) === muscleColor("chest", colors)
  );

  const l = luminance(colors.primary);
  check(`${theme} luminance in range`, l >= 0 && l <= 1, l);
  check(`${theme} onColor returns a foreground`, ["#FFFFFF", "#101014"].includes(onColor(colors.primary)));
}

for (const [role, style] of Object.entries(Type)) {
  const t = style as { fontSize: number; lineHeight?: number };
  check(`Type.${role} is at least 11px`, t.fontSize >= 11, t.fontSize);
  check(`Type.${role} sets a lineHeight`, Boolean(t.lineHeight));
}

for (const size of [14, 17, 22, 28, 46, 52]) {
  const n = statNumber(size);
  check(`statNumber(${size}) uses tabular figures`, n.fontSize === size && Boolean(n.fontVariant));
}

check("Space scale ascends", Space.xs < Space.sm && Space.sm < Space.base && Space.base < Space.xl);
check("Radius scale ascends", Radius.xs < Radius.sm && Radius.sm < Radius.md && Radius.md < Radius.lg);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) throw new Error(`${fail} theme check(s) failed`);
