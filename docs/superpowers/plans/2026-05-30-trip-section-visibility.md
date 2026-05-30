# Trip Section Visibility Controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let trip owners control whether expenses, tasks, and comments are visible to public visitors and/or invited Viewers on public/unlisted trips, with server-side enforcement via InstantDB permissions and client-side locked-state UI.

**Architecture:** Six optional boolean fields added to the `trip` entity (undefined = visible) control visibility per section per audience (public vs. viewer). InstantDB CEL permissions enforce this server-side. A pure `getSectionVisibility` helper drives client-side locked UI in three view components.

**Tech Stack:** TypeScript strict, InstantDB CEL permissions, React 19, Radix UI Themes/Icons, Zustand 5, Vitest + Testing Library

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `instant.schema.ts` | Modify | Add 6 optional boolean fields to `trip` entity |
| `instant.perms.ts` | Modify | Add visibility bindings + fix `task`/`comment` `isTripPublic` bug |
| `src/Trip/db.ts` | Modify | Add 6 optional fields to `DbTrip`; add `dbUpdateTripSectionVisibility` |
| `src/Trip/store/types.ts` | Modify | Add 6 optional fields + `isCurrentUserTripMember` to `TripSliceTrip`; add 6 optional fields to `DbTripQueryReturnType` |
| `src/Trip/store/deriveState.ts` | Modify | Compute `isCurrentUserTripMember`; pass 6 fields through to slice |
| `src/Trip/sectionVisibility.ts` | Create | Pure `getSectionVisibility(trip)` helper |
| `src/Trip/sectionVisibility.test.ts` | Create | Unit tests for `getSectionVisibility` |
| `src/Trip/TripDialog/TripSharingDialog.tsx` | Modify | Add visibility toggle UI for owner |
| `src/Trip/TripExpenseViewCards.tsx` | Modify | Render locked placeholder when expenses hidden |
| `src/Trip/TripTask/TripTaskList.tsx` | Modify | Render locked placeholder when tasks hidden |
| `src/Trip/TripComment.tsx` | Modify | Render locked placeholder when comments hidden |

---

## Task 1: Schema — add 6 optional boolean fields to `trip`

**Files:**
- Modify: `instant.schema.ts`

- [ ] **Step 1: Add fields to `trip` entity**

In `instant.schema.ts`, add 6 fields after `sharingLevel: i.number()`:

```ts
    sharingLevel: i.number(),
    publicShowExpenses: i.boolean().optional(),
    publicShowTasks: i.boolean().optional(),
    publicShowComments: i.boolean().optional(),
    viewerShowExpenses: i.boolean().optional(),
    viewerShowTasks: i.boolean().optional(),
    viewerShowComments: i.boolean().optional(),
```

- [ ] **Step 2: Push schema to InstantDB**

```bash
npx instant-cli push schema
```

Expected: `Schema pushed successfully` (or equivalent success message). If asked to confirm, accept.

- [ ] **Step 3: Commit**

```bash
git add instant.schema.ts
git commit -m "feat(schema): add section visibility boolean fields to trip"
```

---

## Task 2: Permissions — add visibility bindings and fix bugs

**Files:**
- Modify: `instant.perms.ts`

**Context:** `data.ref()` in InstantDB CEL always returns a list. The pattern `!(false in data.ref('trip.publicShowExpenses'))` handles all three cases correctly: `undefined` field → empty list → allow; `true` → allow; `false` → deny.

**Existing bug:** `task` and `comment` only check `sharingLevel=2` (PublicUnlisted) in `isTripPublic`, missing `sharingLevel=3` (PublicListed). Fix this while updating these entities.

- [ ] **Step 1: Update `expense` permissions**

Replace the existing `expense` block:

```ts
  expense: {
    bind: [
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel') || 3 in data.ref('trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isPublicShowExpenses',
      "!(false in data.ref('trip.publicShowExpenses'))",
      'isViewerShowExpenses',
      "!(false in data.ref('trip.viewerShowExpenses'))",
    ],
    allow: {
      view: 'isTripOwner || isTripEditor || (isTripViewer && isViewerShowExpenses) || (isTripPublic && isPublicShowExpenses)',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
```

- [ ] **Step 2: Update `taskList` permissions**

Replace the existing `taskList` block:

```ts
  taskList: {
    bind: [
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel') || 3 in data.ref('trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isPublicShowTasks',
      "!(false in data.ref('trip.publicShowTasks'))",
      'isViewerShowTasks',
      "!(false in data.ref('trip.viewerShowTasks'))",
    ],
    allow: {
      view: 'isTripOwner || isTripEditor || (isTripViewer && isViewerShowTasks) || (isTripPublic && isPublicShowTasks)',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
```

- [ ] **Step 3: Update `task` permissions (also fixes `isTripPublic` bug)**

Replace the existing `task` block:

```ts
  task: {
    bind: [
      'isTripPublic',
      "2 in data.ref('taskList.trip.sharingLevel') || 3 in data.ref('taskList.trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('taskList.trip.tripUser.role') && auth.id in data.ref('taskList.trip.tripUser.user.$users.id')",
      'isTripOwner',
      "'owner' in data.ref('taskList.trip.tripUser.role') && auth.id in data.ref('taskList.trip.tripUser.user.$users.id')",
      'isTripViewer',
      "'viewer' in data.ref('taskList.trip.tripUser.role') && auth.id in data.ref('taskList.trip.tripUser.user.$users.id')",
      'isPublicShowTasks',
      "!(false in data.ref('taskList.trip.publicShowTasks'))",
      'isViewerShowTasks',
      "!(false in data.ref('taskList.trip.viewerShowTasks'))",
    ],
    allow: {
      view: 'isTripOwner || isTripEditor || (isTripViewer && isViewerShowTasks) || (isTripPublic && isPublicShowTasks)',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
```

- [ ] **Step 4: Update `commentGroup` permissions**

Replace the existing `commentGroup` block:

```ts
  commentGroup: {
    bind: [
      'isTripPublic',
      "2 in data.ref('trip.sharingLevel') || 3 in data.ref('trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isTripOwner',
      "'owner' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isTripViewer',
      "'viewer' in data.ref('trip.tripUser.role') && auth.id in data.ref('trip.tripUser.user.$users.id')",
      'isPublicShowComments',
      "!(false in data.ref('trip.publicShowComments'))",
      'isViewerShowComments',
      "!(false in data.ref('trip.viewerShowComments'))",
    ],
    allow: {
      view: 'isTripOwner || isTripEditor || (isTripViewer && isViewerShowComments) || (isTripPublic && isPublicShowComments)',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
```

- [ ] **Step 5: Update `comment` permissions (also fixes `isTripPublic` bug)**

Replace the existing `comment` block:

```ts
  comment: {
    bind: [
      'isTripPublic',
      "2 in data.ref('group.trip.sharingLevel') || 3 in data.ref('group.trip.sharingLevel')",
      'isTripEditor',
      "'editor' in data.ref('group.trip.tripUser.role') && auth.id in data.ref('group.trip.tripUser.user.$users.id')",
      'isTripOwner',
      "'owner' in data.ref('group.trip.tripUser.role') && auth.id in data.ref('group.trip.tripUser.user.$users.id')",
      'isTripViewer',
      "'viewer' in data.ref('group.trip.tripUser.role') && auth.id in data.ref('group.trip.tripUser.user.$users.id')",
      'isPublicShowComments',
      "!(false in data.ref('group.trip.publicShowComments'))",
      'isViewerShowComments',
      "!(false in data.ref('group.trip.viewerShowComments'))",
    ],
    allow: {
      view: 'isTripOwner || isTripEditor || (isTripViewer && isViewerShowComments) || (isTripPublic && isPublicShowComments)',
      create: 'isTripEditor || isTripOwner',
      delete: 'isTripEditor || isTripOwner',
      update: 'isTripEditor || isTripOwner',
    },
  },
```

- [ ] **Step 6: Push permissions to InstantDB**

```bash
npx instant-cli push perms
```

Expected: success message.

- [ ] **Step 7: Commit**

```bash
git add instant.perms.ts
git commit -m "feat(perms): add section visibility rules; fix task/comment isTripPublic bug"
```

---

## Task 3: Data layer — `DbTrip` type and `dbUpdateTripSectionVisibility`

**Files:**
- Modify: `src/Trip/db.ts`

- [ ] **Step 1: Add 6 optional fields to `DbTrip`**

In `src/Trip/db.ts`, after `sharingLevel: TripSharingLevelType;` in the `DbTrip` type, add:

```ts
  /** undefined = visible; false = hidden for public visitors */
  publicShowExpenses?: boolean;
  /** undefined = visible; false = hidden for public visitors */
  publicShowTasks?: boolean;
  /** undefined = visible; false = hidden for public visitors */
  publicShowComments?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowExpenses?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowTasks?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowComments?: boolean;
```

- [ ] **Step 2: Add `dbUpdateTripSectionVisibility` function**

At the end of `src/Trip/db.ts`, add:

```ts
export async function dbUpdateTripSectionVisibility(
  tripId: string,
  fields: Partial<
    Pick<
      DbTrip,
      | 'publicShowExpenses'
      | 'publicShowTasks'
      | 'publicShowComments'
      | 'viewerShowExpenses'
      | 'viewerShowTasks'
      | 'viewerShowComments'
    >
  >,
): Promise<void> {
  await db.transact(db.tx.trip[tripId].merge(fields));
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/Trip/db.ts
git commit -m "feat(data): add section visibility fields to DbTrip and dbUpdateTripSectionVisibility"
```

---

## Task 4: Store types — update `TripSliceTrip` and `DbTripQueryReturnType`

**Files:**
- Modify: `src/Trip/store/types.ts`

- [ ] **Step 1: Add 6 optional fields to `DbTripQueryReturnType`**

In `src/Trip/store/types.ts`, in the `DbTripQueryReturnType` type, after `sharingLevel: number;`, add:

```ts
  publicShowExpenses?: boolean | null;
  publicShowTasks?: boolean | null;
  publicShowComments?: boolean | null;
  viewerShowExpenses?: boolean | null;
  viewerShowTasks?: boolean | null;
  viewerShowComments?: boolean | null;
```

- [ ] **Step 2: Add 6 optional fields + `isCurrentUserTripMember` to `TripSliceTrip`**

In `src/Trip/store/types.ts`, in the `TripSliceTrip` type (the `& { ... }` intersection), after `currentUserRole: TripUserRole;`, add:

```ts
  /** undefined = visible (default); false = hidden for public visitors */
  publicShowExpenses?: boolean;
  /** undefined = visible (default); false = hidden for public visitors */
  publicShowTasks?: boolean;
  /** undefined = visible (default); false = hidden for public visitors */
  publicShowComments?: boolean;
  /** undefined = visible (default); false = hidden for invited Viewers */
  viewerShowExpenses?: boolean;
  /** undefined = visible (default); false = hidden for invited Viewers */
  viewerShowTasks?: boolean;
  /** undefined = visible (default); false = hidden for invited Viewers */
  viewerShowComments?: boolean;
  /** true when the current user has a tripUser record (is an invited member) */
  isCurrentUserTripMember: boolean;
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: errors in `deriveState.ts` only (satisfies TripSliceTrip will fail until Task 5). That is fine — proceed.

- [ ] **Step 4: Commit**

```bash
git add src/Trip/store/types.ts
git commit -m "feat(store): add section visibility fields and isCurrentUserTripMember to TripSliceTrip"
```

---

## Task 5: Derive state — compute and pass through new fields

**Files:**
- Modify: `src/Trip/store/deriveState.ts`

- [ ] **Step 1: Update `deriveNewTripState` to compute `isCurrentUserTripMember` and pass 6 fields**

In `src/Trip/store/deriveState.ts`, in `deriveNewTripState`, update the `satisfies TripSliceTrip` object. After `currentUserRole: (currentUserTripUser?.role as TripUserRole | undefined) ?? TripUserRole.Viewer,`, add:

```ts
      isCurrentUserTripMember: currentUserTripUser !== undefined,
      publicShowExpenses: trip.publicShowExpenses ?? undefined,
      publicShowTasks: trip.publicShowTasks ?? undefined,
      publicShowComments: trip.publicShowComments ?? undefined,
      viewerShowExpenses: trip.viewerShowExpenses ?? undefined,
      viewerShowTasks: trip.viewerShowTasks ?? undefined,
      viewerShowComments: trip.viewerShowComments ?? undefined,
```

(The `?? undefined` converts `null` from InstantDB optional fields to `undefined`.)

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/Trip/store/deriveState.ts
git commit -m "feat(store): derive isCurrentUserTripMember and pass section visibility fields"
```

---

## Task 6: `getSectionVisibility` helper with tests

**Files:**
- Create: `src/Trip/sectionVisibility.ts`
- Create: `src/Trip/sectionVisibility.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/Trip/sectionVisibility.test.ts`:

```ts
import { describe, test, expect } from 'vitest';
import { getSectionVisibility } from './sectionVisibility';
import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';

function makeTrip(overrides: Partial<TripSliceTrip>): TripSliceTrip {
  return {
    id: 't1',
    title: 'Test',
    timestampStart: 0,
    timestampEnd: 0,
    currency: 'USD',
    region: 'US',
    originCurrency: 'USD',
    timeZone: 'UTC',
    sharingLevel: 2,
    accommodationIds: [],
    activityIds: [],
    macroplanIds: [],
    tripUserIds: [],
    commentGroupIds: [],
    expenseIds: [],
    taskListIds: [],
    currentUserRole: TripUserRole.Viewer,
    isCurrentUserTripMember: false,
    ...overrides,
  } as TripSliceTrip;
}

describe('getSectionVisibility', () => {
  test('Owner always sees everything', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Owner,
      isCurrentUserTripMember: true,
      publicShowExpenses: false,
      publicShowTasks: false,
      publicShowComments: false,
      viewerShowExpenses: false,
      viewerShowTasks: false,
      viewerShowComments: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Editor always sees everything', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Editor,
      isCurrentUserTripMember: true,
      publicShowExpenses: false,
      viewerShowExpenses: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Non-member visitor: undefined fields → all visible (safe default)', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Non-member visitor: false fields → hidden', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
      publicShowExpenses: false,
      publicShowTasks: false,
      publicShowComments: false,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: false,
      tasks: false,
      comments: false,
    });
  });

  test('Non-member visitor: true fields → visible', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
      publicShowExpenses: true,
      publicShowTasks: true,
      publicShowComments: true,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });

  test('Non-member visitor: mixed fields', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: false,
      publicShowExpenses: false,
      publicShowTasks: true,
    });
    const result = getSectionVisibility(trip);
    expect(result.expenses).toBe(false);
    expect(result.tasks).toBe(true);
    expect(result.comments).toBe(true); // undefined → visible
  });

  test('Invited Viewer: uses viewerShow* not publicShow*', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: true,
      publicShowExpenses: false,  // would hide if non-member
      viewerShowExpenses: true,   // but viewer override allows it
    });
    expect(getSectionVisibility(trip).expenses).toBe(true);
  });

  test('Invited Viewer: false viewerShow* → hidden', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: true,
      publicShowExpenses: true,   // would show if non-member
      viewerShowExpenses: false,  // but viewer sees it hidden
    });
    expect(getSectionVisibility(trip).expenses).toBe(false);
  });

  test('Invited Viewer: undefined viewerShow* → visible (safe default)', () => {
    const trip = makeTrip({
      currentUserRole: TripUserRole.Viewer,
      isCurrentUserTripMember: true,
    });
    expect(getSectionVisibility(trip)).toEqual({
      expenses: true,
      tasks: true,
      comments: true,
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm test src/Trip/sectionVisibility.test.ts
```

Expected: FAIL — `getSectionVisibility` not found.

- [ ] **Step 3: Implement `getSectionVisibility`**

Create `src/Trip/sectionVisibility.ts`:

```ts
import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';

export type SectionVisibility = {
  expenses: boolean;
  tasks: boolean;
  comments: boolean;
};

export function getSectionVisibility(trip: TripSliceTrip): SectionVisibility {
  const { currentUserRole, isCurrentUserTripMember } = trip;

  if (
    currentUserRole === TripUserRole.Owner ||
    currentUserRole === TripUserRole.Editor
  ) {
    return { expenses: true, tasks: true, comments: true };
  }

  if (isCurrentUserTripMember) {
    return {
      expenses: trip.viewerShowExpenses !== false,
      tasks: trip.viewerShowTasks !== false,
      comments: trip.viewerShowComments !== false,
    };
  }

  return {
    expenses: trip.publicShowExpenses !== false,
    tasks: trip.publicShowTasks !== false,
    comments: trip.publicShowComments !== false,
  };
}
```

- [ ] **Step 4: Run tests — expect passing**

```bash
pnpm test src/Trip/sectionVisibility.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/Trip/sectionVisibility.ts src/Trip/sectionVisibility.test.ts
git commit -m "feat(trip): add getSectionVisibility helper with tests"
```

---

## Task 7: TripSharingDialog — visibility toggles

**Files:**
- Modify: `src/Trip/TripDialog/TripSharingDialog.tsx`

**Context:** The dialog already has immediate-persist behaviour for `sharingLevel`. Add two groups of 3 `Switch` controls below the existing `Callout` warnings, visible only when `sharingLevel !== TripSharingLevel.Private`. Owner only. Uses `dbUpdateTripSectionVisibility` for immediate DB persist.

- [ ] **Step 1: Add `Switch` import and `dbUpdateTripSectionVisibility` import**

At the top of `src/Trip/TripDialog/TripSharingDialog.tsx`:

1. Add `Switch` to the Radix imports:
```ts
import {
  Button,
  Callout,
  Dialog,
  Flex,
  Inset,
  Select,
  Switch,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
```

2. Add `dbUpdateTripSectionVisibility` to the Trip db imports:
```ts
import {
  dbAddUserToTrip,
  dbRemoveUserFromTrip,
  dbUpdateTripSectionVisibility,
  dbUpdateTripSharingLevel,
} from '../db';
```

- [ ] **Step 2: Add section visibility toggle UI**

After the last `Callout` block (after `} : null}`) and before the closing `</Flex>` of the `currentUserIsOwner` block, insert the section visibility UI:

```tsx
            {tripSharingLevel !== TripSharingLevel.Private ? (
              <Flex direction="column" gap="3" mt="2">
                <Text size="2" weight="medium">
                  Section visibility
                </Text>
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium">
                    Public visitors
                  </Text>
                  {(
                    [
                      ['publicShowExpenses', 'Expenses'],
                      ['publicShowTasks', 'Tasks'],
                      ['publicShowComments', 'Comments'],
                    ] as const
                  ).map(([field, label]) => (
                    <Flex key={field} align="center" gap="2" asChild>
                      <label>
                        <Switch
                          size="1"
                          checked={trip?.[field] !== false}
                          disabled={isLoading || !trip}
                          onCheckedChange={(checked) => {
                            if (!trip) return;
                            void dbUpdateTripSectionVisibility(trip.id, {
                              [field]: checked,
                            });
                          }}
                        />
                        <Text size="2">{label}</Text>
                      </label>
                    </Flex>
                  ))}
                </Flex>
                <Flex direction="column" gap="1">
                  <Text size="1" color="gray" weight="medium">
                    Invited viewers (Viewer role)
                  </Text>
                  {(
                    [
                      ['viewerShowExpenses', 'Expenses'],
                      ['viewerShowTasks', 'Tasks'],
                      ['viewerShowComments', 'Comments'],
                    ] as const
                  ).map(([field, label]) => (
                    <Flex key={field} align="center" gap="2" asChild>
                      <label>
                        <Switch
                          size="1"
                          checked={trip?.[field] !== false}
                          disabled={isLoading || !trip}
                          onCheckedChange={(checked) => {
                            if (!trip) return;
                            void dbUpdateTripSectionVisibility(trip.id, {
                              [field]: checked,
                            });
                          }}
                        />
                        <Text size="2">{label}</Text>
                      </label>
                    </Flex>
                  ))}
                </Flex>
              </Flex>
            ) : null}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/Trip/TripDialog/TripSharingDialog.tsx
git commit -m "feat(ui): add section visibility toggles to TripSharingDialog"
```

---

## Task 8: Locked state — Expenses

**Files:**
- Modify: `src/Trip/TripExpenseViewCards.tsx`

**Context:** `TripExpenseViewCards` renders the `/expenses` route. When `getSectionVisibility(trip).expenses` is `false`, replace the entire content with a locked placeholder.

- [ ] **Step 1: Add imports and locked placeholder**

In `src/Trip/TripExpenseViewCards.tsx`:

1. Add `LockClosedIcon` to Radix icon imports (add import at top):
```ts
import { DownloadIcon, LockClosedIcon, PlusIcon } from '@radix-ui/react-icons';
```

2. Add `Text` to the `@radix-ui/themes` imports (it should already be there; if not, add it).

3. Add import for `getSectionVisibility`:
```ts
import { getSectionVisibility } from './sectionVisibility';
```

4. Inside `TripExpenseViewCards`, after `const { trip } = useCurrentTrip();`, compute visibility:
```ts
  const sectionVisibility = trip ? getSectionVisibility(trip) : null;
```

5. After the `<DocTitle ... />` and `<Flex>` heading block, add a guard before all the expense content:

Replace the content area return so that when `sectionVisibility?.expenses === false`, the content area shows a locked placeholder instead. The locked placeholder replaces everything after the `<DocTitle>` line and the heading flex.

In the return, after `<DocTitle title={...} />`, add:
```tsx
      {sectionVisibility?.expenses === false ? (
        <Flex align="center" justify="center" gap="2" py="9">
          <LockClosedIcon />
          <Text color="gray">Expenses are hidden for this trip.</Text>
        </Flex>
      ) : (
        <>
          <Flex justify="between" align="center" mb="3">
            {/* existing heading and export button */}
          </Flex>
          <Grid className={s.expenseGrid}>
            {/* existing expense cards */}
          </Grid>
        </>
      )}
```

**Important:** Wrap all existing post-`<DocTitle>` JSX inside the `else` branch of the condition above. Do not duplicate the `<DocTitle>` or `<Container>` wrapper.

The full updated return should look like:

```tsx
  return (
    <Container py="2" px="2" pb="9">
      <DocTitle title={`${trip?.title ?? 'Trip'} - Expenses`} />
      {sectionVisibility?.expenses === false ? (
        <Flex align="center" justify="center" gap="2" py="9">
          <LockClosedIcon />
          <Text color="gray">Expenses are hidden for this trip.</Text>
        </Flex>
      ) : (
        <>
          <Flex justify="between" align="center" mb="3">
            <Heading as="h2" size="4">
              Expenses
            </Heading>
            {/* TODO: how to put this in TripMenu */}
            {expenses.length > 0 && (
              <Button variant="outline" size="2" onClick={handleExportToCsv}>
                <DownloadIcon />
                Export to CSV
              </Button>
            )}
          </Flex>
          <Grid className={s.expenseGrid}>
            <ExpenseHeaderCard />
            {userCanModifyExpense ? (
              expenseMode === ExpenseMode.View ? (
                <Card
                  size="1"
                  className={clsx(s.addExpenseCard, s.addExpenseCardView)}
                  variant="ghost"
                >
                  <Button
                    variant="outline"
                    size="2"
                    onClick={handleAddExpenseClick}
                  >
                    <PlusIcon />
                    Add Expense
                  </Button>
                </Card>
              ) : (
                <Card className={s.addExpenseCard}>
                  {trip ? (
                    <ExpenseInlineCardForm
                      trip={trip}
                      expenseMode={ExpenseMode.Add}
                      expense={undefined}
                      setExpenseMode={setExpenseMode}
                    />
                  ) : null}
                </Card>
              )
            ) : null}
            {expenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
          </Grid>
        </>
      )}
    </Container>
  );
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/Trip/TripExpenseViewCards.tsx
git commit -m "feat(ui): show locked state for expenses when hidden"
```

---

## Task 9: Locked state — Tasks

**Files:**
- Modify: `src/Trip/TripTask/TripTaskList.tsx`

**Context:** `TripTaskList` renders the `/tasks` route. When `getSectionVisibility(trip).tasks` is `false`, replace the board content with a locked placeholder.

- [ ] **Step 1: Add imports**

In `src/Trip/TripTask/TripTaskList.tsx`, add to the existing Radix icon import:
```ts
import { LockClosedIcon, PlusIcon } from '@radix-ui/react-icons';
```

Add import for `getSectionVisibility`:
```ts
import { getSectionVisibility } from '../sectionVisibility';
```

- [ ] **Step 2: Compute visibility and conditionally render**

In `TripTaskList`, after `const { trip } = useCurrentTrip();`, add:
```ts
  const sectionVisibility = trip ? getSectionVisibility(trip) : null;
```

In the return, the component currently renders a `<Box>` with a `<Container>` heading then the board content (DndContext / empty state) followed by a `<Switch>` for routes. 

After the `<Container>` heading block (the one with "Task Board" heading and "New Task List" button), and before the empty state / DndContext block, add:

```tsx
      {sectionVisibility?.tasks === false ? (
        <Flex align="center" justify="center" gap="2" py="9">
          <LockClosedIcon />
          <Text color="gray">Tasks are hidden for this trip.</Text>
        </Flex>
      ) : (
        /* existing: showInlineForm block + empty state check + DndContext */
        <>
          {showInlineForm && trip && (
            <TaskListInlineForm
              tripId={trip.id}
              onFormSuccess={handleFormSuccess}
              onFormCancel={handleFormCancel}
            />
          )}

          {trip?.taskListIds.length === 0 || !trip?.taskListIds ? (
            <div className={style.emptyTaskBoard}>
              {/* ... existing empty state JSX unchanged ... */}
            </div>
          ) : (
            <DndContext
              {/* ... existing DndContext props unchanged ... */}
            >
              {/* ... existing DndContext children unchanged ... */}
            </DndContext>
          )}
        </>
      )}
```

**Important:** The `<Switch>` for `RouteTripTaskListTask` must remain outside the conditional (it should render regardless of locked state so URL-based dialogs still work). Keep it at the end of the `<Box>`.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/Trip/TripTask/TripTaskList.tsx
git commit -m "feat(ui): show locked state for tasks when hidden"
```

---

## Task 10: Locked state — Comments

**Files:**
- Modify: `src/Trip/TripComment.tsx`

**Context:** `TripComment` renders the `/comment` route. When `getSectionVisibility(trip).comments` is `false`, show a locked placeholder instead of the comments list.

- [ ] **Step 1: Add imports**

In `src/Trip/TripComment.tsx`, update the existing imports:

```ts
import { LockClosedIcon } from '@radix-ui/react-icons';
import { Container, Flex, Heading, Text } from '@radix-ui/themes';
import { Comment } from '../Comment/Comment';
import { DocTitle } from '../Nav/DocTitle';
import { getSectionVisibility } from './sectionVisibility';
import { useCurrentTrip, useTripAllComments } from './store/hooks';
```

- [ ] **Step 2: Compute visibility and conditionally render**

Update `TripComment` to:

```tsx
export function TripComment() {
  const { trip } = useCurrentTrip();
  const allComments = useTripAllComments(trip?.id);
  const sectionVisibility = trip ? getSectionVisibility(trip) : null;

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <DocTitle title={`${trip?.title ?? 'Trip'} - Comments`} />
      <Heading as="h2" size="4" mb="2">
        All Comments
      </Heading>
      {sectionVisibility?.comments === false ? (
        <Flex align="center" justify="center" gap="2" py="9">
          <LockClosedIcon />
          <Text color="gray">Comments are hidden for this trip.</Text>
        </Flex>
      ) : allComments.length === 0 ? (
        <Text>No comments yet in this trip</Text>
      ) : (
        <Flex gap="2" direction="column">
          {allComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onFormFocus={() => {}}
              showCommentObjectTarget
              showControls={false}
            />
          ))}
        </Flex>
      )}
    </Container>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (including `sectionVisibility.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/Trip/TripComment.tsx
git commit -m "feat(ui): show locked state for comments when hidden"
```

---

## Task 11: Final verification

- [ ] **Step 1: Lint and format check**

```bash
pnpm biome:check
```

Expected: no errors or warnings.

- [ ] **Step 2: Full typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Full test run**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Manual smoke test checklist**

Start dev server (`pnpm dev`) and verify:

1. **Owner, Private trip** → Sharing dialog shows NO visibility toggles section
2. **Owner, Unlisted trip** → Sharing dialog shows visibility toggles for both Public visitors and Invited viewers
3. **Owner, Public trip** → Same as step 2
4. **Toggle Expenses off for public visitors** → Save happens immediately (no save button); as a non-logged-in visitor, `/expenses` shows the lock placeholder
5. **Toggle Expenses back on** → `/expenses` shows normally for non-logged-in visitor
6. **Toggle Tasks off for Invited viewers** → As an invited Viewer user, `/tasks` shows the lock placeholder
7. **Owner always sees full content** regardless of toggle state

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: trip section visibility controls (owner can hide expenses/tasks/comments per audience)"
```
