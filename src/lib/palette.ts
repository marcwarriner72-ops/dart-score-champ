import { useEffect, useState } from "react";

export const PALETTES = [
  { id: "emerald", name: "Oche Emerald", swatch: ["#2fbf71", "#e0533d", "#e8c547"] },
  { id: "electric", name: "Electric Bullseye", swatch: ["#22d3ee", "#e879f9", "#a5f3fc"] },
  { id: "amber", name: "Amber Champion", swatch: ["#f5b041", "#ef6c33", "#ffe08a"] },
  { id: "crimson", name: "Crimson Flight", swatch: ["#ef4444", "#f59e0b", "#fca5a5"] },
  { id: "stealth", name: "Midnight Stealth", swatch: ["#cbd5e1", "#64748b", "#f1f5f9"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
const KEY = "dpl-palette";

export function applyPalette(id: string) {
  const el = document.documentElement;
  if (id === "emerald") el.removeAttribute("data-palette");
  else el.setAttribute("data-palette", id);
}

export function getPalette(): PaletteId {
  const v = localStorage.getItem(KEY);
  return (PALETTES.some((p) => p.id === v) ? v : "emerald") as PaletteId;
}

export function usePalette() {
  const [palette, setState] = useState<PaletteId>("emerald");
  useEffect(() => {
    const p = getPalette();
    setState(p);
    applyPalette(p);
  }, []);
  const setPalette = (id: PaletteId) => {
    localStorage.setItem(KEY, id);
    applyPalette(id);
    setState(id);
  };
  return { palette, setPalette };
}
