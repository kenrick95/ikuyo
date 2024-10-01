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
import { Redirect } from 'wouter';
import { ROUTES } from '../routes';

import imgUrl from '/ikuyo.svg';
import { DocTitle } from '../Nav/DocTitle';

export default PageLogin;
export function PageLogin() {
  const { isLoading, user, error } = db.useAuth();
  const [sentEmail, setSentEmail] = useState('');
  const publishToast = useBoundStore((state) => state.publishToast);
  const resetToast = useBoundStore((state) => state.resetToast);

  const { data: userData } = db.useQuery({
    user: {
      $: {
        where: {
          email: user?.email ?? '',
        },
      },
    },
  });

  useEffect(() => {
    if (user?.email) {
      resetToast();
      if (
        userData?.user.length === 0 ||
        userData?.user[0].activated === false
      ) {
        // Create new user if not exist, or alr exist but not yet activated
        void dbUpsertUser({
          // TODO: ask to change handle later?
          handle: user.email,
          email: user.email,
          activated: true,
        }).then(() => {
          publishToast({
            root: {},
            title: { children: `Welcome ${user.email}!` },
            close: {},
          });
        });
      } else if (userData?.user.length != null && userData.user.length > 0) {
        publishToast({
          root: {},
          title: { children: `Welcome back ${user.email}!` },
          close: {},
        });
      }
    }
  }, [userData, user, resetToast, publishToast]);

  if (userData?.user.length != null && userData.user.length > 0) {
    // Already authenticated
    return <Redirect to={ROUTES.Trips} />;
  }

  return (
    <>
      <DocTitle title={'Login'} />
      <Grid className={s.grid}>
        <Box maxWidth="450px" mx="2" px="2">
          {isLoading ? (
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
