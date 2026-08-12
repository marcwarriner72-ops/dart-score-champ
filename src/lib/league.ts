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
};

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
        .select("id, display_name")
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
