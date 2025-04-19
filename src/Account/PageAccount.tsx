import {
  Button,
  Container,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useAuthUser } from '../Auth/hooks';
import { Navbar } from '../Nav/Navbar';
import { db, dbUpsertUser } from '../data/db';
import type { DbUser } from '../data/types';

import { useCallback, useId, useState } from 'react';
import type { RouteComponentProps } from 'wouter';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { DocTitle } from '../Nav/DocTitle';
import { useBoundStore } from '../data/store';
import { dangerToken } from '../ui';

export default PageAccount;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PageAccount(_props: RouteComponentProps) {
  const { user: authUser } = useAuthUser();

  const { data } = db.useQuery({
    user: {
      $: { where: { email: authUser?.email ?? '' } },
    },
  });
  const userData = data?.user[0] as DbUser | undefined;

  const resetToast = useBoundStore((state) => state.resetToast);
  const publishToast = useBoundStore((state) => state.publishToast);

  const idEmail = useId();
  const idHandle = useId();

  const [errorMessage, setErrorMessage] = useState('');

  const handleForm = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const handle = (formData.get('handle') as string | null) ?? '';

      if (!handle || !userData) {
        return;
      }
      try {
        resetToast();
        await dbUpsertUser({
          ...userData,
          handle,
        });
        publishToast({
          root: {},
          title: { children: 'Account details updated' },
          close: {},
        });
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
        elForm.reset();
      }
    };
  }, [userData, resetToast, publishToast]);

  return (
    <>
      <DocTitle title={'Account'} />
      <Navbar
        leftItems={[
          <Heading as="h1" key="title" size={{ initial: '3', xs: '5' }}>
            {'Account'}
          </Heading>,
        ]}
        rightItems={[<UserAvatarMenu key="UserAvatarMenu" user={userData} />]}
      />
      <Container p="2" my="2">
        <Heading as="h2">Edit Account Details</Heading>
        <form
          onInput={() => {
            setErrorMessage('');
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const elForm = e.currentTarget;
            void handleForm()(elForm);
          }}
        >
          <Flex direction="column" gap="2">
            <Text color={dangerToken} size="2">
              {errorMessage}&nbsp;
            </Text>
            <Text as="label" htmlFor={idEmail}>
              E-mail address{' '}
              <Text weight="light" size="1">
                (cannot be changed)
              </Text>
            </Text>
            <TextField.Root
              defaultValue={userData?.email}
              name="email"
              type="email"
              disabled
              readOnly
              id={idEmail}
            />
            <Text as="label" htmlFor={idHandle}>
              Account handle{' '}
              <Text weight="light" size="1">
                (4-16 characters; lowercase alphabets, numbers, or underscore
                only)
              </Text>
            </Text>
            <TextField.Root
              defaultValue={userData?.handle}
              name="handle"
              type="text"
              pattern="[a-z0-9_]{4,16}"
              id={idHandle}
            />
          </Flex>
          <Flex gap="3" mt="5">
            <Button type="submit" size="2" variant="solid">
              Save
            </Button>
          </Flex>
        </form>
      </Container>
    </>
  );
}
