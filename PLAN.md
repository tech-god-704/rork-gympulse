# GymPulse — Gym Workout Tracker App

## Features

- **Onboarding flow**: 3-screen welcome sequence — enter your name, pick a fitness goal, set experience level, and choose training days per week
- **Today screen**: See your daily greeting with streak counter, today's workout with a circular progress ring, and an exercise checklist you can tap to complete
- **Satisfying check-off experience**: Each exercise card animates with a checkmark, shifts to a completed state, and reorders below incomplete ones — with haptic-style feedback
- **Confetti celebration**: Full-screen confetti burst when you finish all exercises in a workout, with a stats summary
- **Rest timer**: After completing a set, choose a rest countdown (30s, 60s, 90s, or custom) shown as a sleek bottom overlay with pulse animation
- **Routines library**: Create, view, edit, and delete workout routines — each showing exercise count, estimated duration, and muscle group tags
- **Exercise library**: Browse exercises by muscle group (Chest, Back, Shoulders, Arms, Legs, Core, Cardio) or add custom exercises that save for reuse
- **Add exercises to routines**: Pick from the built-in library or type a custom exercise with sets, reps, and weight — zero friction
- **Progress screen**: Streak calendar heatmap (GitHub-style), weekly summary card, current/longest streak display, and a bar chart of workouts over the last 8 weeks
- **Profile screen**: View and edit your name, goals, and training days. Minimal settings section.
- **Streak tracking**: A day counts as completed when you finish a full workout. Missing a day resets the streak.
- **All data stored locally** on device — no account or internet required

## Design

- **Clean white background** (#FFFFFF) with electric blue (#3B82F6) accents for buttons, progress elements, and highlights
- Soft gray (#F3F4F6) cards with rounded corners and subtle shadows — premium, airy feel
- Bold modern headings with strong font-weight hierarchy — no color overload
- Generous whitespace on every screen — nothing feels cramped or cluttered
- Smooth micro-animations on every interaction: checkbox fills, card transitions, progress ring updates
- Inspired by Apple Health's clarity meets a luxury fitness brand aesthetic
- Bottom tab bar with 4 tabs: Today, Routines, Progress, Profile

## Pages / Screens

- **Onboarding Screen 1**: Welcome with app name "GymPulse" and tagline "Track it. Check it. Crush it." — big bold text with a Get Started button
- **Onboarding Screen 2**: Enter your name, pick a fitness goal from 4 options, and select experience level
- **Onboarding Screen 3**: Choose how many days per week you want to train (2–7 slider/selector), then finish setup
- **Today (Home tab)**: Greeting banner, streak with flame icon, today's workout progress ring, scrollable exercise checklist with tap-to-complete cards
- **Workout Complete overlay**: Confetti animation, "Workout Complete!" message, stats summary (exercises done, time, streak)
- **Rest Timer overlay**: Bottom sheet with countdown circle, preset buttons (30s/60s/90s/custom), pulse animation
- **Routines (tab)**: List of routine cards with name, exercise count, duration, muscle tags. "Create New" button at top.
- **Routine Detail**: Ordered exercise list with sets/reps/weight. Add exercise button. Swipe to delete.
- **Add Exercise**: Browse categorized library or type a custom exercise name with sets/reps/weight fields
- **Progress (tab)**: Streak calendar heatmap, weekly summary card, current streak display, 8-week bar chart
- **Profile (tab)**: Name, avatar placeholder, member since date, edit goals/training days, settings toggles

## App Icon

- Blue gradient background (electric blue to slightly darker blue) with a bold white dumbbell or pulse/heartbeat line icon — clean, modern, and sporty