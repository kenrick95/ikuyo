import { Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { post } from '../data/apiClient';
import { useBoundStore } from '../data/store';
import imgUrl from '../logo/ikuyo.svg';
import { RouteTrips } from '../Routes/routes';
import s from './Auth.module.css';

type Mode = 'login' | 'guest' | 'forgot' | 'reset';

export function BackendLogin() {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).has('reset_token')
      ? 'reset'
      : 'login',
  );
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const resetToken = useMemo(
    () => new URLSearchParams(window.location.search).get('reset_token') ?? '',
    [],
  );

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      const form = new FormData(event.currentTarget);
      try {
        if (mode === 'guest') {
          await post('/api/auth/guest', {});
        } else if (mode === 'login') {
          await post('/api/auth/login', {
            email: String(form.get('email') ?? '')
              .trim()
              .toLowerCase(),
            password: String(form.get('password') ?? ''),
          });
        } else if (mode === 'forgot') {
          await post('/api/auth/forgot', {
            email: String(form.get('email') ?? '')
              .trim()
              .toLowerCase(),
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
          await post('/api/auth/reset', {
            resetToken: String(form.get('resetToken') ?? resetToken),
            password: String(form.get('password') ?? ''),
          });
        }
        setLocation(RouteTrips.asRootRoute());
      } catch (error) {
        publishToast({
          root: { duration: Number.POSITIVE_INFINITY },
          title: { children: 'Unable to continue' },
          description: {
            children: error instanceof Error ? error.message : 'Unknown error',
          },
          close: {},
        });
      } finally {
        setLoading(false);
      }
    },
    [mode, publishToast, resetToken, setLocation],
  );

  const title =
    mode === 'forgot'
      ? 'Recover your password'
      : mode === 'reset'
        ? 'Choose a new password'
        : 'Log in to Ikuyo!';
  return (
    <form onSubmit={submit}>
      <Flex direction="column" gap="2">
        <Heading>
          <img src={imgUrl} className={s.logo} alt="Ikuyo!" /> {title}
        </Heading>
        {mode === 'login' && (
          <>
            <TextField.Root
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
            <TextField.Root
              name="password"
              type="password"
              placeholder="Password"
              required
              minLength={8}
            />
          </>
        )}
        {mode === 'forgot' && (
          <TextField.Root
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        )}
        {mode === 'reset' && (
          <>
            <Text as="label">Reset token</Text>
            <TextField.Root
              name="resetToken"
              defaultValue={resetToken}
              required
            />
            <TextField.Root
              name="password"
              type="password"
              placeholder="New password"
              required
              minLength={8}
            />
          </>
        )}
        <Button type="submit" loading={loading}>
          {mode === 'guest'
            ? 'Continue as guest'
            : mode === 'forgot'
              ? 'Send reset link'
              : mode === 'reset'
                ? 'Set password'
                : 'Log in'}
        </Button>
        {mode === 'login' && (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode('forgot')}
            >
              Forgot password?
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode('guest')}
            >
              Try as guest
            </Button>
          </>
        )}
        {mode !== 'login' && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode('login')}
          >
            Back to login
          </Button>
        )}
      </Flex>
    </form>
  );
}
