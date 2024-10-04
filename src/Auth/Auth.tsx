import React, { useCallback, useEffect, useId, useState } from 'react';
import { db, dbUpsertUser as dbUpsertUser } from '../data/db';
import {
  Text,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  TextField,
} from '@radix-ui/themes';
import { useBoundStore } from '../data/store';
import s from './Auth.module.css';
import { Link, RouteComponentProps, useLocation } from 'wouter';
import { ROUTES } from '../routes';

import imgUrl from '/ikuyo.svg';
import { DocTitle } from '../Nav/DocTitle';

export default PageLogin;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PageLogin(_props: RouteComponentProps) {
  const { isLoading: authUserLoading, user: authUser, error } = db.useAuth();
  const [sentEmail, setSentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const publishToast = useBoundStore((state) => state.publishToast);
  const resetToast = useBoundStore((state) => state.resetToast);
  const [, setLocation] = useLocation();

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
            root: { duration: Infinity },
            title: { children: `Welcome!` },
            description: {
              children: `Activated account for ${userEmail}. Account handle is set as ${defaultHandle}`,
            },
            action: {
              altText: 'Go to account details edit page to edit handle',
              children: (
                <Button asChild>
                  <Link to={ROUTES.Account}>Edit account details</Link>
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
        <Box maxWidth="450px" mx="2" px="2">
          {authUserLoading || isLoading ? (
            'Loading'
          ) : error ? (
            `Error: ${error.message}`
          ) : !sentEmail ? (
            <Email setSentEmail={setSentEmail} />
          ) : (
            <MagicCode sentEmail={sentEmail} />
          )}
        </Box>
      </Grid>
    </>
  );
}

function Email({ setSentEmail }: { setSentEmail: (email: string) => void }) {
  const publishToast = useBoundStore((state) => state.publishToast);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const email = formData.get('email')?.toString() ?? '';

      db.auth
        .sendMagicCode({ email })
        .then(() => {
          setSentEmail(email);
          publishToast({
            root: { duration: Infinity },
            title: { children: 'Email sent!' },
            description: { children: `Please check your mailbox for ${email}` },
            close: {},
          });
        })
        .catch((err: unknown) => {
          setSentEmail('');
          publishToast({
            root: { duration: Infinity },
            title: { children: `Error sending email to ${email}` },
            description: {
              children: (err as { body?: { message?: string } }).body?.message,
            },
            close: {},
          });
        });
    },
    [setSentEmail, publishToast]
  );
  const idEmail = useId();

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Heading>
          <img src={imgUrl} className={s.logo} /> Ikuyo!
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

function MagicCode({ sentEmail }: { sentEmail: string }) {
  const publishToast = useBoundStore((state) => state.publishToast);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const elForm = e.currentTarget;
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const code = formData.get('code')?.toString() ?? '';
      db.auth
        .signInWithMagicCode({ email: sentEmail, code })
        .catch((err: unknown) => {
          publishToast({
            root: { duration: Infinity },
            title: { children: 'Error signing in' },
            description: {
              children: (err as { body?: { message?: string } }).body?.message,
            },
            close: {},
          });
        });
    },
    [publishToast, sentEmail]
  );
  const idCode = useId();

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Heading>
          <img src={imgUrl} className={s.logo} /> Ikuyo!
        </Heading>
        <Text as="label" htmlFor={idCode}>
          Enter the code we sent to your email ({sentEmail}):
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
