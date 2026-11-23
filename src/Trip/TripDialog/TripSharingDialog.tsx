import {
  ExclamationTriangleIcon,
  Link1Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  Callout,
  Checkbox,
  Dialog,
  Flex,
  Inset,
  Select,
  Switch,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { type SyntheticEvent, useCallback, useMemo, useState } from 'react';
import { useCurrentUser } from '../../Auth/hooks';
import { dangerToken } from '../../common/ui';
import { CommonLargeDialogMaxWidth } from '../../Dialog/ui';
import { patchMutation, postMutation } from '../../data/apiClient';
import { id } from '../../data/id';
import { useBoundStore } from '../../data/store';
import { TripUserRole } from '../../User/TripUserRole';
import {
  dbAddUserToTrip,
  dbRemoveUserFromTrip,
  dbUpdateTripSectionVisibility,
  dbUpdateTripSharingLevel,
} from '../db';
import { useTrip, useTripUserIds } from '../store/hooks';
import type { TripSliceTripUser } from '../store/types';
import {
  TripSharingLevel,
  type TripSharingLevelType,
} from '../tripSharingLevel';
import s from './TripSharingDialog.module.css';

export function TripSharingDialog({
  tripId,
  accountIdentity,
}: {
  tripId: string;
  accountIdentity?: string;
}) {
  const { trip } = useTrip(tripId);
  const currentUser = useCurrentUser();
  const [dialogClosable, setDialogClosable] = useState(true);
  const tripUsers = useTripUserIds(trip?.tripUserIds ?? []);
  const peopleByUserId = useMemo(
    () =>
      new Map(
        trip?.people
          ?.filter((p) => p.userId !== null)
          .map((p) => [p.userId, p]),
      ),
    [trip?.people],
  );
  const popDialog = useBoundStore((state) => state.popDialog);
  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const currentUserIsOwner = trip?.currentUserRole === TripUserRole.Owner;
  const [isLoading, setIsLoading] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState(accountIdentity ?? '');
  const [newUserRole, setNewUserRole] = useState(TripUserRole.Viewer);
  const [addToParticipants, setAddToParticipants] = useState(false);

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
      try {
        await dbAddUserToTrip({
          tripId: trip.id,
          userEmail: newUserEmail,
          userRole: newUserRole as TripUserRole,
          addToParticipants,
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
        setAddToParticipants(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to share trip.',
        );
      } finally {
        setIsLoading(false);
      }
    };
  }, [currentUserIsOwner, currentUser, trip, publishToast, addToParticipants]);

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

  const handleCopyLink = useCallback(() => {
    if (!trip) {
      return;
    }
    const tripLink = `${window.location.origin}/trip/${trip.id}`;
    navigator.clipboard
      .writeText(tripLink)
      .then(() => {
        publishToast({
          root: {},
          title: { children: 'Copied trip link to clipboard' },
          close: {},
        });
      })
      .catch((error: unknown) => {
        console.error('Error copying link to clipboard', error);
        publishToast({
          root: {},
          title: {
            children: 'Error copying link',
          },
          close: {},
        });
      });
  }, [trip, publishToast]);

  return (
    <Dialog.Root open={true}>
      <Dialog.Content
        width="calc(100% - 2 * var(--space-4))"
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
        <Dialog.Title>Sharing & Privacy for Trip</Dialog.Title>
        <Dialog.Description size="2">
          Share this trip with other people!
        </Dialog.Description>

        {currentUserIsOwner ? (
          <Flex direction="column" gap="2" my="2">
            <Flex direction="row" gap="1" align="baseline">
              <Text size="2">Privacy setting for this trip: </Text>
              <Select.Root
                name="tripSharingLevel"
                value={String(tripSharingLevel)}
                onValueChange={handleTripSharingLevelChange}
                required
                size="2"
                disabled={isLoading}
              >
                <Select.Trigger
                  className={s.tripSharingLevelField}
                  aria-label="Trip privacy"
                />
                <Select.Content>
                  <Select.Item value={String(TripSharingLevel.Private)}>
                    Private
                  </Select.Item>
                  <Select.Item value={String(TripSharingLevel.PublicUnlisted)}>
                    Unlisted
                  </Select.Item>
                  <Select.Item value={String(TripSharingLevel.PublicListed)}>
                    Public
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
            {tripSharingLevel === TripSharingLevel.PublicUnlisted ? (
              <Callout.Root color={dangerToken} size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  Anyone with the link can view this trip.
                  <br />
                  <strong>Only share the link with people you trust</strong> and
                  avoid including sensitive personal info.
                </Callout.Text>
              </Callout.Root>
            ) : tripSharingLevel === TripSharingLevel.PublicListed ? (
              <Callout.Root color={dangerToken} size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  Visible to everyone in the public directory
                  <br />
                  <strong>Do not include sensitive personal info</strong> such
                  as home addresses or passport details.
                </Callout.Text>
              </Callout.Root>
            ) : null}
            {tripSharingLevel !== TripSharingLevel.Private ? (
              <Flex direction="column" mt="2">
                <Text size="2" weight="medium">
                  Section Visibility
                </Text>
                <Flex
                  justify="between"
                  direction={{ initial: 'column', sm: 'row' }}
                  gap="3"
                  mt="3"
                >
                  <Flex
                    flexGrow="1"
                    maxWidth={{ initial: '100%', sm: '50%' }}
                    direction="column"
                    gap="1"
                  >
                    <Text size="1" color="gray" weight="medium">
                      Public Visitors
                    </Text>
                    {(
                      [
                        ['publicShowExpenses', 'Expenses'],
                        ['publicShowTasks', 'Tasks'],
                        ['publicShowComments', 'Comments'],
                      ] as const
                    ).map(([field, label]) => (
                      <Flex key={field} align="center" gap="2">
                        <Switch
                          id={field}
                          size="1"
                          checked={trip?.[field] !== false}
                          disabled={isLoading || !trip}
                          onCheckedChange={(checked) => {
                            if (!trip) return;
                            void dbUpdateTripSectionVisibility(trip.id, {
                              [field]: checked,
                            });
                          }}
                        />
                        <Text as="label" htmlFor={field} size="2">
                          {label}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                  <Flex
                    flexGrow="1"
                    maxWidth={{ initial: '100%', md: '50%' }}
                    direction="column"
                    gap="1"
                  >
                    <Text size="1" color="gray" weight="medium">
                      Invited Viewers (Viewer Role)
                    </Text>
                    {(
                      [
                        ['viewerShowExpenses', 'Expenses'],
                        ['viewerShowTasks', 'Tasks'],
                        ['viewerShowComments', 'Comments'],
                      ] as const
                    ).map(([field, label]) => (
                      <Flex key={field} align="center" gap="2">
                        <Switch
                          id={field}
                          size="1"
                          checked={trip?.[field] !== false}
                          disabled={isLoading || !trip}
                          onCheckedChange={(checked) => {
                            if (!trip) return;
                            void dbUpdateTripSectionVisibility(trip.id, {
                              [field]: checked,
                            });
                          }}
                        />
                        <Text as="label" htmlFor={field} size="2">
                          {label}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Flex>
              </Flex>
            ) : null}
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
              <Text
                color={dangerToken}
                size="2"
                role={errorMessage ? 'alert' : undefined}
              >
                {errorMessage}&nbsp;
              </Text>

              <Flex direction="row" gap="1" justify="end" wrap="wrap">
                <TextField.Root
                  placeholder="Email or @username"
                  aria-label="Account to share with"
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
                  <Select.Trigger
                    className={s.roleField}
                    aria-label="Access role"
                  />
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
            <Text as="label" size="2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={addToParticipants}
                  style={{ minWidth: 24, minHeight: 24 }}
                  disabled={isLoading}
                  onCheckedChange={(checked) =>
                    setAddToParticipants(checked === true)
                  }
                />
                Also add to participants
              </Flex>
            </Text>
          </form>
        ) : null}

        <Inset side="x" my="2" className={s.peopleTable}>
          <Table.Root layout="fixed">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Person</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className={s.accessColumn}>
                  Role
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell className={s.joiningColumn}>
                  Joining
                </Table.ColumnHeaderCell>
                {currentUserIsOwner ? (
                  <Table.ColumnHeaderCell className={s.actionsColumn}>
                    Actions
                  </Table.ColumnHeaderCell>
                ) : null}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {tripUsers.map((tripUser) => {
                const person = peopleByUserId.get(tripUser.userId);
                return (
                  <Table.Row key={tripUser.id}>
                    <Table.RowHeaderCell className={s.personCell}>
                      {tripUser.activated ? (
                        tripUser.handle
                      ) : (
                        <>
                          {tripUser.email || tripUser.handle || 'Guest user'}{' '}
                          <Text size="1">(not activated)</Text>
                        </>
                      )}
                      {tripUser.accountType === 'guest' && (
                        <Badge color="gray" ml="2">
                          Guest account
                        </Badge>
                      )}
                      <Text size="1" color="gray" className={s.mobileAccess}>
                        {capitalizeFirst(tripUser.role)}
                      </Text>
                    </Table.RowHeaderCell>
                    <Table.Cell className={s.accessColumn}>
                      {capitalizeFirst(tripUser.role)}
                    </Table.Cell>
                    <Table.Cell className={s.joiningColumn}>
                      <Checkbox
                        aria-label={`${tripUser.handle} is joining the trip`}
                        checked={!!person?.isParticipant && !person.archived}
                        disabled={
                          isLoading ||
                          !currentUserIsOwner ||
                          trip?.archivedAt != null
                        }
                        onCheckedChange={(checked) => {
                          if (!trip) return;
                          setIsLoading(true);
                          const prefix = `/api/trips/${encodeURIComponent(trip.id)}/people`;
                          const request = person
                            ? patchMutation(
                                `${prefix}/${encodeURIComponent(person.id)}`,
                                {
                                  isParticipant: checked === true,
                                  ...(checked ? { archived: false } : {}),
                                },
                              )
                            : postMutation(prefix, {
                                id: id(),
                                userId: tripUser.userId,
                                isParticipant: checked === true,
                              });
                          void request
                            .then(() =>
                              useBoundStore.getState().refreshTrip(trip.id),
                            )
                            .catch((error: unknown) =>
                              setErrorMessage(
                                error instanceof Error
                                  ? error.message
                                  : 'Unable to update person.',
                              ),
                            )
                            .finally(() => setIsLoading(false));
                        }}
                      />
                    </Table.Cell>
                    {currentUserIsOwner ? (
                      <Table.Cell className={s.actionsColumn}>
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
                            <TrashIcon /> Remove
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

        <Flex gap="3" mt="5" justify="end" wrap="wrap">
          {tripSharingLevel === TripSharingLevel.PublicListed ||
          tripSharingLevel === TripSharingLevel.PublicUnlisted ? (
            <Button
              size="2"
              variant="soft"
              color="gray"
              onClick={handleCopyLink}
            >
              <Link1Icon />
              Copy trip link
            </Button>
          ) : null}
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
