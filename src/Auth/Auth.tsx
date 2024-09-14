import React, { useCallback, useId, useState } from 'react';
import { db } from '../data/db';
import {
  Text,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  TextField,
} from '@radix-ui/themes';
import { AppAuthed } from '../AppAuthed';
import { useBoundStore } from '../data/store';
import s from './Auth.module.css';

export function AuthScreen() {
  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>Uh oh! {error.message}</div>;
  }
  if (!user) {
    return <Login />;
  }
  return <AppAuthed user={user} />;
}

function Login() {
  const [sentEmail, setSentEmail] = useState('');
  return (
    <Grid className={s.grid}>
      <Box maxWidth="450px">
        {!sentEmail ? (
          <Email setSentEmail={setSentEmail} />
        ) : (
          <MagicCode sentEmail={sentEmail} />
        )}
      </Box>
    </Grid>
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
        .catch((err) => {
          setSentEmail('');
          publishToast({
            root: { duration: Infinity },
            title: { children: `Error sending email to ${email}` },
            description: { children: err.body?.message },
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
        <Heading>Ikuyo!</Heading>
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
  // TODO: refactor this component
  const [code, setCode] = useState('');
  const publishToast = useBoundStore((state) => state.publishToast);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    db.auth.signInWithMagicCode({ email: sentEmail, code }).catch((err) => {
      publishToast({
        root: { duration: Infinity },
        title: { children: 'Error signing in' },
        description: { children: err.body?.message },
        close: {},
      });

      setCode('');
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Heading>Okay, we sent you an email! What was the code?</Heading>
      <TextField.Root
        type="text"
        placeholder="123456..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <Button type="submit">Verify</Button>
    </form>
  );
}
