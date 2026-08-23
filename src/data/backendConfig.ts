/**
 * Opt-in migration flags. Keep backend auth disabled until the Laravel path is verified.
 *
 * The two global modes below are independent of (and usually used *plus*) the
 * opt-in backend flags:
 *
 * - `maintenanceMode` replaces the whole app with a maintenance page. During an
 *   InstantDB → MySQL cutover this is the safe "everything is frozen" state.
 * - `readOnlyMode` keeps the SPA usable for browsing/reading but rejects every
 *   write at the data layer. Use it for the “freeze Instant writes + take final
 *   backup” window before enabling Laravel writes.
 */
export const maintenanceMode = process.env.IKUYO_MAINTENANCE_MODE === true;
export const readOnlyMode = process.env.IKUYO_READ_ONLY_MODE === true;

/** `true` while the app may still accept writes (i.e. not in read-only mode). */
export const canWrite = !readOnlyMode;

/**
 * Throw during read-only mode so no mutation can reach the data source, and
 * surface a consistent message to the caller. Used by the mutation helpers.
 */
export function assertWritable(what = 'write'): void {
  if (readOnlyMode) {
    throw new Error(`Ikuyo is in read-only mode: ${what} is disabled.`);
  }
}

export const backendAuthEnabled = process.env.IKUYO_BACKEND_AUTH === true;
export const backendActivityWrites =
  process.env.IKUYO_BACKEND_ACTIVITY_WRITES === true;
export const backendContentWrites =
  process.env.IKUYO_BACKEND_CONTENT_WRITES === true;
export const backendTaskWrites = process.env.IKUYO_BACKEND_TASK_WRITES === true;
export const backendSharingWrites =
  process.env.IKUYO_BACKEND_SHARING_WRITES === true;
export const backendTripWrites = process.env.IKUYO_BACKEND_TRIP_WRITES === true;
export const backendTripReads = process.env.IKUYO_BACKEND_TRIP_READS === true;
