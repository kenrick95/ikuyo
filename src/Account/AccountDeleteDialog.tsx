import { AlertDialog, Button, Flex, Text, TextField } from '@radix-ui/themes';
import { useId, useState } from 'react';
import { useLocation } from 'wouter';
import { mutate } from '../data/apiClient';
import { useBoundStore } from '../data/store';
import { RouteLogin } from '../Routes/routes';

export function AccountDeleteDialog() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  const [, setLocation] = useLocation();
  const clearSession = useBoundStore((state) => state.clearSession);

  async function deleteAccount() {
    setBusy(true);
    setError('');
    try {
      await mutate('/api/users/me', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation }),
      });
      clearSession();
      setLocation(RouteLogin.asRootRoute());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete account');
      setBusy(false);
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        setOpen(value);
        setConfirmation('');
        setError('');
      }}
    >
      <AlertDialog.Trigger>
        <Button color="red" variant="soft">
          Delete account
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="480px">
        <AlertDialog.Title>Delete your account?</AlertDialog.Title>
        <AlertDialog.Description>
          Your account, trips you own (including shared and archived trips), and
          their activities, accommodations, expenses, tasks, day plans, and
          comments will be soft deleted. Your comments in other trips will also
          be deleted. Trips owned by other people will remain. You will be
          signed out and cannot sign in again unless an administrator restores
          your account.
        </AlertDialog.Description>
        <Flex direction="column" gap="2" mt="4">
          <Text as="label" htmlFor={id}>
            Type DELETE to confirm
          </Text>
          <TextField.Root
            id={id}
            value={confirmation}
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
          {error ? (
            <Text color="red" role="alert">
              {error}
            </Text>
          ) : null}
        </Flex>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" disabled={busy}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Button
            color="red"
            loading={busy}
            disabled={confirmation !== 'DELETE' || busy}
            onClick={() => void deleteAccount()}
          >
            Delete my account
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
