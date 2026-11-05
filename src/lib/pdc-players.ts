import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PdcPlayer = {
  player_id: string;
  name: string;
  nickname: string | null;
  country_code: string | null;
  merit_ranking: number | null;
  wiki_title: string | null;
};

export function usePdcPlayers() {
  return useQuery({
    queryKey: ["pdc-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdc_players")
        .select("player_id,name,nickname,country_code,merit_ranking,wiki_title")
        .order("merit_ranking", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as PdcPlayer[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/** Public portrait from the player's Wikipedia page (served by Wikimedia). */
export function usePlayerPortrait(wikiTitle: string | null) {
  return useQuery({
    queryKey: ["pdc-portrait", wikiTitle],
    enabled: !!wikiTitle,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle!)}`);
      if (!res.ok) return null;
      const j = (await res.json()) as { thumbnail?: { source: string }; originalimage?: { source: string } };
      return j.thumbnail?.source?.replace(/\/\d+px-/, "/400px-") ?? j.originalimage?.source ?? null;
    },
  });
}

/** Flag emoji, including England/Scotland/Wales subdivision flags. */
export function playerFlag(code: string | null) {
  if (!code) return "";
  const sub: Record<string, string> = { "GB-ENG": "eng", "GB-SCT": "sct", "GB-WLS": "wls" };
  if (sub[code]) {
    return "\u{1F3F4}" + [..."gb" + sub[code]].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join("") + "\u{E007F}";
  }
  const cc = code === "GB-NIR" ? "GB" : code.slice(0, 2);
  return [...cc.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}
