# Admin mode

## Goal

Give explicitly granted administrators a way to find a user, inspect that user's trips for debugging, edit trip details when needed, and recover content removed during investigation.

## Design

1. Add a site-wide `users.role` (`user` or `admin`), separate from trip membership roles. Default every existing and newly registered account to `user`. Grant or revoke `admin` through an operator-only Artisan command; never accept the role in public profile, registration, or membership APIs.
2. Add authenticated `/api/admin` endpoints to search users and list their trips, including archived trips. Return bounded pages and only the fields the admin screen needs. Enforce the admin role on the server before any lookup.
3. Add `/admin` as a guarded client route. Show user search and trip links, with an explicit admin banner on trips opened for debugging. Reuse the existing trip editor, while server-side trip access checks allow admins to view, edit, and manage trips without altering membership.
4. Add recoverable deletion for accounts, trips, and trip content using a `deleted_at` column and model soft-delete scopes. Normal reads and route model binding exclude deleted records. The admin screen can list deleted records and restore them. Keep ordinary trip archival distinct from deletion.
5. On account deletion, invalidate password reset links and database sessions. Keep the email reserved and trip memberships intact for restoration. Reject deletion of administrators, including the acting administrator.
6. Cover non-admin denial, cross-user reads and edits, deletion and restoration, and ordinary-user visibility with backend feature tests. Run frontend checks and the repository CI suite.
7. Record successful administrator access and mutations in an append-only audit table. Store the actor, time, trip or account target, action, route, and changed field names. Include edits through ordinary trip endpoints and direct content-ID endpoints. Expose a paginated read-only history in `/admin`, with an optional trip filter.

## Safety and limits

Admin authority is account-wide and visible in the UI. The browser never supplies a target user ID to regular trip APIs to bypass membership checks. Restoring a child record requires its parent trip to be active. Existing delete flows will become recoverable where models use soft deletion; data is not purged automatically by this change. Account soft deletion is a reversible access removal, not permanent erasure of personal data. Existing public trips may remain visible and should be reviewed separately when handling a deletion request.

Audit rows contain no request values, passwords, or trip content. For a single identified record, `fields` lists database columns that changed; for batch and create operations, `submittedFields` lists top-level input keys to describe the request. Successful reads and mutations are logged, including admin account search and account deletion/restoration. Mutating admin requests and their audit rows share one database transaction, so an audit write failure rolls back the data change. Failed requests and changes made by the trip owner are outside this audit trail. The table has no update or delete API; database operators should protect it with backups and appropriate database permissions.

Admin sync requests for another user's trip must include `tripId` so they can be attributed to that trip in the audit history. Unscoped sync remains limited to public and member trips.

## Operation

After migration, grant access with `cd backend && php artisan user:set-role person@example.com admin`; revoke it by using `user` as the final argument. The role takes effect on the next request, and the `/admin` menu link appears after the browser refreshes its session. The admin page lists active and deleted users, their trips, and paginated live/deleted content. Delete an ordinary user's account to block sign-in and end database sessions; restore it to recover access and memberships. Inviting a deleted account returns a conflict until an admin restores it. Open a trip to use the normal editor; an admin-access warning appears when elevated privileges are used. Restore the trip before restoring its content. When a comment group was deleted with its target, restore the target first, then restore the group to recover its thread.

The last active administrator cannot be demoted or delete their own account.
Grant another active account administrator access first. Role changes and account
deletion share transaction locks so concurrent operations preserve this rule.

## Possible next operations

- Account support: end all sessions, help recover email or password access, and inspect account status without exposing credentials.
- Trip ownership repair: transfer ownership or repair a broken membership when someone loses access.
- Deletion requests: export user data and handle permanent erasure separately from reversible soft deletion, including public trips and backups.
- Moderation: review reports of public trips or comments and remove reported content from public view.
