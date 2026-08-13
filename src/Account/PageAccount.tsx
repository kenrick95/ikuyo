import {
  Button,
  Container,
  Flex,
  Heading,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import type { SubmitEvent } from 'react';
import { useCallback, useId, useState } from 'react';
import type { RouteComponentProps } from 'wouter';
import { useAuthUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { CurrencySelect } from '../common/CurrencySelect/CurrencySelect';
import { TimeZoneSelect } from '../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../common/ui';
import { REGIONS_LIST } from '../data/intl/regions';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { pageTitle } from '../Nav/pageMeta';
import { RouteAccount } from '../Routes/routes';
import { getOriginCurrencyFromLocale } from '../Trip/TripNew/wizardUtils';
import { dbUpdateUser, dbUpdateUserPreferences } from '../User/db';

export default PageAccount;
export function PageAccount(_props: RouteComponentProps) {
  const currentUser = useDeepBoundStore((state) => state.currentUser);
  const resetToast = useBoundStore((state) => state.resetToast);
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const idEmail = useId();
  const idHandle = useId();
  const idPrefRegion = useId();
  const idPrefCurrency = useId();
  const idPrefTimeZone = useId();

  const [errorMessage, setErrorMessage] = useState('');
  const { authUser } = useAuthUser();
  const isGuest = !currentUser?.email;

  const [prefRegion, setPrefRegion] = useState(
    currentUser?.preferredRegion ?? '',
  );
  const [prefCurrency, setPrefCurrency] = useState(
    currentUser?.preferredCurrency ?? getOriginCurrencyFromLocale(),
  );
  const [prefTimeZone, setPrefTimeZone] = useState(
    currentUser?.preferredTimeZone ?? Temporal.Now.timeZoneId(),
  );

  const handleForm = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      setIsFormLoading(true);
      if (!elForm.reportValidity()) {
        setIsFormLoading(false);
        return;
      }
      const formData = new FormData(elForm);
      const handle = (formData.get('handle') as string | null) ?? '';

      if (!handle || !currentUser || !authUser?.id) {
        setIsFormLoading(false);
        return;
      }
      try {
        resetToast();
        await dbUpdateUser({
          id: currentUser.id,
          email: currentUser.email ?? undefined,
          handle,
          activated: currentUser.activated,
          defaultUserNamespaceId: authUser.id,
          lastLoginAt: currentUser.lastLoginAt,
        });
        publishToast({
          root: {},
          title: { children: 'Account details updated' },
          close: {},
        });
        setIsFormLoading(false);
        elForm.reset();
      } catch (err) {
        publishToast({
          root: {
            duration: Number.POSITIVE_INFINITY,
          },
          title: {
            children: 'Failed to update account details',
          },
          description: {
            children: (err as { message?: string }).message || '',
          },
          close: {},
        });
        setIsFormLoading(false);
        elForm.reset();
      }
    };
  }, [currentUser, resetToast, publishToast, authUser?.id]);

  const onFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  const onFormSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const elForm = event.currentTarget;
      void handleForm()(elForm);
    },
    [handleForm],
  );

  const handlePrefForm = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      void (async () => {
        if (!currentUser?.id) return;
        setIsFormLoading(true);
        try {
          await dbUpdateUserPreferences({
            id: currentUser.id,
            region: prefRegion || undefined,
            currency: prefCurrency || undefined,
            timeZone: prefTimeZone || undefined,
          });
          publishToast({
            root: {},
            title: { children: 'Trip preferences updated' },
            close: {},
          });
        } catch (err) {
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: 'Failed to update trip preferences' },
            description: {
              children: (err as { message?: string }).message || '',
            },
            close: {},
          });
        } finally {
          setIsFormLoading(false);
        }
      })();
    },
    [currentUser?.id, prefRegion, prefCurrency, prefTimeZone, publishToast],
  );

  return (
    <>
      <DocTitle title={pageTitle(RouteAccount.routePath)} />
      <Navbar
        leftItems={[
          <Heading as="h1" key="title" size={{ initial: '3', xs: '5' }}>
            {'Account'}
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu key="UserAvatarMenu" user={currentUser} />,
        ]}
      />
      <Container p="2" my="2">
        <Heading as="h2">Edit Account Details</Heading>
        <form onInput={onFormInput} onSubmit={onFormSubmit}>
          <Flex direction="column" gap="2">
            <Text color={dangerToken} size="2">
              {errorMessage}&nbsp;
            </Text>
            <Text as="label" htmlFor={idEmail}>
              E-mail address{' '}
              <Text weight="light" size="1">
                {currentUser?.email
                  ? '(cannot be changed)'
                  : '(sign in with email to set)'}
              </Text>
            </Text>
            <TextField.Root
              defaultValue={currentUser?.email ?? ''}
              name="email"
              type="email"
              disabled
              readOnly
              id={idEmail}
              placeholder={currentUser?.email ? undefined : 'Not set (guest)'}
            />
            <Text as="label" htmlFor={idHandle}>
              Account handle{' '}
              <Text weight="light" size="1">
                {isGuest
                  ? '(sign in with email to change)'
                  : '(4-16 characters; lowercase alphabets, numbers, or underscore only)'}
              </Text>
            </Text>
            <TextField.Root
              defaultValue={currentUser?.handle}
              name="handle"
              type="text"
              pattern="[a-z0-9_]{4,16}"
              id={idHandle}
              disabled={isGuest}
              readOnly={isGuest}
            />
          </Flex>
          <Flex gap="3" mt="5">
            <Button
              type="submit"
              size="2"
              variant="solid"
              loading={isFormLoading}
              disabled={isGuest}
            >
              Save
            </Button>
          </Flex>
        </form>

        <Heading as="h2" mt="6">
          Trip Preferences
        </Heading>
        <Text as="p" size="2" color="gray">
          Your origin (home) country/region. New trips are pre-filled with these
          values so your origin currency and time zone don't have to be
          re-entered.
        </Text>
        <form onInput={onFormInput} onSubmit={handlePrefForm}>
          <Flex direction="column" gap="2" mt="3">
            <Text as="label" htmlFor={idPrefRegion}>
              Origin region / country
            </Text>
            <Select.Root
              name="prefRegion"
              value={prefRegion}
              onValueChange={setPrefRegion}
              disabled={isFormLoading}
            >
              <Select.Trigger
                id={idPrefRegion}
                placeholder="Select an origin region…"
              />
              <Select.Content>
                {REGIONS_LIST.map(([regionCode, regionName]) => (
                  <Select.Item key={regionCode} value={regionCode}>
                    {regionName}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <Text as="label" htmlFor={idPrefCurrency}>
              Origin currency
            </Text>
            <CurrencySelect
              name="prefCurrency"
              id={idPrefCurrency}
              value={prefCurrency}
              isFormLoading={isFormLoading}
              handleChange={setPrefCurrency}
            />

            <Text as="label" htmlFor={idPrefTimeZone}>
              Origin time zone
            </Text>
            <TimeZoneSelect
              name="prefTimeZone"
              id={idPrefTimeZone}
              value={prefTimeZone}
              isFormLoading={isFormLoading}
              handleChange={setPrefTimeZone}
            />
          </Flex>
          <Flex gap="3" mt="5">
            <Button
              type="submit"
              size="2"
              variant="solid"
              loading={isFormLoading}
            >
              Save Preferences
            </Button>
          </Flex>
        </form>
      </Container>
    </>
  );
}
