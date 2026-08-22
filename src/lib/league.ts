import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Match = {
  id: string;
  player_a: string;
  player_b: string;
  tournament: string | null;
  starts_at: string;
  status: string;
  score_a: number | null;
  score_b: number | null;
  format?: string | null;
  country?: string | null;
};

/** Preset PDC World Series events offered in the admin tournament dropdown. */
export const PRESET_TOURNAMENTS = [
  "Bahrain Darts Masters",
  "Saudi Arabia Darts Masters",
  "Nordic Darts Masters",
  "US Darts Masters",
  "New Zealand Darts Masters",
  "Australian Darts Masters",
  "World Series of Darts Finals",
];

/** Host countries used for the flag shown next to a competition. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "NL", name: "Netherlands" },
  { code: "DE", name: "Germany" },
  { code: "BE", name: "Belgium" },
  { code: "DK", name: "Denmark" },
  { code: "SE", name: "Sweden" },
  { code: "AT", name: "Austria" },
  { code: "GI", name: "Gibraltar" },
  { code: "HU", name: "Hungary" },
  { code: "CZ", name: "Czechia" },
  { code: "PL", name: "Poland" },
  { code: "BH", name: "Bahrain" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
  { code: "PH", name: "Philippines" },
  { code: "ZA", name: "South Africa" },
];

/** Best guess of the host country from a competition name. */
export function guessCountry(tournament: string | null | undefined): string | null {
  const t = (tournament ?? "").toLowerCase();
  if (!t) return null;
  const rules: [RegExp, string][] = [
    [/bahrain/, "BH"],
    [/saudi/, "SA"],
    [/dubai|abu dhabi|emirates/, "AE"],
    [/nordic|denmark|copenhagen/, "DK"],
    [/new zealand|auckland/, "NZ"],
    [/australia|melbourne|wollongong/, "AU"],
    [/\bus\b|united states|new york|madison/, "US"],
    [/canada|toronto/, "CA"],
    [/world series of darts finals|netherlands|dutch|amsterdam|rotterdam/, "NL"],
    [/german|europe|dortmund|munich/, "DE"],
    [/belgi|antwerp/, "BE"],
    [/gibraltar/, "GI"],
    [/hungar|budapest/, "HU"],
    [/czech|prague/, "CZ"],
    [/poland|warsaw/, "PL"],
    [/ireland|dublin/, "IE"],
    [/japan|tokyo/, "JP"],
    [/philippin/, "PH"],
    [/south africa/, "ZA"],
    [/sweden|stockholm/, "SE"],
    [/austria|graz/, "AT"],
  ];
  for (const [re, code] of rules) if (re.test(t)) return code;
  return "GB";
}

/** Country code -> flag emoji (no image assets needed). */
export function countryFlagEmoji(code: string | null | undefined) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Flag for a fixture: stored country first, otherwise inferred from the name. */
export function matchFlag(m: Pick<Match, "country" | "tournament">) {
  return countryFlagEmoji(m.country ?? guessCountry(m.tournament));
}

/** "Legs" or "Sets" — how this fixture is scored. */
export function matchFormatLabel(m: Pick<Match, "format">) {
  return m.format === "sets" ? "Sets" : "Legs";
}


export type Prediction = {
  id: string;
  match_id: string;
  user_id: string;
  predicted_winner: string;
  score_a: number;
  score_b: number;
};

export type LeaderboardRow = {
  user_id: string | null;
  display_name: string | null;
  points: number | null;
  predictions_made: number | null;
  exact_hits: number | null;
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Match[];
    },
  });
}

export function useMyPredictions(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-predictions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });
}

export function predictionPoints(match: Match, p: Prediction | undefined): number | null {
  if (!p) return null;
  if (match.score_a === null || match.score_b === null) return null;
  const actual = match.score_a > match.score_b ? "a" : "b";
  if (p.predicted_winner !== actual) return 0;
  if (p.score_a === match.score_a && p.score_b === match.score_b) return 3;
  return 1;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hasStarted(match: Match) {
  return new Date(match.starts_at).getTime() <= Date.now();
}

export function isArchived(match: Match) {
  return match.status === "finished";
}

/** Predictions from everyone that RLS lets us see (own + matches already started). */
export function useVisiblePredictions() {
  return useQuery({
    queryKey: ["all-predictions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("predictions").select("*");
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminIds() {
  return useQuery({
    queryKey: ["admin-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id);
    },
  });
}

export type TournamentRow = {
  tournament: string;
  match_count: number;
  finished_count: number;
  first_match_at: string;
  last_match_at: string;
  is_active: boolean;
};

export type TournamentStanding = LeaderboardRow & { tournament: string };

/** All tournaments derived from fixtures, most recent first. */
export function useTournaments() {
  return useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("last_match_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TournamentRow[];
    },
  });
}

/** Standings split per tournament — the table resets for every new tournament. */
export function useTournamentLeaderboard() {
  return useQuery({
    queryKey: ["tournament-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_leaderboard")
        .select("*")
        .order("points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TournamentStanding[];
    },
  });
}

export function matchTournament(m: Match) {
  return m.tournament || "Other";
}
