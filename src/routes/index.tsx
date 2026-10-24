import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gridwise — Plan your Instagram grid, pixel for pixel" },
      { name: "description", content: "Upload, rearrange and pin posts, reels and highlights and see your Instagram profile exactly as it will look." },
      { property: "og:title", content: "Gridwise — Plan your Instagram grid" },
      { property: "og:description", content: "A 1:1 Instagram profile preview for planning your feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-2xl">Gridwise</span>
        <Button asChild variant={signedIn ? "default" : "outline"}>
          <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Open my grids" : "Sign in"}</Link>
        </Button>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-2 md:pt-20">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">Instagram feed planner</p>
          <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">See your grid before the world does.</h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            A pixel-for-pixel copy of your Instagram profile. Drag posts around, pin your best three, add reels,
            carousels and highlights — everything saved to your account.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to={signedIn ? "/dashboard" : "/auth"}>Start planning — free</Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-[2px] rounded-3xl bg-phone p-3 shadow-phone">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4]"
              style={{ background: `oklch(${0.55 + (i % 4) * 0.1} ${0.08 + (i % 3) * 0.04} ${30 + i * 18})` }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
