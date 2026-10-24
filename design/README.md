# Design reference

Five product screens at iPhone 15 Pro size (393x852 @3x), rendered from the
HTML artboards in `artboards/`. Colours, spacing, radii and type are taken
from `constants/theme.ts` and `constants/colors.ts`, not approximated.

| # | Screen | File |
|---|--------|------|
| 1 | Today, live workout (light) | `screenshots/1-today.png` |
| 2 | Progress (dark) | `screenshots/2-progress.png` |
| 3 | Workout complete | `screenshots/3-complete.png` |
| 4 | Routines (light) | `screenshots/4-routines.png` |
| 5 | Profile (dark) | `screenshots/5-profile.png` |

`artboards/canvas.json` lays the artboards out on one canvas; the sample data
is a single consistent lifter (level 13, 12-day streak, 84 workouts) so every
screen tells the same story.
