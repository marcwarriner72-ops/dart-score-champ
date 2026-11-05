import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, MessageCircle, Send, SmilePlus, Trash2, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { ChatSkeleton } from "@/components/Skeletons";
import { PlayerAvatar } from "@/components/PlayerAvatar";
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
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfiles, useSession } from "@/lib/league";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "League Chat | Darts Predictor League" },
      {
        name: "description",
        content:
          "Live group chat for the Darts Predictor League — share photos, talk trash and react to results in real time.",
      },
      { property: "og:title", content: "League Chat | Darts Predictor League" },
      {
        property: "og:description",
        content: "Live group chat with photo sharing for your darts prediction league.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎯"];
const NAME_COLORS = ["text-primary", "text-gold", "text-accent", "text-destructive", "text-chart-2", "text-chart-3", "text-chart-4", "text-chart-5"];
function nameColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  image_path: string | null;
};

async function downscale(file: File, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process image"))),
      "image/jpeg",
      0.85,
    ),
  );
}

function useChatImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["chat-image", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-images")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

function ChatImage({ path, onOpen }: { path: string; onOpen: (url: string) => void }) {
  const { data: url } = useChatImageUrl(path);
  if (!url) {
    return <div className="mt-1 h-40 w-52 animate-pulse rounded-2xl bg-secondary" />;
  }
  return (
    <button type="button" onClick={() => onOpen(url)} className="mt-1 block">
      <img
        src={url}
        alt="Shared in chat"
        className="max-h-60 w-52 rounded-2xl border border-border/60 object-cover"
      />
    </button>
  );
}

function ChatPage() {
  const { data: user } = useSession();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [toDelete, setToDelete] = useState<Message | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, user_id, content, created_at, image_path")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as Message[];
    },
  });

  const { data: profiles = [] } = useProfiles();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearText, setClearText] = useState("");
  const [typers, setTypers] = useState<Record<string, number>>({});
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTyped = useRef(0);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: reactions = [] } = useQuery({
    queryKey: ["message-reactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("id, message_id, user_id, emoji");
      if (error) throw error;
      return data as Reaction[];
    },
  });
  const reactionsByMsg = useMemo(() => {
    const m = new Map<string, Reaction[]>();
    for (const r of reactions) m.set(r.message_id, [...(m.get(r.message_id) ?? []), r]);
    return m;
  }, [reactions]);

  useEffect(() => {
    const ch = supabase
      .channel(`reactions-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        queryClient.invalidateQueries({ queryKey: ["message-reactions"] }),
      )
      .subscribe();
    const typing = supabase
      .channel("league-chat-typing")
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const id = payload?.user_id as string | undefined;
        if (!id) return;
        setTypers((t) => ({ ...t, [id]: Date.now() }));
      })
      .subscribe();
    typingChannel.current = typing;
    const tick = setInterval(() => {
      setTypers((t) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(t).filter(([, v]) => now - v < 3500));
        return Object.keys(next).length === Object.keys(t).length ? t : next;
      });
    }, 1000);
    return () => {
      clearInterval(tick);
      supabase.removeChannel(ch);
      supabase.removeChannel(typing);
    };
  }, [queryClient]);

  function notifyTyping() {
    if (!user) return;
    const now = Date.now();
    if (now - lastTyped.current < 1500) return;
    lastTyped.current = now;
    void typingChannel.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }

  async function react(messageId: string, emoji: string) {
    if (!user) return;
    setPickerFor(null);
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === user.id);
    const res = mine
      ? mine.emoji === emoji
        ? await supabase.from("message_reactions").delete().eq("id", mine.id)
        : await supabase.from("message_reactions").update({ emoji }).eq("id", mine.id)
      : await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    if (res.error) toast.error("Couldn't save reaction");
    queryClient.invalidateQueries({ queryKey: ["message-reactions"] });
  }

  async function clearAll() {
    setClearOpen(false);
    setClearText("");
    const paths = messages.map((m) => m.image_path).filter(Boolean) as string[];
    const { error } = await supabase.from("messages").delete().not("id", "is", null);
    if (error) {
      toast.error("Could not clear chat");
      return;
    }
    if (paths.length) await supabase.storage.from("chat-images").remove(paths);
    toast.success("All chat messages cleared");
    queryClient.invalidateQueries({ queryKey: ["messages"] });
    queryClient.invalidateQueries({ queryKey: ["message-reactions"] });
  }

  const people = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null }>();
    for (const p of profiles)
      map.set(p.id, { name: p.display_name, avatar: p.avatar_url ?? null });
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

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.preview);
    };
  }, [photo]);

  function pickPhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if ((!content && !photo) || !user) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (photo) {
        const blob = await downscale(photo.file);
        imagePath = `${user.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("chat-images")
          .upload(imagePath, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
      }
      const { error } = await supabase
        .from("messages")
        .insert({ user_id: user.id, content, image_path: imagePath });
      if (error) throw error;
      setDraft("");
      setPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Message not sent");
    } finally {
      setSending(false);
    }
  }

  async function remove(message: Message) {
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) {
      toast.error("Could not delete that message");
      return;
    }
    if (message.image_path) {
      await supabase.storage.from("chat-images").remove([message.image_path]);
    }
    toast.success("Message deleted");
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  }

  return (
    <AppShell title="Chat" subtitle="League banter, live">
      <div className="panel mb-3 flex items-center gap-2 p-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Quick links
        </span>
        <a
          href="https://www.paddypower.com/darts"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary underline-offset-2 transition-transform hover:underline active:scale-95"
        >
          Paddy Power
        </a>
        <a
          href="https://www.pdc.tv"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary underline-offset-2 transition-transform hover:underline active:scale-95"
        >
          pdc.tv
        </a>
      </div>
      {isAdmin && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mb-3 w-full"
          onClick={() => setClearOpen(true)}
        >
          <ShieldAlert className="size-4" /> Clear All Chat Data
        </Button>
      )}

      <div className="flex flex-col gap-3 pb-28">
        {isLoading ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="size-6" />}
            title="No messages yet"
            description="Be the first to start the banter before the next throw-off."
          />
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            const person = people.get(m.user_id);
            const canDelete = mine || !!isAdmin;
            const msgReactions = reactionsByMsg.get(m.id) ?? [];
            const counts: Record<string, number> = {};
            for (const r of msgReactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
            const myReaction = msgReactions.find((r) => r.user_id === user?.id)?.emoji;
            return (
              <div
                key={m.id}
                className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                <PlayerAvatar
                  path={person?.avatar}
                  name={person?.name}
                  className="size-8 text-[10px]"
                />
                <div className={`flex min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}>
                  <span className={`px-1 text-[11px] font-bold uppercase tracking-wide ${mine ? "text-muted-foreground" : nameColor(m.user_id)}`}>
                    {mine ? "You" : (person?.name ?? "Player")}
                  </span>
                  <div
                    className={`relative max-w-[16rem] rounded-2xl px-3.5 pb-1.5 pt-2 text-sm ${
                      mine
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-secondary text-secondary-foreground"
                    } ${msgReactions.length ? "mb-3" : ""}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setPickerFor(m.id);
                    }}
                    onTouchStart={() => {
                      pressTimer.current = setTimeout(() => setPickerFor(m.id), 450);
                    }}
                    onTouchEnd={() => pressTimer.current && clearTimeout(pressTimer.current)}
                    onTouchMove={() => pressTimer.current && clearTimeout(pressTimer.current)}
                  >
                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                    {m.image_path && <ChatImage path={m.image_path} onOpen={setLightbox} />}
                    <span className="mt-0.5 flex items-center justify-end gap-2 text-[10px] tabular-nums opacity-70">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msgReactions.length > 0 && (
                      <div className="absolute -bottom-3 right-2 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-0.5 text-xs text-foreground shadow">
                        {Object.entries(counts).map(([e, n]) => (
                          <button key={e} type="button" onClick={() => react(m.id, e)} className="flex items-center">
                            {e}
                            {n > 1 && <span className="ml-0.5 text-[10px] tabular-nums">{n}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-1 text-muted-foreground">
                    <button type="button" aria-label="React" onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}>
                      <SmilePlus className="size-3.5" />
                    </button>
                    {canDelete && (
                      <button type="button" aria-label="Delete message" onClick={() => setToDelete(m)}>
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {pickerFor === m.id && (
                    <div className="flex gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-lg">
                      {REACTIONS.map((e) => (
                        <button key={e} type="button" onClick={() => react(m.id, e)} className={`rounded-full p-1 text-lg transition-transform hover:scale-125 ${myReaction === e ? "bg-secondary" : ""}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        {(() => {
          const names = Object.keys(typers)
            .filter((id) => id !== user?.id)
            .map((id) => people.get(id)?.name ?? "Someone");
          if (!names.length) return null;
          return (
            <p className="animate-pulse px-2 text-xs italic text-muted-foreground">
              {names.length === 1 ? `${names[0]} is typing…` : `${names.slice(0, 2).join(" & ")} are typing…`}
            </p>
          );
        })()}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="fixed bottom-[68px] left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md"
      >
        {photo && (
          <div className="relative mb-2 inline-block">
            <img
              src={photo.preview}
              alt="Photo to send"
              className="h-20 w-20 rounded-xl border border-border/60 object-cover"
            />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => setPhoto(null)}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-border bg-card"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Add a photo"
            onClick={() => fileRef.current?.click()}
            className="shrink-0 transition-transform active:scale-95"
          >
            <ImagePlus className="size-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              pickPhoto(f);
            }}
          />
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              notifyTyping();
            }}
            placeholder={photo ? "Add a caption…" : "Say something…"}
            maxLength={1000}
            aria-label="Message"
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0 transition-transform active:scale-95"
            disabled={sending || (!draft.trim() && !photo)}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = toDelete;
                setToDelete(null);
                if (target) void remove(target);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={(o) => { setClearOpen(o); if (!o) setClearText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear ALL chat data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every message, photo and reaction for everyone. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={clearText} onChange={(e) => setClearText(e.target.value)} placeholder="Type DELETE" aria-label="Confirm clear" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={clearText !== "DELETE"} onClick={() => void clearAll()}>
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lightbox && (
        <button
          type="button"
          aria-label="Close photo"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-4 backdrop-blur"
        >
          <img src={lightbox} alt="Shared in chat" className="max-h-full max-w-full rounded-2xl" />
        </button>
      )}
    </AppShell>
  );
}
