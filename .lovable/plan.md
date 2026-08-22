# Admin override, richer profiles, reminders, archive filters, country flags

## 1. Admin can fix anything, any time

Today the database itself blocks changes after throw-off: a lock rule rejects edits to players, tournament, start time and format once a match has started, and finished/started fixtures can't be deleted. That stays the default, but admins get an explicit override.

- Admin fixture cards regain Edit and Delete after start, behind a clear "Override lock" step with a confirmation dialog ("This fixture has already started — only do this to correct an obvious error").
- Database changes: the lock rule allows the change when the person making it is an admin; the delete rule allows admins to delete a started or finished fixture.
- Admins can also re-open a finished fixture (clear the result, move it back out of the archive) and correct a saved score.
- Points and league tables recalculate automatically from the corrected score.

## 2. Profile page

Photo upload and username already exist. Adding a details section:

- Favourite player, hometown, walk-on song, highest checkout, short bio.
- Shown read-only on other players' cards (tap a name on the leaderboard or results to see their card).
- New optional columns on the profiles table; everyone signed in can read them, only you can edit your own.

## 3. "Match starting soon" reminders

Delivered in-app and via the browser's notification popup while the app is running or open in a background tab — no accounts, no cost, no extra setup for your friends.

- A reminder toggle on the profile page asks for notification permission.
- Alerts at 60 minutes and at 5 minutes before each fixture, plus a "first match of <competition> starts soon" alert.
- A persistent "Next up" strip with live countdown on every page.
- Each alert fires once per device (remembered locally).

Note: alerts stop when the app is fully closed. True background push (working with the app closed) needs a service worker, push keys and a scheduler — say the word and I'll plan that as a follow-up.

## 4. Archive with filters

Rework the archive on the Results page (and the admin archive) to stay clean:

- Collapsed by default, grouped by competition, newest date first throughout.
- Filter bar: date range (this week / this month / this season / all), player (fixture player or league member), and completion (finished / in play / all).
- Search box for a player or competition name.
- Result rows stay collapsed to the scoreline; tap to expand everyone's picks and points.

## 5. Country flags on competitions

- A country is stored per fixture, pre-filled automatically for the preset World Series events (Bahrain, Saudi Arabia, Nordic/Denmark, US, New Zealand, Australia, World Series Finals/Netherlands) and selectable from a dropdown for any new competition.
- The flag appears next to the competition name everywhere it's shown: predict page, results, archive, leaderboard tournament selector and admin fixture list.

## Technical notes

- Migration: add `country` (2-letter code) to matches and profile detail columns; rewrite `lock_started_matches()` to skip the lock for admins; replace the admin delete policy so admins may delete started/finished fixtures.
- Flags rendered as emoji from the country code (no image assets, no cost).
- Reminders use the browser Notification API plus a client-side timer against fixture start times; fired-alert state kept in local storage.
- New shared components: `CountryFlag`, `ArchiveFilters`, `PlayerCard`; archive filtering derived client-side from existing queries.
