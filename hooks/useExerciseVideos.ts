import { useQuery } from "@tanstack/react-query";
import { PB_URL } from "@/constants/backend";

export interface ExerciseVideo {
  slug: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

interface PBExerciseRecord {
  id: string;
  collectionId: string;
  slug: string;
  video: string;
  thumbnail: string;
  video_url?: string;
  thumbnail_url?: string;
}

function fileUrl(r: PBExerciseRecord, file: string): string | null {
  return file ? `${PB_URL}/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(file)}` : null;
}

async function fetchExerciseVideos(): Promise<Record<string, ExerciseVideo>> {
  const res = await fetch(
    `${PB_URL}/api/collections/exercises/records?perPage=200&fields=id,collectionId,slug,video,thumbnail,video_url,thumbnail_url`
  );
  if (!res.ok) throw new Error(`Exercise library request failed: ${res.status}`);
  const json = (await res.json()) as { items: PBExerciseRecord[] };
  const map: Record<string, ExerciseVideo> = {};
  for (const r of json.items) {
    // An uploaded file wins; the *_url fields cover clips still hosted on the generator's CDN.
    map[r.slug] = {
      slug: r.slug,
      videoUrl: fileUrl(r, r.video) ?? (r.video_url || null),
      thumbnailUrl: fileUrl(r, r.thumbnail) ?? (r.thumbnail_url || null),
    };
  }
  return map;
}

/** Slug → video/thumbnail URLs from PocketBase. New uploads appear without an app update. */
export function useExerciseVideos() {
  return useQuery({
    queryKey: ["exerciseVideos"],
    queryFn: fetchExerciseVideos,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useExerciseVideo(slug: string | undefined): ExerciseVideo | undefined {
  const { data } = useExerciseVideos();
  return slug ? data?.[slug] : undefined;
}
