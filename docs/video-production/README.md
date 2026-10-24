# Exercise Demo Video Production

GymPulse shows a looping form-demo clip for each exercise. All four programs
share one master library of 26 clips, stored in the `gympulse` PocketBase
project (`https://gympulse.cloudpod.pro`, collection `exercises`).

## Pipeline

1. Pick an exercise from `mocks/exerciseLibrary.ts` (its `slug` is the key everywhere).
2. Generate the clip from its prompt in this folder (FAL.AI or Model Labs).
   Use the approved Barbell Bench Press presenter as the character reference.
3. Paste the generator's CDN link into `video_url` (plays instantly). A re-runnable
   script on the VPS copies any record with a `video_url` and an empty `video` into
   the `video` file field for permanent storage — run it after adding new clips.
   Save the prompt in `generation_prompt` and the job id in `fal_request_id`.
   Thumbnails are not generated server-side (no ffmpeg there); the clip itself is the poster.
4. Set `status` to `review`, check the clip loops cleanly, then set it to `ready`.
   The app plays the `video` file if present, otherwise `video_url`, regardless of status.

Providers used: ModelsLab `seedance-2-5-text-to-video` (#3–5) and Runware — `bytedance:seedance@2.0-mini` for simpler moves, `bytedance:seedance@2.0` for barbell lifts (#6–14). All 720×1280, 8 s, audio off. Prompts: `jobs/batch1-modelslab.json`; Runware task ids: `jobs/runware-tasks.txt` (retrieve with getTaskDetails). Always pass your own `taskUUID` to Runware — the MCP call times out at 60 s but the job keeps running.

The PocketBase batch API is enabled (max 50 requests) for bulk record updates.

## Files

- `global-rules.md` — presenter, wardrobe, gym, format, and negative rules that apply to every clip
- `batch-1-videos-02-14.md` — prompts for videos #2–#14
- `jobs/batch2-runware.json` — prompts, models and Runware task ids for videos #15–#26 (written by Claude in the Batch 1 format)

## Library status

| # | Slug | Prompt |
|---|------|--------|
| 1 | barbell_bench_press | ready — stored in `video`. Alt take from the master prompt (Runware Seedance 2.0, task 1bfccfac…) awaiting comparison |
| 2 | incline_dumbbell_press | draft in review — Seedance 2.5 ref-to-video, stored in `video` |
| 3 | cable_chest_fly | in review — ModelsLab job 190501965, on `video_url` |
| 4 | dumbbell_shoulder_press | in review — ModelsLab job 190501988, on `video_url` |
| 5 | dumbbell_lateral_raise | in review — ModelsLab job 190501997, on `video_url` |
| 6 | rope_triceps_pushdown | in review — Runware Seedance Mini, on `video_url` |
| 7 | overhead_cable_triceps_extension | in review — Runware Seedance Mini, on `video_url` |
| 8 | lat_pulldown | in review — Runware Seedance Mini, on `video_url` |
| 9 | seated_cable_row | in review — Runware Seedance Mini, on `video_url` |
| 10 | one_arm_dumbbell_row | in review — Runware Seedance Mini, on `video_url` |
| 11 | face_pull | in review — Runware Seedance Mini, on `video_url` |
| 12 | ez_bar_curl | in review — Runware Seedance Mini, on `video_url` |
| 13 | hammer_curl | in review — Runware Seedance Mini, on `video_url` |
| 14 | barbell_back_squat | in review — Runware Seedance 2.0, on `video_url` |
| 15 | leg_press | in review — Runware Seedance Mini, on `video_url` |
| 16 | romanian_deadlift | in review — Runware Seedance 2.0, on `video_url` |
| 17 | leg_curl | in review — Runware Seedance Mini, on `video_url` |
| 18 | leg_extension | in review — Runware Seedance Mini, on `video_url` |
| 19 | walking_dumbbell_lunge | in review — Runware Seedance Mini, on `video_url` |
| 20 | standing_calf_raise | in review — Runware Seedance Mini, on `video_url` |
| 21 | hip_thrust | in review — Runware Seedance Mini, on `video_url` |
| 22 | plank | in review — Runware Seedance Mini, on `video_url` |
| 23 | hanging_knee_raise | in review — Runware Seedance Mini, on `video_url` |
| 24 | cable_crunch | in review — Runware Seedance Mini, on `video_url` |
| 25 | push_up | in review — Runware Seedance Mini, on `video_url` |
| 26 | pull_up | in review — Runware Seedance Mini, on `video_url` |
