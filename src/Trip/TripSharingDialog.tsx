import {
  Flex,
  Text,
  TextField,
  Button,
  Select,
  Dialog,
  Table,
  Inset,
} from '@radix-ui/themes';
import { useCallback, useState, useMemo, SyntheticEvent } from 'react';
import { db, dbAddUserToTrip, dbRemoveUserFromTrip } from '../data/db';
import { useBoundStore } from '../data/store';
import { DbTrip, DbUser } from '../data/types';
import { TripUserRole } from '../data/TripUserRole';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import s from './TripSharingDialog.module.css';

export function TripSharingDialog({
  dialogOpen,
  setDialogOpen,
  trip,
  user: currentUser,
}: {
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
  trip: DbTrip;
  user: DbUser;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const { userAndRoles, currentUserIsOwner } = useMemo(() => {
    const res: Array<{ user: DbUser; role: TripUserRole }> = [];
    let currentUserIsOwner = false;
    for (const role of [
      TripUserRole.Owner,
      TripUserRole.Editor,
      TripUserRole.Viewer,
    ]) {
      for (const user of trip[role] ?? []) {
        if (user.id === currentUser.id) {
          if (role === TripUserRole.Owner) {
            currentUserIsOwner = true;
          }
        }
        res.push({
          user,
          role: role,
        });
      }
    }

    return { userAndRoles: res, currentUserIsOwner };
  }, [trip, currentUser.id]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState(TripUserRole.Viewer);

  const handleDeleteUser = useCallback(() => {
    return async ({ user, role }: { user: DbUser; role: TripUserRole }) => {
      await dbRemoveUserFromTrip({
        tripId: trip.id,
        userEmail: user.email,
        userRole: role,
      });
    };
  }, [trip.id]);

  const handleForm = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const newUserEmail = formData.get('newUserEmail')?.toString() ?? '';
      const newUserRole = formData.get('newUserRole')?.toString() ?? '';

      console.log('TripForm', {
        newUserEmail,
        newUserRole,
      });
      if (!newUserEmail || !newUserRole) {
        return;
      }

      if (currentUserIsOwner && newUserEmail === currentUser.email) {
        setErrorMessage(`Cannot change current user's owner permission`);
        return;
      }

      await dbAddUserToTrip({
        tripId: trip.id,
        userEmail: newUserEmail,
        userRole: newUserRole as TripUserRole,
      });
      publishToast({
        root: {},
        title: {
          children: `Added ${newUserEmail} to trip ${trip.title} as ${newUserRole}`,
        },
        close: {},
      });
      elForm.reset();
      setNewUserEmail('');
      setNewUserRole(TripUserRole.Viewer);
    };
  }, [currentUserIsOwner, currentUser.email, trip.id, trip.title, publishToast]);

  const handleFormSubmit = useCallback(
    (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      const elForm = e.currentTarget;
      void handleForm()(elForm);
    },
    [handleForm]
  );

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Share Trip</Dialog.Title>
        <Dialog.Description>
          Share this trip with other people!
        </Dialog.Description>

        {currentUserIsOwner ? (
          <form
            onInput={() => {
              setErrorMessage('');
            }}
            onSubmit={handleFormSubmit}
          >
            <Flex direction="column" gap="2">
              <Text color="red" size="2">
                {errorMessage}&nbsp;
              </Text>

              <Flex direction="row" gap="1" justify="end">
                <TextField.Root
                  placeholder="abc@example.com"
                  name="newUserEmail"
                  type="text"
                  required
                  className={s.emailField}
                  value={newUserEmail}
                  onChange={(ev) => {
                    setNewUserEmail(ev.currentTarget.value);
                  }}
                ></TextField.Root>

                <Select.Root
                  name="newUserRole"
                  value={newUserRole}
                  onValueChange={(v) => {
                    setNewUserRole(v as TripUserRole);
                  }}
                  required
                >
                  <Select.Trigger className={s.roleField} />
                  <Select.Content>
                    <Select.Item value={TripUserRole.Viewer}>
                      Viewer
                    </Select.Item>
                    <Select.Item value={TripUserRole.Editor}>
                      Editor
                    </Select.Item>
                    <Select.Item value={TripUserRole.Owner}>Owner</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Button type="submit" size="2" variant="outline">
                  <PlusIcon /> Add
                </Button>
              </Flex>
            </Flex>
          </form>
        ) : null}

        <Inset side="x" my="2">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Person</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                {currentUserIsOwner ? (
                  <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                ) : null}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {userAndRoles.map(({ user, role }) => {
                return (
                  <Table.Row key={user.id}>
                    <Table.RowHeaderCell>
                      {user.handle || user.email}
                    </Table.RowHeaderCell>
                    <Table.Cell>{capitalizeFirst(role)}</Table.Cell>
                    {currentUserIsOwner ? (
                      <Table.Cell>
                        {currentUser.id === user.id ? (
                          ''
                        ) : (
                          <Button
                            variant="outline"
                            color="gray"
                            size="1"
                            onClick={() => {
                              void handleDeleteUser()({ user, role });
                            }}
                          >
                            <TrashIcon /> Delete
                          </Button>
                        )}
                      </Table.Cell>
                    ) : null}
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Inset>

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button size="2" variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function capitalizeFirst(text: string): string {
  return text.length > 0 ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}
