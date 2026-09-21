# Next PDC event countdown + full admin control of past fixtures

## 1. Countdown when nothing is scheduled

Today the dashboard panel says "Nothing scheduled yet" when there are no upcoming fixtures. Instead it will count down to the next official PDC event from a built-in calendar of event names, start dates and host countries (World Series events plus the other majors), showing the event name, host flag, date and the days/hours/mins/secs counter.

Past events in the list are skipped automatically, so it always shows the next one still to come. If every listed event has passed, it falls back to the current "nothing scheduled" note.

You can tell me any event or date to correct and I will update the built-in list.

## 2. Admin can change anything in the past, including other players' predictions

- Every fixture (upcoming, in play, finished/archived) keeps the existing "Fix error" flow for players, competition, date, score, re-open and delete.
- New on each fixture in admin: a **Predictions** panel listing every league member with their pick for that match. You can add a missing player's prediction, change an existing one, or remove it — for finished matches too. Points recalculate from the saved result immediately.
- Each change is confirmed with a dialog naming the player and the pick, so nothing is altered by a mis-tap.

## Technical notes

- New `PDC_EVENTS` calendar in `src/lib/league.ts` (name, ISO start, country code); `NextFixtureCountdown.tsx` falls back to the first future entry.
- Database migration: add admin policies on `predictions` so an admin (`has_role(auth.uid(),'admin')`) can insert, update and delete any row regardless of the match start time, keeping the existing per-user, time-locked policies untouched for normal players. The existing lock trigger is adjusted to allow admin writes on started/finished matches.
- Admin UI: new `AdminPredictions` section inside the fixture card in `src/routes/_authenticated/admin.tsx`, reading profiles + predictions for that match, writing through the existing confirm-dialog pattern, and invalidating the predictions/leaderboard queries on save.
