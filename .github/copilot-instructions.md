# Ikuyo! (行くよ！) — Workspace Instructions for AI Coding Agents

Ikuyo is a collaborative trip/itinerary planning web application with real-time sync. Users create trips containing activities, accommodations, macroplans (high-level plans), expenses, tasks, and comments. It supports role-based access (Owner, Editor, Viewer) and sharing levels (Private, Group, Public).

## Tech Stack

| Layer              | Technology                                                 |
| ------------------ | ---------------------------------------------------------- |
| Language           | TypeScript (strict mode, ES2022)                           |
| Framework          | React 19                                                   |
| Bundler            | Rsbuild (Rspack-based — **not** Vite)                      |
| UI Library         | Radix UI Themes + Radix UI Primitives                      |
| Styling            | CSS Modules (`.module.css` / `.module.scss`), Radix CSS vars |
| State Management   | Zustand 5 (slice pattern with `persist` middleware)        |
| Database / Backend | InstantDB (`@instantdb/core` — real-time client-side DB)   |
| Routing            | Wouter (lightweight React router)                          |
| Date/Time          | Luxon (`DateTime`)                                         |
| Maps               | MapTiler SDK + Geocoding Control                           |
| Drag & Drop        | `@dnd-kit/core` + `@dnd-kit/sortable`                     |
| Error Monitoring   | Sentry (`@sentry/react`)                                   |
| Linting/Formatting | Biome (replaces ESLint + Prettier)                         |
| Testing            | Vitest + Testing Library (React) + jsdom                   |
| Git Hooks          | Lefthook (pre-commit: `biome check --write`)               |
| Package Manager    | pnpm 10                                                    |

## Project Structure

Feature-based folder structure under `src/`. Each domain feature is a **PascalCase** folder:

```
src/
  Activity/           # Feature folder
    Activity.tsx              # Main component
    Activity.module.css       # CSS Module
    db.ts                     # Database operations (InstantDB queries/mutations)
    time.ts                   # Time utilities for this feature
    ActivityNewDialog.tsx     # "New" dialog (imperative, pushed to dialog stack)
    ActivityDialog/           # View/Edit/Delete dialog subfolder
    ActivityForm/             # Form subfolder (with co-located tests)
  Accommodation/      # Same pattern as Activity
  Trip/               # Trip feature with store/ subfolder for Zustand slices
  Comment/
  Expense/
  Macroplan/
  Task/
  Auth/               # Authentication components and hooks
  common/             # Shared utilities, hooks, reusable UI components
  data/               # DB init, central Zustand store, shared types
  Dialog/             # Dialog system (route-based and imperative)
  Routes/             # Route definitions and constants
  theme/              # Theme system (light/dark)
  Toast/              # Toast notification system
```

Key conventions:
- **Features** are top-level PascalCase folders
- **Shared utilities** live in `src/common/`
- **Data layer** in `src/data/` (DB init, central store, shared types)
- **Tests** are **co-located** with source files: `*.test.ts` / `*.test.tsx`
- Each feature has its own `db.ts` for database operations

## Component Conventions

### Naming
- Components use named functions: `function ActivityInner({...}) {}`
- Inner components use `*Inner` suffix, wrapped with `memo()`: `export const Activity = memo(ActivityInner)`
- Page-level components use `Page*` prefix: `PageTrips`, `PageTrip`, `PageAccount`
- **Default exports** only for lazy-loaded page components (`React.lazy()`). All other components use **named exports**.

### CSS Modules
- Import alias is **`s`**: `import s from './Component.module.css'`
- Class names are camelCase: `s.activity`, `s.accommodationNotes`
- CSS uses Radix CSS custom properties: `var(--gray-7)`, `var(--accent-9)`, `var(--color-panel-solid)`
- Supports both `.module.css` and `.module.scss`

### Component Structure
1. External library imports (Radix, Luxon, React, etc.)
2. Internal imports (relative, from other features)
3. CSS module import
4. Types/interfaces (inline)
5. Inner component function
6. Memoized export

### Radix UI Usage
- Layout: `Box`, `Flex` from `@radix-ui/themes`
- Typography: `Text`, `Heading` from `@radix-ui/themes`
- Interactive: `Button`, `Dialog`, `ContextMenu`, `Switch`, `TextField`, `TextArea`
- Icons: `@radix-ui/react-icons`
- Utility: `clsx` for conditional class joining

## Database (InstantDB)

This project uses **InstantDB** (`@instantdb/core`) — a real-time, client-side database with no REST/GraphQL API layer. All data access happens via InstantDB's real-time sync.

### Singleton DB Instance

Defined in `src/data/db.ts`:

```typescript
import { init } from '@instantdb/core';
import schema from '../../instant.schema';

export const db = init({ schema, appId: INSTANT_APP_ID, devtool: false });
```

### Schema

Defined in `instant.schema.ts` at project root using `i.schema()` with `i.entity()` and `i.graph()`.

### Feature db.ts Pattern

Each feature's `db.ts` exports:
- **Type definitions** prefixed with `Db`: `DbActivity`, `DbAccommodation`, `DbExpense`
- **Async CRUD functions** prefixed with `db*`:
  - `dbAddActivity(...)` — creates with `db.transact(db.tx.entity[id()].update({...}).link({...}))`
  - `dbUpdateActivity(...)` — updates with `db.transact(db.tx.entity[id].merge({...}))`
  - `dbDeleteActivity(...)` — deletes with `db.transact(db.tx.entity[id].delete())`
- Timestamps use `Date.now()` for `createdAt` / `lastUpdatedAt`

### InstantDB Quick Reference

**Reading data — Subscriptions (React):**

```typescript
const { isLoading, error, data } = db.useQuery({ goals: {} });
```

This project uses **Vanilla JS** (`@instantdb/core`), so subscriptions use `db.subscribeQuery`:

```typescript
db.subscribeQuery({ todos: {} }, (resp) => {
  if (resp.error) { /* handle error */ return; }
  if (resp.data) { /* use resp.data */ }
});
```

**Reading data — One-shot queries:**

```typescript
const { data } = await db.queryOnce({ todos: {} });
```

**Writing data — Transactions:**

```typescript
import { id } from '@instantdb/core';

// Create
db.transact(db.tx.todos[id()].update({ text: 'Hello', done: false, createdAt: Date.now() }));

// Update
db.transact(db.tx.todos[todoId].update({ done: true }));

// Merge (for nested objects — preserves unmentioned keys)
db.transact(db.tx.todos[todoId].merge({ preferences: { theme: 'dark' } }));

// Delete
db.transact(db.tx.todos[todoId].delete());

// Link
db.transact(db.tx.todos[todoId].update({ title: 'Go run' }).link({ goals: goalId }));

// Unlink
db.transact(db.tx.goals[goalId].unlink({ todos: todoId }));

// Multiple operations (atomic)
db.transact([
  db.tx.todos[id()].update({ text: 'Task 1' }),
  db.tx.todos[id()].update({ text: 'Task 2' }),
]);
```

**Querying with filters:**

```typescript
// Where clause
const query = { todos: { $: { where: { done: true } } } };

// Nested associations
const query = { goals: { todos: {} } };

// OR queries
const query = { todos: { $: { where: { or: [{ priority: 'high' }, { done: false }] } } } };

// Comparison operators (requires indexed attribute): $gt, $lt, $gte, $lte
const query = { products: { $: { where: { price: { $lt: 100 } } } } };

// Ordering (requires indexed attribute)
const query = { todos: { $: { order: { serverCreatedAt: 'desc' } } } };

// Pagination
const query = { todos: { $: { limit: 10, offset: 20 } } };

// Select specific fields
const query = { goals: { $: { fields: ['title', 'status'] } } };
```

**Common mistakes to avoid:**
- Use `merge` (not `update`) for nested objects to avoid overwriting unspecified fields
- `or` and `and` in `where` take **arrays**, not objects
- `limit`, `offset`, and `order` only work on **top-level** namespaces
- Use `order` (not `orderBy`) for sorting
- Comparison operators (`$gt`, `$lt`, etc.) require **indexed** attributes
- Batch large transactions into groups of ~100 to avoid timeouts
- Use `data.ref()` in permissions with string literal arguments only

**Schema definition (`instant.schema.ts`):**

```typescript
import { i } from '@instantdb/core';

const _schema = i.schema({
  entities: {
    todos: i.entity({
      text: i.string(),
      done: i.boolean(),
      createdAt: i.date(),
      priority: i.number().indexed(),    // indexed for ordering/comparison
      slug: i.string().unique(),          // unique constraint
      notes: i.string().optional(),       // optional attribute
    }),
  },
  links: {
    todoGoal: {
      forward: { on: 'todos', has: 'one', label: 'goal' },
      reverse: { on: 'goals', has: 'many', label: 'todos' },
    },
  },
  rooms: {},
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;
export type { AppSchema };
export default schema;
```

**Permissions (`instant.perms.ts`):**

```typescript
export default {
  todos: {
    bind: ['isOwner', "auth.id == data.creatorId"],
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      update: 'isOwner',
      delete: 'isOwner',
    },
  },
  attrs: {
    allow: { create: 'false' },  // Lock schema in production
  },
};
```

### Admin SDK (for backend scripts in `scripts/`)

```typescript
import { init, id } from '@instantdb/admin';

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// Async query (no loading states)
const data = await db.query({ goals: {} });

// Async transact
await db.transact([db.tx.todos[id()].update({ title: 'Get fit' })]);
```

## State Management (Zustand)

Central store in `src/data/store.ts` using slice pattern:

```typescript
export type BoundStoreType = ToastSlice & UserSlice & DialogSlice & TripSlice & TripsSlice & ThemeSlice;

export const useBoundStore = create<BoundStoreType>()(
  persist((...args) => ({
    ...createToastSlice(...args),
    ...createUserSlice(...args),
    // ...more slices
  }), { name: 'ikuyo-storage', version: 3, partialize: ... })
);
```

Each slice is a `StateCreator<BoundStoreType, [], [], SliceType>`.

Custom hooks:
- `useBoundStore` — direct Zustand selector
- `useDeepBoundStore` — wraps with `useDeepEqual` (uses `react-fast-compare`) for complex objects

## Routing (Wouter)

Route definitions in `src/Routes/` use a custom `createRouteParam()` factory:

```typescript
export const RouteTrip = createRouteParam('/trip/:id', replaceId);
```

Navigation: `setLocation(RouteTripListViewActivity.asRouteTarget(activityId))`.

Page components are lazy-loaded via `React.lazy()` + `withLoading()` HOC with View Transitions API support.

## Dialog Patterns

Two dialog systems:

1. **Route-based dialogs** (`createDialogRoute`) — for View/Edit/Delete of existing entities. Mode stored in `history.state?.mode`.
2. **Imperative/stack-based dialogs** (`DialogRoot`) — for "New" entity forms via `pushDialog(Component, props)` / `popDialog()`.

## Type Conventions

**Enum-like values** — use `const` object + derived type (never TypeScript `enum`):

```typescript
export const TripViewMode = { Timetable: 'Timetable', List: 'List', Home: 'Home' } as const;
export type TripViewModeType = (typeof TripViewMode)[keyof typeof TripViewMode];
```

**Type prefixes:**
- `Db` for database types: `DbActivity`, `DbTrip`
- `TripSlice` for store types: `TripSliceActivity`, `TripSliceTrip`
- Use `import type` for type-only imports

## Code Style (enforced by Biome)

- **Single quotes** for strings
- **Spaces** for indentation (2 spaces)
- Imports auto-sorted by Biome (`organizeImports: "on"`)
- Strict linting: `noUnusedImports`, `noUnusedVariables`, `noUndeclaredDependencies`, `noUndeclaredVariables` (all `error`)
- `useHookAtTopLevel: error`
- Strict TypeScript: `strict: true`, `noUnusedLocals`, `noUnusedParameters`

## Testing

- **Framework:** Vitest with jsdom, globals enabled
- **Libraries:** `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- **Style:** `describe()` / `test()` (not `it()`)
- **Co-located** test files: `*.test.ts` / `*.test.tsx`
- **Setup:** `vitest.setup.ts` mocks `ResizeObserver`, imports jest-dom matchers, calls `cleanup()` after each test
- Run tests: `pnpm test`

## Common Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run tests (Vitest)
pnpm biome:check      # Lint and format with Biome
pnpm typecheck        # TypeScript type checking (tsc --noEmit)
```

## Other Conventions

- **`memo()`** for leaf components with complex props
- **Accessibility:** include `role`, `tabIndex`, keyboard handlers (`onKeyDown`/`onKeyUp` for Enter/Space)
- **Time handling:** Timestamps stored as milliseconds (`Date.now()`), timezone-aware display via Luxon `DateTime.setZone()`
- **Bitmask flags:** `ActivityFlag` uses bitwise operations
- **Environment variables:** Injected at build time via `process.env.*` (Rsbuild)
- **Permissions:** Defined in `instant.perms.ts` (InstantDB permissions with CEL expressions)
- **Schema:** Defined in `instant.schema.ts` — push changes with `npx instant-cli push schema`
- **`dangerToken`** from `src/common/ui.ts` = `'yellow'` — used as Radix color token for destructive actions
