# Updating GymPulse without a new TestFlight build

There are two kinds of live updates. Neither needs Apple review.

## 1. Content: exercises, videos and coaching text (instant)

The exercise library is read from PocketBase (`https://gympulse.cloudpod.pro/_/`, collection `exercises`).
The app refetches it every time it comes to the foreground.

| To do this | Edit in PocketBase |
|---|---|
| Replace a demo video | Upload a new file to `video` (the VPS script can also copy from `video_url`) |
| Change the thumbnail | Upload to `thumbnail` |
| Edit setup / cues / mistakes / breathing | `setup`, `cues`, `common_mistakes` (JSON lists of strings), `breathing` |
| Rename an exercise or change its muscle group / equipment | `name`, `muscle_group`, `equipment`, `target_area` |
| Reorder the library | `sort_order` |
| Add a brand-new exercise demo | Create a record with a unique `slug`, the text fields and a `video` (or `video_url`). It appears once it has a video. |
| Make a routine exercise open a demo | Add its routine name to `aliases`, e.g. `["Dumbbell Rows", "DB Row"]` |

`mocks/exerciseLibrary.ts` is only the offline fallback for the original 26 exercises.

## 2. Code: screens, layouts, logic (EAS Update)

The app includes `expo-updates` (runtime version = app `version`, currently 1.0.0) and checks for a
new JavaScript bundle on its channel every time it comes to the foreground. A downloaded update
is applied the next time the user returns to the app.

- **One-time:** ship one more build that includes `expo-updates` (any build made from `main` after this change).
- **Then:** every push to `main` runs `.github/workflows/eas-update.yml`, which publishes to the
  `production` channel. It needs an `EXPO_TOKEN` repository secret from an Expo account that has
  access to EAS project `b735f2f9-2847-4310-b4ef-057e8c26dd60`; without it the job skips.
- **Manual alternative:** `eas update --channel production --message "what changed"`.

What still needs a new store build: adding or upgrading native modules, changing permissions, the app
icon or splash, or anything else in native config. When you do that, bump `version` in `app.json` so
old builds don't receive incompatible JavaScript.
