import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import {
  Button,
  Dialog,
  Flex,
  Inset,
  Select,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { type SyntheticEvent, useCallback, useMemo, useState } from 'react';
import { useCurrentUser } from '../Auth/hooks';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import { TripUserRole } from '../data/TripUserRole';
import { dangerToken } from '../ui';
import { dbAddUserToTrip, dbRemoveUserFromTrip } from './db';
import { useTrip, useTripUserIds } from './hooks';
import type { TripSliceTripUser } from './store/types';
import s from './TripSharingDialog.module.css';

export function TripSharingDialog({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const currentUser = useCurrentUser();
  const tripUsers = useTripUserIds(trip?.tripUserIds ?? []);
  const popDialog = useBoundStore((state) => state.popDialog);
  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const currentUserIsOwner = useMemo(() => {
    for (const tripUser of tripUsers ?? []) {
      if (tripUser.id === currentUser?.id) {
        if (tripUser.role === TripUserRole.Owner) {
          return true;
        }
      }
    }
    return false;
  }, [tripUsers, currentUser]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState(TripUserRole.Viewer);

  const handleDeleteUser = useCallback(() => {
    return async (tripUser: TripSliceTripUser) => {
      await dbRemoveUserFromTrip(tripUser.id);
    };
  }, []);

  const handleForm = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) {
        return;
      }
      if (!trip || !currentUser) {
        return;
      }
      const formData = new FormData(elForm);
      const newUserEmail =
        (formData.get('newUserEmail') as string | null) ?? '';
      const newUserRole = (formData.get('newUserRole') as string | null) ?? '';

      console.log('TripForm', {
        newUserEmail,
        newUserRole,
      });
      if (!newUserEmail || !newUserRole) {
        return;
      }

      if (currentUserIsOwner && newUserEmail === currentUser?.email) {
        setErrorMessage(`Cannot change current user's owner permission`);
        return;
      }

      if ((newUserRole as TripUserRole) === TripUserRole.Owner) {
        setErrorMessage('Cannot set other person as owner');
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
  }, [currentUserIsOwner, currentUser, trip, publishToast]);

  const handleFormSubmit = useCallback(
    (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      const elForm = e.currentTarget;
      void handleForm()(elForm);
    },
    [handleForm],
  );

  return (
    <Dialog.Root
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          popDialog();
        }
      }}
    >
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>Share Trip</Dialog.Title>
        <Dialog.Description size="2">
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
              <Text color={dangerToken} size="2">
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
                />

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
              {tripUsers.map((tripUser) => {
                return (
                  <Table.Row key={tripUser.id}>
                    <Table.RowHeaderCell>
                      {tripUser.activated ? (
                        tripUser.handle
                      ) : (
                        <>
                          {tripUser.email} <Text size="1">(not activated)</Text>
                        </>
                      )}
                    </Table.RowHeaderCell>
                    <Table.Cell>{capitalizeFirst(tripUser.role)}</Table.Cell>
                    {currentUserIsOwner ? (
                      <Table.Cell>
                        {currentUser?.id === tripUser.userId ? (
                          ''
                        ) : (
                          <Button
                            variant="outline"
                            color="gray"
                            size="1"
                            onClick={() => {
                              void handleDeleteUser()(tripUser);
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
