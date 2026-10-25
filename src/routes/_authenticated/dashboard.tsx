import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Instagram, LogOut, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createProfile, deleteProfile, keys, useProfiles } from "@/lib/ig-data";
import { importers } from "@/lib/importers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My grids — Gridwise" },
      { name: "description", content: "Your planned Instagram profiles." },
      { property: "og:title", content: "My grids — Gridwise" },
      { property: "og:description", content: "Your planned Instagram profiles." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profiles, isLoading } = useProfiles();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await createProfile({ username: username.trim().replace(/^@/, "") || "your.username" });
      qc.invalidateQueries({ queryKey: keys.profiles });
      navigate({ to: "/p/$profileId", params: { profileId: p.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-2xl">
          Gridwise
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="mr-1 h-4 w-4" /> Sign out
        </Button>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-4xl">Your profiles</h1>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New profile
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {profiles?.length === 0 && (
            <button
              onClick={() => setOpen(true)}
              className="rounded-2xl border border-dashed p-10 text-left text-muted-foreground"
            >
              No profiles yet. Create your first one to start planning.
            </button>
          )}
          {profiles?.map((p) => (
            <div key={p.id} className="group flex items-center gap-4 rounded-2xl border bg-card p-4">
              <Link to="/p/$profileId" params={{ profileId: p.id }} className="flex min-w-0 flex-1 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                  {p.avatarSrc && <img src={p.avatarSrc} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">@{p.username}</div>
                  <div className="truncate text-sm text-muted-foreground">{p.full_name || "Untitled"}</div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (!confirm(`Delete @${p.username} and all its posts?`)) return;
                  await deleteProfile(p.id);
                  qc.invalidateQueries({ queryKey: keys.profiles });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New profile</DialogTitle>
            <DialogDescription>Start from scratch or bring in your existing grid.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <Label htmlFor="u">Instagram username</Label>
            <Input id="u" placeholder="@yourname" value={username} onChange={(e) => setUsername(e.target.value)} />
            <Button className="w-full" disabled={busy}>
              {importers[0]!.label}
            </Button>
          </form>
          <div className="rounded-xl border p-4 opacity-70">
            <div className="flex items-center gap-2 font-semibold">
              <Instagram className="h-4 w-4" /> {importers[1]!.label}
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">Coming soon</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{importers[1]!.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
