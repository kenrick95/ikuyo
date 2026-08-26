import { ApiError, mutate, postMutation } from '../data/apiClient';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { dbUpdateUserPreferences } from '../User/db';
import type { WebMCPTool } from './modelContext';
import { asStr, str } from './schema';

function requireUser(): NonNullable<
  ReturnType<typeof useBoundStore.getState>['currentUser']
> {
  const { currentUser, authUser } = useBoundStore.getState();
  if (!currentUser || !authUser) {
    throw new Error('Not authenticated. Call auth-login or auth-signup first.');
  }
  return currentUser;
}

/** Re-pull the session (authUser + currentUser) after a login/logout. */
async function refreshSession(): Promise<void> {
  const store = useBoundStore.getState();
  await store.refreshCurrentUser();
  store.subscribeUser();
}

/** Return the current user record (safe subset, no secrets). */
function currentUserSnapshot(): Record<string, unknown> {
  const { currentUser, authUser } = useBoundStore.getState();
  if (!currentUser) return { authenticated: false, user: null };
  return {
    authenticated: true,
    id: currentUser.id,
    handle: currentUser.handle,
    email: currentUser.email ?? null,
    activated: currentUser.activated,
    preferredRegion: currentUser.preferredRegion ?? null,
    preferredCurrency: currentUser.preferredCurrency ?? null,
    preferredTimeZone: currentUser.preferredTimeZone ?? null,
    authUserId: authUser?.id ?? null,
  };
}

export function createAuthTools(): WebMCPTool[] {
  return [
    {
      name: 'auth-get-current-user',
      description:
        'Returns the currently authenticated user (id, handle, email, account preferences) or authenticated:false when logged out.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute() {
        return currentUserSnapshot();
      },
    },
    {
      name: 'auth-login',
      description:
        'Logs the user in with an existing account using email and password. Throws a descriptive error if the account needs a password setup link instead. After success the session is refreshed.',
      inputSchema: {
        type: 'object',
        properties: {
          email: { ...str('The account email address.'), format: 'email' },
          password: { ...str('The account password.') },
        },
        required: ['email', 'password'],
      },
      async execute(input) {
        const email = asStr(input.email, 'email').trim().toLowerCase();
        const password = asStr(input.password, 'password');
        await mutate('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        await refreshSession();
        return { ok: true, user: currentUserSnapshot() };
      },
    },
    {
      name: 'auth-signup',
      description:
        'Creates a new account with an email and password (at least 8 characters), then signs the user in.',
      inputSchema: {
        type: 'object',
        properties: {
          email: { ...str('The new account email address.'), format: 'email' },
          password: {
            ...str('A password of at least 8 characters.'),
            minLength: 8,
          },
        },
        required: ['email', 'password'],
      },
      async execute(input) {
        assertWritable('creating an account');
        const email = asStr(input.email, 'email').trim().toLowerCase();
        const password = asStr(input.password, 'password');
        if (password.length < 8) {
          throw new Error('password must be at least 8 characters');
        }
        await postMutation('/api/auth/register', { email, password });
        await refreshSession();
        return { ok: true, user: currentUserSnapshot() };
      },
    },
    {
      name: 'auth-logout',
      description:
        'Logs the current user out and clears all locally cached session and trip data.',
      inputSchema: { type: 'object', properties: {} },
      async execute() {
        requireUser();
        try {
          await postMutation('/api/auth/logout', {});
        } catch (error) {
          // Logout should invalidate even if the server call fails; the local
          // session is wiped regardless.
          console.warn('[webmcp] logout request failed', error);
        }
        useBoundStore.getState().clearSession();
        return { ok: true };
      },
    },
    {
      name: 'account-update-preferences',
      description:
        'Updates the current user account preferences (region, currency, timezone). Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          region: str('ISO 3166-1 alpha-2 region code (e.g. JP, US).'),
          currency: str('ISO 4217 currency code (e.g. JPY, USD).'),
          timeZone: str('IANA time zone name (e.g. Asia/Tokyo).'),
        },
      },
      async execute(input) {
        const user = requireUser();
        await dbUpdateUserPreferences({
          id: user.id,
          region: input.region as string | undefined,
          currency: input.currency as string | undefined,
          timeZone: input.timeZone as string | undefined,
        });
        await refreshSession();
        return { ok: true, user: currentUserSnapshot() };
      },
    },
  ];
}

/** Re-exported so the login error type can be surfaced by the wiring layer. */
export function isNeedsPasswordSetupError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    typeof error.body === 'object' &&
    error.body !== null &&
    (error.body as { needsPasswordSetup?: boolean }).needsPasswordSetup === true
  );
}
