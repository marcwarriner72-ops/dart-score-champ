import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function PlayerAvatar({
  path,
  name,
  className,
}: {
  path: string | null | undefined;
  name?: string | null;
  className?: string;
}) {
  const { data: url } = useAvatarUrl(path);
  const initials = (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border/60 bg-primary/15 text-xs font-bold uppercase text-primary",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name ? `${name}'s profile photo` : "Profile photo"} className="size-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <UserRound className="size-1/2" />
      )}
    </span>
  );
}
