import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function useNews() {
  return useQuery({
    queryKey: ["darts-news"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("news_updates").select("id,message,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function NewsTicker() {
  const { data, isError } = useNews();
  const text = data?.length ? data.map((n) => n.message).join("     •     ") : isError ? "News updates temporarily unavailable" : "No announcements at the moment";
  return (
    <aside aria-label="Breaking news" className="grid grid-cols-[auto_minmax(0,1fr)] items-center border-y border-border bg-card">
      <div className="flex h-10 items-center gap-1.5 bg-destructive px-3 text-xs font-bold uppercase text-destructive-foreground"><Megaphone className="size-3.5" /> News</div>
      <div className="news-track min-w-0 overflow-hidden px-3 py-2 text-sm"><p className={data?.length ? "news-scroll" : "truncate"}>{text}</p></div>
    </aside>
  );
}

export function NewsAdmin() {
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  const { data, isError } = useNews();
  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("news_updates").insert({ message: message.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setMessage(""); qc.invalidateQueries({ queryKey: ["darts-news"] }); toast.success("News update published"); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["darts-news"] }); toast.success("News update removed"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="space-y-4 pt-3">
      <h3 className="font-display text-2xl">Breaking news</h3>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (message.trim()) publish.mutate(); }}>
        <Textarea aria-label="News update" placeholder="Withdrawals, schedule changes or big darts news…" maxLength={500} required value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{message.length}/500</span><Button disabled={!message.trim() || publish.isPending}><Send /> Publish update</Button></div>
      </form>
      {isError && <p role="alert" className="text-sm text-destructive">Could not load news updates.</p>}
      <ul className="divide-y divide-border">
        {data?.map((n) => <li key={n.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"><div className="min-w-0"><p className="break-words text-sm">{n.message}</p><time className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</time></div><Button variant="ghost" size="icon" aria-label={`Remove update: ${n.message}`} title="Remove update" disabled={remove.isPending} onClick={() => remove.mutate(n.id)}><Trash2 /></Button></li>)}
      </ul>
    </section>
  );
}