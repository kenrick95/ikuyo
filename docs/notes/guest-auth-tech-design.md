# Guest Auth Support - Technical Design

## Status
- Draft
- Owner: Auth/Data
- Last Updated: 2026-02-14

## Goal
Enable InstantDB guest authentication so users can use the app before account creation, then upgrade to email/OAuth without losing access to data.

## Background
Current auth bootstrap in `src/Auth/store.ts` assumes `authResult.user.email` is always present. Guest users from InstantDB have no email, so the flow exits early and does not create/link a `user` row.

This creates two problems:
1. Guest users cannot be represented in app-level user model (`user` entity).
2. Permission checks rely on `auth.email`, which excludes guests.

## Scope
### In scope
- Support sign-in as guest.
- Create/link app `user` records for guest sessions.
- Preserve data continuity when guest upgrades to full auth.
- Update permissions to support guest identity via auth id/links.

### Out of scope (Phase 1)
- Complex conflict UI for merging duplicate accounts.
- Backfilling historic data from legacy systems.

## Current Architecture (Relevant)
- Instant auth user lives in `$users` namespace (`authResult.user.id`).
- App user lives in `user` namespace and links to `$users` via `user.$users`.
- Auth hydration logic is in `src/Auth/store.ts` (`subscribeUser`).
- User creation/update helpers are in `src/User/db.ts`.
- Authorization rules are in `instant.perms.ts`, currently centered on `auth.email` checks.

## Proposed Design

## 1) Auth Flow Changes
### 1.1 Add guest sign-in entrypoint
- Add a “Try as guest” action in login UI (`src/Auth/Auth.tsx`).
- Call `db.auth.signInAsGuest()`.
- Reuse existing redirect behavior once `authUser` + `currentUser` are loaded.

### 1.2 Update auth bootstrap for guest users (`src/Auth/store.ts`)
Replace current early return on missing email with identity-first resolution:
1. Query `user` by linked auth namespace id (`'$users.id': authResult.user.id`).
2. If found, use it (works for both guest and full users).
3. If not found:
   - If email exists: run existing email fallback/link flow.
   - If email does not exist (guest): create app `user` row with guest defaults and link to current `$users.id`.

### 1.3 Guest defaults
When creating a guest app user:
- `handle`: deterministic guest-safe value, e.g. `guest_${authUserId.slice(0, 8)}`.
- `email`: nullable/optional (schema update required).
- `activated`: true (guest is considered an active usable account).

## 2) Data Model Changes
### 2.1 Update `user.email` optionality
Current schema requires `user.email` and marks it unique/indexed. Guest users need no email.

Proposed schema change in `instant.schema.ts`:
- `user.email`: `i.string().unique().indexed().optional()`.

Rationale:
- Keeps uniqueness for full users.
- Allows guest records without synthetic email values.

### 2.2 Optional helper updates (`src/User/db.ts`)
- `DbUser.email` type: `string | null | undefined` (or optional).
- `dbCreateUser` and `dbUpdateUser` should accept optional email and only write it when present.

## 3) Permission Model Changes
Current permissions in `instant.perms.ts` use expressions like:
- `auth.email in data.ref('tripUser.user.email')`

This blocks guest users (no email). Move to auth-id/link-based checks.

### 3.1 Rule strategy
- Prefer `auth.id` and `$users` links, for example:
  - `auth.id in data.ref('tripUser.user.$users.id')`
- Keep role checks unchanged (`tripUser.role`) where applicable.

### 3.2 Why this works
- Guest and full users both have `$users.id`.
- Account upgrades may change email state but preserve identity linkage semantics.

## 4) Upgrade Flow (Guest -> Full User)
InstantDB behavior: signing in with magic code/OAuth while guest upgrades auth.

### 4.1 Expected behavior (no conflict)
- If upgrading to a new email not used by another account, linked identity remains continuous.
- Existing app `user` linked to auth id remains usable.

### 4.2 Conflict case (email already exists)
If user with target email already exists, linked guest users may need merge.

Phase 1 policy:
- Detect via:
  - Existing app `user` linked by auth id
  - Existing app `user` by email
- Prefer linked auth-id account as source of truth.
- If separate email account exists, log/track conflict and skip destructive merge.

Phase 2 policy:
- Batch-transfer ownership from guest-linked user to primary user.
- Add idempotency marker for safe retries.

## 5) Rollout Plan
### Phase 1 (MVP)
1. Add guest sign-in button.
2. Update `subscribeUser` guest branch to create/link app user.
3. Make `user.email` optional.
4. Convert permission checks from `auth.email` to `auth.id` + `$users` link.
5. Ship with monitoring and toasts.

### Phase 2
1. Implement merge job for upgrade conflicts.
2. Add admin tooling/diagnostics for unresolved account conflicts.

## 6) Migration Plan
1. Apply schema change (`instant.schema.ts`) and push via Instant CLI.
2. Apply permission changes (`instant.perms.ts`) and push.
3. Deploy app code changes.
4. Verify with sandbox and production smoke tests.

No mandatory data backfill is required for optionalizing `user.email`.

## 7) Testing Strategy
### 7.1 Functional test matrix
1. Guest sign-in -> can access app.
2. Guest creates entities -> persisted and visible in new session.
3. Guest sign-out/sign-in (same local context) -> data still accessible.
4. Guest upgrade to new email -> data continuity preserved.
5. Email user login (existing path) -> behavior unchanged.

### 7.2 Permission checks
- Guest can only view/update entities they own through existing role-based links.
- Unauthorized guest cannot access private entities of another user.

### 7.3 Regression checks
- Trip sharing roles owner/editor/viewer still enforce correctly.
- Toast and loading states remain stable around auth transitions.

## 8) Observability
Add/keep structured logs for:
- Auth user id and whether session is guest.
- Resolution path taken (linked by auth id, by email, created new guest).
- Conflict detection events during upgrade.

## 9) Risks and Mitigations
1. **Risk:** Permission rewrite introduces access regressions.
   - **Mitigation:** Validate all role paths in sandbox before production push.
2. **Risk:** Duplicate `user` rows during edge upgrade timing.
   - **Mitigation:** Always query by auth-id link first; add follow-up merge tooling.
3. **Risk:** Inconsistent assumptions around `DbUser.email` non-null.
   - **Mitigation:** Update types and UI callsites to treat email as optional.

## 10) Acceptance Criteria
- Guest can sign in and use core app flows without email.
- Guest session always resolves to a linked app `user`.
- Permissions work for guest and full users using auth-id/link checks.
- Upgrade from guest to full user does not lose data in non-conflict path.

## Appendix: Implementation Targets
- `src/Auth/Auth.tsx`
- `src/Auth/store.ts`
- `src/User/db.ts`
- `instant.schema.ts`
- `instant.perms.ts`
