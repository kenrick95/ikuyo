# Expense UX screenshots and accessibility checks

Run this check on a development machine. It uses the real production UI with
fictional API responses. It does not contact production or write to a database.
The QA dependencies are separate from the application and deployment packages.

1. Install the browser tools:

   ```sh
   pnpm --dir scripts/qa install
   pnpm --dir scripts/qa exec playwright install chromium
   ```

2. Build the app and start its preview server:

   ```sh
   pnpm build
   pnpm exec rsbuild preview --host 127.0.0.1 --port 5174
   ```

3. In another terminal, run the walkthrough:

   ```sh
   node scripts/qa/expense-flow.mjs
   ```

The runner writes PNG captures and `accessibility-report.json` to
`docs/screenshots/expense-splitting`. It exits with an error if an accessibility
violation, text contrast failure, browser error, or unexpected API request occurs.

The checks cover expense entry, the people picker, partial payments, an explicit
cross-currency payment, refunds, the shared calendar, keyboard focus, 390px and
320px layouts, and dark mode. The fixture adds a guest and records fictional
payments through the real UI. Every API response comes from the runner's memory.

Axe cannot resolve all of Radix's CSS color expressions. A second browser check
converts those colors through canvas, composites solid backgrounds, and checks
text contrast against WCAG AA thresholds. Disabled controls and image/gradient
backgrounds are excluded from that second check. The report retains axe's
incomplete findings. This review does not include an assistive-technology session.

Optional environment variables:

- `IKUYO_QA_URL`: preview URL, default `http://127.0.0.1:5174`.
- `IKUYO_QA_TOOLS_DIR`: directory with the QA dependencies installed.
- `IKUYO_QA_BROWSER`: path to an existing Chromium executable.
- `IKUYO_QA_OUTPUT`: output directory for screenshots and the report.
