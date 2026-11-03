import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTournaments } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const RESET_PIN = "7912";

/** Admin tool: archive the current competition so the table starts again at zero. */
export function CompetitionReset() {
  const queryClient = useQueryClient();
  const { data: tournaments = [] } = useTournaments();
  const current = tournaments.find((t) => t.is_active)?.tournament ?? null;
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (pin !== RESET_PIN) {
      toast.error("Wrong password");
      return;
    }
    if (!current) return;
    setBusy(true);
    const q = supabase.from("matches").update({ status: "finished" }).neq("status", "finished");
    const { error } = await (current === "Other" ? q.is("tournament", null) : q.eq("tournament", current));
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${current} moved to the archive. Table reset for the next competition.`);
    setOpen(false);
    setPin("");
    for (const k of ["matches", "tournaments", "tournament-leaderboard", "leaderboard"])
      queryClient.invalidateQueries({ queryKey: [k] });
  }

  return (
    <section className="panel mt-6 space-y-2 p-4">
      <h2 className="font-display text-xl font-bold uppercase">Reset competition</h2>
      <p className="text-xs text-muted-foreground">
        {current
          ? `Moves ${current} to the archive and starts the league table again at zero for the next competition.`
          : "No competition is running right now."}
      </p>
      <Button
        type="button"
        variant="destructive"
        className="h-11 w-full font-bold uppercase"
        disabled={!current}
        onClick={() => setOpen(true)}
      >
        <Archive className="size-4" /> Archive & reset
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPin(""); }}>
        <DialogContent className="max-w-[20rem]">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Enter password</DialogTitle>
            <DialogDescription>Archive {current} and reset the table to zero.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Password"
            className="h-11"
          />
          <Button type="button" variant="destructive" className="h-11" disabled={busy || !pin} onClick={run}>
            {busy ? "Resetting…" : "Activate reset"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
