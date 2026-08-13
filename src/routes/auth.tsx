import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Darts Predictor League" },
      { name: "description", content: "Sign in or create your account to submit darts predictions." },
      { property: "og:title", content: "Sign in — Darts Predictor League" },
      { property: "og:description", content: "Sign in to submit your darts predictions." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          setSent(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <h1 className="font-display text-4xl font-bold uppercase leading-none">
        {mode === "signin" ? "Welcome back" : "Join the league"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Sign in to make your picks."
          : "Create an account to start predicting."}
      </p>

      {sent ? (
        <div className="panel mt-6 p-5 text-sm">
          <p className="font-semibold text-primary">Check your email</p>
          <p className="mt-1 text-muted-foreground">
            We sent a confirmation link to {email}. Click it, then come back and sign in.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-6 space-y-4 p-5">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nickname on the leaderboard"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === "signin" && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4">
                Forgot password?
              </Link>
            </div>
          )}
          <Button type="submit" disabled={loading} className="h-12 w-full font-bold uppercase">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      )}

      <button
        type="button"
        className="mt-5 text-center text-sm text-muted-foreground underline underline-offset-4"
        onClick={() => {
          setSent(false);
          setMode(mode === "signin" ? "signup" : "signin");
        }}
      >
        {mode === "signin" ? "No account yet? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
