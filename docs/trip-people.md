# Trip people

`trip_people` identifies people involved in a trip. Expenses reference these IDs.
Future room assignments can use the same IDs.
Saved expense JSON keeps its `participantId` field names for compatibility;
those values now reference `trip_people.id`.

Three facts remain independent:

| Fact | Storage | Meaning |
| --- | --- | --- |
| Joining the trip | `trip_people.is_participant` | The person belongs in the participant list and default split selection. |
| Linked account | `trip_people.user_id`, nullable | The person has an Ikuyo account. |
| Trip access | `trip_user.role` | That account has owner, editor, or viewer access. |

A person with no account has the **No account** label. An Ikuyo guest account
has a real user ID and session, but no email address. A person linked to that
account has the **Guest account** label. Upgrading the account keeps both IDs.
Public responses omit the linked account type, ID, handle, and access role.

The access record and person record connect through `(trip_id, user_id)`.
Linked accounts are unique within each trip's people list. Names can repeat.
An account can have access without a person record. A person can have a linked
account without access.

## Behavior

- New trip creators start as participants. They can turn off Joining and retain
  ownership. Existing shared users are not added to the participant list.
- Adding a person defaults to Joining. Adding or linking an account grants no
  access. Linking preserves the person ID, saved allocations, and repayments.
- Sharing accepts an email or exact `@username`, including guest account handles.
  Also add to participants is optional and starts unchecked.
- People and Sharing both expose Joining. Changing this flag leaves saved
  expenses and access intact. Removing access leaves the person record intact.
- Split selection defaults to active participants. Payer selection includes other
  trip people. Recording the current user's payment can create a non-participating
  person record, so a planner can pay without joining the trip.
- Archival retains references and access. Account deletion clears the account
  link while preserving the person and financial history.
- Linking to an account already assigned to another person returns a conflict.
  It does not merge people or their history.

## API and migration

Trip reads return the canonical roster in `people`. The expense ledger contains
financial values and person references. It does not own another roster.
People mutations use `/api/trips/{trip}/people` and require edit access.
Future features can use `Trip::people()` and the `TripPerson` type.

When expenses are hidden, public and viewer responses show only active
participants. They do not expose people recorded solely as financial contacts.
People sync events contain no personal payload and trigger a trip refresh.

The promotion migration renames `expense_participants` in place. Existing IDs,
payment foreign keys, allocation JSON, account links, and archival state survive.
Existing expense people start with Joining off because a financial role does not
establish attendance. New person creation sets this flag explicitly.

The migration uses PHP and the existing deployment authorization gate. Production
deployment remains a separate operation.
