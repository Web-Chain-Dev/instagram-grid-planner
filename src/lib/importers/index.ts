/**
 * Grid importers.
 *
 * An importer turns an external source into a normalized ImportedGrid that the
 * app saves into ig_profiles / ig_posts / ig_highlights. Today only "manual"
 * is live (the user uploads files in the editor). "instagram" is a ready slot
 * for the official Instagram API (Business/Creator accounts):
 *
 *   1. Create a Meta app with "Instagram API with Instagram Login".
 *   2. Store INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET as backend secrets.
 *   3. Add a server route /api/public/instagram/callback that exchanges the
 *      code for a long-lived token (store it per user, server-side only).
 *   4. Implement fetchGrid() below with GET /me?fields=username,name,biography,
 *      profile_picture_url,followers_count,follows_count and
 *      GET /me/media?fields=id,media_type,media_url,thumbnail_url,caption,children{media_url}
 *   5. Flip `available` to true.
 */

export type ImportedPost = {
  externalId: string;
  kind: "post" | "reel" | "carousel";
  mediaUrls: string[];
  coverUrl: string | null;
  caption: string;
};

export type ImportedGrid = {
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  followers: string;
  following: string;
  posts: ImportedPost[];
};

export type Importer = {
  id: "manual" | "instagram";
  label: string;
  description: string;
  available: boolean;
};

export const importers: Importer[] = [
  {
    id: "manual",
    label: "Start from scratch",
    description: "Fill in your profile and upload photos, reels and carousels.",
    available: true,
  },
  {
    id: "instagram",
    label: "Connect Instagram",
    description: "Pull your existing grid from a Business or Creator account.",
    available: false,
  },
];

/** Maps an imported Instagram media_type to our kind. */
export function kindFromInstagram(mediaType: string): ImportedPost["kind"] {
  if (mediaType === "VIDEO" || mediaType === "REELS") return "reel";
  if (mediaType === "CAROUSEL_ALBUM") return "carousel";
  return "post";
}
