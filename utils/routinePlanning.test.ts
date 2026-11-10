/**
 * Checks for how a workout split is laid out across the week.
 *
 * Run with:  bun run test
 */
import { planSchedule, routineColorFor } from "@/utils/routinePlanning";

let pass = 0, fail = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`, `got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`); }
}

console.log("planSchedule");
eq("three routines, three days", planSchedule(3, 3), [["monday"], ["wednesday"], ["friday"]]);
eq("three routines on a six-day split run twice each", planSchedule(3, 6), [
  ["monday", "thursday"],
  ["tuesday", "friday"],
  ["wednesday", "saturday"],
]);
eq("four-day upper/lower", planSchedule(4, 4), [["monday"], ["tuesday"], ["thursday"], ["friday"]]);
eq("taken days are skipped, not reassigned", planSchedule(3, 3, ["wednesday"]), [["monday"], [], ["friday"]]);
eq("no routines", planSchedule(0, 4), []);
eq("frequency is clamped to a week", planSchedule(2, 12).flat().length, 7);
eq("missing frequency falls back to one day per routine", planSchedule(2, 0), [["monday"], ["thursday"]]);

console.log("routineColorFor");
eq("majority muscle wins", routineColorFor(["chest", "chest", "arms"]), "#EF4444");
eq("empty routine has no color", routineColorFor([]), undefined);
eq("first group wins a tie", routineColorFor(["legs", "core"]), "#3B82F6");

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) throw new Error(`${fail} check(s) failed`);
