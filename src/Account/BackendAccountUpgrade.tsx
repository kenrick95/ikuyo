import { Button, Callout, Flex, Heading, TextField } from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useLocation } from 'wouter';
import { postMutation } from '../data/apiClient';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { RouteAccount } from '../Routes/routes';

export function BackendAccountUpgrade() {
  const publishToast = useBoundStore((state) => state.publishToast);
  const subscribeUser = useBoundStore((state) => state.subscribeUser);
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      const form = new FormData(event.currentTarget);
      try {
        // Linking an email/password writes to the user record.
        assertWritable('upgrading your guest account');
        await postMutation('/api/auth/upgrade', {
          email: String(form.get('email') ?? '')
            .trim()
            .toLowerCase(),
          password: String(form.get('password') ?? ''),
        });
        publishToast({
          root: {},
          title: { children: 'Account upgraded' },
          description: {
            children: 'Your guest account is now linked to your email.',
          },
          close: {},
        });
        // Refresh the cached user so the account/avatar no longer show a guest.
        subscribeUser();
        setLocation(RouteAccount.asRootRoute());
      } catch (error) {
        publishToast({
          root: { duration: Number.POSITIVE_INFINITY },
          title: { children: 'Unable to upgrade account' },
          description: {
            children: error instanceof Error ? error.message : 'Unknown error',
          },
          close: {},
        });
      } finally {
        setLoading(false);
      }
    },
    [publishToast, setLocation, subscribeUser],
  );

  return (
    <form onSubmit={submit}>
      <Flex direction="column" gap="3">
        <Heading size="4">Link your account</Heading>
        <Callout.Root>
          <Callout.Text>
            Add an email and password to keep this guest account across devices.
          </Callout.Text>
        </Callout.Root>
        <TextField.Root
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={loading}
        />
        <TextField.Root
          name="password"
          type="password"
          placeholder="Password (8+ characters)"
          minLength={8}
          required
          disabled={loading}
        />
        <Button type="submit" loading={loading}>
          Link email and password
        </Button>
      </Flex>
    </form>
  );
}
