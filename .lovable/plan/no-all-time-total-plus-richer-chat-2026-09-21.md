# No all-time total, plus richer chat

## 1. Drop the combined points total
The league table currently offers an "All time" option that adds up points across every
competition. That goes away — the table only ever shows one competition at a time, and the
Archive section stays exactly as it is so every finished competition keeps its final table.

- Remove the "All time" entry from the competition picker on the Table page.
- Default to the live competition; if none is live, show the most recent one.
- No data is deleted — past results and past tables remain untouched.

## 2. Chat: delete your own messages
- Long-press or tap a small menu on your own message to delete it.
- A short confirm ("Delete this message?") before it disappears.
- You can only remove your own messages; an admin can remove any message.

## 3. Chat: send photos and images
- A camera/photo button next to the message box picks an image from the phone.
- The image is shrunk before sending so it uploads fast on mobile data.
- Images appear inline in the chat bubble; tap to view it full screen.
- A message can be a photo on its own or a photo with a caption.

## Technical notes
- Table: remove the `ALL_TIME` option and `useLeaderboard()` usage from
  `src/routes/_authenticated/leaderboard.tsx`; keep `useTournamentLeaderboard` and the archive
  list. The `leaderboard` view itself stays in the database (still used by the dashboard) — no
  migration, no data change.
- Chat images: migration adds `messages.image_path text null`, relaxes the
  `content` not-null requirement (or stores `''` for photo-only messages), and creates a private
  `chat-images` bucket with policies: authenticated read, insert restricted to
  `auth.uid()`-prefixed folders, delete own objects, plus admin delete via `has_role`.
- Add an admin delete policy on `public.messages` (`has_role(auth.uid(), 'admin')`); the
  existing "delete own message" policy covers players.
- Chat UI in `src/routes/_authenticated/chat.tsx`: reuse the downscale helper pattern from
  `profile.tsx`, sign image URLs with a `useQuery` hook like `useAvatarUrl`, delete the storage
  object alongside the row, and keep the existing realtime invalidation.
