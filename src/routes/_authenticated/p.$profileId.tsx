import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Images, Loader2, Monitor, Plus, Smartphone, UserPen } from "lucide-react";
import { useWorkspace, useWorkspaceMutations } from "@/lib/ig-data";
import { canPin, type IgHighlight, type IgPost } from "@/lib/ig-types";
import { IgProfileView } from "@/components/ig/IgProfileView";
import { PostDialog } from "@/components/editor/PostDialog";
import { HighlightDialog } from "@/components/editor/HighlightDialog";
import { ProfileDialog } from "@/components/editor/ProfileDialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/p/$profileId")({
  head: () => ({
    meta: [
      { title: "Grid editor — Gridwise" },
      { name: "description", content: "Arrange your Instagram grid." },
      { property: "og:title", content: "Grid editor — Gridwise" },
      { property: "og:description", content: "Arrange your Instagram grid." },
    ],
  }),
  component: Editor,
});

function Editor() {
  const { profileId } = Route.useParams();
  const { data, isLoading, error } = useWorkspace(profileId);
  const m = useWorkspaceMutations(profileId);
  const isMobile = useIsMobile();
  const [layout, setLayout] = useState<"mobile" | "desktop">("mobile");
  const [post, setPost] = useState<IgPost | null>(null);
  const [hl, setHl] = useState<IgHighlight | "new" | null>(null);
  const [editProfile, setEditProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Centered><Loader2 className="h-6 w-6 animate-spin" /></Centered>;
  if (error || !data) return <Centered>Couldn't load this profile.</Centered>;

  const upload = (files: FileList | null, asCarousel = false) => {
    if (!files?.length) return;
    const list = Array.from(files);
    if (asCarousel && list.length < 2) return toast.error("Pick at least 2 files for a carousel");
    toast.promise(m.addPosts.mutateAsync({ files: list, asCarousel }), {
      loading: `Uploading ${list.length} file${list.length > 1 ? "s" : ""}…`,
      success: "Added to grid",
      error: (e) => (e as Error).message,
    });
  };

  const view = (
    <IgProfileView
      layout={isMobile ? "mobile" : layout}
      profile={data.profile}
      posts={data.posts}
      highlights={data.highlights}
      editable
      onTileClick={setPost}
      onReorder={(ids) => m.reorderPosts.mutate(ids)}
      onInvalidMove={() => toast("Unpin a post to move it out of the pinned row")}
      onHighlightClick={setHl}
      onAddHighlight={() => setHl("new")}
      onReorderHighlights={(ids) => m.reorderHighlights.mutate(ids)}
      onEditProfile={() => setEditProfile(true)}
    />
  );

  const livePost = post ? data.posts.find((p) => p.id === post.id) ?? null : null;

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <input ref={fileRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={carouselRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => { upload(e.target.files, true); e.target.value = ""; }} />

      <header className="flex shrink-0 items-center gap-2 border-b bg-card px-3 py-2 md:px-5">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <span className="hidden font-display text-xl md:inline">Gridwise</span>
        <div className="ml-auto flex items-center gap-1.5">
          {!isMobile && (
            <div className="mr-2 flex rounded-lg bg-muted p-1">
              <Button size="sm" variant={layout === "mobile" ? "secondary" : "ghost"} onClick={() => setLayout("mobile")}>
                <Smartphone className="mr-1 h-4 w-4" /> Phone
              </Button>
              <Button size="sm" variant={layout === "desktop" ? "secondary" : "ghost"} onClick={() => setLayout("desktop")}>
                <Monitor className="mr-1 h-4 w-4" /> Desktop
              </Button>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditProfile(true)}>
            <UserPen className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Profile</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => carouselRef.current?.click()}>
            <Images className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Carousel</span>
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={m.addPosts.isPending}>
            <Plus className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Add</span>
          </Button>
        </div>
      </header>

      {isMobile ? (
        <div className="min-h-0 flex-1">{view}</div>
      ) : layout === "mobile" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center gap-10 overflow-auto p-6">
          <div className="shrink-0 rounded-[52px] bg-phone p-[12px] shadow-phone">
            <div className="relative h-[min(844px,calc(100dvh-140px))] w-[390px] overflow-hidden rounded-[42px] bg-ig-bg">
              <div className="h-[44px] bg-ig-bg" />
              <div className="absolute left-1/2 top-[11px] h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-phone" />
              <div className="h-[calc(100%-44px)]">{view}</div>
            </div>
          </div>
          <Tips />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-[1100px] overflow-hidden rounded-xl border shadow-phone">
            <div className="flex h-9 items-center gap-1.5 border-b bg-muted px-3">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-accent" />
              <span className="h-3 w-3 rounded-full bg-secondary" />
              <span className="ml-3 truncate text-xs text-muted-foreground">instagram.com/{data.profile.username}</span>
            </div>
            <div className="bg-ig-bg">{view}</div>
          </div>
        </div>
      )}

      <PostDialog
        post={livePost}
        onClose={() => setPost(null)}
        canPin={canPin(data.posts)}
        onSave={(patch, newCover) => m.updatePost.mutateAsync({ id: livePost!.id, patch, newCover })}
        onDelete={async () => {
          await m.deletePost.mutateAsync(livePost!.id);
          setPost(null);
        }}
      />
      <HighlightDialog
        highlight={hl}
        onClose={() => setHl(null)}
        onSave={async (title, cover) => {
          if (hl === "new") await m.addHighlight.mutateAsync({ title, cover });
          else if (hl) await m.updateHighlight.mutateAsync({ id: hl.id, title, cover });
          setHl(null);
        }}
        onDelete={async () => {
          if (hl && hl !== "new") await m.deleteHighlight.mutateAsync(hl.id);
          setHl(null);
        }}
      />
      <ProfileDialog
        open={editProfile}
        profile={data.profile}
        onClose={() => setEditProfile(false)}
        onSave={async (patch, avatar) => {
          await m.updateProfile.mutateAsync({ patch, avatar });
          setEditProfile(false);
        }}
      />
    </div>
  );
}

function Tips() {
  return (
    <div className="hidden max-w-[240px] space-y-4 text-sm text-muted-foreground xl:block">
      <p className="font-display text-2xl text-foreground">How it works</p>
      <p><b className="text-foreground">Drag</b> any tile to reorder. On phones, press and hold.</p>
      <p><b className="text-foreground">Tap</b> a tile to pin it, change its type, replace the cover or delete it.</p>
      <p><b className="text-foreground">Tap your photo</b> or “Edit profile” to change name, bio and numbers.</p>
      <p>Everything saves automatically.</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{children}</div>;
}
