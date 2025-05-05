import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link, type RouteComponentProps, useLocation } from 'wouter';
import { db, dbUpsertUser } from '../data/db';
import { useBoundStore } from '../data/store';
import { ROUTES, asRootRoute } from '../Routes/routes';
import s from './Auth.module.css';

import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { DocTitle } from '../Nav/DocTitle';
import imgUrl from '../logo/ikuyo.svg';

export default PageLogin;

enum AuthScreen {
  LoginSelection = 0,
  LoginViaEmailInput = 1,
  LoginViaEmailVerify = 2,
  LoginViaGoogle = 3,
  InvalidState = 4,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PageLogin(_props: RouteComponentProps) {
  const { isLoading: authUserLoading, user: authUser, error } = db.useAuth();
  const [screen, setScreen] = useState(AuthScreen.LoginSelection);
  const [sentEmail, setSentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const publishToast = useBoundStore((state) => state.publishToast);
  const resetToast = useBoundStore((state) => state.resetToast);
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
    async function checkUser(userEmail: string) {
      setIsLoading(true);
      const { data: userData } = await db.queryOnce({
        user: {
          $: {
            where: {
              email: userEmail,
            },
            limit: 1,
          },
        },
      });
      if (userData.user.length === 0 || !userData.user[0].activated) {
        // Create new user if not exist, or alr exist but not yet activated
        const defaultHandle = userEmail.toLowerCase().replace(/[@.]/g, '_');
        void dbUpsertUser({
          handle: defaultHandle,
          email: userEmail,
          activated: true,
        }).then(() => {
          publishToast({
            root: { duration: Number.POSITIVE_INFINITY },
            title: { children: 'Welcome!' },
            description: {
              children: `Activated account for ${userEmail}. Account handle is set as ${defaultHandle}`,
            },
            action: {
              altText: 'Go to account details edit page to edit handle',
              children: (
                <Button asChild>
                  <Link to={asRootRoute(ROUTES.Account)}>
                    Edit account details
                  </Link>
                </Button>
              ),
            },
            close: {},
          });
          setIsLoading(false);
          setLocation(ROUTES.Trips);
        });
      } else if (userData.user.length > 0) {
        const userHandle = userData.user[0].handle;
        publishToast({
          root: {},
          title: { children: `Welcome back ${userHandle}!` },
          close: {},
        });
        setIsLoading(false);
        setLocation(ROUTES.Trips);
      }
    }
    if (authUser?.email) {
      resetToast();
      void checkUser(authUser.email);
    }
  }, [authUser?.email, resetToast, publishToast, setLocation]);

  return (
    <>
      <DocTitle title={'Login'} />
      <Grid className={s.grid}>
        <Box maxWidth={CommonDialogMaxWidth} mx="2" px="2">
          {authUserLoading || isLoading ? (
            'Loading'
          ) : error ? (
            `Error: ${error.message}`
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
            <>Invalid State</>
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

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const email = (formData.get('email') as string | null) ?? '';

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
        />
        <Button type="submit">Send Code</Button>
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

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
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
        />
        <Button type="submit">Verify code</Button>
      </Flex>
    </form>
  );
}
