import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  formatDate,
  useAdminIds,
  useIsAdmin,
  useMatches,
  useProfiles,
  useSession,
  type Match,
} from "@/lib/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DartLoader } from "@/components/DartLoader";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin Fixtures | Darts Predictor League" },
      {
        name: "description",
        content:
          "Add darts fixtures, edit match details, enter final leg scores and manage league admins.",
      },
      { property: "og:title", content: "Admin Fixtures | Darts Predictor League" },
      {
        property: "og:description",
        content: "Manage darts fixtures, results and league admins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/** ISO string -> value usable by <input type="datetime-local"> in local time. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminPage() {
  const navigate = useNavigate();
  const { data: user } = useSession();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin(user?.id);
  const { data: matches = [] } = useMatches();

  useEffect(() => {
    if (!roleLoading && isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [roleLoading, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <AppShell title="Admin">
        <DartLoader label="Checking access…" />
      </AppShell>
    );
  }

  const upcoming = matches.filter((m) => m.status === "upcoming");
  const finished = matches.filter((m) => m.status === "finished");

  return (
    <AppShell title="Admin" subtitle="Fixtures and results">
      <NewMatchForm />

      <h2 className="mt-6 font-display text-xl font-bold uppercase">Upcoming</h2>
      <div className="mt-2 space-y-3">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming matches.</p>
        )}
        {upcoming.map((m) => (
          <ResultForm key={m.id} match={m} />
        ))}
      </div>

      <AdminManager currentUserId={user?.id} />

      <h2 className="mt-6 font-display text-xl font-bold uppercase">Archived (finished)</h2>
      <div className="mt-2 space-y-3">
        {finished.length === 0 && <p className="text-sm text-muted-foreground">No results yet.</p>}
        {finished.map((m) => (
          <ResultForm key={m.id} match={m} />
        ))}
      </div>
    </AppShell>
  );
}

function AdminManager({ currentUserId }: { currentUserId: string | undefined }) {
  const queryClient = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const { data: adminIds = [] } = useAdminIds();

  const toggle = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", id)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Admins updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ids"] });
      queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update admins"),
  });

  return (
    <section className="panel mt-6 space-y-2 p-4">
      <h2 className="font-display text-xl font-bold uppercase">League admins</h2>
      <p className="text-xs text-muted-foreground">
        Promote friends to admin so they can add fixtures and enter results.
      </p>
      <ul className="space-y-2 pt-1">
        {profiles.map((p) => {
          const isAdmin = adminIds.includes(p.id);
          const isMe = p.id === currentUserId;
          return (
            <li
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2"
            >
              <span className="truncate text-sm font-semibold">
                {p.display_name}
                {isMe && <span className="ml-2 text-xs text-primary">you</span>}
                {isAdmin && (
                  <span className="ml-2 text-[10px] font-bold uppercase text-gold">Admin</span>
                )}
              </span>
              <Button
                variant={isAdmin ? "ghost" : "secondary"}
                size="sm"
                disabled={isMe || toggle.isPending}
                onClick={() => toggle.mutate({ id: p.id, makeAdmin: !isAdmin })}
              >
                {isAdmin ? "Remove" : "Make admin"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NewMatchForm() {
  const queryClient = useQueryClient();
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [tournament, setTournament] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!playerA.trim() || !playerB.trim()) throw new Error("Both players are required");
      if (!startsAt) throw new Error("Pick a date and time");
      const { error } = await supabase.from("matches").insert({
        player_a: playerA.trim(),
        player_b: playerB.trim(),
        tournament: tournament.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match added");
      setPlayerA("");
      setPlayerB("");
      setTournament("");
      setStartsAt("");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add match"),
  });

  return (
    <section className="panel space-y-3 p-4">
      <h2 className="font-display text-xl font-bold uppercase">Add a match</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="pa">Player A</Label>
          <Input id="pa" value={playerA} onChange={(e) => setPlayerA(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb">Player B</Label>
          <Input id="pb" value={playerB} onChange={(e) => setPlayerB(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tour">Tournament (optional)</Label>
        <Input id="tour" value={tournament} onChange={(e) => setTournament(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="when">Starts at</Label>
        <Input
          id="when"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </div>
      <Button
        className="h-11 w-full font-bold uppercase"
        onClick={() => create.mutate()}
        disabled={create.isPending}
      >
        Add match
      </Button>
    </section>
  );
}

function ResultForm({ match }: { match: Match }) {
  const queryClient = useQueryClient();
  const [a, setA] = useState(match.score_a === null ? "" : String(match.score_a));
  const [b, setB] = useState(match.score_b === null ? "" : String(match.score_b));
  const [editing, setEditing] = useState(false);
  const [playerA, setPlayerA] = useState(match.player_a);
  const [playerB, setPlayerB] = useState(match.player_b);
  const [tournament, setTournament] = useState(match.tournament ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(match.starts_at));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  };

  const saveResult = useMutation({
    mutationFn: async () => {
      const sa = Number(a);
      const sb = Number(b);
      if (a === "" || b === "") throw new Error("Enter both leg scores");
      if (sa === sb) throw new Error("A darts match can't end level");
      const { error } = await supabase
        .from("matches")
        .update({ score_a: sa, score_b: sb, status: "finished" })
        .eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Result saved");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save result"),
  });

  const saveDetails = useMutation({
    mutationFn: async () => {
      if (!playerA.trim() || !playerB.trim()) throw new Error("Both players are required");
      if (!startsAt) throw new Error("Pick a date and time");
      const { error } = await supabase
        .from("matches")
        .update({
          player_a: playerA.trim(),
          player_b: playerB.trim(),
          tournament: tournament.trim() || null,
          starts_at: new Date(startsAt).toISOString(),
        })
        .eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match updated");
      setEditing(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update match"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("matches").delete().eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match deleted");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete"),
  });

  return (
    <div className="panel p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold uppercase">
            {match.player_a} <span className="text-accent">vs</span> {match.player_b}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(match.starts_at)}
            {match.tournament ? ` · ${match.tournament}` : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-destructive"
          aria-label="Delete match"
          onClick={() => remove.mutate()}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          inputMode="numeric"
          className="h-11 w-14 text-center font-display text-xl"
          value={a}
          onChange={(e) => setA(e.target.value.replace(/\D/g, "").slice(0, 2))}
          aria-label={`Legs for ${match.player_a}`}
        />
        <span className="text-muted-foreground">–</span>
        <Input
          inputMode="numeric"
          className="h-11 w-14 text-center font-display text-xl"
          value={b}
          onChange={(e) => setB(e.target.value.replace(/\D/g, "").slice(0, 2))}
          aria-label={`Legs for ${match.player_b}`}
        />
        <Button
          className="ml-auto h-11 font-bold uppercase"
          onClick={() => saveResult.mutate()}
          disabled={saveResult.isPending}
        >
          {match.status === "finished" ? "Update" : "Save result"}
        </Button>
      </div>
    </div>
  );
}
