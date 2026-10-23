import type { Database } from "@/integrations/supabase/types";

export type IgProfileRow = Database["public"]["Tables"]["ig_profiles"]["Row"];
export type IgPostRow = Database["public"]["Tables"]["ig_posts"]["Row"];
export type IgHighlightRow = Database["public"]["Tables"]["ig_highlights"]["Row"];

export type PostKind = "post" | "reel" | "carousel";

/** Rows with storage paths resolved to displayable URLs. */
export type IgPost = IgPostRow & { coverSrc: string | null; mediaSrcs: string[] };
export type IgHighlight = IgHighlightRow & { coverSrc: string | null };
export type IgProfile = IgProfileRow & { avatarSrc: string | null };

export const MAX_PINNED = 3;

/** Instagram ordering: pinned first (by position), then the rest (by position). */
export function orderGrid<T extends { pinned: boolean; position: number; show_in_grid?: boolean }>(
  posts: T[],
): T[] {
  return [...posts]
    .filter((p) => p.show_in_grid !== false)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.position - b.position;
    });
}

/** Can another post be pinned? Instagram allows up to 3 pinned posts. */
export function canPin(posts: { pinned: boolean }[]): boolean {
  return posts.filter((p) => p.pinned).length < MAX_PINNED;
}
