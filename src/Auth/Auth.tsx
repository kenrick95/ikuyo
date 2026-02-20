import { ArrowLeftIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
  TextField,
} from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { db } from '../data/db';
import { useBoundStore } from '../data/store';
import imgUrl from '../logo/ikuyo.svg';
import { DocTitle } from '../Nav/DocTitle';
import { RouteTrips } from '../Routes/routes';
import s from './Auth.module.css';
import { useAuthUser, useCurrentUser } from './hooks';

export default PageLogin;

enum AuthScreen {
  LoginSelection = 0,
  LoginViaEmailInput = 1,
  LoginViaEmailVerify = 2,
  LoginViaGoogle = 3,
  InvalidState = 4,
}

export function PageLogin(_props: RouteComponentProps) {
  const { authUser, authUserLoading, authUserError: error } = useAuthUser();
  const currentUser = useCurrentUser();

  const [screen, setScreen] = useState(AuthScreen.LoginSelection);
  const [sentEmail, setSentEmail] = useState('');
  const [, setLocation] = useLocation();

  const googleAuthUrl = useMemo(
    () =>
      db.auth.createAuthorizationURL({
        clientName: 'ikuyo.kenrick95.org',
        redirectURL: window.location.href,
      }),
    [],
  );

  useEffect(() => {
    if (authUser && currentUser && !authUserLoading) {
      setLocation(RouteTrips.asRootRoute());
    }
  }, [authUser, currentUser, authUserLoading, setLocation]);

  return (
    <>
      <DocTitle title={'Login'} />
      <Grid className={s.grid}>
        <Box maxWidth={CommonDialogMaxWidth} mx="2" px="2">
          {authUserLoading ? (
            <Spinner m="3" />
          ) : error ? (
            `Error: ${error}`
          ) : screen === AuthScreen.LoginSelection ? (
            <LoginSelection
              setScreen={setScreen}
              googleAuthUrl={googleAuthUrl}
            />
          ) : screen === AuthScreen.LoginViaGoogle ? (
            <LoginViaGoogle setScreen={setScreen} />
          ) : screen === AuthScreen.LoginViaEmailInput ? (
            <Email setScreen={setScreen} setSentEmail={setSentEmail} />
          ) : screen === AuthScreen.LoginViaEmailVerify ? (
            <MagicCode setScreen={setScreen} sentEmail={sentEmail} />
          ) : (
            'Invalid State'
          )}
        </Box>
      </Grid>
    </>
  );
}

function LoginViaGoogle({
  setScreen,
}: {
  setScreen: (screen: AuthScreen) => void;
}) {
  return (
    <>
      Logging in via Google...
      <br />
      <Button
        type="reset"
        variant="outline"
        onClick={() => {
          setScreen(AuthScreen.LoginSelection);
        }}
      >
        Back
      </Button>
    </>
  );
}

function LoginSelection({
  setScreen,
  googleAuthUrl,
}: {
  setScreen: (screen: AuthScreen) => void;
  googleAuthUrl: string;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleGuestSignIn = useCallback(() => {
    setIsGuestLoading(true);
    db.auth
      .signInAsGuest()
      .catch((err: unknown) => {
        publishToast({
          root: { duration: Number.POSITIVE_INFINITY },
          title: { children: 'Error signing in as guest' },
          description: {
            children: (err as { body?: { message?: string } }).body?.message,
          },
          close: {},
        });
      })
      .finally(() => {
        setIsGuestLoading(false);
      });
  }, [publishToast]);

  return (
    <Flex direction="column" gap="2">
      <Heading>
        <img src={imgUrl} className={s.logo} alt="Logo" /> Ikuyo!
      </Heading>
      <Button
        variant="outline"
        onClick={() => {
          setScreen(AuthScreen.LoginViaEmailInput);
        }}
      >
        Log in via email code
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = googleAuthUrl;
          setScreen(AuthScreen.LoginViaGoogle);
        }}
      >
        Log in via Google
      </Button>
      <Button
        variant="soft"
        color="gray"
        onClick={handleGuestSignIn}
        loading={isGuestLoading}
      >
        Try as guest
      </Button>
    </Flex>
  );
}
function Email({
  setSentEmail,
  setScreen,
}: {
  setSentEmail: (email: string) => void;
  setScreen: (screen: AuthScreen) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
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

      db.auth
        .sendMagicCode({ email })
        .then(() => {
          setSentEmail(email);
          setScreen(AuthScreen.LoginViaEmailVerify);
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: 'Email sent!' },
            description: { children: `Please check your mailbox for ${email}` },
            close: {},
          });
        })
        .catch((err: unknown) => {
          setSentEmail('');
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: `Error sending email to ${email}` },
            description: {
              children: (err as { body?: { message?: string } }).body?.message,
            },
            close: {},
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [setScreen, setSentEmail, publishToast],
  );
  const idEmail = useId();

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Heading>
          <Button
            type="reset"
            variant="ghost"
            className={s.screenBackButton}
            onClick={() => {
              setScreen(AuthScreen.LoginSelection);
            }}
            loading={isLoading}
          >
            <ArrowLeftIcon />
          </Button>
          <img src={imgUrl} className={s.logo} alt="Logo" /> Ikuyo!
        </Heading>
        <Text as="label" htmlFor={idEmail}>
          Enter your email to log in:
        </Text>
        <TextField.Root
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

function MagicCode({
  sentEmail,
  setScreen,
}: {
  sentEmail: string;
  setScreen: (screen: AuthScreen) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
        setIsLoading(false);
        return;
      }
      const formData = new FormData(elForm);
      const code = (formData.get('code') as string | null) ?? '';
      db.auth
        .signInWithMagicCode({ email: sentEmail, code })
        .catch((err: unknown) => {
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: 'Error signing in' },
            description: {
              children: (err as { body?: { message?: string } }).body?.message,
            },
            close: {},
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [publishToast, sentEmail],
  );
  const idCode = useId();

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Heading>
          <Button
            type="reset"
            variant="ghost"
            className={s.screenBackButton}
            onClick={() => {
              setScreen(AuthScreen.LoginViaEmailInput);
            }}
            loading={isLoading}
          >
            <ArrowLeftIcon />
          </Button>
          <img src={imgUrl} className={s.logo} alt="Ikuyo logo" /> Ikuyo!
        </Heading>
        <Text as="label" htmlFor={idCode}>
          Enter the code we sent to your email ({sentEmail}):
        </Text>
        <Text weight="light" size="1">
          Check your spam folder too if you can't find it in your inbox.
        </Text>
        <TextField.Root
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
