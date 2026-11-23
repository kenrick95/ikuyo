# Expense flow review

These captures use the application UI with fictional people, expenses and
payments. All API responses are local fixtures. No real trip or account appears.

| Capture | User action |
| --- | --- |
| [Overview](01-expenses-overview.png) | Open Expenses. Read the totals separately in SGD and JPY. |
| [Inline split](02-inline-split.png) | Add an expense, choose the payer, and enable the split switch. |
| [People](03-people-picker.png) | Add Dana by name and select the people in this split. |
| [Balances](04-balances.png) | Open Balances and see suggested transfers in each currency. |
| [Partial payment](05-partial-settlement.png) | Record part of Bea's SGD repayment. |
| [Cross-currency payment](06-cross-currency-settlement.png) | Clear JPY 3,000 with an agreed SGD 30 payment. |
| [Refund](07-refund.png) | Record a SGD 30 refund against the original dinner split. |
| [Mobile Expenses](08-mobile-overview.png) | Read the expense list at 390px. |
| [Mobile balances](09-mobile-balances.png) | Read balances and settlements at 390px. |
| [Shared calendar](10-settlement-calendar.png) | Choose a payment date with the shared date picker. |
| [Trip people](11-trip-people.png) | Manage people in aligned Person, Joining, Access, and Actions columns. |
| [Link account](12-link-account.png) | Open the popover from Chen's row. Find and link an account. |
| [Mobile people](13-mobile-trip-people.png) | Manage trip people at 390px; access appears beneath each name. |
| [Sharing](14-trip-sharing.png) | Share with a guest account; Joining stays optional. |
| [Mobile split](15-mobile-inline-split.png) | Use the split method and Choose people on one row at 390px. |
| [Narrow split](16-narrow-inline-split.png) | Use the same controls at 320px. |
| [Narrow share split](17-narrow-share-split.png) | Edit share weights and read calculated amounts in the same row. |

The QA runner writes a local accessibility report. It checks the calendar,
the 320px layout, and dark mode. Keyboard checks cover focus trapping, focus
return after Escape, and date selection with the arrow keys and Enter.
People table checks verify column alignment and horizontal fit on desktop,
390px, and 320px, including inline renaming.
The split controls share one row at 320px, 390px, 1280px, and 1920px.
All four split methods fit at 320px. The section stops growing at 640px.

The review fixed field labels, navigation names, calendar row semantics, and
mobile summary overflow. The latest UX changes use gray outline header actions,
native-currency totals, and a split switch. The split method and Choose people
appear above the amounts. Foreign conversion fields appear only for foreign currencies.

See [the runner instructions](../../../scripts/qa/README.md) to repeat the check.
