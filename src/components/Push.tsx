import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/league";

export const PUSH_PRESETS = [
  "📢 New fixtures are LIVE! Get your predictions in.",
  "⚠️ Time is ticking! The darts start soon — have you made your picks?",
  "🏆 Game shot! Results are loaded and the league table has been updated.",
] as const;

const SEEN_KEY = "darts:last-alert";

function useOptIn() {
  const { data: user } = useSession();
  const uid = user?.id;
  return useQuery({
    queryKey: ["push-opt-in", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("push_opt_ins").select("enabled").eq("user_id", uid!).maybeSingle()).data?.enabled ?? false,
  });
}

/** Opt-in toggle shown in My Profile & Settings. */
export function PushOptIn() {
  const qc = useQueryClient();
  const { data: user } = useSession();
  const { data: enabled = false } = useOptIn();
  const toggle = useMutation({
    mutationFn: async () => {
      const next = !enabled;
      if (next && typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
      const { error } = await supabase.from("push_opt_ins").upsert({ user_id: user!.id, enabled: next, updated_at: new Date().toISOString() });
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => { toast.success(next ? "Match alerts switched on" : "Match alerts switched off"); qc.invalidateQueries({ queryKey: ["push-opt-in"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex items-center justify-between gap-3 border border-border bg-card p-3">
      <div className="min-w-0"><p className="text-sm font-bold">Push notifications</p><p className="text-xs text-muted-foreground">Get instant alerts from the Admin Command Center on this device.</p></div>
      <Button variant={enabled ? "default" : "outline"} aria-pressed={enabled} disabled={!user || toggle.isPending} onClick={() => toggle.mutate()} className="shrink-0 gap-2">
        {enabled ? <Bell /> : <BellOff />}{enabled ? "On" : "Off"}
      </Button>
    </div>
  );
}

/** Mounted once in the app shell: shows new admin alerts to opted-in players. */
export function usePushListener() {
  const { data: enabled = false } = useOptIn();
  const { data: latest } = useQuery({
    queryKey: ["push-latest"], enabled, refetchInterval: 20000,
    queryFn: async () => (await supabase.from("push_alerts").select("id,message,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  useEffect(() => {
    if (!enabled || !latest) return;
    const seen = localStorage.getItem(SEEN_KEY);
    localStorage.setItem(SEEN_KEY, latest.id);
    if (!seen || seen === latest.id) return; // first load just records the baseline
    toast(latest.message);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Darts Predictor League", { body: latest.message });
    } catch { /* some mobile browsers only allow notifications from a service worker */ }
  }, [enabled, latest]);
}

/** Admin blast panel with the three preset alerts. */
export function PushAdmin() {
  const { data: count } = useQuery({
    queryKey: ["push-opt-count"],
    queryFn: async () => (await supabase.from("push_opt_ins").select("user_id", { count: "exact", head: true }).eq("enabled", true)).count ?? 0,
  });
  const send = useMutation({
    mutationFn: async (message: string) => { const { error } = await supabase.from("push_alerts").insert({ message }); if (error) throw error; },
    onSuccess: () => toast.success("Alert sent to opted-in players"),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="panel mt-6 space-y-2 p-4">
      <h3 className="font-display text-2xl">Nudge players</h3>
      <p className="text-sm text-muted-foreground">{count ?? 0} players have alerts switched on.</p>
      {PUSH_PRESETS.map((m) => <Button key={m} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3 text-left" disabled={send.isPending} onClick={() => send.mutate(m)}>{m}</Button>)}
    </section>
  );
}
