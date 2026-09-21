import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, MessageCircle, Send, Trash2, X } from "lucide-react";
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
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                <PlayerAvatar
                  path={person?.avatar}
                  name={person?.name}
                  className="size-8 text-[10px]"
                />
                <div className={`flex min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}>
                  <span className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {mine ? "You" : (person?.name ?? "Player")}
                    {" · "}
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {canDelete && (
                      <button
                        type="button"
                        aria-label="Delete message"
                        onClick={() => setToDelete(m)}
                        className="text-muted-foreground transition-transform active:scale-90"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </span>
                  {m.content && (
                    <p
                      className={`max-w-[16rem] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                        mine
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {m.content}
                    </p>
                  )}
                  {m.image_path && <ChatImage path={m.image_path} onOpen={setLightbox} />}
                </div>
              </div>
            );
          })
        )}
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
            onChange={(e) => setDraft(e.target.value)}
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
              It will disappear for everyone in the league. This can't be undone.
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
