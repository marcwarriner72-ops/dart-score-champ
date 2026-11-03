import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Free-to-air public YouTube upload feeds (uploads playlist = channel id with UC → UU). */
export const CHANNELS = [
  { id: "pdc", name: "PDC Darts", src: "https://www.youtube-nocookie.com/embed/videoseries?list=UUmdY6iHqxBXFNpy4mOjxTnw" },
  { id: "sky-news", name: "Sky Sports News", src: "https://www.youtube-nocookie.com/embed/videoseries?list=UUoLrcjPV5PbUrUyXq5mjc_A" },
  { id: "bbc-sport", name: "BBC Sport Highlights", src: "https://www.youtube-nocookie.com/embed/videoseries?list=UUW6-BQWFA70Dyyc7ZpZ9Xlg" },
] as const;

const FAV_KEY = "darts:media-favorite";

export function MediaDock() {
  const [favorite, setFavorite] = useState("");
  const [active, setActive] = useState("");
  useEffect(() => {
    const f = localStorage.getItem(FAV_KEY) ?? "";
    setFavorite(f);
    setActive(f);
  }, []);
  function onFavorite(id: string) {
    setFavorite(id);
    localStorage.setItem(FAV_KEY, id);
  }
  const current = CHANNELS.find((c) => c.id === active) ?? CHANNELS.find((c) => c.id === favorite) ?? CHANNELS[0];
  return (
    <div className="space-y-3">
      <div className="aspect-video w-full border-2 border-border bg-muted">
        <iframe key={current.id} title={current.name} src={current.src} className="size-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
      </div>
      <ul className="divide-y divide-border border border-border bg-card">
        {CHANNELS.map((c) => (
          <li key={c.id} className={`flex items-center gap-2 px-2 ${c.id === current.id ? "bg-primary/10" : ""}`}>
            <button type="button" onClick={() => setActive(c.id)} className="min-h-12 flex-1 text-left text-sm font-semibold" aria-current={c.id === current.id}>{c.name}</button>
            <Button variant="ghost" size="icon" aria-label={favorite === c.id ? `${c.name} is your default` : `Make ${c.name} your default`} aria-pressed={favorite === c.id} onClick={() => onFavorite(favorite === c.id ? "" : c.id)}>
              <Star className={favorite === c.id ? "fill-primary text-primary" : "text-muted-foreground"} />
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Star a channel to open it by default. Streams come from the broadcasters' free public channels.</p>
    </div>
  );
}
