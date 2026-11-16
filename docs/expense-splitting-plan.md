# Expense splitting plan

Status: the integrated expense flow is implemented on this branch. Later scope remains proposed.
Research date: 2026-11-15.
Base: freshly fetched `origin/main`, `122d460375c68a47a11d4e0cd5ea91edf191d4d4`.

## Implemented flow

The existing Expenses tab now includes People and Balances dialogs. The inline
form adds a payer and optional equal, exact, percentage, or share splits.
Multiple payers and people without accounts are supported. Balances remain
separate for each currency. A cross-currency settlement stores the debt cleared
and the actual payment as an explicit agreement. Editors can void a payment.
Refunds reverse the original split and cannot exceed the original charge.
People can be renamed, archived, and restored without changing earlier amounts.
The Balances dialog includes a paginated activity history and an export.

Expense allocations use a JSON snapshot on each expense. This keeps the amount,
contributions, and shares atomic and includes them in existing expense sync events.
Participants, payments, and audit history use separate tables. New ledger amounts
use a limit of `10^12` minor units per entry. Shared currency metadata and test
fixtures keep PHP calculations and browser previews consistent.

Existing expenses remain unsplit. Currency totals no longer include unconverted
foreign amounts under the origin currency. The existing deployment controller
will detect the additive migration and require its normal migration authorization.

Participant merging and account claims for historical guests remain future work.
Receipt scanning, provider payments, recurring costs, notifications, and imports
remain in the later roadmap. Deployment is pending.

## Product direction

Make a trip's Expenses section answer three questions: who paid, what each
person's share is, and which repayments would settle the trip. Use Splitwise as
the quality benchmark while keeping Ikuyo's trip workflow and access rules.

**A participant is a person in a trip's expense ledger, not an Ikuyo account.**
One organizer must be able to manage an entire trip for friends, children, or
relatives who never sign up. A name is sufficient. Email, phone, invitations,
and account creation are never prerequisites for recording costs or repayments.

Recommended first complete release: name-only participants, selected-person
splits (equal, exact, percentage, shares), multiple payers, separate balances
per currency, suggested repayments, recorded partial repayments, corrections,
and readable exports. Reveal advanced controls only when needed. Ship the
foundation and basic equal/exact flow first behind a feature flag, then complete
the remaining modes before general rollout.

## Research and implications

These are observed product behaviors; the implementation choices below are our
recommendations, not claims about competitors' internals.

| Evidence | Implication for Ikuyo |
| --- | --- |
| Splitwise offers equal, exact, percentage, shares, adjustment, reimbursement, and itemized splitting; its form exposes split options from a short payer/split sentence. [Split options](https://kb.splitwise.com/balances-and-expenses/what-are-different-ways-i-can-split-an-expense) | Keep equal splitting visible by default; put alternate methods behind “Split equally.” Defer itemization and adjustments. |
| Splitwise supports name-only placeholder group members on the web, and expenses for invited people before they accept. [Participants without contact details](https://kb.splitwise.com/getting-started/can-i-add-a-friend-without-adding-their-email-address-or-phone-number) | Guest participants must have durable identities and full accounting capabilities without accounts. |
| Splitwise advertises multiple payers, balances, repayments, history, and export. [Product overview](https://www.splitwise.com/) | Flexible allocation alone is insufficient; completing the repayment loop and explaining changes are core requirements. |
| Splitwise's simplification preserves each person's net balance, can redirect whom they pay, and works separately per currency. [Simplify Debts](https://kb.splitwise.com/balances-and-expenses/what-is-simplify-debts) | Explain net repayment suggestions, never rewrite expenses to simplify them, and never mix currencies in the algorithm. |
| Splitwise keeps currencies separate by default; its bulk conversion can affect already settled expenses. [Multiple currencies](https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-a-friendship-or-group-with-multiple-currencies) | Separate authoritative currency ledgers from optional converted spending estimates. Avoid retrospective exchange-rate recalculation of debts. |
| Spliit combines account-free usage with percentage/share/amount splits, balances, and reimbursements. [Spliit](https://spliit.app/) | Low onboarding friction and flexible splitting can coexist. Ikuyo can retain authenticated editors without requiring every participant to authenticate. |

Do not copy subscription limits, social graphs, or payment integrations just to
match a benchmark. This feature records money exchanged outside Ikuyo; it does
not transfer money.

## Existing system and integration points

- `src/Expense/db.ts` and `backend/app/Models/Expense.php` represent an expense's
  amount, currency, date, description, and optional origin-currency conversion.
  They have no payer, beneficiary, allocation, or repayment model.
- `src/Expense/ExpenseInlineCardForm.tsx`, `ExpenseCard.tsx`, and
  `src/Trip/TripExpenseViewCards.tsx` provide the current entry and list UI.
  Extend these rather than adding a disconnected bill-splitting application.
- `src/Expense/ExpenseHeaderCard.tsx` currently sums
  `amountInOriginCurrency || amount` under one origin-currency label. A foreign
  expense without conversion can therefore produce a misleading total. Correct
  this when adding balances: show each native currency total separately.
  The header does not show converted estimates or conversion-status prose.
- Expense amounts are `DECIMAL(30,10)` in the database; `src/data/apiTrip.ts`
  converts them to JavaScript numbers. The schema intentionally accommodates
  unusually large and high-precision legacy data. Do not narrow these columns
  or silently round existing records to introduce splitting.
- Writes currently run through generic `ContentController` routes. Expense
  writes need dedicated validation/service handling on every route alias.
- Extend `src/Trip/store/types.ts`, `deriveState.ts`, store invalidation,
  `src/data/optimistic.ts`, `src/data/apiTrip.ts`, `SyncEventService`, and sync
  filtering together. Expense changes must refresh allocations and balances.
- Honor `TripAccessService`, `SerializeTripLifecycle`, archival, section visibility,
  admin auditing, soft deletion/restoration, account deletion, and duplication.
  These are existing behavior, not optional follow-up work.
- Extend `src/Expense/csvExport.ts` and `src/webmcp/expense.tools.ts`; avoid a UI-only
  split model that tools or exports cannot represent.

## User experience

The Expenses tab remains the main screen. It keeps the totals, CSV export,
inline Add Expense form, and expense cards. There is no setup wizard or separate
People or Balances page. The mockup is `docs/mockups/expense-splitting-flow.html`.

### People dialog

The Expenses header has People and Balances buttons beside Export to CSV.
People opens a dialog with an input labeled “Add or find a person.” Its
placeholder is “Name, Ikuyo email or @username.”

A plain name offers an explicit “Add [name]” action with a Guest label.
An exact email or username can select an existing Ikuyo account. Existing trip
members can also appear as suggestions. Account selection never grants access
to the trip or sends an invitation. Account lookup needs rate limits and a
privacy review before implementation. The mockup uses fictional local matches.

A participant without an account has a Guest badge. An account participant has
a username. The current user has “(you).” There are no repeated explanations
about accounts, permissions, or guest capabilities in the normal flow.

“Choose people” inside the expense form opens this same dialog with checkboxes.
Done applies the selection. Cancel preserves the draft and its previous selection.
Adding a person does not close the expense form. Participant IDs distinguish
identical names. Adding or archiving a participant never changes saved allocations.

### Inline expense form

The Add Expense button opens the existing inline form. Its date, title,
description, currency, amount, and conversion fields remain in place.

A new “Paid by” field defaults to the current user. The first saved expense can
create that user's linked participant record. This does not add all trip members
as financial participants. Users can select a different payer, including a guest,
or select Multiple people and enter each contribution.

“Split expense” is initially collapsed and off. An expense without a split records
spending without creating debt. Enabling the option expands the split controls
inside the form. There is no navigation to another step or page.

The expanded section shows the selected names, a Choose people button, a split
method, and each person's share. Equal is the default. Exact amounts, percentages,
and shares remain available in the method selector. Validation shows only the
specific error, such as “SGD 10.00 left to assign.”

The payer can be excluded from the split. Edits preserve the saved selection.
Turning the split off excludes that expense from balances. Add saves the complete
expense and returns to the existing list. Back discards the unsaved form.

Expense cards retain their date, title, currency, and amount. A compact line adds
the payer and split count, such as “Alex paid · 3 people.” Expanding a card shows
the allocation. The current user's identity comes from the authenticated account,
not a match against a participant name.

### Balances and settlement dialogs

Balances opens a dialog over the Expenses page. It groups balances by currency
and lists each person's amount with Owes, Owed, or Settled. If allocation is
incomplete, it shows a count such as “2 of 5 expenses split.”

The dialog includes suggested transfers under “Settle balances.” Each transfer
has a Settle button. The suggestion uses net balances, so the recipient can differ
from an original payer. Original expense details remain available in the list.

Settle replaces the dialog content with a compact payment form. Paid by, Paid to,
amount, and currency are prefilled. The user can change the amount for a partial
payment and enter a date or note. A balance preview shows the result.

“Record payment” records a transfer that occurred outside Ikuyo. It returns to
the updated Balances dialog with the short status “Payment recorded.” There is
no separate success page. A Record settlement action permits other transfers.
Payments do not increase trip spending.

A payment can involve guests on either side. Zero, negative, and self-payments
are invalid. An overpayment shows the resulting credit before submission.
Corrections void and replace a payment with an audit record.

No guest authentication or bearer-link access is included in the first release.
Editors can download expense, allocation, balance, and payment exports. Each
export includes currency, participant IDs, and names. Spreadsheet cells receive
formula escaping.

## Domain and storage proposal

Use string IDs compatible with the existing schema. Final migration names can
follow implementation order; these responsibilities should remain separate.

| Record | Proposed fields and rules |
| --- | --- |
| `expense_participants` | `id`, `trip_id`, `display_name`, optional `user_id`, optional `archived_at_ms`, timestamps. IDs are stable; an account link is metadata, never the ledger key. At most one linked participant per user per trip. |
| Expense extension | Nullable `split_method`, `ledger_amount_minor`, `ledger_currency_exponent`, integer `revision`, `entry_kind` (`expense`/`refund`), optional original-expense reference. Null split means track-only. Keep existing amount and conversion columns. |
| `expense_contributions` | `expense_id`, `participant_id`, nonnegative `amount_minor`; unique expense/participant. One row per payer or refund recipient. |
| `expense_allocations` | `expense_id`, `participant_id`, nonnegative `amount_minor`, optional exact decimal-string input weight/percentage; unique expense/participant. Persist both method inputs and final rounded results. |
| `expense_repayments` | `id`, `trip_id`, sender/recipient participant IDs, positive `amount_minor`, currency/exponent, date, note, nullable actor ID, revision, void timestamp, optional replacement reference. |
| `expense_revisions` | Expense/repayment/participant reference, revision, operation, nullable actor ID, timestamp, before/after financial fields. Append within the same transaction as the change; avoid storing entire trip snapshots. |

Enforce same-trip references in the service and, where practical, composite
foreign keys. Index trip/participant lookup and expense child lookup. Avoid
cascading user deletion into participants, allocations, or financial history.
Retain participant references when archiving them; archived people are hidden
from new selections but remain visible in prior expenses and balances. Hard
removal is allowed only if never referenced. Participant merging is deferred;
rename or archive accidental unused duplicates instead.

Selecting an existing account creates an explicit association by its account ID.
It does not change membership. Linking a historical guest requires a separate
confirmation with the account holder. A name or search result never claims or
merges a guest's history automatically.
Removing a member removes access without changing ledger balances. Deleting an
account detaches its links and actor references; apply the existing owned-trip
deletion policy. Do not introduce a new data-retention policy in this feature.

## Money, refunds, and balancing rules

Use integer minor units for new ledger math and a versioned currency-exponent
allowlist (including JPY 0, SGD 2, KWD 3). Accept decimal amounts and integer minor
units as strings in the API; never pass new ledger values through `Number()`.
Use TypeScript `bigint` for preview math and checked 64-bit PHP integers for
server math, with a documented initial cap of `10^15` minor units per entry.
Assert 64-bit PHP in deployment preflight. Guard intermediate multiplication
and aggregate addition against overflow; reject an unsupported operation before
writing, rather than wrapping or using floating point. If real usage demands
larger ranges, adopt tested arbitrary-precision PHP arithmetic before raising
the cap. Persist minor units in BIGINT columns and serialize them as strings.

Legacy records remain unchanged and track-only. To split a legacy amount that
has extra fractional precision, an unsupported currency, or exceeds the cap,
require an explicit correction or leave it track-only. No migration may invent
a payer, assume the creator paid, or allocate old expenses to current members.

For every split expense, require:

- At least one payer and one beneficiary, all in the expense's trip.
- Sum of contributions = sum of allocations = the ledger expense amount.
- Equal: divide by selected count; distribute leftover minor units in stable
  participant-ID order. Show which people received the extra unit.
- Shares: nonnegative decimal weights with at most four fractional places;
  at least one positive weight. Percentages: at most four decimal places,
  nonnegative, totaling exactly 100. Store scaled integer/string inputs.
- Weighted methods: allocate floors, then remaining units by largest fractional
  remainder with participant-ID tie breaks. Exact amounts must already sum
  exactly; never silently rebalance manually entered amounts.
- Zero allocations are allowed, but zero total split expenses are not.

Support refunds as explicit entries with positive amounts and `entry_kind=refund`:
contribution rows identify who received money back and allocation rows identify
whose cost is reduced. Reverse both sides' ledger signs. Default a referenced
refund to the original beneficiaries, allow explicit adjustments, and cap
cumulative referenced refunds at the original amount unless correcting that
original entry first. Reject negative expense amounts in new split writes.
Track-only legacy negatives retain their existing meaning outside the ledger.

For participant p and currency c:

`net = signed_contributions - signed_allocations + repayments_sent - repayments_received`

Positive means owed money; negative means owes. Each currency sums to zero.
Use a deterministic debtor/creditor matching algorithm on those nets, sorting
by absolute outstanding amount then participant ID. Each transfer reduces at
least one outstanding balance; at most debtors + creditors - 1 transfers are
needed. Suggestions are derived and can change when expenses change; recorded
payments remain independent facts. Fully settled means every minor-unit net is
zero, never an epsilon tolerance.

**Keep settlement currencies separate.** Existing origin-currency conversion
fields remain useful for spending estimates, with their stored values; they
must not silently convert participant debt. Missing rates produce “conversion
missing,” never a fabricated 1:1 conversion. Changing trip origin currency or
an FX rate must not reopen a settled currency ledger. Cross-currency repayments
record two explicit values: the debt amount cleared and the actual payment amount
and currency. Only the agreed debt currency changes in the ledger. The actual
payment does not create a second debt or offset other balances. The stored amounts
define the agreed rate permanently. Voiding that record reverses the debt
clearance. No market rate is fetched or applied silently.

## API, consistency, and access

- Add trip-scoped participant list/create/update/archive endpoints, dedicated
  validated expense writes, a currency-grouped balance read endpoint, and
  repayment list/create/void endpoints. All generic and direct-ID expense
  write routes must delegate to the same service. Never mass-assign nested
  ledger payloads through `ContentController`.
- Split write shape: `{ split: { method, contributions: [{ participantId,
  amountMinor }], allocations: [{ participantId, amountMinor?, weight? }] },
  expectedRevision }`. Amounts are strings. The server computes authoritative
  weighted allocations and returns complete rounded rows and the new revision.
- Preserve omitted split data on metadata-only edits. Explicit `split: null`
  removes splitting with a revision check and audit record. Changing a split
  expense's amount/currency requires a coherent replacement split in the same
  transaction; reject stale legacy clients' financial edits with a clear 409.
- Save expense, contribution/allocation replacement, revision/audit record,
  and sync notification atomically under the existing trip lifecycle lock.
  Recheck access and archival state inside the lock. Require `expectedRevision`
  for financial updates; return 409 for stale edits and preserve the draft.
- Use client-generated IDs/idempotency keys for creation and repayments, scoped
  to actor/trip and request payload. Same key/same payload returns the original
  result; changed payload conflicts. Browser and WebMCP retries must never
  duplicate a transfer. Add revision checks to void/correction operations too.
- Reuse owner/editor write permission and existing admin audit rules. Viewers
  can read only when expenses are visible. Public visitors receive ledger data
  only when public expenses are visible; before enabling splitting on a public
  trip, explain that names and allocations follow that setting. Hide account
  IDs/contact details from public financial serializers. No participant link
  grants access, editing, or an exception to archival.
- Apply visibility filtering to full-trip reads, child lists, balance endpoints,
  exports, sync events, and WebMCP. Clear participant/repayment/balance state on
  trip removal, permission revocation, or section hiding.
- Serialize an expense's allocations/contributions as part of its sync payload;
  add participant and repayment event types and put all three behind the
  expense visibility filter. Read balances consistently from a single snapshot,
  return a snapshot cursor, and refresh them after financial sync events. For
  initial scale, aggregate on demand with eager loading; no second authoritative
  mutable balances table or background-worker dependency.
- Ordinary expense deletion/restoration excludes/restores its entire allocation
  graph in balance calculations. Keep revisions so the outcome is explainable.
  Include the new graph in admin restore, trip deletion, and account-deletion
  flows. New routes must participate in `SerializeTripLifecycle`.
- Trip duplication copies expenses as track-only by default, with an explicit
  warning that financial history is not copied. Do not carry real repayments,
  participant account links, or old debts into a new trip. Full ledger cloning
  is outside this release.

## Delivery sequence

1. **Foundation and compatibility.** Add schema, currency metadata, checked
   arithmetic, allocation/refund/balance services, revisions, route delegation,
   legacy-client protections, visibility, lifecycle and deletion integration.
   Keep the feature disabled while doing this; preserve current expense entry.
2. **Usable end-to-end slice.** Add name-only people, equal/exact splitting,
   one payer, per-currency balances, suggested repayments, partial repayment
   recording/voiding, history, sync and exports. Exercise a complete guest trip
   before expanding form complexity. Optional account linking is not a blocker.
3. **Complete core release.** Add percentages, shares, multiple payers, refunds,
   final WebMCP schemas, optional linking, responsive/accessibility polish, and
   mixed-currency/legacy edge cases. Roll out to test trips, then enable general
   opt-in after the acceptance checks pass.
4. **Later, only with demonstrated demand.** Receipt itemization with tax/tip,
   reusable household weights, participant merges, scoped read-only statements
   via revocable links, exchange-rate suggestions, Splitwise import,
   recurring costs, notifications, and payment-provider integration. Avoid
   receipt storage/OCR and upload growth in the first release on limited disk.

Migrations must be additive and require no historical split backfill. Rehearse
against representative legacy data. Use PHP 8.4-compatible migrations/helpers
and `php scripts/deploy/deploy.php`; retain the migration/recovery authorization
gates and automatic deployment when no migrations are pending. Preserve the
single-copy rsync deployment, with no retained host release artifacts or Python.
Disable the feature to roll back behavior; do not drop newly recorded ledgers.

## Acceptance and verification

Implement PHP unit/feature tests for authoritative math, API/security and
lifecycle behavior; Vitest tests for previews, state and important UI flows.
Use shared JSON money fixtures across PHP and TypeScript to prevent drift.

- Organizer Alex adds guests Bea and Chen without contact details or accounts;
  Alex pays SGD 90 equally. Nets are +60/-30/-30. Bea repays 20: +40/-10/-30.
  Chen repays 30, Bea repays 10: all zero; trip spending remains SGD 90.
- Bea and Chen each pay 30 toward a 60 expense benefiting Alex alone: nets are
  -60/+30/+30, even though neither payer benefited.
- SGD 10 among three has shares 3.34/3.33/3.33 in documented tie order; JPY 100
  yields 34/33/33; KWD 1 yields .334/.333/.333. Repeat saves are deterministic.
- Shares 2:1 allocate SGD 90 as 60/30; percentages 25:75 allocate 22.50/67.50.
  Reject invalid totals, unsupported precision, overflow, and cross-trip IDs.
  Randomized allocation fixtures preserve totals and permutation-independent
  ties; refund and repayment operations preserve per-currency zero-sum nets.
- Alex receives a SGD 30 refund on the original equal SGD 90 expense: each
  person's cost decreases by 10; Alex's refund net is -20 and each guest's +10.
  If already settled, the new amount owed by Alex is shown explicitly.
- Adding/archiving/renaming a person does not alter historical amounts; identical
  names remain distinct. Removing/deleting a linked account preserves the
  remaining trip's ledger while removing access and account identifiers.
- A USD expense with no SGD conversion never contributes its raw amount to an
  SGD total. USD and SGD debts stay separate, including after rate changes.
  Oversized/high-precision legacy expenses remain readable and track-only.
- Concurrent edit, edit-versus-archive, duplicate creation retries, and repeated
  repayment/void requests cannot double-count or leave partial allocations.
  Offline/stale forms show conflicts without silently discarding changes.
- Hidden expenses leak no participants, allocations, repayments or balances
  through any API, sync, export, WebMCP, or stale local store. Test owners,
  editors, viewers, public visitors and audited admins, including archived trips.
- Delete/restore an expense and trip; test admin restoration, account deletion,
  permission revocation, duplication, old API clients and migration rollback
  strategy. Confirm payments survive expense corrections as independent facts.
- Mobile and keyboard users can add a guest, exclude a beneficiary, change a
  payer/method, inspect rounding, record a partial repayment and correct it.
  Labels explain owes/owed without depending on red/green. Exports reconcile
  with displayed balances and neutralize formula-like participant names/notes.

Before implementation, validate the draft with three short task walkthroughs:
a dinner split with one absent friend, a family trip with child shares, and a
multi-currency trip with a repayment before a refund. Aim for an equal split
without opening advanced controls, and for each tester to explain a suggested
repayment correctly. These are validation targets, not completed user research.
