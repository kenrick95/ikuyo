import {
  Button,
  Container,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import type { SubmitEvent } from 'react';
import { useCallback, useId, useState } from 'react';
import type { RouteComponentProps } from 'wouter';
import { useAuthUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { dangerToken } from '../common/ui';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { dbUpdateUser } from '../User/db';

export default PageAccount;
export function PageAccount(_props: RouteComponentProps) {
  const currentUser = useDeepBoundStore((state) => state.currentUser);
  const resetToast = useBoundStore((state) => state.resetToast);
  const publishToast = useBoundStore((state) => state.publishToast);
  const [isFormLoading, setIsFormLoading] = useState(false);

  const idEmail = useId();
  const idHandle = useId();

  const [errorMessage, setErrorMessage] = useState('');
  const { authUser } = useAuthUser();

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
          email: currentUser.email,
          handle,
          activated: currentUser.activated,
          defaultUserNamespaceId: authUser.id,
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

  return (
    <>
      <DocTitle title={'Account'} />
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
                (cannot be changed)
              </Text>
            </Text>
            <TextField.Root
              defaultValue={currentUser?.email}
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
              defaultValue={currentUser?.handle}
              name="handle"
              type="text"
              pattern="[a-z0-9_]{4,16}"
              id={idHandle}
            />
          </Flex>
          <Flex gap="3" mt="5">
            <Button
              type="submit"
              size="2"
              variant="solid"
              loading={isFormLoading}
            >
              Save
            </Button>
          </Flex>
        </form>
      </Container>
    </>
  );
}
