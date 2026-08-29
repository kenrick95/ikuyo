import { Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ApiError, mutate, postMutation } from '../data/apiClient';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import imgUrl from '../logo/ikuyo.svg';
import { RouteTrips } from '../Routes/routes';
import s from './Auth.module.css';

type Mode = 'login' | 'signup' | 'guest' | 'forgot' | 'reset';
type LoginStep = 'email' | 'password';

type LookupResult = { known: boolean; needsPasswordSetup: boolean };

/**
 * Backend (Laravel session) auth.
 *
 * The login form is email-first: we look up the account before ever showing a
 * password field, so legacy users (who joined via magic-link/Google and never
 * set a password) aren't confronted with a password input. Depending on the
 * account they are sent to: the password step (account has a password),
 * password setup via email (legacy account), or signup (unknown email).
 */
export function BackendLogin() {
  const publishToast = useBoundStore((state) => state.publishToast);
  const subscribeUser = useBoundStore((state) => state.subscribeUser);
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).has('reset_token')
      ? 'reset'
      : 'login',
  );
  // Within login mode, 'email' asks for the email first; only accounts that
  // actually have a password ever reach the 'password' step.
  const [loginStep, setLoginStep] = useState<LoginStep>('email');
  const [loginEmail, setLoginEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  // Remember the email across the login → recovery/signup transitions.
  const [prefillEmail, setPrefillEmail] = useState('');
  const resetToken = useMemo(
    () => new URLSearchParams(window.location.search).get('reset_token') ?? '',
    [],
  );

  const goToPasswordSetup = useCallback(
    (email: string) => {
      setPrefillEmail(email);
      setMode('forgot');
      publishToast({
        root: {},
        title: { children: 'Set up your password' },
        description: {
          children:
            "We'll send you a link to create a password, then you can log in.",
        },
        close: {},
      });
    },
    [publishToast],
  );

  const toastError = useCallback(
    (title: string, error: unknown) => {
      publishToast({
        root: { duration: Number.POSITIVE_INFINITY },
        title: { children: title },
        description: {
          children: error instanceof Error ? error.message : 'Unknown error',
        },
        close: {},
      });
    },
    [publishToast],
  );

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const email =
        String(form.get('email') ?? '')
          .trim()
          .toLowerCase() || loginEmail;

      // ── Login: email step (look up the account first) ────────────────────
      if (mode === 'login' && loginStep === 'email') {
        setLoading(true);
        try {
          const lookup = await mutate<LookupResult>('/api/auth/lookup', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          if (!lookup.known) {
            // Unknown email → offer signup (pre-filled).
            setPrefillEmail(email);
            setMode('signup');
            publishToast({
              root: {},
              title: { children: 'No account found' },
              description: {
                children: `We couldn't find an account for ${email}. Create one to get started.`,
              },
              close: {},
            });
          } else if (lookup.needsPasswordSetup) {
            // Legacy account that never set a password → password setup.
            goToPasswordSetup(email);
          } else {
            setLoginEmail(email);
            setLoginStep('password');
          }
        } catch (error) {
          toastError('Unable to look up account', error);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        // Guest creation, signup, password recovery, and reset all write to the
        // data store, so they're barred during the read-only freeze window.
        // Logging in is kept available so existing users can still read their trips.
        if (mode !== 'login') {
          assertWritable('creating or changing your account');
        }
        if (mode === 'signup') {
          await postMutation('/api/auth/register', {
            email,
            password: String(form.get('password') ?? ''),
          });
        } else if (mode === 'guest') {
          await postMutation('/api/auth/guest', {});
        } else if (mode === 'login') {
          // `mutate` keeps CSRF but (unlike postMutation) does not assert
          // writable, so existing users can still log in during a read-only freeze.
          await mutate('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: loginEmail,
              password: String(form.get('password') ?? ''),
            }),
          });
        } else if (mode === 'forgot') {
          await postMutation('/api/auth/forgot', {
            email,
          });
          publishToast({
            root: {},
            title: { children: 'Check your email' },
            description: {
              children:
                'If an account exists, a password reset link has been sent.',
            },
            close: {},
          });
          setMode('login');
          return;
        } else {
          await postMutation('/api/auth/reset', {
            resetToken: String(form.get('resetToken') ?? resetToken),
            password: String(form.get('password') ?? ''),
          });
          publishToast({
            root: {},
            title: { children: 'Password updated' },
            description: { children: 'You are now signed in.' },
            close: {},
          });
        }
        // Refresh the cached auth/current user from the new session before
        // navigating, so the redirect guard no longer sees the pre-login state.
        subscribeUser();
        setLocation(RouteTrips.asRootRoute());
      } catch (error) {
        // A legacy account reached the password step somehow still without a
        // password: fall back to the setup flow rather than failing.
        if (
          mode === 'login' &&
          error instanceof ApiError &&
          typeof error.body === 'object' &&
          error.body !== null &&
          'needsPasswordSetup' in error.body &&
          error.body.needsPasswordSetup === true
        ) {
          goToPasswordSetup(loginEmail);
          return;
        }
        toastError('Unable to continue', error);
      } finally {
        setLoading(false);
      }
    },
    [
      mode,
      loginStep,
      loginEmail,
      publishToast,
      resetToken,
      setLocation,
      subscribeUser,
      goToPasswordSetup,
      toastError,
    ],
  );

  const returnToLogin = () => {
    setMode('login');
    setLoginStep('email');
  };

  return (
    <form onSubmit={submit}>
      <Flex direction="column" gap="2">
        <LoginHeading mode={mode} />
        {mode === 'login' && loginStep === 'email' && (
          <EmailScreen
            email={loginEmail}
            loading={loading}
            onEmailChange={setLoginEmail}
            onForgotPassword={() => {
              setPrefillEmail(loginEmail.trim().toLowerCase());
              setMode('forgot');
            }}
            onTryGuest={() => setMode('guest')}
          />
        )}
        {mode === 'login' && loginStep === 'password' && (
          <PasswordScreen
            email={loginEmail}
            loading={loading}
            onUseDifferentEmail={() => {
              setLoginStep('email');
              setLoginEmail('');
            }}
            onTryGuest={() => setMode('guest')}
          />
        )}
        {mode === 'signup' && (
          <SignupScreen
            email={prefillEmail}
            loading={loading}
            onBack={returnToLogin}
          />
        )}
        {mode === 'forgot' && (
          <ForgotPasswordScreen
            email={prefillEmail || loginEmail}
            loading={loading}
            onBack={returnToLogin}
          />
        )}
        {mode === 'reset' && (
          <ResetPasswordScreen resetToken={resetToken} loading={loading} />
        )}
        {mode === 'guest' && (
          <GuestScreen loading={loading} onBack={returnToLogin} />
        )}
      </Flex>
    </form>
  );
}

function LoginHeading({ mode }: { mode: Mode }) {
  const title =
    mode === 'forgot'
      ? 'Recover your password'
      : mode === 'reset'
        ? 'Choose a new password'
        : mode === 'signup'
          ? 'Create your account'
          : 'Log in to Ikuyo!';

  return (
    <Heading>
      <img src={imgUrl} className={s.logo} alt="Ikuyo!" /> {title}
    </Heading>
  );
}

function EmailScreen({
  email,
  loading,
  onEmailChange,
  onForgotPassword,
  onTryGuest,
}: {
  email: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onForgotPassword: () => void;
  onTryGuest: () => void;
}) {
  return (
    <>
      <label htmlFor="backend-login-email">Email</label>
      <TextField.Root
        id="backend-login-email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => onEmailChange(event.currentTarget.value)}
        placeholder="you@example.com"
        required
        autoComplete="username"
        autoFocus
      />
      <Text size="1" color="gray">
        Enter your email to log in or create a new account.
      </Text>
      <Button type="submit" loading={loading}>
        Continue
      </Button>
      <Button type="button" variant="ghost" onClick={onForgotPassword}>
        Forgot password?
      </Button>
      <Button type="button" variant="ghost" onClick={onTryGuest}>
        Try as guest
      </Button>
    </>
  );
}

function PasswordScreen({
  email,
  loading,
  onUseDifferentEmail,
  onTryGuest,
}: {
  email: string;
  loading: boolean;
  onUseDifferentEmail: () => void;
  onTryGuest: () => void;
}) {
  return (
    <>
      <label htmlFor="backend-login-email">Email</label>
      <TextField.Root
        id="backend-login-email"
        name="email"
        type="email"
        value={email}
        readOnly
        required
        autoComplete="username"
      />
      <label htmlFor="backend-login-password">Password</label>
      <TextField.Root
        id="backend-login-password"
        name="password"
        type="password"
        placeholder="Password"
        required
        autoComplete="current-password"
        autoFocus
      />
      <Button type="submit" loading={loading}>
        Log in
      </Button>
      <Button type="button" variant="ghost" onClick={onUseDifferentEmail}>
        Use a different email
      </Button>
      <Button type="button" variant="ghost" onClick={onTryGuest}>
        Try as guest
      </Button>
    </>
  );
}

function SignupScreen({
  email,
  loading,
  onBack,
}: {
  email: string;
  loading: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <label htmlFor="backend-signup-email">Email</label>
      <TextField.Root
        id="backend-signup-email"
        name="email"
        type="email"
        defaultValue={email}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
      <label htmlFor="backend-signup-password">Password</label>
      <TextField.Root
        id="backend-signup-password"
        name="password"
        type="password"
        placeholder="Password (8+ characters)"
        required
        minLength={8}
        autoComplete="new-password"
        autoFocus
      />
      <Button type="submit" loading={loading}>
        Create account
      </Button>
      <BackToLoginButton onClick={onBack} />
    </>
  );
}

function ForgotPasswordScreen({
  email,
  loading,
  onBack,
}: {
  email: string;
  loading: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <label htmlFor="backend-forgot-email">Email</label>
      <TextField.Root
        id="backend-forgot-email"
        name="email"
        defaultValue={email}
        type="email"
        placeholder="you@example.com"
        required
        autoFocus={!email}
      />
      <Text size="1" color="gray">
        Enter your email and we'll send you a link to reset your password.
      </Text>
      <Button type="submit" loading={loading} autoFocus={Boolean(email)}>
        Send reset link
      </Button>
      <BackToLoginButton onClick={onBack} />
    </>
  );
}

function ResetPasswordScreen({
  resetToken,
  loading,
}: {
  resetToken: string;
  loading: boolean;
}) {
  return (
    <>
      <input type="hidden" name="resetToken" value={resetToken} />
      <label htmlFor="backend-reset-password">New password</label>
      <TextField.Root
        id="backend-reset-password"
        name="password"
        type="password"
        placeholder="New password (8+ characters)"
        required
        minLength={8}
        autoComplete="new-password"
        autoFocus
      />
      <Text size="1" color="gray">
        Enter a new password, then you'll be signed in.
      </Text>
      <Button type="submit" loading={loading}>
        Set password
      </Button>
    </>
  );
}

function GuestScreen({
  loading,
  onBack,
}: {
  loading: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <Text color="gray">Create a temporary account to explore Ikuyo.</Text>
      <Button type="submit" loading={loading} autoFocus>
        Continue as guest
      </Button>
      <BackToLoginButton onClick={onBack} />
    </>
  );
}

function BackToLoginButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick}>
      Back to login
    </Button>
  );
}
