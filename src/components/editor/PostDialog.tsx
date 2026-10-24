import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { IgPost, PostKind } from "@/lib/ig-types";
import { MAX_PINNED } from "@/lib/ig-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Props = {
  post: IgPost | null;
  canPin: boolean;
  onClose: () => void;
  onSave: (patch: Partial<IgPost>, newCover?: File | null) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
};

export function PostDialog({ post, canPin, onClose, onSave, onDelete }: Props) {
  const [caption, setCaption] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  useEffect(() => setCaption(post?.caption ?? ""), [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!post) return <Dialog open={false} />;

  const save = (patch: Partial<IgPost>, cover?: File | null) =>
    onSave(patch, cover).catch((e) => toast.error((e as Error).message));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {post.kind}</DialogTitle>
        </DialogHeader>

        <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto">
          {post.kind === "reel" && post.mediaSrcs[0] ? (
            <video src={post.mediaSrcs[0]} poster={post.coverSrc ?? undefined} controls playsInline className="aspect-[9/16] max-h-[50dvh] rounded-lg bg-muted object-cover" />
          ) : (
            post.mediaSrcs.map((src, i) => (
              <img key={i} src={src} alt="" className="aspect-[3/4] w-[70%] shrink-0 snap-center rounded-lg object-cover" />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={post.kind}
              onValueChange={(v) => v && save({ kind: v as PostKind })}
              className="justify-start"
            >
              <ToggleGroupItem value="post">Photo</ToggleGroupItem>
              <ToggleGroupItem value="carousel">Carousel</ToggleGroupItem>
              <ToggleGroupItem value="reel">Reel</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Pin to top</Label>
              <p className="text-xs text-muted-foreground">Up to {MAX_PINNED} pinned posts</p>
            </div>
            <Switch
              checked={post.pinned}
              onCheckedChange={(v) => {
                if (v && !canPin) return toast.error(`You can only pin ${MAX_PINNED} posts`);
                save({ pinned: v });
              }}
            />
          </div>

          {post.kind === "reel" && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Show in main grid</Label>
                <p className="text-xs text-muted-foreground">Off = only in the Reels tab</p>
              </div>
              <Switch checked={post.show_in_grid} onCheckedChange={(v) => save({ show_in_grid: v })} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Caption</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== post.caption && save({ caption })} rows={3} />
          </div>

          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) toast.promise(save({}, f), { loading: "Updating cover…", success: "Cover updated", error: "Failed" });
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => coverRef.current?.click()}>
              Replace cover
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this from your grid?")) onDelete();
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
