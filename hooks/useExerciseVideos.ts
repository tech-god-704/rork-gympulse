import { useMemo } from "react";
import { AppState } from "react-native";
import { focusManager, useQuery } from "@tanstack/react-query";
import { PB_URL } from "@/constants/backend";
import { EXERCISE_LIBRARY, type LibraryExercise } from "@/mocks/exerciseLibrary";
import { MuscleGroup } from "@/types";

export interface ExerciseVideo {
  slug: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

interface PBExerciseRecord {
  id: string;
  collectionId: string;
  slug: string;
  name: string;
  muscle_group: MuscleGroup;
  target_area: string;
  equipment: string;
  setup: unknown;
  cues: unknown;
  common_mistakes: unknown;
  breathing: string;
  aliases?: unknown;
  sort_order?: number;
  video: string;
  thumbnail: string;
  video_url?: string;
  thumbnail_url?: string;
}

interface RemoteLibrary {
  records: PBExerciseRecord[];
  videos: Record<string, ExerciseVideo>;
}

// React Native has no window focus, so refetch when the app returns to the foreground.
// That way an edit in PocketBase shows up the next time someone opens the app.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener("change", (state) => setFocused(state === "active"));
  return () => sub.remove();
});

function fileUrl(r: PBExerciseRecord, file: string): string | null {
  return file ? `${PB_URL}/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(file)}` : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

async function fetchLibrary(): Promise<RemoteLibrary> {
  const res = await fetch(`${PB_URL}/api/collections/exercises/records?perPage=200&sort=sort_order`);
  if (!res.ok) throw new Error(`Exercise library request failed: ${res.status}`);
  const json = (await res.json()) as { items: PBExerciseRecord[] };
  const videos: Record<string, ExerciseVideo> = {};
  for (const r of json.items) {
    // An uploaded file wins; the *_url fields cover clips still hosted on the generator's CDN.
    videos[r.slug] = {
      slug: r.slug,
      videoUrl: fileUrl(r, r.video) ?? (r.video_url || null),
      thumbnailUrl: fileUrl(r, r.thumbnail) ?? (r.thumbnail_url || null),
    };
  }
  return { records: json.items, videos };
}

function useRemoteLibrary() {
  return useQuery({
    queryKey: ["exerciseLibrary"],
    queryFn: fetchLibrary,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * The exercise library, driven by PocketBase. The bundled copy in mocks/exerciseLibrary.ts is the
 * offline fallback; server text overrides it field by field, and any extra record that has a video
 * is added — so new demos, edited cues and replaced clips all go live without an app update.
 */
export function useExerciseLibrary() {
  const { data } = useRemoteLibrary();

  return useMemo(() => {
    const bundled = new Map(EXERCISE_LIBRARY.map((e) => [e.slug, e]));
    const merged = new Map<string, LibraryExercise>(bundled);
    const order = new Map(EXERCISE_LIBRARY.map((e, i) => [e.slug, i]));

    for (const r of data?.records ?? []) {
      const base = bundled.get(r.slug);
      const hasVideo = !!data?.videos[r.slug]?.videoUrl;
      if (!base && !hasVideo) continue;
      const pick = (remote: string[], fallback: string[] = []) => (remote.length > 0 ? remote : fallback);
      merged.set(r.slug, {
        slug: r.slug,
        name: r.name || base?.name || r.slug,
        muscleGroup: r.muscle_group || base?.muscleGroup || "core",
        targetArea: r.target_area || base?.targetArea || "",
        equipment: r.equipment || base?.equipment || "",
        aliases: [...new Set([...(base?.aliases ?? []), ...stringList(r.aliases), r.name].filter(Boolean))],
        setup: pick(stringList(r.setup), base?.setup),
        cues: pick(stringList(r.cues), base?.cues),
        commonMistakes: pick(stringList(r.common_mistakes), base?.commonMistakes),
        breathing: r.breathing || base?.breathing || "",
      });
      if (typeof r.sort_order === "number") order.set(r.slug, r.sort_order);
    }

    const exercises = [...merged.values()].sort(
      (a, b) => (order.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.slug) ?? Number.MAX_SAFE_INTEGER)
    );
    const byAlias = new Map<string, LibraryExercise>();
    for (const ex of exercises) {
      for (const alias of [ex.name, ...ex.aliases]) byAlias.set(alias.trim().toLowerCase(), ex);
    }

    return {
      exercises,
      videos: data?.videos ?? {},
      getBySlug: (slug: string | undefined) => (slug ? merged.get(slug) : undefined),
      /** Finds the demo for an exercise name used in a routine (e.g. "Bench Press"). */
      findByName: (name: string) => byAlias.get(name.trim().toLowerCase()),
    };
  }, [data]);
}

/** Slug → video/thumbnail URLs from PocketBase. */
export function useExerciseVideos() {
  const query = useRemoteLibrary();
  return { ...query, data: query.data?.videos };
}

export function useExerciseVideo(slug: string | undefined): ExerciseVideo | undefined {
  const { data } = useExerciseVideos();
  return slug ? data?.[slug] : undefined;
}
