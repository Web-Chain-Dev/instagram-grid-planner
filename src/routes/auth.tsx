import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Gridwise" },
      { name: "description", content: "Sign in to plan your Instagram grid." },
      { property: "og:title", content: "Sign in — Gridwise" },
      { property: "og:description", content: "Sign in to plan your Instagram grid." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/dashboard" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/dashboard" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        setSent("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setSent("Password reset link sent — check your email.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-3xl">
          Gridwise
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
        </h1>
        {sent ? (
          <p className="mt-6 rounded-lg bg-accent p-4 text-accent-foreground">{sent}</p>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <Button variant="outline" className="mt-6 w-full" onClick={google}>
                  Continue with Google
                </Button>
                <div className="my-5 text-center text-xs uppercase tracking-widest text-muted-foreground">or</div>
              </>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Password</Label>
                  <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
              <Button className="w-full" disabled={busy}>
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link"}
              </Button>
            </form>
          </>
        )}
        <div className="mt-6 flex justify-between text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button onClick={() => setMode("signup")}>Create account</button>
              <button onClick={() => setMode("forgot")}>Forgot password?</button>
            </>
          ) : (
            <button onClick={() => { setMode("signin"); setSent(null); }}>Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  );
}
