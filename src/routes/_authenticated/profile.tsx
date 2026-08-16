import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useProfile, useSession } from "@/lib/league";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function downscale(file: File, max = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.85),
  );
}

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile | Darts Predictor League" },
      {
        name: "description",
        content: "Change the username your friends see on the darts league table and in chat.",
      },
      { property: "og:title", content: "Your Profile | Darts Predictor League" },
      {
        property: "og:description",
        content: "Update your display name for the darts predictor league.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (trimmed.length < 2) throw new Error("Username must be at least 2 characters");
      if (trimmed.length > 24) throw new Error("Keep it under 24 characters");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Username updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["tournament-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update username"),
  });

  const photo = useMutation({
    mutationFn: async (file: File | null) => {
      if (!file) {
        if (profile?.avatar_url) await supabase.storage.from("avatars").remove([profile.avatar_url]);
        const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user!.id);
        if (error) throw error;
        return;
      }
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
      if (file.size > 8 * 1024 * 1024) throw new Error("Image must be under 8MB");
      const blob = await downscale(file);
      const path = `${user!.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const old = profile?.avatar_url;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user!.id);
      if (error) throw error;
      if (old) await supabase.storage.from("avatars").remove([old]);
    },
    onSuccess: () => {
      toast.success("Photo updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update photo"),
  });

  return (
    <AppShell title="Profile" subtitle="How your friends see you">
      <section className="panel space-y-4 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PlayerAvatar
              path={profile?.avatar_url}
              name={profile?.display_name}
              className="size-16 text-base"
            />
            <button
              type="button"
              aria-label="Upload profile photo"
              disabled={photo.isPending}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-border bg-card text-primary shadow"
            >
              <Camera className="size-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (f) photo.mutate(f);
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold uppercase">
              {profile?.display_name ?? "Player"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            {profile?.avatar_url ? (
              <button
                type="button"
                disabled={photo.isPending}
                onClick={() => photo.mutate(null)}
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4"
              >
                <Trash2 className="size-3" /> Remove photo
              </button>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                {photo.isPending ? "Uploading…" : "Tap the camera to add a photo"}
              </p>
            )}
          </div>
        </div>


        <div className="space-y-1.5 pt-1">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your nickname"
          />
          <p className="text-xs text-muted-foreground">
            Shown on the league table, results and chat.
          </p>
        </div>

        <Button
          className="h-11 w-full font-bold uppercase"
          disabled={save.isPending || !name.trim() || name.trim() === profile?.display_name}
          onClick={() => save.mutate()}
        >
          Save username
        </Button>
      </section>
    </AppShell>
  );
}
