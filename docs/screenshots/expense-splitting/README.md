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

The [browser report](accessibility-report.json) covers 12 states, including the
calendar, a 320px layout and dark mode. It contains zero axe violations and zero
failures across 487 rendered text contrast samples. Keyboard checks cover focus
trapping, Escape focus return, and date selection with arrow keys and Enter.

The review fixed field labels, navigation names, calendar row semantics, and
mobile summary overflow. The latest UX changes use gray outline header actions,
native-currency totals, a split switch, a nearby people button, and a visible
split-method label. Foreign conversion fields appear only for foreign currencies.

See [the runner instructions](../../../scripts/qa/README.md) to repeat the check.
