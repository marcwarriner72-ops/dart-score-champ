import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Lock, Pencil, RotateCcw, Trash2, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CountryFlag } from "@/components/CountryFlag";
import {
  COUNTRIES,
  PRESET_TOURNAMENTS,
  formatDate,
  guessCountry,
  hasStarted,
  matchFormatLabel,
  useAdminIds,
  useIsAdmin,
  useMatches,
  useProfiles,
  useSession,
  useTournaments,
  type Match,
} from "@/lib/league";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DartLoader } from "@/components/DartLoader";
import { throwDart } from "@/components/DartThrow";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Reusable "are you sure" wrapper for admin saves. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[20rem] rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display uppercase">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Legs vs sets picker for a fixture. */
function FormatPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Scored in</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full">
          <SelectValue placeholder="Legs or sets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="legs">Legs</SelectItem>
          <SelectItem value="sets">Sets</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Host country for the competition — drives the flag shown around the app. */
function CountryPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Host country</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full">
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="mr-2">
                <CountryFlag code={c.code} />
              </span>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}



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

  const active = matches.filter((m) => m.status === "upcoming");
  const finished = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  /** Archive is grouped by tournament, newest event first. */
  const archiveGroups: { name: string; matches: Match[] }[] = [];
  for (const m of finished) {
    const name = m.tournament?.trim() || "Other fixtures";
    const group = archiveGroups.find((g) => g.name === name);
    if (group) group.matches.push(m);
    else archiveGroups.push({ name, matches: [m] });
  }

  return (
    <AppShell title="Admin" subtitle="Fixtures and results">
      <NewMatchForm />

      <h2 className="mt-6 font-display text-xl font-bold uppercase">Active fixtures</h2>
      <p className="text-xs text-muted-foreground">
        Saving a result moves the fixture straight into the archive below.
      </p>
      <div className="mt-2 space-y-3">
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">No active fixtures.</p>
        )}
        {active.map((m) => (
          <ResultForm key={m.id} match={m} />
        ))}
      </div>

      <AdminManager currentUserId={user?.id} />

      <Collapsible className="mt-6">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-xl bg-secondary/50 px-4 py-3 text-left transition active:scale-[0.99]">
          <span className="font-display text-xl font-bold uppercase">Archive</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs font-semibold">
              {finished.length}
            </span>
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-5">
          {finished.length === 0 && (
            <p className="text-sm text-muted-foreground">No completed fixtures yet.</p>
          )}
          {archiveGroups.map((g) => (
            <div key={g.name} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.name} · {g.matches.length}
              </h3>
              {g.matches.map((m) => (
                <div key={m.id} className="opacity-80 transition hover:opacity-100">
                  <ResultForm match={m} />
                </div>
              ))}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
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
  const [format, setFormat] = useState("legs");
  const [country, setCountry] = useState("GB");
  const [confirming, setConfirming] = useState(false);

  /** Picking a known competition pre-fills its host country. */
  function pickTournament(v: string) {
    setTournament(v);
    const guess = guessCountry(v);
    if (guess) setCountry(guess);
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!playerA.trim() || !playerB.trim()) throw new Error("Both players are required");
      if (!startsAt) throw new Error("Pick a date and time");
      const { error } = await supabase.from("matches").insert({
        player_a: playerA.trim(),
        player_b: playerB.trim(),
        tournament: tournament.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        format,
        country,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match added");
      setPlayerA("");
      setPlayerB("");
      setTournament("");
      setStartsAt("");
      setFormat("legs");
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
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
      <TournamentPicker id="tour" value={tournament} onChange={pickTournament} />
      <CountryPicker id="country" value={country} onChange={setCountry} />
      <FormatPicker id="format" value={format} onChange={setFormat} />

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
        className="h-11 w-full font-bold uppercase transition-transform active:scale-[0.98]"
        onClick={() => {
          if (!playerA.trim() || !playerB.trim()) {
            toast.error("Both players are required");
            return;
          }
          if (!startsAt) {
            toast.error("Pick a date and time");
            return;
          }
          setConfirming(true);
        }}
        disabled={create.isPending}
      >
        Add match
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Add this fixture?"
        description={`${playerA} vs ${playerB}${tournament ? ` · ${tournament}` : ""} · ${
          format === "sets" ? "sets" : "legs"
        } · ${startsAt ? new Date(startsAt).toLocaleString() : ""}`}
        onConfirm={() => create.mutate()}
      />
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
  const [format, setFormat] = useState(match.format === "sets" ? "sets" : "legs");
  const [confirmResult, setConfirmResult] = useState(false);
  const [confirmDetails, setConfirmDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Once the throw-off time passes the fixture details are locked (enforced in the database too). */
  const locked = hasStarted(match);

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
      setConfirmResult(false);
      throwDart("Result saved");
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
          format,
        })
        .eq("id", match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Match updated");
      setConfirmDetails(false);
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
      setConfirmDelete(false);
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
            {match.tournament ? ` · ${match.tournament}` : ""} · {matchFormatLabel(match)}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {locked ? (
            <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Lock className="size-3" /> Locked
            </span>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit match details"
                onClick={() => setEditing((v) => !v)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                aria-label="Delete match"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && !locked && (
        <div className="mt-3 space-y-3 rounded-lg bg-secondary/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`pa-${match.id}`}>Player A</Label>
              <Input
                id={`pa-${match.id}`}
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`pb-${match.id}`}>Player B</Label>
              <Input
                id={`pb-${match.id}`}
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
              />
            </div>
          </div>
          <TournamentPicker id={`tour-${match.id}`} value={tournament} onChange={setTournament} />
          <FormatPicker id={`format-${match.id}`} value={format} onChange={setFormat} />
          <div className="space-y-1.5">
            <Label htmlFor={`when-${match.id}`}>Starts at</Label>
            <Input
              id={`when-${match.id}`}
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="h-11 flex-1 font-bold uppercase"
              onClick={() => {
                setPlayerA(match.player_a);
                setPlayerB(match.player_b);
                setTournament(match.tournament ?? "");
                setStartsAt(toLocalInput(match.starts_at));
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 font-bold uppercase"
              onClick={() => setConfirmDetails(true)}
              disabled={saveDetails.isPending}
            >
              Save details
            </Button>
          </div>
        </div>
      )}


      {locked && (
        <p className="mt-2 text-xs text-muted-foreground">
          This fixture has started — details are locked. You can still enter the final score.
        </p>
      )}

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
          className="ml-auto h-11 font-bold uppercase transition-transform active:scale-95"
          onClick={() => setConfirmResult(true)}
          disabled={saveResult.isPending}
        >
          {match.status === "finished" ? "Update" : "Save result"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmResult}
        onOpenChange={setConfirmResult}
        title="Save this result?"
        description={`${match.player_a} ${a || "?"}–${b || "?"} ${match.player_b} in ${matchFormatLabel(
          match,
        ).toLowerCase()}. This finishes the match and scores everyone's predictions.`}
        onConfirm={() => saveResult.mutate()}
      />
      <ConfirmDialog
        open={confirmDetails}
        onOpenChange={setConfirmDetails}
        title="Save these changes?"
        description={`${playerA} vs ${playerB}${tournament ? ` · ${tournament}` : ""} · ${
          format === "sets" ? "sets" : "legs"
        } · ${startsAt ? new Date(startsAt).toLocaleString() : ""}`}
        onConfirm={() => saveDetails.mutate()}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this fixture?"
        description={`${match.player_a} vs ${match.player_b} and every prediction on it will be removed. This can't be undone.`}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

const NEW_TOURNAMENT = "__new__";

/** Pick an existing tournament from a dropdown, or type a brand new one. */
function TournamentPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: tournaments = [] } = useTournaments();
  const names = Array.from(
    new Set([
      ...PRESET_TOURNAMENTS,
      ...tournaments.map((t) => t.tournament).filter((t) => t !== "Other"),
    ]),
  );
  const known = value !== "" && names.includes(value);
  const [custom, setCustom] = useState(!known && value !== "");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Tournament</Label>
      <Select
        value={custom ? NEW_TOURNAMENT : known ? value : ""}
        onValueChange={(v) => {
          if (v === NEW_TOURNAMENT) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger id={id} className="h-11 w-full">
          <SelectValue placeholder="Select a tournament" />
        </SelectTrigger>
        <SelectContent>
          {names.map((n) => (
            <SelectItem key={n} value={n}>
              {n}
            </SelectItem>
          ))}
          <SelectItem value={NEW_TOURNAMENT}>+ New tournament…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input
          value={value}
          placeholder="Tournament name"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <p className="text-xs text-muted-foreground">
        The league table resets for each tournament and past ones move to the archive.
      </p>
    </div>
  );
}
