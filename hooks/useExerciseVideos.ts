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
}

function fileUrl(r: PBExerciseRecord, file: string): string | null {
  return file ? `${PB_URL}/api/files/${r.collectionId}/${r.id}/${encodeURIComponent(file)}` : null;
}

async function fetchExerciseVideos(): Promise<Record<string, ExerciseVideo>> {
  const res = await fetch(
    `${PB_URL}/api/collections/exercises/records?perPage=200&fields=id,collectionId,slug,video,thumbnail`
  );
  if (!res.ok) throw new Error(`Exercise library request failed: ${res.status}`);
  const json = (await res.json()) as { items: PBExerciseRecord[] };
  const map: Record<string, ExerciseVideo> = {};
  for (const r of json.items) {
    map[r.slug] = { slug: r.slug, videoUrl: fileUrl(r, r.video), thumbnailUrl: fileUrl(r, r.thumbnail) };
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
