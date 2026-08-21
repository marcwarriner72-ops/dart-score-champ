# Flying dart save confirmation + admin archive polish

## What you'll get

1. **Flying dart confirmation on save**
   When you confirm a prediction, a dart flies across the screen and thuds into a dartboard, with a short "Prediction saved" flash, before the card settles back into its saved state. Same effect used when an admin saves a final result, so both actions feel confirmed.

2. **Admin archive that actually tidies up**
   Right now finished fixtures still sit in a plain list under the form. After you hit "Save result", the fixture animates out of the active list and drops into a collapsible **Archive** section, closed by default, grouped by tournament and sorted newest first, with a count badge. Active (upcoming / in play) fixtures stay clean at the top.

3. **Visual polish on both pages**
   - Clear section headers: "Active fixtures" vs "Archive".
   - Locked fixtures keep their badge; archived ones get a subtle muted/dimmed card style with the final score shown large.
   - Success toasts get the darts accent styling and tap animations stay consistent.

## Technical notes

- New `src/components/DartThrow.tsx`: a fixed-position, pointer-events-none overlay that plays a one-shot dart-flight keyframe (reusing the `dart-fly` style already in `src/styles.css`, plus a new `dart-throw` keyframe with a board impact + ring pulse). Exposed via a `useDartThrow()` hook so any page can fire `throwDart()`.
- Mount the overlay once in `src/routes/__root.tsx` (context provider) so it can render above all content.
- `src/routes/_authenticated/predict.tsx`: call `throwDart()` in the prediction mutation's `onSuccess`, before/with the existing toast.
- `src/routes/_authenticated/admin.tsx`: call `throwDart()` on successful result save; split the fixture list into an active list and an `Archive` block using the existing shadcn `Collapsible`/`Accordion`, grouped by `tournament`, sorted by `starts_at` desc.
- Respect `prefers-reduced-motion`: skip the animation and just show the toast.
- No database or scoring changes.
