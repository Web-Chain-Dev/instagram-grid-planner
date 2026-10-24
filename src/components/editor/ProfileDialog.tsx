import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { IgProfile, IgProfileRow } from "@/lib/ig-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  profile: IgProfile;
  onClose: () => void;
  onSave: (patch: Partial<IgProfileRow>, avatar: File | null) => Promise<unknown>;
};

const fields = [
  ["username", "Username"],
  ["full_name", "Name"],
  ["category", "Category (e.g. Photographer)"],
  ["link", "Link"],
  ["followers", "Followers (e.g. 12.4K)"],
  ["following", "Following"],
  ["posts_count_override", "Posts count (blank = count grid)"],
] as const;

export function ProfileDialog({ open, profile, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<IgProfileRow>>({});
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      username: profile.username,
      full_name: profile.full_name,
      category: profile.category,
      link: profile.link,
      bio: profile.bio,
      followers: profile.followers,
      following: profile.following,
      posts_count_override: profile.posts_count_override ?? "",
      is_verified: profile.is_verified,
    });
    setAvatar(null);
    setPreview(profile.avatarSrc);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(
        {
          ...form,
          username: (form.username ?? "").trim().replace(/^@/, "") || "username",
          posts_count_override: form.posts_count_override?.trim() || null,
        },
        avatar,
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="mx-auto block h-24 w-24 cursor-pointer overflow-hidden rounded-full bg-muted">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-muted-foreground">Add photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAvatar(f);
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          {fields.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} value={(form[k] as string) ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={4} maxLength={150} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Verified badge</Label>
            <Switch checked={!!form.is_verified} onCheckedChange={(v) => setForm({ ...form, is_verified: v })} />
          </div>
          <Button className="w-full" disabled={busy}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
