/** Opt-in migration flags. Keep backend auth disabled until the Laravel path is verified. */
export const backendAuthEnabled = process.env.IKUYO_BACKEND_AUTH === true;
export const backendActivityWrites =
  process.env.IKUYO_BACKEND_ACTIVITY_WRITES === true;
export const backendContentWrites =
  process.env.IKUYO_BACKEND_CONTENT_WRITES === true;
export const backendTaskWrites = process.env.IKUYO_BACKEND_TASK_WRITES === true;
export const backendSharingWrites =
  process.env.IKUYO_BACKEND_SHARING_WRITES === true;
export const backendTripWrites = process.env.IKUYO_BACKEND_TRIP_WRITES === true;
