import { ArrowLeftIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Callout,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { useAuthUser, useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { db } from '../data/db';
import { useBoundStore } from '../data/store';
import imgUrl from '../logo/ikuyo.svg';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { RouteAccount, RouteTrips } from '../Routes/routes';
import s from './PageAccountUpgrade.module.css';

export default PageAccountUpgrade;

enum UpgradeScreen {
  Selection = 0,
  EmailInput = 1,
  EmailVerify = 2,
  GoogleRedirect = 3,
}

export function PageAccountUpgrade(_props: RouteComponentProps) {
  const currentUser = useCurrentUser();
  const { authUser, authUserLoading } = useAuthUser();
  const [screen, setScreen] = useState(UpgradeScreen.Selection);
  const [sentEmail, setSentEmail] = useState('');
  const [, setLocation] = useLocation();

  const isGuest = !currentUser?.email;

  const googleAuthUrl = useMemo(
    () =>
      db.auth.createAuthorizationURL({
        clientName: 'ikuyo.kenrick95.org',
        redirectURL: window.location.href,
      }),
    [],
  );

  // If user already has email, redirect to account page
  useEffect(() => {
    if (!authUserLoading && authUser && currentUser && !isGuest) {
      setLocation(RouteAccount.asRootRoute());
    }
  }, [authUserLoading, authUser, currentUser, isGuest, setLocation]);

  // If not logged in at all, redirect to trips (auth redirect will handle)
  useEffect(() => {
    if (!authUserLoading && !authUser) {
      setLocation(RouteTrips.asRootRoute());
    }
  }, [authUserLoading, authUser, setLocation]);

  return (
    <>
      <DocTitle title={'Upgrade Account'} />
      <Navbar
        leftItems={[
          <Heading as="h1" key="title" size={{ initial: '3', xs: '5' }}>
            Upgrade Account
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu key="UserAvatarMenu" user={currentUser} />,
        ]}
      />
      <Container p="2" my="2">
        <Grid className={s.grid}>
          <Box maxWidth={CommonDialogMaxWidth} mx="2" px="2">
            {screen === UpgradeScreen.Selection ? (
              <UpgradeSelection
                setScreen={setScreen}
                googleAuthUrl={googleAuthUrl}
              />
            ) : screen === UpgradeScreen.GoogleRedirect ? (
              <UpgradeGoogleRedirect setScreen={setScreen} />
            ) : screen === UpgradeScreen.EmailInput ? (
              <UpgradeEmailInput
                setScreen={setScreen}
                setSentEmail={setSentEmail}
                currentUserId={currentUser?.id}
              />
            ) : screen === UpgradeScreen.EmailVerify ? (
              <UpgradeEmailVerify
                setScreen={setScreen}
                sentEmail={sentEmail}
                currentUserId={currentUser?.id}
              />
            ) : null}
          </Box>
        </Grid>
      </Container>
    </>
  );
}

function UpgradeSelection({
  setScreen,
  googleAuthUrl,
}: {
  setScreen: (screen: UpgradeScreen) => void;
  googleAuthUrl: string;
}) {
  return (
    <Flex direction="column" gap="3">
      <Heading size="4">
        <img src={imgUrl} alt="Logo" style={{ width: 28, verticalAlign: -4 }} />{' '}
        Link your account
      </Heading>
      <Callout.Root>
        <Callout.Text>
          You're currently using a guest account. Link an email or Google
          account to keep your data, change your handle, and share trips.
        </Callout.Text>
      </Callout.Root>
      <Button
        variant="outline"
        onClick={() => {
          setScreen(UpgradeScreen.EmailInput);
        }}
      >
        Link via email code
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = googleAuthUrl;
          setScreen(UpgradeScreen.GoogleRedirect);
        }}
      >
        Link via Google
      </Button>
    </Flex>
  );
}

function UpgradeGoogleRedirect({
  setScreen,
}: {
  setScreen: (screen: UpgradeScreen) => void;
}) {
  return (
    <Flex direction="column" gap="2">
      <Text>Linking via Google...</Text>
      <Button
        type="reset"
        variant="outline"
        onClick={() => {
          setScreen(UpgradeScreen.Selection);
        }}
      >
        Back
      </Button>
    </Flex>
  );
}

function UpgradeEmailInput({
  setSentEmail,
  setScreen,
  currentUserId,
}: {
  setSentEmail: (email: string) => void;
  setScreen: (screen: UpgradeScreen) => void;
  currentUserId: string | undefined;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      setIsLoading(true);
      e.preventDefault();
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
        setIsLoading(false);
        return;
      }
      const formData = new FormData(elForm);
      const email = ((formData.get('email') as string | null) || '')
        .trim()
        .toLowerCase();

      void db
        .queryOnce({
          user: {
            $: {
              where: { email },
              limit: 1,
            },
          },
        })
        .then(({ data }) => {
          const existingUser = data?.user?.[0] as { id: string } | undefined;
          if (existingUser && existingUser.id !== currentUserId) {
            setSentEmail('');
            publishToast({
              root: { duration: Number.POSITIVE_INFINITY },
              title: { children: 'Email already in use' },
              description: {
                children:
                  'This email is already linked to an existing account. Please log in with that account instead.',
              },
              close: {},
            });
            setIsLoading(false);
            return;
          }

          db.auth
            .sendMagicCode({ email })
            .then(() => {
              setSentEmail(email);
              setScreen(UpgradeScreen.EmailVerify);
              publishToast({
                root: { duration: Number.POSITIVE_INFINITY },
                title: { children: 'Email sent!' },
                description: {
                  children: `Please check your mailbox for ${email}`,
                },
                close: {},
              });
            })
            .catch((err: unknown) => {
              setSentEmail('');
              publishToast({
                root: { duration: Number.POSITIVE_INFINITY },
                title: { children: `Error sending email to ${email}` },
                description: {
                  children: (err as { body?: { message?: string } }).body
                    ?.message,
                },
                close: {},
              });
            })
            .finally(() => {
              setIsLoading(false);
            });
        })
        .catch((err: unknown) => {
          setSentEmail('');
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: `Error validating ${email}` },
            description: {
              children: (err as { message?: string }).message,
            },
            close: {},
          });
          setIsLoading(false);
        });
    },
    [setScreen, setSentEmail, publishToast, currentUserId],
  );

  const idEmail = useId();

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Heading size="4">
          <Button
            type="reset"
            variant="ghost"
            className={s.screenBackButton}
            onClick={() => {
              setScreen(UpgradeScreen.Selection);
            }}
            loading={isLoading}
          >
            <ArrowLeftIcon />
          </Button>
          Link via email
        </Heading>
        <Text as="label" htmlFor={idEmail}>
          Enter your email to link to this account:
        </Text>
        <TextField.Root
          id={idEmail}
          placeholder="example@example.com"
          type="email"
          name="email"
          defaultValue=""
          required
          disabled={isLoading}
        />
        <Button type="submit" loading={isLoading}>
          Send Code
        </Button>
      </Flex>
    </form>
  );
}

function UpgradeEmailVerify({
  sentEmail,
  setScreen,
  currentUserId,
}: {
  sentEmail: string;
  setScreen: (screen: UpgradeScreen) => void;
  currentUserId: string | undefined;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
        setIsLoading(false);
        return;
      }
      const formData = new FormData(elForm);
      const code = (formData.get('code') as string | null) ?? '';
      void db
        .queryOnce({
          user: {
            $: {
              where: { email: sentEmail },
              limit: 1,
            },
          },
        })
        .then(({ data }) => {
          const existingUser = data?.user?.[0] as { id: string } | undefined;
          if (existingUser && existingUser.id !== currentUserId) {
            publishToast({
              root: { duration: Number.POSITIVE_INFINITY },
              title: { children: 'Email already in use' },
              description: {
                children:
                  'This email is already linked to an existing account. Please log in with that account instead.',
              },
              close: {},
            });
            setIsLoading(false);
            return;
          }

          db.auth
            .signInWithMagicCode({ email: sentEmail, code })
            .catch((err: unknown) => {
              publishToast({
                root: { duration: Number.POSITIVE_INFINITY },
                title: { children: 'Error verifying code' },
                description: {
                  children: (err as { body?: { message?: string } }).body
                    ?.message,
                },
                close: {},
              });
            })
            .finally(() => {
              setIsLoading(false);
            });
        })
        .catch((err: unknown) => {
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: 'Error validating email ownership' },
            description: {
              children: (err as { message?: string }).message,
            },
            close: {},
          });
          setIsLoading(false);
        });
    },
    [publishToast, sentEmail, currentUserId],
  );

  const idCode = useId();

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Heading size="4">
          <Button
            type="reset"
            variant="ghost"
            className={s.screenBackButton}
            onClick={() => {
              setScreen(UpgradeScreen.EmailInput);
            }}
            loading={isLoading}
          >
            <ArrowLeftIcon />
          </Button>
          Verify code
        </Heading>
        <Text as="label" htmlFor={idCode}>
          Enter the code we sent to your email ({sentEmail}):
        </Text>
        <Text weight="light" size="1">
          Check your spam folder too if you can't find it in your inbox.
        </Text>
        <TextField.Root
          id={idCode}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          placeholder="123456"
          name="code"
          defaultValue=""
          required
          minLength={6}
          maxLength={6}
          disabled={isLoading}
        />
        <Button type="submit" loading={isLoading}>
          Verify code
        </Button>
      </Flex>
    </form>
  );
}
