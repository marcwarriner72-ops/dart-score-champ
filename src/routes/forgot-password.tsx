import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Darts Predictor League" },
      { name: "description", content: "Reset your Darts Predictor League password." },
      { property: "og:title", content: "Forgot password — Darts Predictor League" },
      { property: "og:description", content: "Reset your Darts Predictor League password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
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
      <h1 className="font-display text-4xl font-bold uppercase leading-none">Reset password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we'll send you a link to set a new password.
      </p>

      {sent ? (
        <div className="panel mt-6 p-5 text-sm">
          <p className="font-semibold text-primary">Check your email</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for {email}, you'll receive a password reset link.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="panel mt-6 space-y-4 p-5">
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
          <Button type="submit" disabled={loading} className="h-12 w-full font-bold uppercase">
            {loading ? "Please wait…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
