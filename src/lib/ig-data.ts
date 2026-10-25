import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IgHighlight, IgPost, IgProfile, IgProfileRow, PostKind } from "./ig-types";
import { extOf, isVideo, removeFiles, resolveUrls, uploadFile, videoThumbnail } from "./media";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const keys = {
  profiles: ["ig_profiles"] as const,
  profile: (id: string) => ["ig_profile", id] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: keys.profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ig_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const urls = await resolveUrls(data.map((p) => p.avatar_url));
      return data.map((p) => ({ ...p, avatarSrc: p.avatar_url ? urls.get(p.avatar_url) ?? null : null }));
    },
  });
}

export type Workspace = { profile: IgProfile; posts: IgPost[]; highlights: IgHighlight[] };

export function useWorkspace(profileId: string) {
  return useQuery({
    queryKey: keys.profile(profileId),
    queryFn: async (): Promise<Workspace> => {
      const [p, posts, hl] = await Promise.all([
        supabase.from("ig_profiles").select("*").eq("id", profileId).single(),
        supabase.from("ig_posts").select("*").eq("profile_id", profileId).order("position"),
        supabase.from("ig_highlights").select("*").eq("profile_id", profileId).order("position"),
      ]);
      if (p.error) throw p.error;
      if (posts.error) throw posts.error;
      if (hl.error) throw hl.error;
      const urls = await resolveUrls([
        p.data.avatar_url,
        ...posts.data.flatMap((x) => [x.cover_url, ...x.media_urls]),
        ...hl.data.map((h) => h.cover_url),
      ]);
      const u = (v: string | null) => (v ? urls.get(v) ?? null : null);
      return {
        profile: { ...p.data, avatarSrc: u(p.data.avatar_url) },
        posts: posts.data.map((x) => ({
          ...x,
          coverSrc: u(x.cover_url ?? x.media_urls[0] ?? null),
          mediaSrcs: x.media_urls.map((m) => urls.get(m) ?? ""),
        })),
        highlights: hl.data.map((h) => ({ ...h, coverSrc: u(h.cover_url) })),
      };
    },
  });
}

export async function createProfile(input: Partial<IgProfileRow>) {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("ig_profiles")
    .insert({ username: "your.username", ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProfile(id: string) {
  const [posts, hl, p] = await Promise.all([
    supabase.from("ig_posts").select("cover_url,media_urls").eq("profile_id", id),
    supabase.from("ig_highlights").select("cover_url").eq("profile_id", id),
    supabase.from("ig_profiles").select("avatar_url").eq("id", id).single(),
  ]);
  const { error } = await supabase.from("ig_profiles").delete().eq("id", id);
  if (error) throw error;
  await removeFiles([
    p.data?.avatar_url,
    ...(posts.data ?? []).flatMap((x) => [x.cover_url, ...x.media_urls]),
    ...(hl.data ?? []).map((h) => h.cover_url),
  ]);
}

/** Upload one file and return { path, coverPath, isVideo }. */
async function uploadMedia(userId: string, file: File) {
  const path = await uploadFile(userId, file, extOf(file));
  let cover: string | null = null;
  if (isVideo(file)) {
    try {
      cover = await uploadFile(userId, await videoThumbnail(file), "jpg");
    } catch {
      cover = null;
    }
  }
  return { path, cover, video: isVideo(file) };
}

export function useWorkspaceMutations(profileId: string) {
  const qc = useQueryClient();
  const key = keys.profile(profileId);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const current = () => qc.getQueryData<Workspace>(key);

  const updateProfile = useMutation({
    mutationFn: async (input: { patch: Partial<IgProfileRow>; avatar?: File | null }) => {
      const patch = { ...input.patch };
      if (input.avatar) {
        const userId = await uid();
        patch.avatar_url = await uploadFile(userId, input.avatar, extOf(input.avatar));
        await removeFiles([current()?.profile.avatar_url]);
      }
      const { error } = await supabase.from("ig_profiles").update(patch).eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: keys.profiles });
    },
  });

  /** Each file becomes its own post (videos become reels). */
  const addPosts = useMutation({
    mutationFn: async (input: { files: File[]; asCarousel?: boolean }) => {
      const userId = await uid();
      const ws = current();
      const minPos = Math.min(0, ...(ws?.posts.map((p) => p.position) ?? [0]));
      const uploaded = await Promise.all(input.files.map((f) => uploadMedia(userId, f)));
      const rows = input.asCarousel
        ? [
            {
              profile_id: profileId,
              user_id: userId,
              kind: "carousel" as PostKind,
              media_urls: uploaded.map((u) => u.path),
              cover_url: uploaded[0]!.cover ?? uploaded[0]!.path,
              position: minPos - 1,
            },
          ]
        : uploaded
            .map((u, i) => ({
              profile_id: profileId,
              user_id: userId,
              kind: (u.video ? "reel" : "post") as PostKind,
              media_urls: [u.path],
              cover_url: u.cover ?? (u.video ? null : u.path),
              // first selected file ends up at the top-left
              position: minPos - uploaded.length + i,
            }));
      const { error } = await supabase.from("ig_posts").insert(rows);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const updatePost = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<IgPost>; newCover?: File | null | undefined }) => {
      const { coverSrc: _c, mediaSrcs: _m, ...patch } = input.patch as IgPost;
      void _c;
      void _m;
      if (input.newCover) {
        const userId = await uid();
        patch.cover_url = await uploadFile(userId, input.newCover, extOf(input.newCover));
      }
      const { error } = await supabase.from("ig_posts").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const post = current()?.posts.find((p) => p.id === id);
      const { error } = await supabase.from("ig_posts").delete().eq("id", id);
      if (error) throw error;
      if (post) await removeFiles([post.cover_url, ...post.media_urls]);
    },
    onMutate: (id) => {
      qc.setQueryData<Workspace>(key, (ws) => ws && { ...ws, posts: ws.posts.filter((p) => p.id !== id) });
    },
    onSettled: refresh,
  });

  /** Persist a new order. `orderedIds` is the full visible grid order. */
  const reorderPosts = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, i) => supabase.from("ig_posts").update({ position: i }).eq("id", id)),
      );
    },
    onMutate: (orderedIds) => {
      qc.setQueryData<Workspace>(key, (ws) => {
        if (!ws) return ws;
        const pos = new Map(orderedIds.map((id, i) => [id, i]));
        return { ...ws, posts: ws.posts.map((p) => ({ ...p, position: pos.get(p.id) ?? p.position })) };
      });
    },
    onError: refresh,
  });

  const addHighlight = useMutation({
    mutationFn: async (input: { title: string; cover: File | null }) => {
      const userId = await uid();
      const cover_url = input.cover ? await uploadFile(userId, input.cover, extOf(input.cover)) : null;
      const max = Math.max(-1, ...(current()?.highlights.map((h) => h.position) ?? []));
      const { error } = await supabase
        .from("ig_highlights")
        .insert({ profile_id: profileId, user_id: userId, title: input.title, cover_url, position: max + 1 });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const updateHighlight = useMutation({
    mutationFn: async (input: { id: string; title: string; cover?: File | null }) => {
      const patch: { title: string; cover_url?: string } = { title: input.title };
      if (input.cover) {
        const old = current()?.highlights.find((h) => h.id === input.id)?.cover_url;
        patch.cover_url = await uploadFile(await uid(), input.cover, extOf(input.cover));
        await removeFiles([old]);
      }
      const { error } = await supabase.from("ig_highlights").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const deleteHighlight = useMutation({
    mutationFn: async (id: string) => {
      const old = current()?.highlights.find((h) => h.id === id)?.cover_url;
      const { error } = await supabase.from("ig_highlights").delete().eq("id", id);
      if (error) throw error;
      await removeFiles([old]);
    },
    onSuccess: refresh,
  });

  const reorderHighlights = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id, i) => supabase.from("ig_highlights").update({ position: i }).eq("id", id)));
    },
    onMutate: (ids) => {
      qc.setQueryData<Workspace>(key, (ws) => {
        if (!ws) return ws;
        const pos = new Map(ids.map((id, i) => [id, i]));
        return {
          ...ws,
          highlights: ws.highlights
            .map((h) => ({ ...h, position: pos.get(h.id) ?? h.position }))
            .sort((a, b) => a.position - b.position),
        };
      });
    },
    onError: refresh,
  });

  return {
    updateProfile,
    addPosts,
    updatePost,
    deletePost,
    reorderPosts,
    addHighlight,
    updateHighlight,
    deleteHighlight,
    reorderHighlights,
  };
}
