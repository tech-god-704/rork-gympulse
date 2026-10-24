import { MuscleGroup } from "@/types";

export interface LibraryExercise {
  slug: string;
  name: string;
  muscleGroup: MuscleGroup;
  targetArea: string;
  equipment: string;
  /** Names in BUILT_IN_EXERCISES / routines that should show this demo. */
  aliases: string[];
  setup: string[];
  cues: string[];
  commonMistakes: string[];
  breathing: string;
}

// The master demo library. Each entry gets one AI-generated clip in the
// PocketBase `exercises` collection, matched by slug.
export const EXERCISE_LIBRARY: LibraryExercise[] = [
  {
    slug: "barbell_bench_press",
    name: "Barbell Bench Press",
    muscleGroup: "chest",
    targetArea: "Chest, front delts, triceps",
    equipment: "Barbell, flat bench",
    aliases: ["Bench Press", "Barbell Bench Press", "Flat Bench Press"],
    setup: [
      "Lie with eyes directly under the bar",
      "Grip slightly wider than shoulders, wrists stacked over elbows",
      "Pull shoulder blades back and down, feet planted",
    ],
    cues: [
      "Unrack and hold the bar over your shoulders",
      "Lower under control to mid-chest, elbows about 45°",
      "Touch lightly, then press up and slightly back",
      "Keep glutes and upper back on the bench",
    ],
    commonMistakes: ["Flaring elbows to 90°", "Bouncing the bar off the chest", "Lifting hips off the bench"],
    breathing: "Breathe in and brace before lowering, breathe out as you press.",
  },
  {
    slug: "incline_dumbbell_press",
    name: "Incline Dumbbell Press",
    muscleGroup: "chest",
    targetArea: "Upper chest, front delts",
    equipment: "Dumbbells, incline bench",
    aliases: ["Incline Dumbbell Press", "Incline DB Press", "Incline Press"],
    setup: [
      "Set the bench to 30–45°",
      "Kick dumbbells up to shoulder level, palms forward",
      "Shoulder blades pinched, chest up",
    ],
    cues: [
      "Press the dumbbells up and slightly together",
      "Stop just short of the dumbbells touching",
      "Lower slowly until you feel a stretch in the upper chest",
    ],
    commonMistakes: ["Bench set too steep", "Clanking dumbbells at the top", "Shortening the range"],
    breathing: "Inhale on the way down, exhale as you press.",
  },
  {
    slug: "cable_chest_fly",
    name: "Cable Chest Fly",
    muscleGroup: "chest",
    targetArea: "Chest",
    equipment: "Cable station",
    aliases: ["Cable Flyes", "Cable Fly", "Cable Chest Fly", "Cable Crossovers"],
    setup: [
      "Set pulleys around shoulder height",
      "Step forward into a split stance",
      "Slight bend in the elbows, chest tall",
    ],
    cues: [
      "Sweep hands together in a wide arc",
      "Squeeze the chest as hands meet",
      "Return slowly until you feel a stretch",
    ],
    commonMistakes: ["Turning it into a press", "Using momentum", "Letting shoulders roll forward"],
    breathing: "Exhale as hands come together, inhale on the way back.",
  },
  {
    slug: "dumbbell_shoulder_press",
    name: "Dumbbell Shoulder Press",
    muscleGroup: "shoulders",
    targetArea: "Front and side delts, triceps",
    equipment: "Dumbbells, bench",
    aliases: ["Dumbbell Shoulder Press", "Seated Dumbbell Shoulder Press", "DB Shoulder Press"],
    setup: [
      "Sit upright with back supported",
      "Dumbbells at shoulder height, palms forward",
      "Brace your core, ribs down",
    ],
    cues: [
      "Press straight up until arms are nearly locked",
      "Keep wrists stacked over elbows",
      "Lower back to ear level with control",
    ],
    commonMistakes: ["Arching the lower back", "Partial reps", "Elbows drifting behind the body"],
    breathing: "Exhale as you press, inhale as you lower.",
  },
  {
    slug: "dumbbell_lateral_raise",
    name: "Dumbbell Lateral Raise",
    muscleGroup: "shoulders",
    targetArea: "Side delts",
    equipment: "Dumbbells",
    aliases: ["Lateral Raises", "Lateral Raise", "Dumbbell Lateral Raise", "Side Raises"],
    setup: [
      "Stand tall, dumbbells at your sides",
      "Slight bend in the elbows",
      "Lean forward a few degrees",
    ],
    cues: [
      "Raise arms out to the sides to shoulder height",
      "Lead with the elbows, not the hands",
      "Lower slowly over 2–3 seconds",
    ],
    commonMistakes: ["Swinging the weight", "Shrugging the shoulders", "Going too heavy"],
    breathing: "Exhale on the way up, inhale on the way down.",
  },
  {
    slug: "rope_triceps_pushdown",
    name: "Rope Triceps Pushdown",
    muscleGroup: "arms",
    targetArea: "Triceps",
    equipment: "Cable station, rope",
    aliases: ["Tricep Pushdowns", "Triceps Pushdown", "Rope Pushdown", "Rope Triceps Pushdown"],
    setup: [
      "Attach a rope to a high pulley",
      "Elbows pinned to your sides",
      "Slight forward lean, chest up",
    ],
    cues: [
      "Push down until arms are straight",
      "Spread the rope apart at the bottom",
      "Let the forearms rise back to parallel slowly",
    ],
    commonMistakes: ["Elbows drifting forward", "Leaning over the weight", "Rushing the return"],
    breathing: "Exhale as you push down, inhale as you return.",
  },
  {
    slug: "overhead_cable_triceps_extension",
    name: "Overhead Cable Triceps Extension",
    muscleGroup: "arms",
    targetArea: "Triceps (long head)",
    equipment: "Cable station, rope",
    aliases: ["Overhead Tricep Extension", "Overhead Triceps Extension", "Overhead Cable Triceps Extension", "Cable Overhead Extension"],
    setup: [
      "Face away from a low pulley, rope behind your head",
      "Staggered stance, slight forward lean",
      "Elbows pointing forward, close to your head",
    ],
    cues: [
      "Extend arms forward and up until straight",
      "Keep upper arms still",
      "Lower behind the head for a deep stretch",
    ],
    commonMistakes: ["Elbows flaring wide", "Arching the lower back", "Moving the upper arms"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  {
    slug: "lat_pulldown",
    name: "Lat Pulldown",
    muscleGroup: "back",
    targetArea: "Lats, biceps",
    equipment: "Lat pulldown machine",
    aliases: ["Lat Pulldown", "Lat Pull-Down"],
    setup: [
      "Thighs locked under the pad",
      "Grip just outside shoulder width",
      "Lean back slightly, chest up",
    ],
    cues: [
      "Pull the bar to your upper chest",
      "Drive elbows down toward your hips",
      "Control the bar all the way back up",
    ],
    commonMistakes: ["Pulling behind the neck", "Leaning way back", "Letting the weight yank you up"],
    breathing: "Exhale as you pull down, inhale as you return.",
  },
  {
    slug: "seated_cable_row",
    name: "Seated Cable Row",
    muscleGroup: "back",
    targetArea: "Mid back, lats, rear delts",
    equipment: "Cable row station",
    aliases: ["Seated Cable Row", "Cable Row"],
    setup: [
      "Feet on the platform, knees slightly bent",
      "Sit tall with a neutral spine",
      "Arms extended, shoulders forward",
    ],
    cues: [
      "Pull the handle to your lower ribs",
      "Squeeze shoulder blades together",
      "Return slowly, letting the shoulders reach",
    ],
    commonMistakes: ["Rocking the torso", "Shrugging", "Rounding the lower back"],
    breathing: "Exhale as you row, inhale as you return.",
  },
  {
    slug: "one_arm_dumbbell_row",
    name: "One-Arm Dumbbell Row",
    muscleGroup: "back",
    targetArea: "Lats, mid back",
    equipment: "Dumbbell, flat bench",
    aliases: ["One-Arm Dumbbell Row", "Dumbbell Row", "Dumbbell Rows", "Single-Arm Row"],
    setup: [
      "One knee and hand on the bench",
      "Back flat, parallel to the floor",
      "Dumbbell hanging under the shoulder",
    ],
    cues: [
      "Pull the dumbbell toward your hip",
      "Keep the elbow close to your body",
      "Lower until the arm is fully straight",
    ],
    commonMistakes: ["Twisting the torso", "Pulling to the chest", "Jerking the weight"],
    breathing: "Exhale as you pull, inhale as you lower.",
  },
  {
    slug: "face_pull",
    name: "Face Pull",
    muscleGroup: "shoulders",
    targetArea: "Rear delts, upper back",
    equipment: "Cable station, rope",
    aliases: ["Face Pulls", "Face Pull"],
    setup: [
      "Rope at upper-chest to face height",
      "Overhand grip, thumbs toward you",
      "Step back until arms are straight",
    ],
    cues: [
      "Pull the rope toward your face",
      "Split the rope and pull hands past your ears",
      "Finish with elbows high and shoulders back",
    ],
    commonMistakes: ["Elbows dropping low", "Leaning back", "Going too heavy"],
    breathing: "Exhale as you pull, inhale as you return.",
  },
  {
    slug: "ez_bar_curl",
    name: "EZ-Bar Curl",
    muscleGroup: "arms",
    targetArea: "Biceps",
    equipment: "EZ bar",
    aliases: ["EZ-Bar Curl", "EZ Bar Curl", "EZ Bar Curls", "Barbell Curls"],
    setup: [
      "Stand tall, grip the angled part of the bar",
      "Elbows at your sides",
      "Shoulders back, core braced",
    ],
    cues: [
      "Curl the bar toward your shoulders",
      "Keep elbows pinned in place",
      "Lower all the way down slowly",
    ],
    commonMistakes: ["Swinging the hips", "Elbows drifting forward", "Half reps"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  {
    slug: "hammer_curl",
    name: "Hammer Curl",
    muscleGroup: "arms",
    targetArea: "Biceps, brachialis, forearms",
    equipment: "Dumbbells",
    aliases: ["Hammer Curls", "Hammer Curl"],
    setup: [
      "Stand tall, dumbbells at your sides",
      "Palms facing each other",
      "Elbows close to your body",
    ],
    cues: [
      "Curl up keeping thumbs on top",
      "Squeeze at the top",
      "Lower under control",
    ],
    commonMistakes: ["Swinging", "Rotating the wrists", "Moving the elbows"],
    breathing: "Exhale on the way up, inhale on the way down.",
  },
  {
    slug: "barbell_back_squat",
    name: "Barbell Back Squat",
    muscleGroup: "legs",
    targetArea: "Quads, glutes, adductors",
    equipment: "Barbell, squat rack",
    aliases: ["Barbell Squats", "Back Squat", "Barbell Back Squat", "Squat"],
    setup: [
      "Bar on your upper back, not your neck",
      "Feet shoulder-width, toes slightly out",
      "Brace your core hard before moving",
    ],
    cues: [
      "Sit down and back between your hips",
      "Knees track over your toes",
      "Go to at least parallel",
      "Drive up through the whole foot",
    ],
    commonMistakes: ["Knees caving in", "Heels lifting", "Rounding the lower back"],
    breathing: "Big breath and brace at the top, exhale after you pass the hardest point.",
  },
  {
    slug: "leg_press",
    name: "Leg Press",
    muscleGroup: "legs",
    targetArea: "Quads, glutes",
    equipment: "Leg press machine",
    aliases: ["Leg Press"],
    setup: [
      "Back and hips flat against the pad",
      "Feet shoulder-width, mid-platform",
      "Release the safety handles",
    ],
    cues: [
      "Lower until knees reach about 90°",
      "Press through your heels",
      "Stop just short of locking the knees",
    ],
    commonMistakes: ["Hips lifting off the seat", "Locking the knees", "Knees caving in"],
    breathing: "Inhale as you lower, exhale as you press.",
  },
  {
    slug: "romanian_deadlift",
    name: "Romanian Deadlift",
    muscleGroup: "legs",
    targetArea: "Hamstrings, glutes, lower back",
    equipment: "Barbell",
    aliases: ["Romanian Deadlift", "RDL"],
    setup: [
      "Stand tall holding the bar at hip height",
      "Feet hip-width, soft knees",
      "Shoulders back, lats tight",
    ],
    cues: [
      "Push hips back like closing a door",
      "Keep the bar close to your legs",
      "Lower until you feel a strong hamstring stretch",
      "Drive hips forward to stand",
    ],
    commonMistakes: ["Rounding the back", "Squatting it down", "Bar drifting away from the legs"],
    breathing: "Inhale and brace before lowering, exhale as you stand.",
  },
  {
    slug: "leg_curl",
    name: "Leg Curl",
    muscleGroup: "legs",
    targetArea: "Hamstrings",
    equipment: "Leg curl machine",
    aliases: ["Leg Curls", "Leg Curl", "Hamstring Curl"],
    setup: [
      "Pad sits just above the heels",
      "Knees line up with the machine pivot",
      "Hips pressed into the pad",
    ],
    cues: [
      "Curl heels toward your glutes",
      "Squeeze at the top",
      "Lower slowly to full extension",
    ],
    commonMistakes: ["Hips lifting", "Using momentum", "Cutting the range short"],
    breathing: "Exhale as you curl, inhale as you lower.",
  },
  {
    slug: "leg_extension",
    name: "Leg Extension",
    muscleGroup: "legs",
    targetArea: "Quads",
    equipment: "Leg extension machine",
    aliases: ["Leg Extensions", "Leg Extension"],
    setup: [
      "Knees line up with the machine pivot",
      "Pad on the lower shins",
      "Hold the side handles",
    ],
    cues: [
      "Extend your legs until straight",
      "Pause and squeeze the quads",
      "Lower slowly",
    ],
    commonMistakes: ["Kicking the weight up", "Lifting off the seat", "Dropping the weight"],
    breathing: "Exhale as you extend, inhale as you lower.",
  },
  {
    slug: "walking_dumbbell_lunge",
    name: "Walking Dumbbell Lunge",
    muscleGroup: "legs",
    targetArea: "Quads, glutes",
    equipment: "Dumbbells",
    aliases: ["Walking Lunges", "Walking Lunge", "Lunges", "Walking Dumbbell Lunge"],
    setup: [
      "Stand tall with dumbbells at your sides",
      "Core braced, shoulders back",
      "Clear path ahead",
    ],
    cues: [
      "Step forward into a long stride",
      "Lower until the back knee nearly touches",
      "Drive through the front heel into the next step",
    ],
    commonMistakes: ["Short steps", "Front knee caving in", "Leaning forward"],
    breathing: "Inhale as you lower, exhale as you drive up.",
  },
  {
    slug: "standing_calf_raise",
    name: "Standing Calf Raise",
    muscleGroup: "legs",
    targetArea: "Calves",
    equipment: "Calf raise machine or step",
    aliases: ["Calf Raises", "Calf Raise", "Standing Calf Raise"],
    setup: [
      "Balls of the feet on the edge",
      "Shoulders under the pads",
      "Legs straight, knees soft",
    ],
    cues: [
      "Rise up as high as possible",
      "Pause at the top",
      "Lower into a deep stretch",
    ],
    commonMistakes: ["Bouncing", "Bending the knees", "Short range of motion"],
    breathing: "Exhale on the way up, inhale on the way down.",
  },
  {
    slug: "hip_thrust",
    name: "Hip Thrust",
    muscleGroup: "legs",
    targetArea: "Glutes",
    equipment: "Barbell, bench",
    aliases: ["Hip Thrusts", "Hip Thrust"],
    setup: [
      "Upper back against the bench edge",
      "Bar over the hip crease, padded",
      "Feet flat, shins vertical at the top",
    ],
    cues: [
      "Drive hips up until the torso is flat",
      "Squeeze glutes hard at the top",
      "Keep chin tucked, ribs down",
      "Lower with control",
    ],
    commonMistakes: ["Arching the lower back", "Feet too far out", "Not reaching full hip extension"],
    breathing: "Exhale as you drive up, inhale as you lower.",
  },
  {
    slug: "plank",
    name: "Plank",
    muscleGroup: "core",
    targetArea: "Core",
    equipment: "Bodyweight",
    aliases: ["Plank", "Planks"],
    setup: [
      "Forearms on the floor, elbows under shoulders",
      "Legs straight, feet together",
      "Body in one straight line",
    ],
    cues: [
      "Squeeze glutes and brace abs",
      "Push the floor away with your forearms",
      "Keep your neck neutral",
    ],
    commonMistakes: ["Hips sagging", "Hips piked high", "Holding your breath"],
    breathing: "Slow, steady breaths through the whole hold.",
  },
  {
    slug: "hanging_knee_raise",
    name: "Hanging Knee Raise",
    muscleGroup: "core",
    targetArea: "Lower abs, hip flexors",
    equipment: "Pull-up bar",
    aliases: ["Hanging Knee Raise", "Hanging Knee Raises", "Hanging Leg Raise", "Hanging Leg Raises"],
    setup: [
      "Hang from a bar, shoulder-width grip",
      "Shoulders active, not shrugged",
      "Legs together",
    ],
    cues: [
      "Raise knees toward your chest",
      "Curl the pelvis up at the top",
      "Lower slowly without swinging",
    ],
    commonMistakes: ["Swinging", "Only lifting to hip height", "Dropping the legs"],
    breathing: "Exhale as you raise, inhale as you lower.",
  },
  {
    slug: "cable_crunch",
    name: "Cable Crunch",
    muscleGroup: "core",
    targetArea: "Abs",
    equipment: "Cable station, rope",
    aliases: ["Cable Crunch", "Cable Crunches"],
    setup: [
      "Kneel facing a high pulley",
      "Rope held beside your head",
      "Hips stacked over knees",
    ],
    cues: [
      "Crunch down by curling your spine",
      "Bring elbows toward your knees",
      "Return slowly to a stretch",
    ],
    commonMistakes: ["Pulling with the arms", "Sitting back on the heels", "Moving the hips"],
    breathing: "Exhale hard as you crunch, inhale as you return.",
  },
  {
    slug: "push_up",
    name: "Push-Up",
    muscleGroup: "chest",
    targetArea: "Chest, triceps, front delts",
    equipment: "Bodyweight",
    aliases: ["Push-Up", "Push-Ups", "Pushups"],
    setup: [
      "Hands slightly wider than shoulders",
      "Body in a straight line, core tight",
      "Feet together",
    ],
    cues: [
      "Lower your chest to just above the floor",
      "Elbows angled about 45°",
      "Push the floor away to the top",
    ],
    commonMistakes: ["Hips sagging", "Elbows flaring", "Half reps"],
    breathing: "Inhale on the way down, exhale as you push.",
  },
  {
    slug: "pull_up",
    name: "Assisted Pull-Up / Pull-Up",
    muscleGroup: "back",
    targetArea: "Lats, biceps",
    equipment: "Pull-up bar or assisted machine",
    aliases: ["Pull-Ups", "Pull-Up", "Assisted Pull-Up", "Assisted Pull-Ups", "Chin-Ups"],
    setup: [
      "Grip just outside shoulder width",
      "Hang with arms straight, shoulders engaged",
      "Legs still, slightly forward",
    ],
    cues: [
      "Pull your chest toward the bar",
      "Drive elbows down to your sides",
      "Lower all the way to a dead hang",
    ],
    commonMistakes: ["Kipping", "Half reps", "Shrugging at the top"],
    breathing: "Exhale as you pull up, inhale as you lower.",
  },
];

const BY_SLUG = new Map(EXERCISE_LIBRARY.map((e) => [e.slug, e]));
const BY_ALIAS = new Map<string, LibraryExercise>();
for (const e of EXERCISE_LIBRARY) {
  for (const a of [e.name, ...e.aliases]) BY_ALIAS.set(a.toLowerCase(), e);
}

export function getLibraryExercise(slug: string): LibraryExercise | undefined {
  return BY_SLUG.get(slug);
}

/** Finds the demo for an exercise name used in a routine (e.g. "Bench Press"). */
export function findLibraryExerciseByName(name: string): LibraryExercise | undefined {
  return BY_ALIAS.get(name.trim().toLowerCase());
}
