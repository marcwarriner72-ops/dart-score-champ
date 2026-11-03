import { playThwack } from "@/lib/sound";

/** Save confirmation: plays the dart "thwack" sound (no on-screen flying emoji). */
export function throwDart(_label = "Saved") {
  if (typeof window === "undefined") return;
  playThwack();
}
