# Exercise Demo Video Production

GymPulse shows a looping form-demo clip for each exercise. All four programs
share one master library of 26 clips, stored in the `gympulse` PocketBase
project (`https://gympulse.cloudpod.pro`, collection `exercises`).

## Pipeline

1. Pick an exercise from `mocks/exerciseLibrary.ts` (its `slug` is the key everywhere).
2. Generate the clip from its prompt in this folder (FAL.AI or Model Labs).
   Use the approved Barbell Bench Press presenter as the character reference.
3. Upload the MP4 to the matching PocketBase record's `video` field,
   save the prompt in `generation_prompt` and the job id in `fal_request_id`.
4. Set `status` to `review`, check the clip loops cleanly, then set it to `ready`.
   The app shows any record that has a `video` file, regardless of status.

## Files

- `global-rules.md` — presenter, wardrobe, gym, format, and negative rules that apply to every clip
- `batch-1-videos-02-14.md` — prompts for videos #2–#14

## Library status

| # | Slug | Prompt |
|---|------|--------|
| 1 | barbell_bench_press | already generated (reference presenter) |
| 2 | incline_dumbbell_press | batch 1 |
| 3 | cable_chest_fly | batch 1 |
| 4 | dumbbell_shoulder_press | batch 1 |
| 5 | dumbbell_lateral_raise | batch 1 |
| 6 | rope_triceps_pushdown | batch 1 |
| 7 | overhead_cable_triceps_extension | batch 1 |
| 8 | lat_pulldown | batch 1 |
| 9 | seated_cable_row | batch 1 |
| 10 | one_arm_dumbbell_row | batch 1 |
| 11 | face_pull | batch 1 |
| 12 | ez_bar_curl | batch 1 |
| 13 | hammer_curl | batch 1 |
| 14 | barbell_back_squat | batch 1 |
| 15 | leg_press | needed |
| 16 | romanian_deadlift | needed |
| 17 | leg_curl | needed |
| 18 | leg_extension | needed |
| 19 | walking_dumbbell_lunge | needed |
| 20 | standing_calf_raise | needed |
| 21 | hip_thrust | needed |
| 22 | plank | needed |
| 23 | hanging_knee_raise | needed |
| 24 | cable_crunch | needed |
| 25 | push_up | needed |
| 26 | pull_up | needed |
