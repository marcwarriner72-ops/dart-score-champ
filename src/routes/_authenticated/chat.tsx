import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/league";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "League Chat | Darts Predictor League" },
      {
        name: "description",
        content:
          "Live group chat for the Darts Predictor League — talk trash, share tips and react to results in real time.",
      },
      { property: "og:title", content: "League Chat | Darts Predictor League" },
      {
        property: "og:description",
        content: "Live group chat for your darts prediction league.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

function ChatPage() {
  const { data: user } = useSession();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, user_id, content, created_at")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as Message[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return data;
    },
  });

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, p.display_name);
    return map;
  }, [profiles]);

  useEffect(() => {
    const channel = supabase
      .channel("league-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ user_id: user.id, content });
    setSending(false);
    if (error) {
      toast.error("Message not sent");
      return;
    }
    setDraft("");
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  }

  return (
    <AppShell title="Chat" subtitle="League banter, live">
      <div className="flex flex-col gap-3 pb-20">
        {messages.length === 0 ? (
          <div className="panel p-6 text-center text-sm text-muted-foreground">
            No messages yet — start the banter.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {mine ? "You" : (names.get(m.user_id) ?? "Player")}
                  {" · "}
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <p
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="fixed bottom-[68px] left-1/2 z-20 flex w-full max-w-lg -translate-x-1/2 gap-2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Say something…"
          maxLength={1000}
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </AppShell>
  );
}
