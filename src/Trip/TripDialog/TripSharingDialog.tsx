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
import { useCurrentUser } from '../../Auth/hooks';
import { dangerToken } from '../../common/ui';
import { CommonLargeDialogMaxWidth } from '../../Dialog/ui';
import { useBoundStore } from '../../data/store';
import { TripUserRole } from '../../User/TripUserRole';
import {
  dbAddUserToTrip,
  dbRemoveUserFromTrip,
  dbUpdateTripSharingLevel,
} from '../db';
import { useTrip, useTripUserIds } from '../store/hooks';
import type { TripSliceTripUser } from '../store/types';
import {
  TripSharingLevel,
  type TripSharingLevelType,
} from '../tripSharingLevel';
import s from './TripSharingDialog.module.css';

export function TripSharingDialog({ tripId }: { tripId: string }) {
  const { trip } = useTrip(tripId);
  const currentUser = useCurrentUser();
  const [dialogClosable, setDialogClosable] = useState(true);
  const tripUsers = useTripUserIds(trip?.tripUserIds ?? []);
  const popDialog = useBoundStore((state) => state.popDialog);
  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const currentUserIsOwner = useMemo(() => {
    return trip?.currentUserRole === TripUserRole.Owner;
  }, [trip?.currentUserRole]);
  const [isLoading, setIsLoading] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState(TripUserRole.Viewer);

  const [tripSharingLevel, setTripSharingLevel] =
    useState<TripSharingLevelType>(
      trip?.sharingLevel ?? TripSharingLevel.Private,
    );

  const handleDeleteUser = useCallback(() => {
    return async (tripUser: TripSliceTripUser) => {
      setIsLoading(true);
      await dbRemoveUserFromTrip(tripUser.id);
      setIsLoading(false);
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
      setIsLoading(true);

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
      setIsLoading(false);
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

  const syncTripSharingLevel = useCallback(
    async (newTripSharingLevel: TripSharingLevelType) => {
      if (!trip) {
        return;
      }
      if (trip.sharingLevel === newTripSharingLevel) {
        return;
      }
      setIsLoading(true);
      setTripSharingLevel(newTripSharingLevel);
      await dbUpdateTripSharingLevel(trip.id, newTripSharingLevel);
      setIsLoading(false);
    },
    [trip],
  );
  const handleTripSharingLevelChange = useCallback(
    (value: string) => {
      void syncTripSharingLevel(parseInt(value, 10) as TripSharingLevelType);
    },
    [syncTripSharingLevel],
  );

  return (
    <Dialog.Root open={true}>
      <Dialog.Content
        maxWidth={CommonLargeDialogMaxWidth}
        onEscapeKeyDown={(e) => {
          if (e.defaultPrevented) return;
          e.preventDefault();
          if (dialogClosable) {
            popDialog();
          }
        }}
        onInteractOutside={(e) => {
          if (e.defaultPrevented) return;
          e.preventDefault();
          if (dialogClosable) {
            popDialog();
          }
        }}
      >
        <Dialog.Title>Share Trip</Dialog.Title>
        <Dialog.Description size="2">
          Share this trip with other people!
        </Dialog.Description>

        {currentUserIsOwner ? (
          <Flex direction="column" gap="2" my="2">
            <Flex direction="row" gap="1" align="baseline">
              <Text size="2">Privacy setting for this trip:</Text>
              <Select.Root
                name="tripSharingLevel"
                value={String(tripSharingLevel)}
                onValueChange={handleTripSharingLevelChange}
                required
                size="2"
                disabled={isLoading}
              >
                <Select.Trigger className={s.tripSharingLevelField} />
                <Select.Content>
                  <Select.Item value={String(TripSharingLevel.Private)}>
                    Private
                  </Select.Item>
                  <Select.Item value={String(TripSharingLevel.Public)}>
                    Public
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Flex>
        ) : null}
        {currentUserIsOwner ? (
          <form
            onInput={() => {
              setErrorMessage('');
              setDialogClosable(false);
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
                  disabled={isLoading}
                />

                <Select.Root
                  name="newUserRole"
                  value={newUserRole}
                  onValueChange={(v) => {
                    setNewUserRole(v as TripUserRole);
                  }}
                  required
                  disabled={isLoading}
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
                <Button
                  type="submit"
                  size="2"
                  variant="outline"
                  loading={isLoading}
                >
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
                          {tripUser.email || tripUser.handle || 'Guest user'}{' '}
                          <Text size="1">(not activated)</Text>
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
                            loading={isLoading}
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
          <Button
            size="2"
            variant="soft"
            color="gray"
            onClick={() => {
              popDialog();
              setDialogClosable(true);
            }}
            loading={isLoading}
          >
            Close
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function capitalizeFirst(text: string): string {
  return text.length > 0 ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}
