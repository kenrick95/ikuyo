# Trip Section Visibility Controls — Design Spec

**Date:** 2026-05-30  
**Status:** Approved for implementation

## Overview

Allow trip owners to control whether non-owner audiences can see expenses, tasks, and comments on a public or unlisted trip. Controls are per-section and per-audience (public visitors vs. invited Viewers), giving owners fine-grained control over what sensitive data is visible.

## Motivation

Trips shared publicly or via unlisted link may contain private financial data (expenses), internal logistics (tasks), or sensitive discussion (comments) that the owner does not want visible to all viewers. Owners need a way to hide these sections without revoking access to the rest of the trip.

## Scope

**In scope:**
- Hide/show expenses, tasks, and comments per audience (public visitors, invited Viewers)
- Enforcement both at the DB/permissions layer (InstantDB CEL) and the UI layer (locked placeholder)
- Owner UI in the existing `TripSharingDialog`

**Out of scope:**
- Activities, accommodations, macroplans (always visible to permitted audiences)
- Per-item granularity (section-level only)
- Temporary/time-limited visibility

---

## 1. Schema (`instant.schema.ts`)

Add 6 optional boolean fields to the `trip` entity:

```ts
publicShowExpenses: i.boolean().optional(),
publicShowTasks: i.boolean().optional(),
publicShowComments: i.boolean().optional(),
viewerShowExpenses: i.boolean().optional(),
viewerShowTasks: i.boolean().optional(),
viewerShowComments: i.boolean().optional(),
```

**Semantics:** `undefined` (unset) = visible (safe default). `false` = hidden. `true` = explicitly visible.

No migration is needed. Existing trips will have all fields undefined, meaning all sections remain visible — no behaviour change.

---

## 2. Permissions Layer (`instant.perms.ts`)

The permissions layer enforces visibility server-side; the client-side locked UI is supplementary UX only.

### Pattern

For a 1-hop entity (e.g. `expense`, linked directly to `trip`):

```ts
bind: [
  // existing bindings...
  'isPublicShowExpenses', "!(false in data.ref('trip.publicShowExpenses'))",
  'isViewerShowExpenses', "!(false in data.ref('trip.viewerShowExpenses'))",
],
allow: {
  view: 'isTripOwner || isTripEditor || (isTripViewer && isViewerShowExpenses) || (isTripPublic && isPublicShowExpenses)',
}
```

The `!(false in data.ref(...))` pattern correctly handles all three states:
- `undefined` → ref returns empty list → `false in []` is false → `!false` = **allow**
- `true` → `false in [true]` is false → **allow**
- `false` → `false in [false]` is true → `!true` = **deny**

### Changes per entity

| Entity | Hop depth | Ref path prefix | New bindings |
|--------|-----------|-----------------|--------------|
| `expense` | 1 | `trip.` | `isPublicShowExpenses`, `isViewerShowExpenses` |
| `taskList` | 1 | `trip.` | `isPublicShowTasks`, `isViewerShowTasks` |
| `task` | 2 | `taskList.trip.` | `isPublicShowTasks`, `isViewerShowTasks` |
| `commentGroup` | 1 | `trip.` | `isPublicShowComments`, `isViewerShowComments` |
| `comment` | 2 | `group.trip.` | `isPublicShowComments`, `isViewerShowComments` |

### Bug fix (included in this change)

`task` and `comment` currently have a bug where `isTripPublic` only checks `sharingLevel=2` (PublicUnlisted) and misses `sharingLevel=3` (PublicListed). Fix as part of this change:

```ts
// task (was: "2 in data.ref('taskList.trip.sharingLevel')")
'isTripPublic', "2 in data.ref('taskList.trip.sharingLevel') || 3 in data.ref('taskList.trip.sharingLevel')",

// comment (was: "2 in data.ref('group.trip.sharingLevel')")
'isTripPublic', "2 in data.ref('group.trip.sharingLevel') || 3 in data.ref('group.trip.sharingLevel')",
```

---

## 3. Data Layer (`src/Trip/db.ts`)

### `DbTrip` type

Add 6 optional boolean fields:

```ts
publicShowExpenses?: boolean;
publicShowTasks?: boolean;
publicShowComments?: boolean;
viewerShowExpenses?: boolean;
viewerShowTasks?: boolean;
viewerShowComments?: boolean;
```

### New function

```ts
export async function dbUpdateTripSectionVisibility(
  tripId: string,
  fields: Partial<Pick<DbTrip,
    'publicShowExpenses' | 'publicShowTasks' | 'publicShowComments' |
    'viewerShowExpenses' | 'viewerShowTasks' | 'viewerShowComments'
  >>,
): Promise<void> {
  await db.transact(db.tx.trip[tripId].merge(fields));
}
```

Uses `merge` (not `update`) to avoid overwriting unrelated fields.

---

## 4. Store Types (`src/Trip/store/types.ts` + `deriveState.ts`)

### `TripSliceTrip`

Add 6 optional boolean fields (passed through from `DbTrip`) and a computed membership flag:

```ts
publicShowExpenses?: boolean;
publicShowTasks?: boolean;
publicShowComments?: boolean;
viewerShowExpenses?: boolean;
viewerShowTasks?: boolean;
viewerShowComments?: boolean;
isCurrentUserTripMember: boolean;
```

**`isCurrentUserTripMember`** is `true` when a `tripUser` record exists for the current user. This distinguishes an invited Viewer (should check `viewerShow*`) from an unauthenticated / non-member visitor (should check `publicShow*`). Both currently resolve to `currentUserRole === Viewer`, which is ambiguous without this flag.

### `deriveState.ts`

The existing `deriveNewTripState` already finds `currentUserTripUser`. Set:

```ts
isCurrentUserTripMember: currentUserTripUser !== undefined,
```

Also pass the 6 new boolean fields from `trip` through to the slice:

```ts
publicShowExpenses: trip.publicShowExpenses,
publicShowTasks: trip.publicShowTasks,
// etc.
```

---

## 5. UI — `TripSharingDialog.tsx`

### Visibility toggles

Add a section below the sharing level `Select`, rendered only when `sharingLevel !== TripSharingLevel.Private`.

Two labelled groups, each with 3 `Switch` controls:

```
Public visitors
  Expenses    ●─── (on)
  Tasks       ●─── (on)
  Comments    ───● (off)

Invited viewers (Viewer role)
  Expenses    ●─── (on)
  Tasks       ●─── (on)
  Comments    ●─── (on)
```

**Behaviour:**
- `checked` = `trip.<field> !== false` (undefined and true both render as on)
- On toggle: call `dbUpdateTripSectionVisibility(tripId, { [field]: newValue })` — immediate persist, no save button, consistent with the existing sharingLevel behaviour
- Both groups are shown whenever `sharingLevel !== Private` (PublicUnlisted trips are still accessible via direct link, so public visitor controls are always relevant)

---

## 6. UI — Locked Section Display

When a section is hidden from the current viewer's audience, replace its content area with a locked placeholder. The section heading/tab remains visible so the user knows it exists.

### Audience determination

Computed once per section view (e.g. a shared helper `getSectionVisibility`):

```ts
function getSectionVisibility(trip: TripSliceTrip): {
  expenses: boolean;
  tasks: boolean;
  comments: boolean;
} {
  const { currentUserRole, isCurrentUserTripMember } = trip;

  if (currentUserRole === TripUserRole.Owner || currentUserRole === TripUserRole.Editor) {
    return { expenses: true, tasks: true, comments: true };
  }

  const flags = isCurrentUserTripMember
    ? {
        expenses: trip.viewerShowExpenses,
        tasks: trip.viewerShowTasks,
        comments: trip.viewerShowComments,
      }
    : {
        expenses: trip.publicShowExpenses,
        tasks: trip.publicShowTasks,
        comments: trip.publicShowComments,
      };

  return {
    expenses: flags.expenses !== false,
    tasks: flags.tasks !== false,
    comments: flags.comments !== false,
  };
}
```

### Locked placeholder

When a flag is `false`, render:

```tsx
<Flex align="center" justify="center" gap="2" p="6">
  <LockClosedIcon />
  <Text color="gray">Expenses are hidden for this trip.</Text>
</Flex>
```

One variant per section (Expenses / Tasks / Comments). Uses `LockClosedIcon` from `@radix-ui/react-icons` and `Text` + `Flex` from `@radix-ui/themes`.

The DB permissions layer ensures no actual data is returned regardless of client rendering — this is defence-in-depth UX only.

---

## 7. Defaults & Migration

- All 6 new fields are `optional` in the schema → existing trips have them as `undefined`
- `undefined` = visible in both the permissions CEL and the client visibility logic
- No data migration required
- No InstantDB schema migration script needed — new optional fields are additive

---

## Files Changed

| File | Change |
|------|--------|
| `instant.schema.ts` | Add 6 optional boolean fields to `trip` entity |
| `instant.perms.ts` | Add visibility bindings + fix `task`/`comment` `isTripPublic` bug |
| `src/Trip/db.ts` | Add 6 fields to `DbTrip`; add `dbUpdateTripSectionVisibility` |
| `src/Trip/store/types.ts` | Add 6 fields + `isCurrentUserTripMember` to `TripSliceTrip` |
| `src/Trip/store/deriveState.ts` | Compute `isCurrentUserTripMember`; pass through 6 new fields |
| `src/Trip/TripDialog/TripSharingDialog.tsx` | Add visibility toggle UI |
| Expense view component | Add locked placeholder |
| Task view component | Add locked placeholder |
| Comment view component | Add locked placeholder |
