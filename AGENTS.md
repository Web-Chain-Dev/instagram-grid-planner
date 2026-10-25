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

## Project rules
- Grid data lives in ig_profiles / ig_posts / ig_highlights, all owner-scoped by RLS on user_id; the browser talks to them directly with the Supabase client (no server functions needed).
- Media is stored in the private `media` bucket under `<user_id>/...`; DB stores paths, which are resolved to signed URLs on read (public buckets are blocked in this workspace).
- Grid order = pinned first, then `position` ascending (see orderGrid in src/lib/ig-types.ts); keep the IG replica components in src/components/ig free of app chrome.
- External grid sources plug in via src/lib/importers (Instagram official API is a stub slot) so the editor never depends on where posts came from.
- Schema migrations are kept in drizzle/migrations for re-applying to a fresh database.
