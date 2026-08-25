/**
 * Backend (Laravel/MySQL) is now the only data source; InstantDB is removed.
 * These flags are retained as always-on so the API-client code paths are taken.
 * Set the corresponding IKUYO_BACKEND_* to 'false' only if you intentionally want
 * to disable a capability (not recommended after cutover).
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

// Backend (Laravel) is the source of truth. Flags default to true unless the
// corresponding IKUYO_BACKEND_* env is set to 'false'.
const flagOn = (v: unknown): boolean => v !== false;

export const backendAuthEnabled = flagOn(process.env.IKUYO_BACKEND_AUTH);
export const backendActivityWrites = flagOn(
  process.env.IKUYO_BACKEND_ACTIVITY_WRITES,
);
export const backendContentWrites = flagOn(
  process.env.IKUYO_BACKEND_CONTENT_WRITES,
);
export const backendTaskWrites = flagOn(process.env.IKUYO_BACKEND_TASK_WRITES);
export const backendSharingWrites = flagOn(
  process.env.IKUYO_BACKEND_SHARING_WRITES,
);
export const backendTripWrites = flagOn(process.env.IKUYO_BACKEND_TRIP_WRITES);
export const backendTripReads = flagOn(process.env.IKUYO_BACKEND_TRIP_READS);
