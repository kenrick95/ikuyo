/** Opt-in migration flags. Keep backend auth disabled until the Laravel path is verified. */
export const backendAuthEnabled = process.env.IKUYO_BACKEND_AUTH === true;
