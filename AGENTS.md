<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Home quick settings reuse the shared Nudge preference hook and existing device reminder/sound storage so Profile and Home change the same preferences.
- The daily predictions panel uses existing Dashboard data and an accessible dialog; it never fetches or exposes other users' upcoming picks.
- Fixture-provider calls run in a server-only helper shared by the authenticated admin action and managed cron route; the service-only transactional RPC serializes writes and preserves existing player order, predictions, results and archives.
