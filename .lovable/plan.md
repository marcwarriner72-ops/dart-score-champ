# Friendlier fixture filtering on the Predict page

The Predict page currently has one tournament dropdown; when a tournament has many fixtures it still means a lot of scrolling. This plan makes filtering faster and collapses the list.

## What changes

1. **One-tap filter chips instead of a dropdown**
   - Replace the tournament `Select` with a horizontal row of tappable chips: **All**, each active tournament name, and **To predict** (fixtures you haven't called yet).
   - Chips scroll sideways if there are many; the selected chip is highlighted.

2. **Collapsible tournament sections in "All" view**
   - When **All** is chosen, fixtures are grouped under a header per tournament (flag + name + fixture count).
   - Each section can be expanded/collapsed with a tap; all start collapsed except the tournament containing the next upcoming fixture, so the screen opens clean.

3. **"To predict" shortcut**
   - Shows only open fixtures without a saved prediction, so finishing your picks takes no scrolling.
   - Combined with a tournament chip: picking a tournament chip and **To predict** narrows to that tournament's unpredicted games.

4. **Keep the existing summary panel** (X to call / next up) and existing PredictionCard behaviour unchanged.

## Technical details

- Edit `src/routes/_authenticated/predict.tsx` only:
  - Replace `Select`-based tournament filter state with chip state (`tournament` + `onlyUnpredicted` booleans).
  - Add a `TournamentSection` component with `ChevronDown` toggle and per-tournament expanded state (`Set` of names), defaulting expanded for the tournament of the first upcoming fixture.
  - Derive grouped lists from the already-fetched `open` fixtures; no new queries.
- Reuse existing `CountryFlag`/`matchFlag` and styling tokens (`panel`, `border`, `bg-secondary`, `text-primary`).
