import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { IgHighlight } from "@/lib/ig-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  highlight: IgHighlight | "new" | null;
  onClose: () => void;
  onSave: (title: string, cover: File | null) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
};

export function HighlightDialog({ highlight, onClose, onSave, onDelete }: Props) {
  const isNew = highlight === "new";
  const existing = highlight && highlight !== "new" ? highlight : null;
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(existing?.title ?? "");
    setCover(null);
    setPreview(existing?.coverSrc ?? null);
  }, [highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(title.trim() || "Highlight", cover);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!highlight} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isNew ? "New highlight" : "Edit highlight"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="mx-auto block h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed bg-muted">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Cover</span>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setCover(f);
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="ht">Title</Label>
            <Input id="ht" maxLength={15} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy}>
              Save
            </Button>
            {!isNew && (
              <Button type="button" variant="destructive" onClick={() => confirm("Delete highlight?") && onDelete()}>
                Delete
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
