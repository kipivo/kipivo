# Admin account directory

After setup, open **Administration** from the account menu or go directly to `/admin`. The page links to the account directory (`/admin/accounts`) and to settings when permitted. Signed-out visitors return to their requested admin page after sign-in. Members cannot access the directory, even by requesting it directly.

On **Manage accounts**, an administrator can search for a teammate by part of their name or email before changing their role. Submit the form to search; **Clear** returns to the unfiltered directory. Draft text is not sent on each keystroke or stored in the page URL. A new search starts on page one.

## Contract and ownership

The existing `admin.accounts.list` procedure and `GET /api/v1/admin/accounts` accept the same optional `query`. After trimming, at most 128 characters are accepted. An empty query means no filter. Matching is case-insensitive; `%`, `_` and backslash are ordinary characters, not wildcards. Pages remain ordered by account ID. Pass `nextCursor` with the same query for the next page; discard the cursor when changing the filter. Omitting `limit` uses the configured directory page size.

`@kipivo/admin/directory` owns the input and instance settings, not an additional app or privilege level. The API still requires a session; core checks `accounts.read` before asking the database for results. Applying the filter in PostgreSQL before limiting the result avoids downloading an entire directory or searching just the visible page. Role changes retain their separate transactional authorization check.

## Verification

Run `bun run check`, then follow the [database and authentication test instructions](testing.md#database-and-authentication-tests). The auth suite covers both transports, filtered cursors, literal characters, denial for members, and clearing a search in the browser.
