import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Darts Predictor League" },
      { name: "description", content: "Set a new password for your Darts Predictor League account." },
      { property: "og:title", content: "Reset password — Darts Predictor League" },
      { property: "og:description", content: "Set a new password for your Darts Predictor League account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    if (params.get("type") !== "recovery") {
      toast.error("Invalid or expired password reset link.");
      return;
    }
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      toast.error("Invalid or expired password reset link.");
      return;
    }
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        toast.error(error.message);
      } else {
        setReady(true);
      }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-10">
      <Link to="/auth" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      <h1 className="font-display text-4xl font-bold uppercase leading-none">New password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a new password for your account.
      </p>

      {done ? (
        <div className="panel mt-6 p-5 text-sm">
          <p className="font-semibold text-primary">Password updated</p>
          <p className="mt-1 text-muted-foreground">Taking you to the dashboard…</p>
        </div>
      ) : !ready ? (
        <div className="panel mt-6 p-5 text-sm">
          <p className="font-semibold text-primary">Verifying link…</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-6 space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full font-bold uppercase">
            {loading ? "Please wait…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
